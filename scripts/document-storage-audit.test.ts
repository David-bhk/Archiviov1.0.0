import path from 'path'
import { describe, expect, it } from 'vitest'

import { classifyStoredPath, metadataSignature } from './document-storage-audit'

describe('classifyStoredPath', () => {
  const uploadsRoot = path.resolve('uploads')

  it('classe un nom relatif dans le stockage géré', () => {
    expect(classifyStoredPath(uploadsRoot, 'document.pdf')).toEqual({
      kind: 'managed',
      resolvedPath: path.join(uploadsRoot, 'document.pdf'),
    })
  })

  it('isole les anciens chemins racine /uploads sans les normaliser automatiquement', () => {
    const result = classifyStoredPath(uploadsRoot, '/uploads/legacy.pdf')
    expect(result.kind).toBe('legacy-rooted')
    if (result.kind === 'legacy-rooted') {
      expect(result.managedCandidate).toBe(path.join(uploadsRoot, 'legacy.pdf'))
    }
  })

  it('classe un chemin absolu hors racine comme externe', () => {
    const external = path.resolve(uploadsRoot, '..', 'outside.pdf')
    expect(classifyStoredPath(uploadsRoot, external)).toEqual({
      kind: 'external',
      resolvedPath: external,
    })
  })
})

describe('metadataSignature', () => {
  it('regroupe seulement les métadonnées physiques identiques', () => {
    const first = metadataSignature({ filename: 'a.pdf', filePath: '/uploads/a.pdf', fileSize: 10 })
    const same = metadataSignature({ filename: 'a.pdf', filePath: '/uploads/a.pdf', fileSize: 10 })
    const different = metadataSignature({ filename: 'a.pdf', filePath: '/uploads/a.pdf', fileSize: 11 })
    expect(first).toBe(same)
    expect(first).not.toBe(different)
  })
})
