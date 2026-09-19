const SQLITE_DEVELOPMENT_DATABASE = 'prisma/dev.db'
const CONFIRMATION_PREFIX = '--confirm-database='

export type DemoSeedOptions = {
  password: string
}

export function parseDemoSeedOptions(
  args: string[],
  environment: NodeJS.ProcessEnv = process.env,
): DemoSeedOptions {
  if (environment.NODE_ENV === 'production') {
    throw new Error('Le seed de démonstration est interdit avec NODE_ENV=production.')
  }

  const provider = environment.ARCHIVIO_DB_PROVIDER?.trim() || 'sqlite'
  if (provider !== 'sqlite') {
    throw new Error(
      'Le seed de démonstration cible uniquement la base SQLite de développement et refuse le fournisseur actif.',
    )
  }

  const unknownArgs = args.filter((argument) => !argument.startsWith(CONFIRMATION_PREFIX))
  if (unknownArgs.length > 0) {
    throw new Error('Argument inconnu pour le seed de démonstration.')
  }

  const confirmations = args.filter((argument) => argument.startsWith(CONFIRMATION_PREFIX))
  if (confirmations.length !== 1) {
    throw new Error(
      `Confirmez exactement la cible avec --confirm-database=${SQLITE_DEVELOPMENT_DATABASE}.`,
    )
  }

  const confirmedDatabase = confirmations[0].slice(CONFIRMATION_PREFIX.length)
  if (confirmedDatabase !== SQLITE_DEVELOPMENT_DATABASE) {
    throw new Error(
      `La cible confirmée doit être exactement ${SQLITE_DEVELOPMENT_DATABASE}.`,
    )
  }

  const password = environment.ARCHIVIO_DEMO_PASSWORD
  if (!password || password.trim().length < 12 || password === 'password123') {
    throw new Error(
      'ARCHIVIO_DEMO_PASSWORD doit contenir au moins 12 caractères et ne peut pas reprendre l’ancien mot de passe connu.',
    )
  }

  return { password }
}
