export const DATABASE_PROVIDERS = ['sqlite', 'postgresql'] as const

export type DatabaseProvider = (typeof DATABASE_PROVIDERS)[number]

export type DatabaseConfig =
  | { provider: 'sqlite' }
  | { provider: 'postgresql'; url: string }

function getRequiredValue(
  environment: NodeJS.ProcessEnv,
  name: 'ARCHIVIO_DB_PASSWORD',
): string {
  const value = environment[name]
  if (!value) {
    throw new Error(`${name} doit être défini pour utiliser PostgreSQL.`)
  }
  return value
}

function getPostgreSQLPort(environment: NodeJS.ProcessEnv): string {
  const value = environment.ARCHIVIO_DB_PORT || '5433'
  const port = Number(value)

  if (!/^\d+$/.test(value) || !Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('ARCHIVIO_DB_PORT doit être un numéro de port compris entre 1 et 65535.')
  }

  return value
}

function getPostgreSQLHost(environment: NodeJS.ProcessEnv): string {
  const value = environment.ARCHIVIO_DB_HOST?.trim() || '127.0.0.1'

  if (!/^[a-zA-Z0-9.-]+$/.test(value)) {
    throw new Error('ARCHIVIO_DB_HOST doit être un nom DNS ou une adresse IPv4 valide.')
  }

  return value
}

export function getPostgreSQLDatabaseName(
  environment: NodeJS.ProcessEnv = process.env,
): string {
  return environment.ARCHIVIO_DB_NAME?.trim() || 'archivio'
}

export function getPostgreSQLUrl(environment: NodeJS.ProcessEnv = process.env): string {
  const password = getRequiredValue(environment, 'ARCHIVIO_DB_PASSWORD')
  const database = getPostgreSQLDatabaseName(environment)
  const user = environment.ARCHIVIO_DB_USER?.trim() || 'archivio'
  const host = getPostgreSQLHost(environment)
  const port = getPostgreSQLPort(environment)

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(database)}?schema=public&connect_timeout=10`
}

export function resolveDatabaseConfig(
  environment: NodeJS.ProcessEnv = process.env,
): DatabaseConfig {
  const provider = environment.ARCHIVIO_DB_PROVIDER?.trim() || 'sqlite'

  if (provider === 'sqlite') {
    return { provider }
  }

  if (provider === 'postgresql') {
    return {
      provider,
      url: getPostgreSQLUrl(environment),
    }
  }

  throw new Error(
    `ARCHIVIO_DB_PROVIDER doit être "sqlite" ou "postgresql", valeur reçue : "${provider}".`,
  )
}
