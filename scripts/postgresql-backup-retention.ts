import fs from 'fs'
import path from 'path'
import { z } from 'zod'

import {
  BACKUP_FORMAT_VERSION,
  assertApplicationDatabaseName,
  resolveInsideRoot,
} from './postgresql-backup-options'

export const LOCAL_BACKUP_RETENTION_DAYS = 30

const retentionManifestSchema = z.object({
  formatVersion: z.literal(BACKUP_FORMAT_VERSION),
  createdAt: z.string().datetime(),
  database: z.object({
    engine: z.literal('postgresql'),
    name: z.string().min(1),
  }),
})

export type BackupRetentionStatus = 'current' | 'expired' | 'invalid' | 'other-database'

export interface BackupRetentionEntry {
  name: string
  status: BackupRetentionStatus
  createdAt?: string
}

export interface BackupRetentionInventory {
  entries: BackupRetentionEntry[]
  current: number
  expired: number
  invalid: number
  otherDatabase: number
}

function isExpired(createdAt: Date, now: Date, retentionDays: number): boolean {
  return now.getTime() - createdAt.getTime() > retentionDays * 24 * 60 * 60 * 1000
}

export async function inspectBackupRetention(input: {
  backupRoot: string
  databaseName: string
  now?: Date
  retentionDays?: number
}): Promise<BackupRetentionInventory> {
  const retentionDays = input.retentionDays ?? LOCAL_BACKUP_RETENTION_DAYS
  if (!Number.isInteger(retentionDays) || retentionDays < 1) {
    throw new Error('La durée de rétention doit être un nombre entier positif de jours.')
  }
  assertApplicationDatabaseName(input.databaseName)

  const backupRoot = path.resolve(input.backupRoot)
  const now = input.now ?? new Date()
  const entries: BackupRetentionEntry[] = []

  if (!fs.existsSync(backupRoot)) {
    return { entries, current: 0, expired: 0, invalid: 0, otherDatabase: 0 }
  }

  const directoryEntries = await fs.promises.readdir(backupRoot, { withFileTypes: true })
  directoryEntries.sort((left, right) => left.name.localeCompare(right.name))

  for (const entry of directoryEntries) {
    const snapshotDirectory = path.join(backupRoot, entry.name)
    if (entry.isSymbolicLink() || !entry.isDirectory()) {
      entries.push({ name: entry.name, status: 'invalid' })
      continue
    }

    try {
      const safeSnapshotDirectory = resolveInsideRoot(backupRoot, snapshotDirectory)
      const parsed: unknown = JSON.parse(
        await fs.promises.readFile(path.join(safeSnapshotDirectory, 'manifest.json'), 'utf8'),
      )
      const manifest = retentionManifestSchema.parse(parsed)
      const createdAt = new Date(manifest.createdAt)

      if (manifest.database.name !== input.databaseName) {
        entries.push({ name: entry.name, status: 'other-database', createdAt: manifest.createdAt })
      } else if (createdAt.getTime() > now.getTime()) {
        entries.push({ name: entry.name, status: 'invalid', createdAt: manifest.createdAt })
      } else {
        entries.push({
          name: entry.name,
          status: isExpired(createdAt, now, retentionDays) ? 'expired' : 'current',
          createdAt: manifest.createdAt,
        })
      }
    } catch {
      entries.push({ name: entry.name, status: 'invalid' })
    }
  }

  return {
    entries,
    current: entries.filter((entry) => entry.status === 'current').length,
    expired: entries.filter((entry) => entry.status === 'expired').length,
    invalid: entries.filter((entry) => entry.status === 'invalid').length,
    otherDatabase: entries.filter((entry) => entry.status === 'other-database').length,
  }
}
