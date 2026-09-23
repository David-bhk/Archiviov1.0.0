import 'dotenv/config'

import path from 'path'
import { PrismaClient as PostgreSQLClient } from '@archivio/postgresql-client'

import { getPostgreSQLDatabaseName, getPostgreSQLUrl } from '../server/database-config'
import {
  parseConfirmedPostgreSQLOperationOptions,
  verifyRecentBackupConfirmation,
} from './confirmed-postgresql-operation'
import { buildDepartmentAccessLevelPlan } from './department-access-level-initialization'

const departmentSelection = {
  id: true,
  name: true,
  accessLevel: true,
} as const

function getBackupRoot(): string {
  return path.resolve(process.cwd(), process.env.ARCHIVIO_BACKUP_DIR?.trim() || '.archivio-backups')
}

async function readDepartments(client: PostgreSQLClient, readOnly: boolean) {
  if (!readOnly) {
    return client.department.findMany({ select: departmentSelection, orderBy: { id: 'asc' } })
  }

  return client.$transaction(
    async (transaction) => {
      await transaction.$executeRawUnsafe('SET TRANSACTION READ ONLY')
      return transaction.department.findMany({ select: departmentSelection, orderBy: { id: 'asc' } })
    },
    { timeout: 30_000 },
  )
}

async function applyPlan(client: PostgreSQLClient, expectedCandidateIds: number[]): Promise<void> {
  await client.$transaction(
    async (transaction) => {
      await transaction.$executeRawUnsafe('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE')
      const currentDepartments = await transaction.department.findMany({
        select: departmentSelection,
        orderBy: { id: 'asc' },
      })
      const currentPlan = buildDepartmentAccessLevelPlan(currentDepartments)
      const currentCandidateIds = currentPlan.candidates.map((candidate) => candidate.id)
      if (
        currentCandidateIds.length !== expectedCandidateIds.length ||
        currentCandidateIds.some((id, index) => id !== expectedCandidateIds[index])
      ) {
        throw new Error('Les départements ont changé depuis la simulation ; opération annulée.')
      }

      for (const assignment of currentPlan.candidates) {
        const result = await transaction.department.updateMany({
          where: { id: assignment.id, name: assignment.name, accessLevel: null },
          data: { accessLevel: assignment.accessLevel },
        })
        if (result.count !== 1) {
          throw new Error('Une attribution de niveau a changé pendant la transaction.')
        }
      }

      await transaction.activity.create({
        data: {
          type: 'department_access_levels_initialized',
          description: 'Niveaux initiaux attribués aux six départements selon la grille approuvée.',
        },
      })
    },
    { timeout: 30_000 },
  )
}

async function main(): Promise<void> {
  if (process.env.ARCHIVIO_DB_PROVIDER?.trim() !== 'postgresql') {
    throw new Error('ARCHIVIO_DB_PROVIDER doit valoir postgresql pour initialiser les niveaux.')
  }

  const options = parseConfirmedPostgreSQLOperationOptions(
    process.argv.slice(2),
    'd’initialisation des niveaux',
  )
  const databaseName = getPostgreSQLDatabaseName()
  const client = new PostgreSQLClient({ datasources: { db: { url: getPostgreSQLUrl() } } })

  try {
    const departments = await readDepartments(client, options.mode === 'dry-run')
    const plan = buildDepartmentAccessLevelPlan(departments)

    console.log('Plan d’initialisation des niveaux départementaux :')
    for (const assignment of plan.assignments) {
      console.log(`- ${assignment.name} : niveau ${assignment.accessLevel}`)
    }
    console.log(`- départements à mettre à jour : ${plan.candidates.length}`)
    console.log(`- départements déjà conformes : ${plan.alreadyInitialized}`)

    if (options.mode === 'dry-run') {
      console.log('Simulation terminée : aucune donnée n’a été modifiée.')
      return
    }
    if (
      options.confirmedDatabaseName !== databaseName ||
      options.confirmedStoppedDatabaseName !== databaseName
    ) {
      throw new Error('Les confirmations de base et d’arrêt ne correspondent pas à la base active.')
    }
    if (options.confirmedCount !== plan.candidates.length) {
      throw new Error('Le nombre de départements à mettre à jour a changé ; opération annulée.')
    }
    if (plan.candidates.length === 0) {
      throw new Error('Tous les niveaux sont déjà initialisés ; aucune écriture nécessaire.')
    }

    verifyRecentBackupConfirmation({
      backupName: options.confirmedBackup,
      databaseName,
      backupRoot: getBackupRoot(),
    })
    await applyPlan(client, plan.candidates.map((candidate) => candidate.id))

    const verifiedPlan = buildDepartmentAccessLevelPlan(await readDepartments(client, true))
    if (verifiedPlan.candidates.length !== 0 || verifiedPlan.alreadyInitialized !== 6) {
      throw new Error('La vérification après initialisation a détecté un niveau incomplet.')
    }
    console.log('Initialisation réussie : les six départements possèdent leur niveau approuvé.')
    console.log('Aucun niveau documentaire et aucune autre donnée métier n’ont été modifiés.')
  } finally {
    await client.$disconnect()
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error
    ? error.message
    : 'Erreur inconnue pendant l’initialisation des niveaux.'
  console.error(message)
  process.exitCode = 1
})
