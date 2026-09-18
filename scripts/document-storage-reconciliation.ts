import path from 'path'

import { assertApplicationDatabaseName } from './postgresql-backup-options'

export type DocumentStorageReconciliationOptions =
  | { mode: 'dry-run' }
  | {
      mode: 'apply'
      confirmedDatabaseName: string
      confirmedStoppedDatabaseName: string
      confirmedBackup: string
      confirmedCount: number
    }

export function parseDocumentStorageReconciliationOptions(
  argumentsList: string[],
): DocumentStorageReconciliationOptions {
  if (argumentsList.length === 0) return { mode: 'dry-run' }

  const applyRequested = argumentsList.includes('--apply')
  const database = argumentsList.find((argument) => argument.startsWith('--confirm-database='))
  const stopped = argumentsList.find((argument) => argument.startsWith('--confirm-stopped='))
  const backup = argumentsList.find((argument) => argument.startsWith('--confirm-backup='))
  const count = argumentsList.find((argument) => argument.startsWith('--confirm-count='))
  const knownArguments = argumentsList.filter((argument) =>
    argument === '--apply' ||
    argument.startsWith('--confirm-database=') ||
    argument.startsWith('--confirm-stopped=') ||
    argument.startsWith('--confirm-backup=') ||
    argument.startsWith('--confirm-count='),
  )

  if (knownArguments.length !== argumentsList.length) {
    throw new Error('La commande de réconciliation contient une option inconnue.')
  }
  if (!applyRequested || !database || !stopped || !backup || !count) {
    throw new Error(
      'L’application exige --apply et les confirmations database, stopped, backup et count.',
    )
  }

  const confirmedDatabaseName = database.slice('--confirm-database='.length)
  const confirmedStoppedDatabaseName = stopped.slice('--confirm-stopped='.length)
  const confirmedBackup = backup.slice('--confirm-backup='.length).trim()
  const confirmedCountValue = count.slice('--confirm-count='.length)
  const confirmedCount = Number(confirmedCountValue)

  assertApplicationDatabaseName(confirmedDatabaseName)
  assertApplicationDatabaseName(confirmedStoppedDatabaseName)
  if (!confirmedBackup || path.basename(confirmedBackup) !== confirmedBackup) {
    throw new Error('La confirmation de sauvegarde doit être le nom simple du dossier vérifié.')
  }
  if (!/^\d+$/.test(confirmedCountValue) || !Number.isSafeInteger(confirmedCount) || confirmedCount < 1) {
    throw new Error('Le nombre confirmé doit être un entier strictement positif.')
  }

  return {
    mode: 'apply',
    confirmedDatabaseName,
    confirmedStoppedDatabaseName,
    confirmedBackup,
    confirmedCount,
  }
}

export function managedFilename(identifier: string, sourceFilename: string): string {
  const extension = path.extname(sourceFilename).toLowerCase()
  const safeExtension = /^\.[a-z0-9]{1,10}$/.test(extension) ? extension : ''
  return `${identifier}${safeExtension}`
}

export function isForbiddenExternalSource(sourcePath: string): boolean {
  return path.resolve(sourcePath)
    .split(/[\\/]/)
    .some((segment) => segment.toLowerCase().startsWith('business-management'))
}
