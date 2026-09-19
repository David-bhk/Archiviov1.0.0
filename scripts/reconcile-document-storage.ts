import 'dotenv/config'

import { createHash, randomUUID } from 'crypto'
import fs from 'fs'
import path from 'path'
import { PrismaClient as PostgreSQLClient } from '@archivio/postgresql-client'

import { getPostgreSQLDatabaseName, getPostgreSQLUrl } from '../server/database-config'
import { verifyRecentBackupConfirmation } from './confirmed-postgresql-operation'
import { classifyStoredPath } from './document-storage-audit'
import {
  isForbiddenExternalSource,
  managedFilename,
  parseDocumentStorageReconciliationOptions,
} from './document-storage-reconciliation'

type DocumentMetadata = {
  id: number
  filename: string
  filePath: string
  fileSize: number
}

type ReconciliationCandidate = DocumentMetadata & {
  sourcePath: string
}

type PreparedCopy = ReconciliationCandidate & {
  targetFilename: string
  targetPath: string
  sha256: string
}

function getUploadsRoot(): string {
  return path.resolve(process.cwd(), process.env.UPLOADS_DIR?.trim() || 'uploads')
}

function getBackupRoot(): string {
  return path.resolve(process.cwd(), process.env.ARCHIVIO_BACKUP_DIR?.trim() || '.archivio-backups')
}

function isRegularFileWithSize(filePath: string, expectedBytes: number): boolean {
  try {
    const stats = fs.lstatSync(filePath)
    return !stats.isSymbolicLink() && stats.isFile() && stats.size === expectedBytes
  } catch {
    return false
  }
}

async function hashFile(filePath: string): Promise<string> {
  const hash = createHash('sha256')
  const stream = fs.createReadStream(filePath)
  for await (const chunk of stream) hash.update(chunk)
  return hash.digest('hex')
}

function buildPlan(documents: DocumentMetadata[], uploadsRoot: string): {
  candidates: ReconciliationCandidate[]
  missingOrInvalid: number
  forbidden: number
  alreadyManagedOrLegacy: number
} {
  const candidates: ReconciliationCandidate[] = []
  let missingOrInvalid = 0
  let forbidden = 0
  let alreadyManagedOrLegacy = 0

  for (const document of documents) {
    const classification = classifyStoredPath(uploadsRoot, document.filePath)
    if (classification.kind !== 'external') {
      alreadyManagedOrLegacy += 1
      continue
    }
    if (isForbiddenExternalSource(classification.resolvedPath)) {
      forbidden += 1
      continue
    }
    if (!isRegularFileWithSize(classification.resolvedPath, document.fileSize)) {
      missingOrInvalid += 1
      continue
    }
    candidates.push({ ...document, sourcePath: classification.resolvedPath })
  }

  return { candidates, missingOrInvalid, forbidden, alreadyManagedOrLegacy }
}

async function readDocuments(client: PostgreSQLClient, readOnly: boolean): Promise<DocumentMetadata[]> {
  if (!readOnly) {
    return client.file.findMany({
      select: { id: true, filename: true, filePath: true, fileSize: true },
      orderBy: { id: 'asc' },
    })
  }

  return client.$transaction(
    async (transaction) => {
      await transaction.$executeRawUnsafe('SET TRANSACTION READ ONLY')
      return transaction.file.findMany({
        select: { id: true, filename: true, filePath: true, fileSize: true },
        orderBy: { id: 'asc' },
      })
    },
    { timeout: 30_000 },
  )
}

async function prepareCopies(
  candidates: ReconciliationCandidate[],
  uploadsRoot: string,
): Promise<PreparedCopy[]> {
  await fs.promises.mkdir(uploadsRoot, { recursive: true })
  const prepared: PreparedCopy[] = []

  for (const candidate of candidates) {
    const sourceHash = await hashFile(candidate.sourcePath)
    const targetFilename = managedFilename(randomUUID(), candidate.filename)
    const targetPath = path.join(uploadsRoot, targetFilename)
    await fs.promises.copyFile(candidate.sourcePath, targetPath, fs.constants.COPYFILE_EXCL)
    const preparedCopy = {
      ...candidate,
      targetFilename,
      targetPath,
      sha256: sourceHash,
    }
    prepared.push(preparedCopy)

    const [copiedHash, repeatedSourceHash] = await Promise.all([
      hashFile(targetPath),
      hashFile(candidate.sourcePath),
    ])
    if (copiedHash !== sourceHash || repeatedSourceHash !== sourceHash) {
      throw new Error('Une empreinte a changé pendant la copie documentaire.')
    }
  }

  return prepared
}

