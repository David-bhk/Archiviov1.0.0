import 'dotenv/config'

import fs from 'fs'
import path from 'path'
import { PrismaClient as PostgreSQLClient } from '@archivio/postgresql-client'

import { getPostgreSQLDatabaseName, getPostgreSQLUrl } from '../server/database-config'
import { verifyRecentBackupConfirmation } from './confirmed-postgresql-operation'
import { classifyStoredPath } from './document-storage-audit'
import {
  assertExpectedSeedDocumentCleanupPlan,
  buildSeedDocumentCleanupPlan,
  parseSeedDocumentCleanupOptions,
  type SeedDocumentMetadata,
} from './seed-document-cleanup'

const documentSelection = {
  id: true,
  filename: true,
  fileSize: true,
  filePath: true,
  status: true,
  reviewedBy: true,
  reviewedAt: true,
  reviewComment: true,
  classificationLevel: true,
  _count: { select: { activities: true } },
} as const

function getUploadsRoot(): string {
  return path.resolve(process.cwd(), process.env.UPLOADS_DIR?.trim() || 'uploads')
}

function getBackupRoot(): string {
  return path.resolve(process.cwd(), process.env.ARCHIVIO_BACKUP_DIR?.trim() || '.archivio-backups')
}

function targetExists(filePath: string, uploadsRoot: string): boolean {
  const classification = classifyStoredPath(uploadsRoot, filePath)
  if (classification.kind !== 'legacy-rooted') return true
  return fs.existsSync(classification.resolvedPath) || fs.existsSync(classification.managedCandidate)
}

async function readDocuments(
  client: PostgreSQLClient,
  readOnly: boolean,
): Promise<SeedDocumentMetadata[]> {
  if (!readOnly) {
    return client.file.findMany({ select: documentSelection, orderBy: { id: 'asc' } })
  }

  return client.$transaction(
    async (transaction) => {
      await transaction.$executeRawUnsafe('SET TRANSACTION READ ONLY')
      return transaction.file.findMany({ select: documentSelection, orderBy: { id: 'asc' } })
    },
    { timeout: 30_000 },
  )
}

function verifyNoPhysicalTargets(
  documents: SeedDocumentMetadata[],
  uploadsRoot: string,
): void {
  if (documents.some((document) => targetExists(document.filePath, uploadsRoot))) {
    throw new Error(
      'Au moins une métadonnée du seed possède maintenant une cible physique ; opération annulée.',
    )
  }
}

async function deleteCandidates(
  client: PostgreSQLClient,
  expectedIds: number[],
  uploadsRoot: string,
  expectedActivityCount: number,
): Promise<void> {
  await client.$transaction(
    async (transaction) => {
      await transaction.$executeRawUnsafe('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE')
      const currentDocuments = await transaction.file.findMany({
        select: documentSelection,
        orderBy: { id: 'asc' },
      })
      const currentPlan = buildSeedDocumentCleanupPlan(currentDocuments)
      assertExpectedSeedDocumentCleanupPlan(currentPlan)
      verifyNoPhysicalTargets(currentPlan.candidates, uploadsRoot)

      const currentIds = currentPlan.candidates.map((document) => document.id)
      if (
        currentIds.length !== expectedIds.length ||
        currentIds.some((id, index) => id !== expectedIds[index])
      ) {
        throw new Error('Les candidats ont changé depuis la simulation ; opération annulée.')
      }

      const deletion = await transaction.file.deleteMany({ where: { id: { in: currentIds } } })
      if (deletion.count !== expectedIds.length) {
        throw new Error('Le nombre de métadonnées supprimées est inattendu ; transaction annulée.')
      }

      const activityCount = await transaction.activity.count()
      if (activityCount !== expectedActivityCount) {
        throw new Error('Le journal d’activité a changé pendant le nettoyage ; transaction annulée.')
      }
    },
    { timeout: 30_000 },
  )
}

async function main(): Promise<void> {
  if (process.env.ARCHIVIO_DB_PROVIDER?.trim() !== 'postgresql') {
    throw new Error('ARCHIVIO_DB_PROVIDER doit valoir postgresql pour nettoyer la base active.')
  }

  const options = parseSeedDocumentCleanupOptions(process.argv.slice(2))
  const databaseName = getPostgreSQLDatabaseName()
  const uploadsRoot = getUploadsRoot()
  const client = new PostgreSQLClient({ datasources: { db: { url: getPostgreSQLUrl() } } })

  try {
    const documents = await readDocuments(client, options.mode === 'dry-run')
    const plan = buildSeedDocumentCleanupPlan(documents)
    console.log('Plan de nettoyage des métadonnées du seed :')
    console.log(`- groupes historiques reconnus : ${plan.groupCounts.length}`)
    console.log(`- répétitions par groupe : ${plan.groupCounts.join(', ')}`)
    console.log(`- métadonnées candidates : ${plan.candidates.length}`)
    console.log(`- références d’activité à préserver : ${plan.activityReferences}`)
    console.log(`- lignes déjà revues ou classifiées : ${plan.reviewedOrClassified}`)

    assertExpectedSeedDocumentCleanupPlan(plan)
    verifyNoPhysicalTargets(plan.candidates, uploadsRoot)

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

    verifyRecentBackupConfirmation({
      backupName: options.confirmedBackup,
      databaseName,
      backupRoot: getBackupRoot(),
    })
    const activityCount = await client.activity.count()
    await deleteCandidates(
      client,
      plan.candidates.map((document) => document.id),
      uploadsRoot,
      activityCount,
    )

    const remainingDocuments = await readDocuments(client, true)
    const remainingPlan = buildSeedDocumentCleanupPlan(remainingDocuments)
    if (remainingPlan.candidates.length !== 0) {
      throw new Error('La vérification après nettoyage a trouvé des métadonnées du seed restantes.')
    }
    if (await client.activity.count() !== activityCount) {
      throw new Error('La vérification après nettoyage a détecté une perte du journal d’activité.')
    }

    console.log(
      `Nettoyage réussi : ${plan.candidates.length} métadonnée(s) historiques supprimée(s).`,
    )
    console.log('Aucun fichier physique et aucune autre métadonnée n’ont été modifiés.')
  } finally {
    await client.$disconnect()
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error
    ? error.message
    : 'Erreur inconnue pendant le nettoyage des métadonnées du seed.'
  console.error(message)
  process.exitCode = 1
})
