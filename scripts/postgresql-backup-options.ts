import path from 'path'

export const BACKUP_FORMAT_VERSION = 1

const databaseNamePattern = /^[a-zA-Z][a-zA-Z0-9_]{0,62}$/
const systemDatabaseNames = new Set(['postgres', 'template0', 'template1'])

export type PostgreSQLBackupOptions =
  | { mode: 'create'; confirmedDatabaseName: string }
  | { mode: 'verify'; snapshotDirectory: string }

export function assertApplicationDatabaseName(databaseName: string): void {
  if (!databaseNamePattern.test(databaseName) || systemDatabaseNames.has(databaseName)) {
    throw new Error('Le nom de la base Archivio n’est pas autorisé pour cette opération.')
  }
}

export function parsePostgreSQLBackupOptions(argumentsList: string[]): PostgreSQLBackupOptions {
  const createRequested = argumentsList.includes('--create')
  const verifyRequested = argumentsList.includes('--verify')
  const confirmation = argumentsList.find((argument) => argument.startsWith('--confirm-stopped='))
  const snapshot = argumentsList.find((argument) => argument.startsWith('--snapshot='))
  const knownArguments = argumentsList.filter((argument) =>
    argument === '--create' ||
    argument === '--verify' ||
    argument.startsWith('--confirm-stopped=') ||
    argument.startsWith('--snapshot='),
  )

  if (knownArguments.length !== argumentsList.length) {
    throw new Error('La commande de sauvegarde contient une option inconnue.')
  }

  if (createRequested === verifyRequested) {
    throw new Error('Choisir exactement une opération : --create ou --verify.')
  }

  if (createRequested) {
    if (!confirmation || snapshot) {
      throw new Error('La création exige uniquement --confirm-stopped=<nom-base>.')
    }

    const confirmedDatabaseName = confirmation.slice('--confirm-stopped='.length)
    assertApplicationDatabaseName(confirmedDatabaseName)
    return { mode: 'create', confirmedDatabaseName }
  }

  if (!snapshot || confirmation) {
    throw new Error('La vérification exige uniquement --snapshot=<dossier-sauvegarde>.')
  }

  const snapshotDirectory = snapshot.slice('--snapshot='.length).trim()
  if (!snapshotDirectory) {
    throw new Error('Le dossier de sauvegarde à vérifier est vide.')
  }

  return { mode: 'verify', snapshotDirectory }
}

export function resolveInsideRoot(root: string, candidate: string): string {
  const resolvedRoot = path.resolve(root)
  const resolvedCandidate = path.resolve(candidate)
  const relative = path.relative(resolvedRoot, resolvedCandidate)

  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Le chemin de sauvegarde doit désigner un sous-dossier de la racine configurée.')
  }

  return resolvedCandidate
}

