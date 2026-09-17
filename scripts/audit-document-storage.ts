import 'dotenv/config'

import fs from 'fs'
import os from 'os'
import path from 'path'
import { PrismaClient as PostgreSQLClient } from '@archivio/postgresql-client'

import { getPostgreSQLUrl } from '../server/database-config'
import { classifyStoredPath, metadataSignature } from './document-storage-audit'

type DocumentMetadata = {
  filename: string
  filePath: string
  fileSize: number
}

type WorkspaceFile = {
  basename: string
  bytes: number
  absolutePath: string
}

const SKIPPED_DIRECTORIES = new Set([
  '.archivio-backups',
  '.git',
  'dist',
  'node_modules',
  'UI',
])

function fileExistsWithSize(filePath: string, expectedBytes: number): boolean {
  try {
    const stats = fs.statSync(filePath)
    return stats.isFile() && stats.size === expectedBytes
  } catch {
    return false
  }
}

function inventoryWorkspace(root: string): WorkspaceFile[] {
  const files: WorkspaceFile[] = []

  function visit(directory: string): void {
    const entries = fs.readdirSync(directory, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue
      const absolutePath = path.join(directory, entry.name)
      if (entry.isDirectory()) {
        if (!SKIPPED_DIRECTORIES.has(entry.name)) visit(absolutePath)
        continue
      }
      if (!entry.isFile()) continue
      const stats = fs.statSync(absolutePath)
      files.push({ basename: entry.name.toLocaleLowerCase('en'), bytes: stats.size, absolutePath })
    }
  }

  visit(root)
  return files
}

function candidateKey(filename: string, bytes: number): string {
  return `${filename.toLocaleLowerCase('en')}\u0000${bytes}`
}

function isInsideDirectory(directory: string, candidate: string): boolean {
  const relative = path.relative(path.resolve(directory), path.resolve(candidate))
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))
}

function countDuplicateMetadata(documents: DocumentMetadata[]): {
  groups: number
  rows: number
  extraRows: number
} {
  const signatures = new Map<string, number>()
  for (const document of documents) {
    const signature = metadataSignature(document)
    signatures.set(signature, (signatures.get(signature) || 0) + 1)
  }
  const repeated = Array.from(signatures.values()).filter((count) => count > 1)
  return {
    groups: repeated.length,
    rows: repeated.reduce((sum, count) => sum + count, 0),
    extraRows: repeated.reduce((sum, count) => sum + count - 1, 0),
  }
}

async function readDocumentsReadOnly(client: PostgreSQLClient): Promise<DocumentMetadata[]> {
  return client.$transaction(async (transaction) => {
    await transaction.$executeRawUnsafe('SET TRANSACTION READ ONLY')
    return transaction.file.findMany({
      select: { filename: true, filePath: true, fileSize: true },
      orderBy: { id: 'asc' },
    })
  })
}

