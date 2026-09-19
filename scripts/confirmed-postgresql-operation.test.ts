import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it } from 'vitest'

import { verifyRecentBackupConfirmation } from './confirmed-postgresql-operation'

const temporaryRoots: string[] = []

function createSnapshot(databaseName = 'archivio'): {
  backupRoot: string
  backupName: string
  manifestPath: string
} {
  const backupRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'archivio-backup-confirmation-'))
  temporaryRoots.push(backupRoot)
  const backupName = 'archivio-20260919T090000000Z'
  const snapshotDirectory = path.join(backupRoot, backupName)
  fs.mkdirSync(snapshotDirectory)
  const manifestPath = path.join(snapshotDirectory, 'manifest.json')
  fs.writeFileSync(manifestPath, JSON.stringify({ database: { name: databaseName } }))
  return { backupRoot, backupName, manifestPath }
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

describe('verified backup confirmation', () => {
  it('accepts a recent manifest for the confirmed database', () => {
    const snapshot = createSnapshot()
    expect(verifyRecentBackupConfirmation({
      backupName: snapshot.backupName,
      databaseName: 'archivio',
      backupRoot: snapshot.backupRoot,
    })).toBe(path.join(snapshot.backupRoot, snapshot.backupName))
  })

  it('rejects a manifest for a different database', () => {
    const snapshot = createSnapshot('other_database')
    expect(() => verifyRecentBackupConfirmation({
      backupName: snapshot.backupName,
      databaseName: 'archivio',
      backupRoot: snapshot.backupRoot,
    })).toThrow('base active')
  })

  it('rejects a stale manifest', () => {
    const snapshot = createSnapshot()
    const staleTime = new Date(Date.now() - 25 * 60 * 60 * 1_000)
    fs.utimesSync(snapshot.manifestPath, staleTime, staleTime)

    expect(() => verifyRecentBackupConfirmation({
      backupName: snapshot.backupName,
      databaseName: 'archivio',
      backupRoot: snapshot.backupRoot,
    })).toThrow('moins de 24 heures')
  })

  it('rejects a snapshot outside the configured root', () => {
    const snapshot = createSnapshot()
    expect(() => verifyRecentBackupConfirmation({
      backupName: '..',
      databaseName: 'archivio',
      backupRoot: snapshot.backupRoot,
    })).toThrow('sous-dossier')
  })
})
