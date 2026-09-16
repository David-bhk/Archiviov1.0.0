import 'dotenv/config'

import { randomUUID } from 'crypto'
import { spawn } from 'child_process'
import express from 'express'
import fs from 'fs'
import { AddressInfo } from 'net'
import os from 'os'
import path from 'path'
import { PrismaClient as PostgreSQLClient } from '@archivio/postgresql-client'
import bcrypt from 'bcryptjs'

import { getPostgreSQLUrl } from '../server/database-config'

const disposableDatabasePattern = /^archivio_validation_\d{13}_[a-f0-9]{8}$/

function createDisposableDatabaseName(): string {
  return `archivio_validation_${Date.now()}_${randomUUID().replaceAll('-', '').slice(0, 8)}`
}

function assertDisposableDatabaseName(databaseName: string): void {
  if (!disposableDatabasePattern.test(databaseName)) {
    throw new Error('Le nom de la base temporaire ne respecte pas le format de sécurité attendu.')
  }
}

function getDatabaseUrl(databaseName: string): string {
  return getPostgreSQLUrl({
    ...process.env,
    ARCHIVIO_DB_NAME: databaseName,
  })
}

async function runPostgreSQLMigrations(databaseUrl: string): Promise<void> {
  const prismaCli = path.resolve('node_modules', 'prisma', 'build', 'index.js')

  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [prismaCli, 'migrate', 'deploy', '--schema', 'prisma/postgresql/schema.prisma'],
      {
        cwd: process.cwd(),
        env: { ...process.env, DATABASE_URL: databaseUrl },
        stdio: 'ignore',
      },
    )

    child.once('error', () => {
      reject(new Error('Impossible de lancer les migrations PostgreSQL temporaires.'))
    })
    child.once('exit', (code) => {
      if (code === 0) {
        resolve()
        return
      }

      reject(new Error(`La migration PostgreSQL temporaire a échoué (code ${code ?? 'inconnu'}).`))
    })
  })
}

async function runPostgreSQLCopy(databaseName: string, argument: string): Promise<void> {
  const tsxCli = path.resolve('node_modules', 'tsx', 'dist', 'cli.mjs')
  const copyScript = path.resolve('scripts', 'migrate-sqlite-to-postgresql.ts')

  await new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, [tsxCli, copyScript, argument], {
      cwd: process.cwd(),
      env: { ...process.env, ARCHIVIO_DB_NAME: databaseName },
      stdio: 'ignore',
    })

    child.once('error', () => {
      reject(new Error('Impossible de lancer la copie PostgreSQL temporaire.'))
    })
    child.once('exit', (code) => {
      if (code === 0) {
        resolve()
        return
      }

      reject(new Error(`La copie PostgreSQL temporaire a échoué (code ${code ?? 'inconnu'}).`))
    })
  })
}

async function expectJson<ResponseBody>(
  baseUrl: URL,
  route: string,
  expectedStatus: number,
  init?: RequestInit,
): Promise<ResponseBody> {
  const response = await fetch(new URL(route, baseUrl), init)
  const body = await response.json() as ResponseBody

  if (response.status !== expectedStatus) {
    throw new Error(
      `Le parcours ${init?.method || 'GET'} ${route} a renvoyé ${response.status} au lieu de ${expectedStatus}.`,
    )
  }

  return body
}

function authorizationHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` }
}

function assertTemporaryUploadsDirectory(directory: string): void {
  const resolvedDirectory = path.resolve(directory)
  const resolvedTemporaryRoot = path.resolve(os.tmpdir())
  const relative = path.relative(resolvedTemporaryRoot, resolvedDirectory)

  if (
    !path.basename(resolvedDirectory).startsWith('archivio-validation-') ||
    relative.startsWith('..') ||
    path.isAbsolute(relative)
  ) {
    throw new Error('Le dossier d’uploads temporaire ne respecte pas le périmètre de nettoyage autorisé.')
  }
}

async function closeServer(server: import('http').Server | undefined): Promise<void> {
  if (!server?.listening) return

  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error)
      else resolve()
    })
  })
}

async function main(): Promise<void> {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET doit être défini pour valider les écritures PostgreSQL.')
  }

  const databaseName = createDisposableDatabaseName()
  assertDisposableDatabaseName(databaseName)

  const uploadsDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'archivio-validation-'))
  assertTemporaryUploadsDirectory(uploadsDirectory)

  const admin = new PostgreSQLClient({
    datasources: { db: { url: getDatabaseUrl('postgres') } },
  })
  let target: PostgreSQLClient | undefined
  let appDatabase: { client: { $disconnect(): Promise<void> } } | undefined
  let server: import('http').Server | undefined
  let databaseCreated = false

  try {
    await admin.$executeRawUnsafe(`CREATE DATABASE "${databaseName}"`)
    databaseCreated = true

    const targetUrl = getDatabaseUrl(databaseName)
    await runPostgreSQLMigrations(targetUrl)

    await runPostgreSQLCopy(databaseName, '--apply')

    target = new PostgreSQLClient({ datasources: { db: { url: targetUrl } } })
    await target.department.create({
      data: {
        name: `Donnée obsolète ${randomUUID()}`,
        description: 'Cette ligne doit disparaître pendant la répétition du rafraîchissement.',
      },
    })
    await target.$disconnect()
    target = undefined

    await runPostgreSQLCopy(databaseName, `--refresh=${databaseName}`)
    await runPostgreSQLCopy(databaseName, '--verify')

    target = new PostgreSQLClient({ datasources: { db: { url: targetUrl } } })

    const departmentName = 'Validation PostgreSQL isolée'
    const password = `Validation-${randomUUID()}`
    const passwordHash = await bcrypt.hash(password, 10)
    const department = await target.department.create({
      data: { name: departmentName, description: 'Données synthétiques jetables' },
    })
    const actor = await target.user.create({
      data: {
        username: `validation_${randomUUID().replaceAll('-', '').slice(0, 10)}`,
        email: `validation-${randomUUID()}@example.invalid`,
        password: passwordHash,
        role: 'SUPERUSER',
        department: departmentName,
        departmentId: department.id,
        firstName: 'Validation',
        lastName: 'PostgreSQL',
      },
    })

    process.env.ARCHIVIO_DB_PROVIDER = 'postgresql'
    process.env.ARCHIVIO_DB_NAME = databaseName
    process.env.UPLOADS_DIR = uploadsDirectory

    const [{ registerRoutes }, databaseModule, storageModule] = await Promise.all([
      import('../server/routes'),
      import('../server/database'),
      import('../server/storage'),
    ])
    appDatabase = databaseModule.activeDatabase

    const app = express()
    app.use(express.json())
    server = await registerRoutes(app)
    await new Promise<void>((resolve, reject) => {
      server?.once('error', reject)
      server?.listen(0, '127.0.0.1', resolve)
    })

    const address = server.address() as AddressInfo
    const baseUrl = new URL(`http://127.0.0.1:${address.port}`)

    await expectJson(baseUrl, '/api/auth/login', 401, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: actor.username, password: 'mot-de-passe-invalide' }),
    })

    const login = await expectJson<{
      token: string
      user: Record<string, unknown>
    }>(baseUrl, '/api/auth/login', 200, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: actor.username, password }),
    })
    if (!login.token || Object.hasOwn(login.user, 'password')) {
      throw new Error('La réponse de connexion ne respecte pas le contrat de sécurité attendu.')
    }

    const loggedInActor = await target.user.findUniqueOrThrow({ where: { id: actor.id } })
    if (!loggedInActor.lastLogin) {
      throw new Error('La connexion n’a pas enregistré lastLogin dans PostgreSQL.')
    }

    const form = new FormData()
    form.append('file', new Blob(['%PDF-1.4\n% Archivio validation\n'], {
      type: 'application/pdf',
    }), 'validation-postgresql.pdf')
    form.append('department', departmentName)
    form.append('category', 'Validation')
    form.append('description', 'Document synthétique pour validation isolée')

    const uploaded = await expectJson<{ id: number; filename: string; status: string }>(
      baseUrl,
      '/api/files',
      200,
      {
        method: 'POST',
        headers: authorizationHeaders(login.token),
        body: form,
      },
    )
    if (uploaded.status !== 'pending') {
      throw new Error('Le document téléversé n’a pas été créé avec le statut pending.')
    }

    const uploadedPath = path.resolve(uploadsDirectory, uploaded.filename)
    if (!fs.existsSync(uploadedPath)) {
      throw new Error('Le fichier synthétique téléversé est absent du stockage temporaire.')
    }

    const uploadActivity = await target.activity.findFirst({
      where: { type: 'document_uploaded', userId: actor.id, fileId: uploaded.id },
    })
    if (!uploadActivity) {
      throw new Error('L’activité de téléversement n’a pas été enregistrée.')
    }

    const justification = 'Validation transactionnelle PostgreSQL'
    await expectJson(baseUrl, `/api/files/${uploaded.id}/approve`, 200, {
      method: 'PATCH',
      headers: {
        ...authorizationHeaders(login.token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ justification }),
    })

    const approved = await target.file.findUniqueOrThrow({ where: { id: uploaded.id } })
    const approvalActivity = await target.activity.findFirst({
      where: { type: 'document_archived', userId: actor.id, fileId: uploaded.id },
    })
    if (
      approved.status !== 'archived' ||
      approved.reviewedBy !== actor.id ||
      !approved.reviewedAt ||
      approved.reviewComment !== justification ||
      approvalActivity?.description !== justification
    ) {
      throw new Error('La décision et son audit ne sont pas cohérents dans PostgreSQL.')
    }

    const rollbackCandidate = await target.file.create({
      data: {
        filename: 'rollback-validation.pdf',
        originalName: 'rollback-validation.pdf',
        fileType: 'pdf',
        fileSize: 1,
        filePath: 'rollback-validation.pdf',
        uploadedBy: actor.id,
        department: departmentName,
      },
    })
    const rollbackResult = await storageModule.storage.reviewFile(
      rollbackCandidate.id,
      2_147_483_647,
      'archived',
      'Cette décision doit être annulée avec sa transaction',
    )
    const rolledBack = await target.file.findUniqueOrThrow({ where: { id: rollbackCandidate.id } })
    if (
      rollbackResult !== undefined ||
      rolledBack.status !== 'pending' ||
      rolledBack.reviewedBy !== null ||
      rolledBack.reviewedAt !== null ||
      rolledBack.reviewComment !== null
    ) {
      throw new Error('L’échec de l’audit n’a pas annulé la décision documentaire.')
    }

    await expectJson(baseUrl, `/api/files/${uploaded.id}`, 200, {
      method: 'DELETE',
      headers: authorizationHeaders(login.token),
    })
    const deleted = await target.file.findUniqueOrThrow({ where: { id: uploaded.id } })
    if (!deleted.isDeleted || !fs.existsSync(uploadedPath)) {
      throw new Error('La suppression logique a supprimé la ligne ou le fichier physique.')
    }

    console.log(
      'Validation PostgreSQL réussie : rafraîchissement, connexion, upload, audits, rollback transactionnel et suppression logique.',
    )
  } finally {
    await closeServer(server).catch(() => undefined)
    await Promise.allSettled([
      appDatabase?.client.$disconnect(),
      target?.$disconnect(),
    ])

    let cleanupFailed = false
    try {
      if (databaseCreated) {
        assertDisposableDatabaseName(databaseName)
        await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`)
      }
    } catch {
      cleanupFailed = true
    }

    try {
      await admin.$disconnect()
    } catch {
      cleanupFailed = true
    }

    try {
      assertTemporaryUploadsDirectory(uploadsDirectory)
      fs.rmSync(uploadsDirectory, { recursive: true, force: true })
    } catch {
      cleanupFailed = true
    }

    if (cleanupFailed) {
      throw new Error('Le nettoyage des ressources temporaires PostgreSQL est incomplet.')
    }
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error
    ? error.message
    : 'Erreur inconnue pendant la validation des écritures PostgreSQL.'
  console.error(message)
  process.exitCode = 1
})
