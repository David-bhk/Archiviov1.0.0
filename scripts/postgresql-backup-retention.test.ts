import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it } from 'vitest'

import { inspectBackupRetention } from './postgresql-backup-retention'

const temporaryRoots: string[] = []

function createRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'archivio-retention-'))
  temporaryRoots.push(root)
  return root
}

function createSnapshot(root: string, name: string, createdAt: string, databaseName = 'archivio'): void {
  const snapshotDirectory = path.join(root, name)
  fs.mkdirSync(snapshotDirectory)
  fs.writeFileSync(path.join(snapshotDirectory, 'manifest.json'), JSON.stringify({
    formatVersion: 1,
    createdAt,
    database: { engine: 'postgresql', name: databaseName },
  }))
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

describe('inspectBackupRetention', () => {
  it('classe les sauvegardes selon la rétention locale de 30 jours', async () => {
    const root = createRoot()
    createSnapshot(root, 'archivio-current', '2026-09-10T00:00:00.000Z')
    createSnapshot(root, 'archivio-expired', '2026-08-01T00:00:00.000Z')

    const inventory = await inspectBackupRetention({
      backupRoot: root,
      databaseName: 'archivio',
      now: new Date('2026-09-22T00:00:00.000Z'),
    })

    expect(inventory.current).toBe(1)
    expect(inventory.expired).toBe(1)
    expect(inventory.invalid).toBe(0)
  })

  it('n’assimile pas une sauvegarde étrangère ou invalide à un candidat de rétention', async () => {
    const root = createRoot()
    createSnapshot(root, 'other-database', '2026-08-01T00:00:00.000Z', 'other_app')
    fs.mkdirSync(path.join(root, 'invalid-snapshot'))

    const inventory = await inspectBackupRetention({
      backupRoot: root,
      databaseName: 'archivio',
      now: new Date('2026-09-22T00:00:00.000Z'),
    })

    expect(inventory.expired).toBe(0)
    expect(inventory.otherDatabase).toBe(1)
    expect(inventory.invalid).toBe(1)
  })

  it('reste en lecture seule et retourne un inventaire vide si la racine n’existe pas', async () => {
    const root = path.join(createRoot(), 'missing')

    await expect(inspectBackupRetention({
      backupRoot: root,
      databaseName: 'archivio',
    })).resolves.toEqual({
      entries: [],
      current: 0,
      expired: 0,
      invalid: 0,
      otherDatabase: 0,
    })
    expect(fs.existsSync(root)).toBe(false)
  })
})
