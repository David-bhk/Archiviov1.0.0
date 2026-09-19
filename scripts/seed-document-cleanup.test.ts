import { describe, expect, it } from 'vitest'

import {
  SEED_DOCUMENT_SIGNATURES,
  assertExpectedSeedDocumentCleanupPlan,
  buildSeedDocumentCleanupPlan,
  parseSeedDocumentCleanupOptions,
  type SeedDocumentMetadata,
} from './seed-document-cleanup'

function seedDocument(
  signatureIndex: number,
  id: number,
  overrides: Partial<SeedDocumentMetadata> = {},
): SeedDocumentMetadata {
  const signature = SEED_DOCUMENT_SIGNATURES[signatureIndex]
  return {
    id,
    filename: signature.filename,
    fileSize: signature.fileSize,
    filePath: signature.filePath,
    status: 'pending',
    reviewedBy: null,
    reviewedAt: null,
    reviewComment: null,
    classificationLevel: null,
    _count: { activities: 0 },
    ...overrides,
  }
}

describe('seed document cleanup options', () => {
  it('uses a read-only dry run by default', () => {
    expect(parseSeedDocumentCleanupOptions([])).toEqual({ mode: 'dry-run' })
  })

  it('requires every destructive confirmation', () => {
    expect(parseSeedDocumentCleanupOptions([
      '--apply',
      '--confirm-database=archivio',
      '--confirm-stopped=archivio',
      '--confirm-backup=archivio-20260919T090000000Z',
      '--confirm-count=12',
    ])).toEqual({
      mode: 'apply',
      confirmedDatabaseName: 'archivio',
      confirmedStoppedDatabaseName: 'archivio',
      confirmedBackup: 'archivio-20260919T090000000Z',
      confirmedCount: 12,
    })
  })
})

describe('seed document cleanup plan', () => {
  it('accepts exactly four rows for each historical physical seed signature', () => {
    const documents = SEED_DOCUMENT_SIGNATURES.flatMap((_, signatureIndex) =>
      Array.from({ length: 4 }, (_unused, repetition) =>
        seedDocument(signatureIndex, signatureIndex * 4 + repetition + 1),
      ),
    )
    const plan = buildSeedDocumentCleanupPlan(documents)

    expect(plan.groupCounts).toEqual([4, 4, 4])
    expect(plan.candidates).toHaveLength(12)
    expect(plan.activityReferences).toBe(0)
    expect(plan.reviewedOrClassified).toBe(0)
    expect(() => assertExpectedSeedDocumentCleanupPlan(plan)).not.toThrow()
  })

  it('keeps reviewed, classified, and audited rows in the cleanup while counting their history', () => {
    const variants: Partial<SeedDocumentMetadata>[] = [
      { status: 'archived', reviewedBy: 1, reviewedAt: new Date(), reviewComment: 'Traité' },
      { classificationLevel: 2 },
      { _count: { activities: 1 } },
    ]
    const documents = SEED_DOCUMENT_SIGNATURES.flatMap((_, signatureIndex) =>
      Array.from({ length: 4 }, (_unused, repetition) =>
        seedDocument(
          signatureIndex,
          signatureIndex * 4 + repetition + 1,
          signatureIndex === 0 && repetition < variants.length ? variants[repetition] : {},
        ),
      ),
    )
    const plan = buildSeedDocumentCleanupPlan(documents)

    expect(plan.candidates).toHaveLength(12)
    expect(plan.activityReferences).toBe(1)
    expect(plan.reviewedOrClassified).toBe(2)
    expect(() => assertExpectedSeedDocumentCleanupPlan(plan)).not.toThrow()
  })

  it('refuses a missing or additional historical row', () => {
    const documents = SEED_DOCUMENT_SIGNATURES.flatMap((_, signatureIndex) =>
      Array.from({ length: 4 }, (_unused, repetition) =>
        seedDocument(signatureIndex, signatureIndex * 4 + repetition + 1),
      ),
    )

    expect(() =>
      assertExpectedSeedDocumentCleanupPlan(buildSeedDocumentCleanupPlan(documents.slice(1))),
    ).toThrow('opération annulée')
    expect(() =>
      assertExpectedSeedDocumentCleanupPlan(
        buildSeedDocumentCleanupPlan([...documents, seedDocument(0, 99)]),
      ),
    ).toThrow('opération annulée')
  })
})