async function applyDatabaseUpdates(
  client: PostgreSQLClient,
  prepared: PreparedCopy[],
): Promise<void> {
  await client.$transaction(async (transaction) => {
    for (const item of prepared) {
      const updated = await transaction.file.updateMany({
        where: {
          id: item.id,
          filename: item.filename,
          filePath: item.filePath,
          fileSize: item.fileSize,
        },
        data: {
          filename: item.targetFilename,
          filePath: item.targetFilename,
        },
      })
      if (updated.count !== 1) {
        throw new Error('Une métadonnée a changé depuis la simulation ; transaction annulée.')
      }
    }
  })
}

async function verifyAppliedState(
  client: PostgreSQLClient,
  prepared: PreparedCopy[],
): Promise<void> {
  for (const item of prepared) {
    const document = await client.file.findUnique({
      where: { id: item.id },
      select: { filename: true, filePath: true, fileSize: true },
    })
    if (
      document?.filename !== item.targetFilename ||
      document.filePath !== item.targetFilename ||
      document.fileSize !== item.fileSize ||
      !isRegularFileWithSize(item.targetPath, item.fileSize) ||
      await hashFile(item.targetPath) !== item.sha256
    ) {
      throw new Error('La vérification après réconciliation a échoué.')
    }
  }
}

async function removePreparedCopies(prepared: PreparedCopy[]): Promise<void> {
  for (const item of prepared) {
    await fs.promises.rm(item.targetPath, { force: true })
  }
}

async function main(): Promise<void> {
  if (process.env.ARCHIVIO_DB_PROVIDER?.trim() !== 'postgresql') {
    throw new Error('ARCHIVIO_DB_PROVIDER doit valoir postgresql pour réconcilier le stockage actif.')
  }

  const options = parseDocumentStorageReconciliationOptions(process.argv.slice(2))
  const databaseName = getPostgreSQLDatabaseName()
  const uploadsRoot = getUploadsRoot()
  const client = new PostgreSQLClient({ datasources: { db: { url: getPostgreSQLUrl() } } })
  let prepared: PreparedCopy[] = []
  let databaseCommitted = false

  try {
    const documents = await readDocuments(client, options.mode === 'dry-run')
    const plan = buildPlan(documents, uploadsRoot)
    console.log('Plan de réconciliation documentaire :')
    console.log(`- candidats externes présents avec taille conforme : ${plan.candidates.length}`)
    console.log(`- chemins externes absents ou invalides : ${plan.missingOrInvalid}`)
    console.log(`- chemins appartenant à un projet protégé : ${plan.forbidden}`)
    console.log(`- documents gérés ou anciens chemins sans cible : ${plan.alreadyManagedOrLegacy}`)

    if (options.mode === 'dry-run') {
      console.log('Simulation terminée : aucune donnée et aucun fichier n’ont été modifiés.')
      return
    }

    if (
      options.confirmedDatabaseName !== databaseName ||
      options.confirmedStoppedDatabaseName !== databaseName
    ) {
      throw new Error('Les confirmations de base et d’arrêt ne correspondent pas à la base active.')
    }
    if (options.confirmedCount !== plan.candidates.length) {
      throw new Error('Le nombre de candidats a changé depuis la confirmation ; opération annulée.')
    }
    if (plan.forbidden > 0) {
      throw new Error('Un candidat appartient à un projet explicitement protégé ; opération annulée.')
    }
    verifyRecentBackupConfirmation({
      backupName: options.confirmedBackup,
      databaseName,
      backupRoot: getBackupRoot(),
    })

    prepared = await prepareCopies(plan.candidates, uploadsRoot)
    await applyDatabaseUpdates(client, prepared)
    databaseCommitted = true
    await verifyAppliedState(client, prepared)

    console.log(
      `Réconciliation réussie : ${prepared.length} fichier(s) copié(s), vérifié(s) et rattaché(s) au stockage géré.`,
    )
    console.log('Les fichiers sources externes ont été conservés sans modification.')
  } finally {
    if (!databaseCommitted && prepared.length > 0) {
      await removePreparedCopies(prepared)
    }
    await client.$disconnect()
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error
    ? error.message
    : 'Erreur inconnue pendant la réconciliation documentaire.'
  console.error(message)
  process.exitCode = 1
})
