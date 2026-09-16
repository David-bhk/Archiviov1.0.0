import { describe, expect, it } from 'vitest'

import {
  getPostgreSQLDatabaseName,
  getPostgreSQLUrl,
  resolveDatabaseConfig,
} from './database-config'

describe('database configuration', () => {
  it('keeps SQLite as the default provider', () => {
    expect(resolveDatabaseConfig({})).toEqual({ provider: 'sqlite' })
  })

  it('rejects an unknown provider', () => {
    expect(() => resolveDatabaseConfig({ ARCHIVIO_DB_PROVIDER: 'mysql' })).toThrow(
      'ARCHIVIO_DB_PROVIDER doit être "sqlite" ou "postgresql"',
    )
  })

  it('requires a PostgreSQL password only when PostgreSQL is selected', () => {
    expect(() => resolveDatabaseConfig({ ARCHIVIO_DB_PROVIDER: 'postgresql' })).toThrow(
      'ARCHIVIO_DB_PASSWORD doit être défini',
    )
  })

  it('builds an encoded PostgreSQL URL from validated components', () => {
    const url = getPostgreSQLUrl({
      ARCHIVIO_DB_HOST: 'postgres',
      ARCHIVIO_DB_PORT: '5432',
      ARCHIVIO_DB_NAME: 'archivio local',
      ARCHIVIO_DB_USER: 'archivio@example',
      ARCHIVIO_DB_PASSWORD: 'test:/?#[]@',
    })

    expect(url).toBe(
      'postgresql://archivio%40example:test%3A%2F%3F%23%5B%5D%40@postgres:5432/archivio%20local?schema=public&connect_timeout=10',
    )
  })

  it('resolves the PostgreSQL database name independently from its secret', () => {
    expect(getPostgreSQLDatabaseName({})).toBe('archivio')
    expect(getPostgreSQLDatabaseName({ ARCHIVIO_DB_NAME: ' archivio_test ' })).toBe(
      'archivio_test',
    )
  })

  it('rejects invalid PostgreSQL ports and hosts', () => {
    expect(() =>
      getPostgreSQLUrl({
        ARCHIVIO_DB_PASSWORD: 'test-only',
        ARCHIVIO_DB_PORT: '70000',
      }),
    ).toThrow('ARCHIVIO_DB_PORT')

    expect(() =>
      getPostgreSQLUrl({
        ARCHIVIO_DB_PASSWORD: 'test-only',
        ARCHIVIO_DB_HOST: 'postgres/path',
      }),
    ).toThrow('ARCHIVIO_DB_HOST')
  })
})
