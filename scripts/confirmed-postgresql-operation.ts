import fs from 'fs'
import path from 'path'

import { assertApplicationDatabaseName, resolveInsideRoot } from './postgresql-backup-options'

export type ConfirmedPostgreSQLOperationOptions =
  | { mode: 'dry-run' }
  | {
      mode: 'apply'
      confirmedDatabaseName: string
      confirmedStoppedDatabaseName: string
      confirmedBackup: string
      confirmedCount: number
    }

export function parseConfirmedPostgreSQLOperationOptions(
  argumentsList: string[],
  operationLabel: string,
): ConfirmedPostgreSQLOperationOptions {
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
    throw new Error(`La commande ${operationLabel} contient une option inconnue.`)
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
  if (
    !/^\d+$/.test(confirmedCountValue) ||
    !Number.isSafeInteger(confirmedCount) ||
    confirmedCount < 1
  ) {
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

export function verifyRecentBackupConfirmation(input: {
  backupName: string
  databaseName: string
  backupRoot: string
  now?: number
}): string {
  const snapshotDirectory = resolveInsideRoot(
    input.backupRoot,
    path.join(input.backupRoot, input.backupName),
  )
  const snapshotStats = fs.lstatSync(snapshotDirectory)
  if (snapshotStats.isSymbolicLink() || !snapshotStats.isDirectory()) {
    throw new Error('La sauvegarde confirmée doit être un dossier réel dans la racine configurée.')
  }

  const manifestPath = path.join(snapshotDirectory, 'manifest.json')
  if (!fs.existsSync(manifestPath)) {
    throw new Error('La sauvegarde confirmée est absente de la racine configurée.')
  }

  const stats = fs.lstatSync(manifestPath)
  const ageMilliseconds = (input.now ?? Date.now()) - stats.mtimeMs
  if (
    stats.isSymbolicLink() ||
    !stats.isFile() ||
    ageMilliseconds < 0 ||
    ageMilliseconds > 24 * 60 * 60 * 1_000
  ) {
    throw new Error(
      'La sauvegarde confirmée doit être un fichier réel créé et vérifié depuis moins de 24 heures.',
    )
  }

  const manifest: unknown = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  if (
    typeof manifest !== 'object' ||
    manifest === null ||
    !('database' in manifest) ||
    typeof manifest.database !== 'object' ||
    manifest.database === null ||
    !('name' in manifest.database) ||
    manifest.database.name !== input.databaseName
  ) {
    throw new Error('La sauvegarde confirmée ne correspond pas à la base active.')
  }

  return snapshotDirectory
}
