import 'dotenv/config'

import { createHash, randomUUID } from 'crypto'
import { spawn } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { PrismaClient as PostgreSQLClient } from '@archivio/postgresql-client'
import { z } from 'zod'

import { getPostgreSQLDatabaseName, getPostgreSQLUrl } from '../server/database-config'
import {
  BACKUP_FORMAT_VERSION,
  assertApplicationDatabaseName,
  parsePostgreSQLBackupOptions,
  resolveInsideRoot,
} from './postgresql-backup-options'

const TABLE_NAMES = ['departments', 'users', 'files', 'activities'] as const
const SEQUENCE_NAMES = [
  'departments_id_seq',
  'users_id_seq',
  'files_id_seq',
  'Activity_id_seq',
] as const
const disposableDatabasePattern = /^archivio_restore_\d{13}_[a-f0-9]{8}$/

const storedFileSchema = z.object({
  path: z.string().min(1),
  bytes: z.number().int().nonnegative(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
})

const manifestSchema = z.object({
  formatVersion: z.literal(BACKUP_FORMAT_VERSION),
  createdAt: z.string().datetime(),
  database: z.object({
    engine: z.literal('postgresql'),
    name: z.string().min(1),
    dump: storedFileSchema,
    rowCounts: z.record(z.string(), z.number().int().nonnegative()),
    sequences: z.record(z.string(), z.object({
      lastValue: z.string().regex(/^\d+$/),
      isCalled: z.boolean(),
    })),
  }),
  uploads: z.object({
    directory: z.literal('files'),
    fileCount: z.number().int().nonnegative(),
    totalBytes: z.number().int().nonnegative(),
    files: z.array(storedFileSchema),
    missingDocumentFiles: z.number().int().nonnegative(),
    unsafeDocumentPaths: z.number().int().nonnegative(),
  }),
})

type BackupManifest = z.infer<typeof manifestSchema>
type StoredFile = z.infer<typeof storedFileSchema>
type SequenceState = { lastValue: string; isCalled: boolean }

function getBackupRoot(): string {
  return path.resolve(process.cwd(), process.env.ARCHIVIO_BACKUP_DIR?.trim() || '.archivio-backups')
}

function getUploadsRoot(): string {
  return path.resolve(process.cwd(), process.env.UPLOADS_DIR?.trim() || 'uploads')
}

function assertSeparateRoots(backupRoot: string, uploadsRoot: string): void {
  const backupFromUploads = path.relative(uploadsRoot, backupRoot)
  const uploadsFromBackup = path.relative(backupRoot, uploadsRoot)
  const overlaps =
    backupFromUploads === '' ||
    uploadsFromBackup === '' ||
    (!backupFromUploads.startsWith('..') && !path.isAbsolute(backupFromUploads)) ||
    (!uploadsFromBackup.startsWith('..') && !path.isAbsolute(uploadsFromBackup))

  if (overlaps) {
    throw new Error('La racine de sauvegarde doit être séparée du dossier documentaire.')
  }
}

function normalizeRelativePath(value: string): string {
  return value.split(path.sep).join('/')
}

function resolveFileInsideRoot(root: string, relativePath: string): string {
  if (!relativePath || path.isAbsolute(relativePath)) {
    throw new Error('La sauvegarde contient un chemin de fichier invalide.')
  }

  const normalizedSegments = relativePath.split('/').filter(Boolean)
  const candidate = path.resolve(root, ...normalizedSegments)
  const relative = path.relative(path.resolve(root), candidate)
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('La sauvegarde contient un chemin sortant de sa racine.')
  }

  return candidate
}

async function hashFile(filePath: string): Promise<string> {
  const hash = createHash('sha256')
  const stream = fs.createReadStream(filePath)

  for await (const chunk of stream) {
    hash.update(chunk)
  }

  return hash.digest('hex')
}

async function inventoryDirectory(root: string): Promise<StoredFile[]> {
  if (!fs.existsSync(root)) return []

  const files: StoredFile[] = []

  async function visit(directory: string): Promise<void> {
    const entries = await fs.promises.readdir(directory, { withFileTypes: true })
    entries.sort((left, right) => left.name.localeCompare(right.name))

    for (const entry of entries) {
      const absolutePath = path.join(directory, entry.name)
      if (entry.isSymbolicLink()) {
        throw new Error('Les liens symboliques ne sont pas autorisés dans le stockage documentaire.')
      }
      if (entry.isDirectory()) {
        await visit(absolutePath)
        continue
      }
      if (!entry.isFile()) {
        throw new Error('Le stockage documentaire contient un élément non pris en charge.')
      }

      const stats = await fs.promises.stat(absolutePath)
      files.push({
        path: normalizeRelativePath(path.relative(root, absolutePath)),
        bytes: stats.size,
        sha256: await hashFile(absolutePath),
      })
    }
  }

  await visit(root)
  return files
}

