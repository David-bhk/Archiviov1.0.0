import { PrismaClient as SQLiteClient } from '@prisma/client'
import { PrismaClient as PostgreSQLClient } from '@archivio/postgresql-client'

import { resolveDatabaseConfig, type DatabaseProvider } from './database-config'

export type DatabaseClient = Pick<
  SQLiteClient,
  'user' | 'department' | 'file' | 'activity' | '$disconnect'
>

export type DatabaseTransactionClient = Pick<SQLiteClient, 'file' | 'activity'>

export interface ActiveDatabase {
  client: DatabaseClient
  provider: DatabaseProvider
  transaction: <Result>(
    operation: (client: DatabaseTransactionClient) => Promise<Result>,
  ) => Promise<Result>
}

export function createDatabaseClient(
  environment: NodeJS.ProcessEnv = process.env,
): ActiveDatabase {
  const config = resolveDatabaseConfig(environment)

  if (config.provider === 'sqlite') {
    const client = new SQLiteClient()
    return {
      client,
      provider: config.provider,
      transaction: (operation) => client.$transaction((transaction) => operation(transaction)),
    }
  }

  const postgresqlClient = new PostgreSQLClient({
    datasources: {
      db: {
        url: config.url,
      },
    },
  })
  // Prisma brands generated clients with provider-specific runtime types even
  // when their checked schemas are identical. Keep that adaptation at this
  // boundary instead of weakening types throughout the storage layer.
  const client = postgresqlClient as unknown as DatabaseClient

  return {
    client,
    provider: config.provider,
    transaction: (operation) =>
      postgresqlClient.$transaction((transaction) =>
        operation(transaction as unknown as DatabaseTransactionClient),
      ),
  }
}

export const activeDatabase = createDatabaseClient()
