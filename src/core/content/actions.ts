// The server-action contract shared by the platform and by any module that
// owns an admin surface of its own. Deliberately NOT a `'use server'` file:
// such a file may only export async functions, so the types and helpers
// every action needs have to live somewhere a module can import them from.
import { z } from 'zod'

// `error` is a message key under admin.errors (translated where rendered,
// in ActionFeedback), with `detail` interpolated for technical specifics.
// `values` echoes the submitted fields on error so forms can re-fill:
// React 19 resets uncontrolled <form action> forms on every submit, error
// included — without the echo a failed save discards everything typed.
export type ActionErrorCode =
  | 'slugFormat'
  | 'typeInvalid'
  | 'slugTaken'
  | 'titleRequired'
  | 'publishNeedsTranslation'
  | 'resourceNotFound'
  | 'emailInvalid'
  | 'metaInvalid'

export type ActionState = {
  ok?: boolean
  error?: ActionErrorCode
  detail?: string
  values?: Record<string, string>
}

export function submittedValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {}
  for (const [key, value] of formData.entries()) {
    if (typeof value === 'string' && !key.startsWith('$ACTION')) {
      values[key] = value
    }
  }
  return values
}

export const localeSchema = z.enum(['en', 'zh'])
export const uuidSchema = z.uuid()

// Drizzle wraps driver errors, so the postgres SQLSTATE lives on a cause a
// level or two down, not the top-level error — walk the chain to find it.
export function pgErrorCode(error: unknown): string | undefined {
  let current: unknown = error
  for (let depth = 0; depth < 5 && current; depth++) {
    const code = (current as { code?: unknown }).code
    if (typeof code === 'string') return code
    current = (current as { cause?: unknown }).cause
  }
  return undefined
}

// A slug that raced past the pre-check surfaces as a unique violation; a
// well-formed id whose parent row is missing (deleted concurrently, or a
// crafted request) fails a foreign key. Both become handled errors, not 500s.
export function isUniqueViolation(error: unknown): boolean {
  return pgErrorCode(error) === '23505'
}

export function isForeignKeyViolation(error: unknown): boolean {
  return pgErrorCode(error) === '23503'
}
