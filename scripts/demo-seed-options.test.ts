import { describe, expect, it } from 'vitest'

import { parseDemoSeedOptions } from './demo-seed-options'

const confirmation = '--confirm-database=prisma/dev.db'

describe('demo seed safeguards', () => {
  it('accepts the explicit SQLite development target with a local password', () => {
    expect(
      parseDemoSeedOptions([confirmation], {
        ARCHIVIO_DB_PROVIDER: 'sqlite',
        ARCHIVIO_DEMO_PASSWORD: 'local-demo-password',
      }),
    ).toEqual({ password: 'local-demo-password' })
  })

  it('rejects production even when the target is confirmed', () => {
    expect(() =>
      parseDemoSeedOptions([confirmation], {
        NODE_ENV: 'production',
        ARCHIVIO_DB_PROVIDER: 'sqlite',
        ARCHIVIO_DEMO_PASSWORD: 'local-demo-password',
      }),
    ).toThrow('interdit')
  })

  it('rejects the active PostgreSQL provider', () => {
    expect(() =>
      parseDemoSeedOptions([confirmation], {
        ARCHIVIO_DB_PROVIDER: 'postgresql',
        ARCHIVIO_DEMO_PASSWORD: 'local-demo-password',
      }),
    ).toThrow('SQLite')
  })

  it('rejects a missing or different database confirmation', () => {
    const environment = {
      ARCHIVIO_DB_PROVIDER: 'sqlite',
      ARCHIVIO_DEMO_PASSWORD: 'local-demo-password',
    }

    expect(() => parseDemoSeedOptions([], environment)).toThrow('Confirmez exactement')
    expect(() =>
      parseDemoSeedOptions(['--confirm-database=archivio'], environment),
    ).toThrow('exactement prisma/dev.db')
  })

  it('rejects unknown arguments', () => {
    expect(() =>
      parseDemoSeedOptions([confirmation, '--apply'], {
        ARCHIVIO_DB_PROVIDER: 'sqlite',
        ARCHIVIO_DEMO_PASSWORD: 'local-demo-password',
      }),
    ).toThrow('Argument inconnu')
  })

  it('rejects missing, short, or previously known passwords', () => {
    const baseEnvironment = { ARCHIVIO_DB_PROVIDER: 'sqlite' }

    expect(() => parseDemoSeedOptions([confirmation], baseEnvironment)).toThrow(
      'ARCHIVIO_DEMO_PASSWORD',
    )
    expect(() =>
      parseDemoSeedOptions([confirmation], {
        ...baseEnvironment,
        ARCHIVIO_DEMO_PASSWORD: 'trop-court',
      }),
    ).toThrow('ARCHIVIO_DEMO_PASSWORD')
    expect(() =>
      parseDemoSeedOptions([confirmation], {
        ...baseEnvironment,
        ARCHIVIO_DEMO_PASSWORD: 'password123',
      }),
    ).toThrow('ancien mot de passe')
  })
})