async function main(): Promise<void> {
  if (process.env.ARCHIVIO_DB_PROVIDER?.trim() !== 'postgresql') {
    throw new Error('ARCHIVIO_DB_PROVIDER doit valoir postgresql pour auditer les documents actifs.')
  }

  const uploadsRoot = path.resolve(process.cwd(), process.env.UPLOADS_DIR?.trim() || 'uploads')
  const client = new PostgreSQLClient({ datasources: { db: { url: getPostgreSQLUrl() } } })

  try {
    const documents = await readDocumentsReadOnly(client)
    const workspaceFiles = inventoryWorkspace(process.cwd())
    const workspaceIndex = new Map<string, string[]>()
    for (const file of workspaceFiles) {
      const key = candidateKey(file.basename, file.bytes)
      const matches = workspaceIndex.get(key) || []
      matches.push(file.absolutePath)
      workspaceIndex.set(key, matches)
    }

    let managedExisting = 0
    let managedMissing = 0
    let legacyRooted = 0
    let legacyTargetExisting = 0
    let legacyManagedCandidate = 0
    let external = 0
    let externalTargetExisting = 0
    let externalInsideWorkspace = 0
    let externalInsideWorkspaceExisting = 0
    let externalOutsideWorkspace = 0
    let externalOutsideWorkspaceExisting = 0
    let externalExistingInTemporaryDirectory = 0
    let externalExistingInUserProfile = 0
    let externalExistingElsewhere = 0
    let unmanagedWorkspaceCandidates = 0

    for (const document of documents) {
      const classification = classifyStoredPath(uploadsRoot, document.filePath)
      if (classification.kind === 'managed') {
        if (fileExistsWithSize(classification.resolvedPath, document.fileSize)) managedExisting += 1
        else managedMissing += 1
        continue
      }

      const workspaceMatches = workspaceIndex.get(candidateKey(document.filename, document.fileSize)) || []
      const outsideManagedRoot = workspaceMatches.some((candidate) => {
        const relative = path.relative(uploadsRoot, candidate)
        return relative.startsWith('..') || path.isAbsolute(relative)
      })
      if (outsideManagedRoot) unmanagedWorkspaceCandidates += 1

      if (classification.kind === 'legacy-rooted') {
        legacyRooted += 1
        if (fileExistsWithSize(classification.resolvedPath, document.fileSize)) legacyTargetExisting += 1
        if (fileExistsWithSize(classification.managedCandidate, document.fileSize)) {
          legacyManagedCandidate += 1
        }
      } else {
        external += 1
        const targetExists = fileExistsWithSize(classification.resolvedPath, document.fileSize)
        const targetInsideWorkspace = isInsideDirectory(process.cwd(), classification.resolvedPath)
        if (targetExists) {
          externalTargetExisting += 1
        }
        if (targetInsideWorkspace) {
          externalInsideWorkspace += 1
          if (targetExists) externalInsideWorkspaceExisting += 1
        } else {
          externalOutsideWorkspace += 1
          if (targetExists) {
            externalOutsideWorkspaceExisting += 1
            if (isInsideDirectory(os.tmpdir(), classification.resolvedPath)) {
              externalExistingInTemporaryDirectory += 1
            } else if (isInsideDirectory(os.homedir(), classification.resolvedPath)) {
              externalExistingInUserProfile += 1
            } else {
              externalExistingElsewhere += 1
            }
          }
        }
      }
    }

    const duplicates = countDuplicateMetadata(documents)
    console.log('Audit documentaire PostgreSQL en lecture seule :')
    console.log(`- métadonnées : ${documents.length}`)
    console.log(`- fichiers gérés présents avec taille conforme : ${managedExisting}`)
    console.log(`- fichiers gérés absents ou de taille différente : ${managedMissing}`)
    console.log(`- anciens chemins /uploads/... : ${legacyRooted}`)
    console.log(`- cibles historiques encore présentes : ${legacyTargetExisting}`)
    console.log(`- candidats directs dans la racine actuelle avec taille conforme : ${legacyManagedCandidate}`)
    console.log(`- autres chemins externes : ${external}`)
    console.log(`- autres cibles externes encore présentes : ${externalTargetExisting}`)
    console.log(
      `- chemins externes dans le dépôt : ${externalInsideWorkspace}, dont ${externalInsideWorkspaceExisting} cible(s) présente(s)`,
    )
    console.log(
      `- chemins externes hors dépôt : ${externalOutsideWorkspace}, dont ${externalOutsideWorkspaceExisting} cible(s) présente(s)`,
    )
    console.log(
      `- cibles externes présentes par zone : temporaire=${externalExistingInTemporaryDirectory}, profil-utilisateur=${externalExistingInUserProfile}, autre=${externalExistingElsewhere}`,
    )
    console.log(`- candidats nom + taille ailleurs dans le dépôt : ${unmanagedWorkspaceCandidates}`)
    console.log(
      `- doublons physiques de métadonnées : ${duplicates.groups} groupe(s), ${duplicates.rows} ligne(s), ${duplicates.extraRows} répétition(s)`,
    )
  } finally {
    await client.$disconnect()
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Erreur inconnue pendant l’audit documentaire.'
  console.error(message)
  process.exitCode = 1
})
