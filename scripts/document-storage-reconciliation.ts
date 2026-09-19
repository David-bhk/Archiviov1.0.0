import path from 'path'

import {
  parseConfirmedPostgreSQLOperationOptions,
  type ConfirmedPostgreSQLOperationOptions,
} from './confirmed-postgresql-operation'

export type DocumentStorageReconciliationOptions = ConfirmedPostgreSQLOperationOptions

export function parseDocumentStorageReconciliationOptions(
  argumentsList: string[],
): DocumentStorageReconciliationOptions {
  return parseConfirmedPostgreSQLOperationOptions(argumentsList, 'de réconciliation')
}

export function managedFilename(identifier: string, sourceFilename: string): string {
  const extension = path.extname(sourceFilename).toLowerCase()
  const safeExtension = /^\.[a-z0-9]{1,10}$/.test(extension) ? extension : ''
  return `${identifier}${safeExtension}`
}

export function isForbiddenExternalSource(sourcePath: string): boolean {
  return path.resolve(sourcePath)
    .split(/[\\/]/)
    .some((segment) => segment.toLowerCase().startsWith('business-management'))
}