async function copyInventory(sourceRoot: string, targetRoot: string, inventory: StoredFile[]): Promise<void> {
  await fs.promises.mkdir(targetRoot, { recursive: true })

  for (const file of inventory) {
    const source = resolveFileInsideRoot(sourceRoot, file.path)
    const target = resolveFileInsideRoot(targetRoot, file.path)
    await fs.promises.mkdir(path.dirname(target), { recursive: true })
    await fs.promises.copyFile(source, target, fs.constants.COPYFILE_EXCL)
  }
}

function dockerComposeArguments(command: string, commandArguments: string[]): string[] {
  return [
    'compose',
    '--env-file',
    '.env',
    '-p',
    'archivio',
    '-f',
    'compose.database.yaml',
    'exec',
    '-T',
    'postgres',
    command,
    ...commandArguments,
  ]
}

async function runDockerDatabaseCommand(
  command: string,
  commandArguments: string[],
  inputFile?: string,
  outputFile?: string,
): Promise<void> {
  const inputDescriptor = inputFile ? fs.openSync(inputFile, 'r') : 'ignore'
  const outputDescriptor = outputFile ? fs.openSync(outputFile, 'wx') : 'ignore'
  const dockerExecutable = process.platform === 'win32' ? 'docker.exe' : 'docker'

  try {
    await new Promise<void>((resolve, reject) => {
      const child = spawn(
        dockerExecutable,
        dockerComposeArguments(command, commandArguments),
        {
          cwd: process.cwd(),
          stdio: [inputDescriptor, outputDescriptor, 'pipe'],
          windowsHide: true,
        },
      )
      let diagnostic = ''

      const errorStream = child.stderr
      if (!errorStream) {
        reject(new Error(`Impossible de lire les erreurs de ${command}.`))
        return
      }
      errorStream.setEncoding('utf8')
      errorStream.on('data', (chunk: string) => {
        if (diagnostic.length < 2_000) diagnostic += chunk
      })
      child.once('error', () => reject(new Error(`Impossible de lancer ${command} dans PostgreSQL Docker.`)))
      child.once('exit', (code) => {
        if (code === 0) {
          resolve()
          return
        }
        const suffix = diagnostic.trim() ? ` ${diagnostic.trim()}` : ''
        reject(new Error(`${command} a échoué (code ${code ?? 'inconnu'}).${suffix}`))
      })
    })
  } finally {
    if (typeof inputDescriptor === 'number') fs.closeSync(inputDescriptor)
    if (typeof outputDescriptor === 'number') fs.closeSync(outputDescriptor)
  }
}

async function getDatabaseState(client: PostgreSQLClient): Promise<{
  rowCounts: Record<string, number>
  sequences: Record<string, SequenceState>
}> {
  const [departments, users, files, activities] = await Promise.all([
    client.department.count(),
    client.user.count(),
    client.file.count(),
    client.activity.count(),
  ])
  const rowCounts: Record<string, number> = { departments, users, files, activities }
  const sequences: Record<string, SequenceState> = {}

  for (const sequenceName of SEQUENCE_NAMES) {
    const rows = await client.$queryRawUnsafe<Array<{ last_value: bigint; is_called: boolean }>>(
      `SELECT last_value, is_called FROM "${sequenceName}"`,
    )
    const state = rows[0]
    if (!state) throw new Error(`La séquence ${sequenceName} est absente.`)
    sequences[sequenceName] = {
      lastValue: state.last_value.toString(),
      isCalled: state.is_called,
    }
  }

  return { rowCounts, sequences }
}

function documentStoragePath(uploadsRoot: string, storedPath: string): string | null {
  const candidate = path.isAbsolute(storedPath)
    ? path.resolve(storedPath)
    : path.resolve(uploadsRoot, storedPath)
  const relative = path.relative(uploadsRoot, candidate)
  if (relative.startsWith('..') || path.isAbsolute(relative)) return null
  return candidate
}

async function getDocumentStorageWarnings(
  client: PostgreSQLClient,
  uploadsRoot: string,
): Promise<{ missingDocumentFiles: number; unsafeDocumentPaths: number }> {
  const documents = await client.file.findMany({ select: { filePath: true } })
  let missingDocumentFiles = 0
  let unsafeDocumentPaths = 0

  for (const document of documents) {
    const resolvedPath = documentStoragePath(uploadsRoot, document.filePath)
    if (!resolvedPath) {
      unsafeDocumentPaths += 1
    } else if (!fs.existsSync(resolvedPath)) {
      missingDocumentFiles += 1
    }
  }

  return { missingDocumentFiles, unsafeDocumentPaths }
}

