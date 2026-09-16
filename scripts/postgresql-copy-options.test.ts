import { describe, expect, it } from 'vitest'

import { assertRefreshTarget, parsePostgreSQLCopyMode } from './postgresql-copy-options'

describe('PostgreSQL copy options', () => {
  it('keeps the audit mode as the default', () => {
    expect(parsePostgreSQLCopyMode([])).toEqual({ kind: 'audit' })
  })

  it('parses the non-destructive modes', () => {
    expect(parsePostgreSQLCopyMode(['--apply'])).toEqual({ kind: 'apply' })
    expect(parsePostgreSQLCopyMode(['--verify'])).toEqual({ kind: 'verify' })
  })

  it('requires one explicit database name for refresh', () => {
    expect(parsePostgreSQLCopyMode(['--refresh=archivio_rehearsal'])).toEqual({
      kind: 'refresh',
      confirmedDatabaseName: 'archivio_rehearsal',
    })
    expect(() => parsePostgreSQLCopyMode(['--refresh='])).toThrow('nom exact')
    expect(() => parsePostgreSQLCopyMode(['--apply', '--verify'])).toThrow('une seule option')
  })

  it('rejects an unknown option', () => {
    expect(() => parsePostgreSQLCopyMode(['--replace'])).toThrow('Option inconnue')
  })

  it('requires an exact target confirmation and rejects system databases', () => {
    expect(() => assertRefreshTarget('archivio', 'archivio-copy')).toThrow(
      'correspondre exactement',
    )
    expect(() => assertRefreshTarget('postgres', 'postgres')).toThrow('système')
    expect(() => assertRefreshTarget('template0', 'template0')).toThrow('système')
    expect(() => assertRefreshTarget('archivio', 'archivio')).not.toThrow()
  })
})
