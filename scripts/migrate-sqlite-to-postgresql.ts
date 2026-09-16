import 'dotenv/config'

import { PrismaClient as SQLiteClient } from '@prisma/client'
import {
  Prisma as PostgreSQLPrisma,
  PrismaClient as PostgreSQLClient,
} from '@archivio/postgresql-client'
import {
  getPostgreSQLDatabaseName,
  getPostgreSQLUrl,
} from '../server/database-config'
import {
  assertRefreshTarget,
  parsePostgreSQLCopyMode,
} from './postgresql-copy-options'

const sqlite = new SQLiteClient()

const postgresql = new PostgreSQLClient({
  datasources: {
    db: {
      url: getPostgreSQLUrl(),
    },
  },
})

async function readSourceSnapshot() {
  return sqlite.$transaction(async (transaction) => ({
    departments: await transaction.department.findMany({ orderBy: { id: 'asc' } }),
    users: await transaction.user.findMany({ orderBy: { id: 'asc' } }),
    files: await transaction.file.findMany({ orderBy: { id: 'asc' } }),
    activities: await transaction.activity.findMany({ orderBy: { id: 'asc' } }),
  }))
}

type SourceSnapshot = Awaited<ReturnType<typeof readSourceSnapshot>>
type CountClient = Pick<PostgreSQLClient, 'department' | 'user' | 'file' | 'activity'>

async function readTargetSnapshot() {
  return postgresql.$transaction(async (transaction) => ({
    departments: await transaction.department.findMany({ orderBy: { id: 'asc' } }),
    users: await transaction.user.findMany({ orderBy: { id: 'asc' } }),
    files: await transaction.file.findMany({ orderBy: { id: 'asc' } }),
    activities: await transaction.activity.findMany({ orderBy: { id: 'asc' } }),
  }))
}

function validateUniqueValues(
  values: string[],
  label: string,
  errors: string[],
): void {
  if (new Set(values).size !== values.length) {
    errors.push(`${label} contient des doublons.`)
  }
}

function validateSource(snapshot: SourceSnapshot): void {
  const errors: string[] = []
  const departmentIds = new Set(snapshot.departments.map(({ id }) => id))
  const userIds = new Set(snapshot.users.map(({ id }) => id))
  const fileIds = new Set(snapshot.files.map(({ id }) => id))

  validateUniqueValues(snapshot.users.map(({ username }) => username), 'users.username', errors)
  validateUniqueValues(snapshot.users.map(({ email }) => email), 'users.email', errors)
  validateUniqueValues(snapshot.departments.map(({ name }) => name), 'departments.name', errors)

  for (const department of snapshot.departments) {
    if (
      department.accessLevel !== null &&
      (!Number.isInteger(department.accessLevel) ||
        department.accessLevel < 1 ||
        department.accessLevel > 4)
    ) {
      errors.push(`departments.accessLevel est invalide pour l'identifiant ${department.id}.`)
    }
  }

  for (const user of snapshot.users) {
    if (user.departmentId !== null && !departmentIds.has(user.departmentId)) {
      errors.push(`users.departmentId est orphelin pour l'identifiant ${user.id}.`)
    }
  }

  for (const file of snapshot.files) {
    if (file.departmentId !== null && !departmentIds.has(file.departmentId)) {
      errors.push(`files.departmentId est orphelin pour l'identifiant ${file.id}.`)
    }

    if (file.uploadedBy !== null && !userIds.has(file.uploadedBy)) {
      errors.push(`files.uploadedBy est orphelin pour l'identifiant ${file.id}.`)
    }

    if (file.reviewedBy !== null && !userIds.has(file.reviewedBy)) {
      errors.push(`files.reviewedBy est orphelin pour l'identifiant ${file.id}.`)
    }

    if (
      file.classificationLevel !== null &&
      (!Number.isInteger(file.classificationLevel) ||
        file.classificationLevel < 1 ||
        file.classificationLevel > 4)
    ) {
      errors.push(`files.classificationLevel est invalide pour l'identifiant ${file.id}.`)
    }

    if (!['pending', 'archived', 'rejected'].includes(file.status)) {
      errors.push(`files.status est invalide pour l'identifiant ${file.id}.`)
    }
  }

  for (const activity of snapshot.activities) {
    if (activity.userId !== null && !userIds.has(activity.userId)) {
      errors.push(`Activity.userId est orphelin pour l'identifiant ${activity.id}.`)
    }

    if (activity.fileId !== null && !fileIds.has(activity.fileId)) {
      errors.push(`Activity.fileId est orphelin pour l'identifiant ${activity.id}.`)
    }
  }

  if (errors.length > 0) {
    throw new Error(`La source SQLite ne respecte pas les invariants de copie :\n- ${errors.join('\n- ')}`)
  }
}