function createSnapshotName(databaseName: string, now: Date): string {
  const timestamp = now.toISOString().replace(/[-:.]/g, '')
  return `${databaseName}-${timestamp}`
}

function assertDisposableDatabaseName(databaseName: string): void {
  if (!disposableDatabasePattern.test(databaseName)) {
    throw new Error('Le nom de la base de restauration temporaire est invalide.')
  }
}

function createDisposableDatabaseName(): string {
  return `archivio_restore_${Date.now()}_${randomUUID().replaceAll('-', '').slice(0, 8)}`
}

function getDatabaseUrl(databaseName: string): string {
  return getPostgreSQLUrl({ ...process.env, ARCHIVIO_DB_NAME: databaseName })
}

async function createBackup(confirmedDatabaseName: string): Promise<void> {
  if (process.env.ARCHIVIO_DB_PROVIDER?.trim() !== 'postgresql') {
    throw new Error('ARCHIVIO_DB_PROVIDER doit valoir postgresql pour créer cette sauvegarde.')
  }

  const databaseName = getPostgreSQLDatabaseName()
  assertApplicationDatabaseName(databaseName)
  if (confirmedDatabaseName !== databaseName) {
    throw new Error('La confirmation ne correspond pas exactement à ARCHIVIO_DB_NAME.')
  }

  const backupRoot = getBackupRoot()
  const uploadsRoot = getUploadsRoot()
  assertSeparateRoots(backupRoot, uploadsRoot)
  await fs.promises.mkdir(backupRoot, { recursive: true })

  const snapshotDirectory = resolveInsideRoot(
    backupRoot,
    path.join(backupRoot, createSnapshotName(databaseName, new Date())),
  )
  const restoredFilesDirectory = path.join(snapshotDirectory, 'files')
  const dumpPath = path.join(snapshotDirectory, 'database.dump')
  const manifestPath = path.join(snapshotDirectory, 'manifest.json')
  await fs.promises.mkdir(snapshotDirectory)

  const client = new PostgreSQLClient({ datasources: { db: { url: getPostgreSQLUrl() } } })
  let completed = false

  try {
    const inventory = await inventoryDirectory(uploadsRoot)
    await copyInventory(uploadsRoot, restoredFilesDirectory, inventory)
    await runDockerDatabaseCommand('pg_dump', [
      '--format=custom',
      '--no-owner',
      '--no-acl',
      '--dbname',
      databaseName,
      '--username',
      process.env.ARCHIVIO_DB_USER?.trim() || 'archivio',
    ], undefined, dumpPath)

    const [databaseState, storageWarnings, dumpStats, dumpHash] = await Promise.all([
      getDatabaseState(client),
      getDocumentStorageWarnings(client, uploadsRoot),
      fs.promises.stat(dumpPath),
      hashFile(dumpPath),
    ])
    const totalBytes = inventory.reduce((sum, file) => sum + file.bytes, 0)
    const manifest: BackupManifest = {
      formatVersion: BACKUP_FORMAT_VERSION,
      createdAt: new Date().toISOString(),
      database: {
        engine: 'postgresql',
        name: databaseName,
        dump: { path: 'database.dump', bytes: dumpStats.size, sha256: dumpHash },
        rowCounts: databaseState.rowCounts,
        sequences: databaseState.sequences,
      },
      uploads: {
        directory: 'files',
        fileCount: inventory.length,
        totalBytes,
        files: inventory,
        ...storageWarnings,
      },
    }
    await fs.promises.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, {
      encoding: 'utf8',
      flag: 'wx',
    })
    completed = true

    console.log(`Sauvegarde créée : ${path.relative(process.cwd(), snapshotDirectory)}`)
    console.log(
      `Contenu : ${TABLE_NAMES.map((name) => `${name}=${manifest.database.rowCounts[name]}`).join(', ')}, fichiers=${manifest.uploads.fileCount}.`,
    )
    if (storageWarnings.missingDocumentFiles || storageWarnings.unsafeDocumentPaths) {
      console.warn(
        `Attention : ${storageWarnings.missingDocumentFiles} fichier(s) référencé(s) sont absents et ${storageWarnings.unsafeDocumentPaths} chemin(s) sont hors stockage.`,
      )
    }
    console.warn('Cette sauvegarde locale contient des données sensibles et n’est pas chiffrée.')
  } finally {
    await client.$disconnect().catch(() => undefined)
    if (!completed) {
      const safeSnapshot = resolveInsideRoot(backupRoot, snapshotDirectory)
      await fs.promises.rm(safeSnapshot, { recursive: true, force: true })
    }
  }
}

