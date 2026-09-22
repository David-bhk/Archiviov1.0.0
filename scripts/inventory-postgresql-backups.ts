import 'dotenv/config'

import path from 'path'

import { getPostgreSQLDatabaseName } from '../server/database-config'
import {
  inspectBackupRetention,
  LOCAL_BACKUP_RETENTION_DAYS,
} from './postgresql-backup-retention'

async function main(): Promise<void> {
  const databaseName = getPostgreSQLDatabaseName()
  const backupRoot = path.resolve(
    process.cwd(),
    process.env.ARCHIVIO_BACKUP_DIR?.trim() || '.archivio-backups',
  )
  const inventory = await inspectBackupRetention({ backupRoot, databaseName })

  console.log(
    `Inventaire local (${LOCAL_BACKUP_RETENTION_DAYS} jours) : ` +
    `${inventory.current} courante(s), ${inventory.expired} expirée(s), ` +
    `${inventory.invalid} invalide(s), ${inventory.otherDatabase} autre(s) base(s).`,
  )

  for (const entry of inventory.entries.filter((candidate) => candidate.status === 'expired')) {
    console.log(`À examiner avant une purge séparée : ${entry.name}`)
  }

  if (inventory.invalid > 0) {
    console.warn('Des entrées invalides existent dans la racine de sauvegarde ; aucune action automatique n’a été effectuée.')
  }
  console.log('Inventaire terminé en lecture seule : aucune sauvegarde n’a été supprimée.')
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Erreur inconnue pendant l’inventaire des sauvegardes.'
  console.error(message)
  process.exitCode = 1
})