function getSnapshotCounts(snapshot: SourceSnapshot) {
  return {
    departments: snapshot.departments.length,
    users: snapshot.users.length,
    files: snapshot.files.length,
    activities: snapshot.activities.length,
  }
}

async function getTargetCounts(client: CountClient = postgresql) {
  const [departments, users, files, activities] = await Promise.all([
    client.department.count(),
    client.user.count(),
    client.file.count(),
    client.activity.count(),
  ])

  return { departments, users, files, activities }
}

function hasRows(counts: Awaited<ReturnType<typeof getTargetCounts>>): boolean {
  return Object.values(counts).some((count) => count !== 0)
}

async function resetSequences(transaction: PostgreSQLPrisma.TransactionClient): Promise<void> {
  const statements = [
    `SELECT setval(pg_get_serial_sequence('departments', 'id'), COALESCE((SELECT MAX("id") FROM "departments"), 1), EXISTS (SELECT 1 FROM "departments"))`,
    `SELECT setval(pg_get_serial_sequence('users', 'id'), COALESCE((SELECT MAX("id") FROM "users"), 1), EXISTS (SELECT 1 FROM "users"))`,
    `SELECT setval(pg_get_serial_sequence('files', 'id'), COALESCE((SELECT MAX("id") FROM "files"), 1), EXISTS (SELECT 1 FROM "files"))`,
    `SELECT setval(pg_get_serial_sequence('"Activity"', 'id'), COALESCE((SELECT MAX("id") FROM "Activity"), 1), EXISTS (SELECT 1 FROM "Activity"))`,
  ]

  for (const statement of statements) {
    await transaction.$queryRawUnsafe(statement)
  }
}

async function verifyTarget(snapshot: SourceSnapshot): Promise<void> {
  const target = await readTargetSnapshot()
  const tables: Array<keyof SourceSnapshot> = [
    'departments',
    'users',
    'files',
    'activities',
  ]

  for (const table of tables) {
    if (JSON.stringify(target[table]) !== JSON.stringify(snapshot[table])) {
      throw new Error(`La table PostgreSQL ${table} ne correspond pas exactement à SQLite.`)
    }
  }

  const sequenceRows = await postgresql.$queryRawUnsafe<
    Array<{ sequencename: string; last_value: bigint | null }>
  >(
    `SELECT sequencename, last_value
     FROM pg_sequences
     WHERE schemaname = 'public'
       AND sequencename IN ('departments_id_seq', 'users_id_seq', 'files_id_seq', 'Activity_id_seq')`,
  )
  const expectedSequences = new Map<string, number>([
    [
      'departments_id_seq',
      snapshot.departments.length > 0
        ? Math.max(...snapshot.departments.map(({ id }) => id))
        : 1,
    ],
    [
      'users_id_seq',
      snapshot.users.length > 0 ? Math.max(...snapshot.users.map(({ id }) => id)) : 1,
    ],
    [
      'files_id_seq',
      snapshot.files.length > 0 ? Math.max(...snapshot.files.map(({ id }) => id)) : 1,
    ],
    [
      'Activity_id_seq',
      snapshot.activities.length > 0
        ? Math.max(...snapshot.activities.map(({ id }) => id))
        : 1,
    ],
  ])

  if (sequenceRows.length !== expectedSequences.size) {
    throw new Error('Les quatre séquences PostgreSQL attendues ne sont pas disponibles.')
  }

  for (const sequence of sequenceRows) {
    const expectedValue = expectedSequences.get(sequence.sequencename)
    if (
      expectedValue === undefined ||
      sequence.last_value === null ||
      Number(sequence.last_value) !== expectedValue
    ) {
      throw new Error(`La séquence PostgreSQL ${sequence.sequencename} n'est pas alignée.`)
    }
  }
}

