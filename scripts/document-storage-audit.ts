import path from 'path'

export type StoredPathClassification =
  | { kind: 'managed'; resolvedPath: string }
  | { kind: 'legacy-rooted'; resolvedPath: string; managedCandidate: string }
  | { kind: 'external'; resolvedPath: string }

function isInsideRoot(root: string, candidate: string): boolean {
  const relative = path.relative(path.resolve(root), path.resolve(candidate))
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))
}

export function classifyStoredPath(
  uploadsRoot: string,
  storedPath: string,
): StoredPathClassification {
  const normalizedRoot = path.resolve(uploadsRoot)
  const legacyMatch = storedPath.match(/^[/\\]uploads[/\\](.+)$/i)

  if (legacyMatch) {
    const relativeSegments = legacyMatch[1].split(/[/\\]/).filter(Boolean)
    return {
      kind: 'legacy-rooted',
      resolvedPath: path.resolve(storedPath),
      managedCandidate: path.resolve(normalizedRoot, ...relativeSegments),
    }
  }

  const resolvedPath = path.isAbsolute(storedPath)
    ? path.resolve(storedPath)
    : path.resolve(normalizedRoot, storedPath)

  if (isInsideRoot(normalizedRoot, resolvedPath)) {
    return { kind: 'managed', resolvedPath }
  }

  return { kind: 'external', resolvedPath }
}

export function metadataSignature(input: {
  filename: string
  filePath: string
  fileSize: number
}): string {
  return JSON.stringify([input.filename, input.filePath, input.fileSize])
}
