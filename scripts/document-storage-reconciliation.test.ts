import path from 'path'
import { describe, expect, it } from 'vitest'

import {
  isForbiddenExternalSource,
  managedFilename,
  parseDocumentStorageReconciliationOptions,
} from './document-storage-reconciliation'

describe('parseDocumentStorageReconciliationOptions', () => {
  it('utilise une simulation en lecture seule sans option', () => {
    expect(parseDocumentStorageReconciliationOptions([])).toEqual({ mode: 'dry-run' })
  })

  it('exige toutes les confirmations pour appliquer', () => {
    expect(parseDocumentStorageReconciliationOptions([
      '--apply',
      '--confirm-database=archivio',
      '--confirm-stopped=archivio',
      '--confirm-backup=archivio-20260918T090000000Z',
      '--confirm-count=11',
    ])).toEqual({
      mode: 'apply',
      confirmedDatabaseName: 'archivio',
      confirmedStoppedDatabaseName: 'archivio',
      confirmedBackup: 'archivio-20260918T090000000Z',
      confirmedCount: 11,
    })
  })

  it('refuse une confirmation incomplète ou ambiguë', () => {
    expect(() => parseDocumentStorageReconciliationOptions(['--apply'])).toThrow('confirmations')
    expect(() => parseDocumentStorageReconciliationOptions([
      '--apply',
      '--confirm-database=archivio',
      '--confirm-stopped=archivio',
      '--confirm-backup=../snapshot',
      '--confirm-count=11',
    ])).toThrow('nom simple')
    expect(() => parseDocumentStorageReconciliationOptions(['--unknown'])).toThrow('option inconnue')
  })
})

describe('managedFilename', () => {
  it('conserve uniquement une extension simple normalisée', () => {
    expect(managedFilename('generated-id', 'Document.PDF')).toBe('generated-id.pdf')
    expect(managedFilename('generated-id', 'document.extension-trop-longue')).toBe('generated-id')
  })
})

describe('isForbiddenExternalSource', () => {
  it('protège explicitement les projets Business Management voisins', () => {
    expect(isForbiddenExternalSource(path.join('D:', 'project', 'Business-management-local', 'file.pdf')))
      .toBe(true)
    expect(isForbiddenExternalSource(path.join('D:', 'project', 'Archiviov1.0.0-main-old', 'file.pdf')))
      .toBe(false)
  })
})
