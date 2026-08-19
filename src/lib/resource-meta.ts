import { z } from 'zod'
import type { MetaField } from '@/core/module/define'
import { findSection, type SectionKey, sectionKeys } from '@/core/module/derive'

// The per-type `meta` schemas themselves now live with the modules that own
// them (`src/modules/*/module.ts`); what stays here is the generic write-time
// validation the platform runs over whatever a module registered.

/** A registered section key, stored in `resources.type`. */
export type ResourceType = SectionKey

export const resourceTypes: readonly ResourceType[] = sectionKeys

export const slugSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug must be kebab-case')

export function formString(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

function optional(value: string): string | undefined {
  return value === '' ? undefined : value
}

// One form field → one candidate value. Optional fields submit `undefined`
// for an empty input so they drop out of the parsed object; required ones
// submit '' and let the module's zod schema produce the error.
function fieldValue(field: MetaField, formData: FormData): unknown {
  const raw = formString(formData, field.name)
  switch (field.kind) {
    case 'lines':
      // "Label | URL" per line. Split on the first pipe only — a URL may
      // legitimately contain one.
      return raw
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [label, ...rest] = line.split('|')
          return { label: label?.trim() ?? '', url: rest.join('|').trim() }
        })
    case 'number':
      return raw === '' ? undefined : Number(raw)
    default:
      return field.required ? raw : optional(raw)
  }
}

// Builds the candidate meta object from the section's declared fields, then
// validates it against that section's zod schema.
export function parseMeta(
  type: ResourceType,
  formData: FormData,
): { meta?: Record<string, unknown>; error?: string } {
  const section = findSection(type)
  if (!section) return { error: `type: unregistered section "${type}"` }

  const candidate: Record<string, unknown> = {}
  for (const field of section.metaFields) {
    candidate[field.name] = fieldValue(field, formData)
  }

  const parsed = section.meta.safeParse(candidate)
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ')
    return { error: message }
  }
  return { meta: parsed.data as Record<string, unknown> }
}