async function readManifest(snapshotDirectory: string): Promise<BackupManifest> {
  const manifestPath = path.join(snapshotDirectory, 'manifest.json')
  const parsed: unknown = JSON.parse(await fs.promises.readFile(manifestPath, 'utf8'))
  return manifestSchema.parse(parsed)
}

function assertSameInventory(expected: StoredFile[], actual: StoredFile[]): void {
  if (JSON.stringify(expected) !== JSON.stringify(actual)) {
    throw new Error('Les fichiers restaurés ne correspondent pas exactement au manifeste.')
  }
}

function assertSameDatabaseState(
  expected: BackupManifest['database'],
  actual: Awaited<ReturnType<typeof getDatabaseState>>,
): void {
  if (
    JSON.stringify(expected.rowCounts) !== JSON.stringify(actual.rowCounts) ||
    JSON.stringify(expected.sequences) !== JSON.stringify(actual.sequences)
  ) {
    throw new Error('La base restaurée ne correspond pas aux comptes et séquences du manifeste.')
  }
}

async function verifyBackup(snapshotArgument: string): Promise<void> {
  const backupRoot = getBackupRoot()
  const snapshotDirectory = resolveInsideRoot(backupRoot, snapshotArgument)
  const manifest = await readManifest(snapshotDirectory)
  assertApplicationDatabaseName(manifest.database.name)

  const dumpPath = resolveFileInsideRoot(snapshotDirectory, manifest.database.dump.path)
  const dumpStats = await fs.promises.stat(dumpPath)
  if (
    dumpStats.size !== manifest.database.dump.bytes ||
    await hashFile(dumpPath) !== manifest.database.dump.sha256
  ) {
    throw new Error('L’empreinte ou la taille du dump PostgreSQL ne correspond pas au manifeste.')
  }

  const backupFilesRoot = resolveFileInsideRoot(snapshotDirectory, manifest.uploads.directory)
  const backupInventory = await inventoryDirectory(backupFilesRoot)
  assertSameInventory(manifest.uploads.files, backupInventory)

  const temporaryUploads = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'archivio-restore-'))
  const databaseName = createDisposableDatabaseName()
  assertDisposableDatabaseName(databaseName)
  const admin = new PostgreSQLClient({ datasources: { db: { url: getDatabaseUrl('postgres') } } })
  let target: PostgreSQLClient | undefined
  let databaseCreated = false

  try {
    await copyInventory(backupFilesRoot, temporaryUploads, manifest.uploads.files)
    assertSameInventory(manifest.uploads.files, await inventoryDirectory(temporaryUploads))

    await admin.$executeRawUnsafe(`CREATE DATABASE "${databaseName}"`)
    databaseCreated = true
    await runDockerDatabaseCommand('pg_restore', [
      '--exit-on-error',
      '--no-owner',
      '--no-acl',
      '--dbname',
      databaseName,
      '--username',
      process.env.ARCHIVIO_DB_USER?.trim() || 'archivio',
    ], dumpPath)

    target = new PostgreSQLClient({ datasources: { db: { url: getDatabaseUrl(databaseName) } } })
    assertSameDatabaseState(manifest.database, await getDatabaseState(target))
    console.log(
      `Restauration vérifiée dans une base et un dossier jetables : ${manifest.uploads.fileCount} fichier(s), ${manifest.database.rowCounts.files} document(s).`,
    )
  } finally {
    await target?.$disconnect().catch(() => undefined)
    let cleanupFailed = false

    try {
      if (databaseCreated) {
        assertDisposableDatabaseName(databaseName)
        await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`)
      }
    } catch {
      cleanupFailed = true
    }
    await admin.$disconnect().catch(() => {
      cleanupFailed = true
    })
    try {
      const temporaryRoot = path.resolve(os.tmpdir())
      const resolvedUploads = path.resolve(temporaryUploads)
      const relative = path.relative(temporaryRoot, resolvedUploads)
      if (
        !path.basename(resolvedUploads).startsWith('archivio-restore-') ||
        relative.startsWith('..') ||
        path.isAbsolute(relative)
      ) {
        throw new Error('Le dossier de restauration temporaire est hors périmètre.')
      }
      await fs.promises.rm(resolvedUploads, { recursive: true, force: true })
    } catch {
      cleanupFailed = true
    }

    if (cleanupFailed) {
      throw new Error('Le nettoyage des ressources de restauration temporaires est incomplet.')
    }
  }
}

async function main(): Promise<void> {
  const options = parsePostgreSQLBackupOptions(process.argv.slice(2))
  if (options.mode === 'create') {
    await createBackup(options.confirmedDatabaseName)
  } else {
    await verifyBackup(options.snapshotDirectory)
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Erreur inconnue de sauvegarde PostgreSQL.'
  console.error(message)
  process.exitCode = 1
})
