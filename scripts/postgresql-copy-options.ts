export type PostgreSQLCopyMode =
  | { kind: 'audit' }
  | { kind: 'apply' }
  | { kind: 'verify' }
  | { kind: 'refresh'; confirmedDatabaseName: string }

const SYSTEM_DATABASE_NAMES = new Set(['postgres', 'template0', 'template1'])

export function parsePostgreSQLCopyMode(argumentsList: string[]): PostgreSQLCopyMode {
  if (argumentsList.length === 0) return { kind: 'audit' }
  if (argumentsList.length > 1) {
    throw new Error('Utiliser une seule option parmi --apply, --verify ou --refresh=<base>.')
  }

  const [argument] = argumentsList
  if (argument === '--apply') return { kind: 'apply' }
  if (argument === '--verify') return { kind: 'verify' }

  if (argument.startsWith('--refresh=')) {
    const confirmedDatabaseName = argument.slice('--refresh='.length)
    if (!confirmedDatabaseName) {
      throw new Error('--refresh exige le nom exact de la base PostgreSQL cible.')
    }
    return { kind: 'refresh', confirmedDatabaseName }
  }

  throw new Error(`Option inconnue : ${argument}`)
}

export function assertRefreshTarget(
  configuredDatabaseName: string,
  confirmedDatabaseName: string,
): void {
  if (SYSTEM_DATABASE_NAMES.has(configuredDatabaseName.toLowerCase())) {
    throw new Error('Le rafraîchissement d’une base PostgreSQL système est interdit.')
  }

  if (confirmedDatabaseName !== configuredDatabaseName) {
    throw new Error(
      `La confirmation --refresh doit correspondre exactement à la base configurée « ${configuredDatabaseName} ».`,
    )
  }
}
