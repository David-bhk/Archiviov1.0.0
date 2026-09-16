import 'dotenv/config'

import { PrismaClient as PostgreSQLClient } from '@archivio/postgresql-client'
import jwt from 'jsonwebtoken'

import { getPostgreSQLUrl } from '../server/database-config'

function getLocalBaseUrl(): URL {
  const url = new URL(process.env.ARCHIVIO_SMOKE_BASE_URL || 'http://127.0.0.1:5001')

  if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(url.hostname)) {
    throw new Error('ARCHIVIO_SMOKE_BASE_URL doit cibler localhost en HTTP.')
  }

  return url
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET doit être défini pour le smoke test PostgreSQL.')
  }
  return secret
}

async function expectStatus(
  baseUrl: URL,
  path: string,
  expectedStatus: number,
  token?: string,
): Promise<void> {
  const response = await fetch(new URL(path, baseUrl), {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
  await response.arrayBuffer()

  if (response.status !== expectedStatus) {
    throw new Error(
      `Le parcours ${path} a renvoyé ${response.status} au lieu de ${expectedStatus}.`,
    )
  }
}

async function main(): Promise<void> {
  const baseUrl = getLocalBaseUrl()
  const postgresql = new PostgreSQLClient({
    datasources: {
      db: {
        url: getPostgreSQLUrl(),
      },
    },
  })

  try {
    const actor = await postgresql.user.findFirst({
      where: {
        isActive: true,
        role: 'SUPERUSER',
      },
      select: {
        id: true,
        role: true,
        department: true,
      },
    })

    if (!actor) {
      throw new Error('Aucun superutilisateur actif n’est disponible pour le smoke test.')
    }

    const token = jwt.sign(actor, getJwtSecret(), { expiresIn: '2m' })
    const checks: Array<[string, number, string | undefined]> = [
      ['/', 200, undefined],
      ['/api/departments', 200, token],
      ['/api/files?page=1&limit=1', 200, token],
      ['/api/stats', 200, token],
      ['/api/activities?limit=1', 200, token],
    ]

    for (const [path, expectedStatus, authorization] of checks) {
      await expectStatus(baseUrl, path, expectedStatus, authorization)
    }

    console.log(`Smoke test PostgreSQL réussi : ${checks.length} parcours en lecture seule.`)
  } finally {
    await postgresql.$disconnect()
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Erreur inconnue pendant le smoke test.'
  console.error(message)
  process.exitCode = 1
})
