import {
  parseConfirmedPostgreSQLOperationOptions,
  type ConfirmedPostgreSQLOperationOptions,
} from './confirmed-postgresql-operation'

export type SeedDocumentMetadata = {
  id: number
  filename: string
  fileSize: number
  filePath: string
  status: string
  reviewedBy: number | null
  reviewedAt: Date | null
  reviewComment: string | null
  classificationLevel: number | null
  _count: { activities: number }
}

type SeedDocumentSignature = Pick<SeedDocumentMetadata, 'filename' | 'fileSize' | 'filePath'>

export const SEED_DOCUMENT_SIGNATURES: readonly SeedDocumentSignature[] = [
  {
    filename: 'rapport_q1_2024.pdf',
    fileSize: 2_400_000,
    filePath: '/uploads/rapport_q1_2024.pdf',
  },
  {
    filename: 'manuel_procedures.docx',
    fileSize: 1_800_000,
    filePath: '/uploads/manuel_procedures.docx',
  },
  {
    filename: 'budget_2024.xlsx',
    fileSize: 3_200_000,
    filePath: '/uploads/budget_2024.xlsx',
  },
]

export type SeedDocumentCleanupPlan = {
  candidates: SeedDocumentMetadata[]
  groupCounts: number[]
  activityReferences: number
  reviewedOrClassified: number
}

function matchesSignature(
  document: SeedDocumentMetadata,
  signature: SeedDocumentSignature,
): boolean {
  return document.filename === signature.filename &&
    document.fileSize === signature.fileSize &&
    document.filePath === signature.filePath
}

export function buildSeedDocumentCleanupPlan(
  documents: SeedDocumentMetadata[],
): SeedDocumentCleanupPlan {
  const candidates: SeedDocumentMetadata[] = []
  const groupCounts = SEED_DOCUMENT_SIGNATURES.map(() => 0)
  let activityReferences = 0
  let reviewedOrClassified = 0

  for (const document of documents) {
    const signatureIndex = SEED_DOCUMENT_SIGNATURES.findIndex((signature) =>
      matchesSignature(document, signature),
    )
    if (signatureIndex === -1) continue

    groupCounts[signatureIndex] += 1
    candidates.push(document)
    activityReferences += document._count.activities
    if (
      document.status !== 'pending' ||
      document.reviewedBy !== null ||
      document.reviewedAt !== null ||
      document.reviewComment !== null ||
      document.classificationLevel !== null
    ) {
      reviewedOrClassified += 1
    }
  }

  return { candidates, groupCounts, activityReferences, reviewedOrClassified }
}

export function assertExpectedSeedDocumentCleanupPlan(plan: SeedDocumentCleanupPlan): void {
  const hasExpectedGroups = plan.groupCounts.every((count) => count === 4)
  if (!hasExpectedGroups || plan.candidates.length !== 12) {
    throw new Error(
      'Les métadonnées du seed ne correspondent plus aux trois signatures physiques de quatre lignes ; opération annulée.',
    )
  }
}

export function parseSeedDocumentCleanupOptions(
  argumentsList: string[],
): ConfirmedPostgreSQLOperationOptions {
  return parseConfirmedPostgreSQLOperationOptions(
    argumentsList,
    'de nettoyage des métadonnées du seed',
  )
}
