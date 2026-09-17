import path from 'path'
import { describe, expect, it } from 'vitest'

import {
  assertApplicationDatabaseName,
  parsePostgreSQLBackupOptions,
  resolveInsideRoot,
} from './postgresql-backup-options'

describe('parsePostgreSQLBackupOptions', () => {
  it('exige la confirmation exacte pour créer une sauvegarde', () => {
    expect(parsePostgreSQLBackupOptions([
      '--create',
      '--confirm-stopped=archivio',
    ])).toEqual({ mode: 'create', confirmedDatabaseName: 'archivio' })
  })

  it('accepte un dossier de sauvegarde pour la vérification', () => {
    expect(parsePostgreSQLBackupOptions([
      '--verify',
      '--snapshot=.archivio-backups/archivio-20260917T120000000Z',
    ])).toEqual({
      mode: 'verify',
      snapshotDirectory: '.archivio-backups/archivio-20260917T120000000Z',
    })
  })

  it('refuse les opérations ambiguës ou incomplètes', () => {
    expect(() => parsePostgreSQLBackupOptions(['--create'])).toThrow('confirm-stopped')
    expect(() => parsePostgreSQLBackupOptions(['--verify'])).toThrow('snapshot')
    expect(() => parsePostgreSQLBackupOptions(['--create', '--verify'])).toThrow('exactement une')
    expect(() => parsePostgreSQLBackupOptions(['--create', '--unknown'])).toThrow('option inconnue')
  })
})

describe('assertApplicationDatabaseName', () => {
  it('refuse les bases système et les noms injectables', () => {
    expect(() => assertApplicationDatabaseName('postgres')).toThrow('pas autorisé')
    expect(() => assertApplicationDatabaseName('template1')).toThrow('pas autorisé')
    expect(() => assertApplicationDatabaseName('archivio;DROP DATABASE archivio')).toThrow('pas autorisé')
  })
})

describe('resolveInsideRoot', () => {
  it('accepte seulement un sous-dossier réel de la racine', () => {
    const root = path.resolve('.archivio-backups')
    expect(resolveInsideRoot(root, path.join(root, 'snapshot'))).toBe(path.join(root, 'snapshot'))
    expect(() => resolveInsideRoot(root, root)).toThrow('sous-dossier')
    expect(() => resolveInsideRoot(root, path.resolve('outside'))).toThrow('sous-dossier')
  })
})