async function copySnapshot(snapshot: SourceSnapshot): Promise<void> {
  await postgresql.$transaction(
    async (transaction) => {
      const targetCounts = await getTargetCounts(transaction)

      if (hasRows(targetCounts)) {
        throw new Error('La cible PostgreSQL n’est pas vide ; aucune ligne n’a été copiée.')
      }

      await writeSnapshot(transaction, snapshot)
    },
    {
      maxWait: 10_000,
      timeout: 60_000,
    },
  )
}

async function writeSnapshot(
  transaction: PostgreSQLPrisma.TransactionClient,
  snapshot: SourceSnapshot,
): Promise<void> {
  await transaction.department.createMany({ data: snapshot.departments })
  await transaction.user.createMany({ data: snapshot.users })
  await transaction.file.createMany({ data: snapshot.files })
  await transaction.activity.createMany({ data: snapshot.activities })
  await resetSequences(transaction)
}

async function refreshSnapshot(snapshot: SourceSnapshot): Promise<void> {
  await postgresql.$transaction(
    async (transaction) => {
      await transaction.activity.deleteMany()
      await transaction.file.deleteMany()
      await transaction.user.deleteMany()
      await transaction.department.deleteMany()
      await writeSnapshot(transaction, snapshot)
    },
    {
      maxWait: 10_000,
      timeout: 60_000,
    },
  )
}

async function main(): Promise<void> {
  const mode = parsePostgreSQLCopyMode(process.argv.slice(2))

  const snapshot = await readSourceSnapshot()
  validateSource(snapshot)

  const sourceCounts = getSnapshotCounts(snapshot)
  const initialTargetCounts = await getTargetCounts()

  console.log('Source SQLite valide :', sourceCounts)
  console.log('Cible PostgreSQL avant copie :', initialTargetCounts)

  if (mode.kind === 'verify') {
    await verifyTarget(snapshot)
    console.log('PostgreSQL correspond exactement à SQLite et ses séquences sont alignées.')
    return
  }

  if (mode.kind === 'refresh') {
    const databaseName = getPostgreSQLDatabaseName()
    assertRefreshTarget(databaseName, mode.confirmedDatabaseName)
    await refreshSnapshot(snapshot)
    await verifyTarget(snapshot)
    console.log(
      `Rafraîchissement transactionnel terminé pour « ${databaseName} » : contenu exact et séquences vérifiés.`,
      sourceCounts,
    )
    return
  }

  if (hasRows(initialTargetCounts)) {
    throw new Error('La cible PostgreSQL n’est pas vide ; la copie est refusée.')
  }

  if (mode.kind === 'audit') {
    console.log('Audit terminé sans écriture. Utiliser --apply pour lancer la copie transactionnelle.')
    return
  }

  await copySnapshot(snapshot)
  await verifyTarget(snapshot)
  console.log('Copie PostgreSQL terminée : contenu exact et séquences vérifiés.', sourceCounts)
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Erreur inconnue pendant la copie.'
    console.error(message)
    process.exitCode = 1
  })
  .finally(async () => {
    await Promise.allSettled([sqlite.$disconnect(), postgresql.$disconnect()])
  })
