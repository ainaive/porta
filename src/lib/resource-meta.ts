import { z } from 'zod'

// Type-specific data stored in resources.meta (jsonb). Adding a new section
// later = new enum value in the schema + a meta schema here + a listing page.
export const toolMeta = z.object({
  url: z.url().optional(),
  docsUrl: z.url().optional(),
})

export const courseMeta = z.object({
  level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  estimatedHours: z.number().positive().optional(),
})

export const videoMeta = z.object({
  provider: z.enum(['youtube', 'bilibili']),
  embedUrl: z.url(),
  duration: z.string().optional(),
})

export const modelApiMeta = z.object({
  provider: z.string().optional(),
  docsUrl: z.url().optional(),
  endpoint: z.string().optional(),
  links: z
    .array(z.object({ label: z.string().min(1), url: z.url() }))
    .default([]),
})

export const metaSchemas = {
  tool: toolMeta,
  course: courseMeta,
  video: videoMeta,
  model_api: modelApiMeta,
} as const

export type ResourceType = keyof typeof metaSchemas

// Derived rather than hand-listed, so a new section can't be added to
// metaSchemas and silently skipped by anything iterating the types.
export const resourceTypes = Object.keys(metaSchemas) as ResourceType[]
export type ToolMeta = z.infer<typeof toolMeta>
export type CourseMeta = z.infer<typeof courseMeta>
export type VideoMeta = z.infer<typeof videoMeta>
export type ModelApiMeta = z.infer<typeof modelApiMeta>

// URL section segment for each resource type (and back).
export const sectionForType: Record<ResourceType, string> = {
  tool: 'tools',
  course: 'courses',
  video: 'videos',
  model_api: 'models',
}

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

// Builds the candidate meta object from type-specific form fields, then
// validates it against the zod schema for that resource type.
export function parseMeta(
  type: ResourceType,
  formData: FormData,
): { meta?: Record<string, unknown>; error?: string } {
  let candidate: Record<string, unknown>
  switch (type) {
    case 'tool':
      candidate = {
        url: optional(formString(formData, 'url')),
        docsUrl: optional(formString(formData, 'docsUrl')),
      }
      break
    case 'video':
      candidate = {
        provider: formString(formData, 'provider'),
        embedUrl: formString(formData, 'embedUrl'),
        duration: optional(formString(formData, 'duration')),
      }
      break
    case 'model_api':
      candidate = {
        provider: optional(formString(formData, 'provider')),
        docsUrl: optional(formString(formData, 'docsUrl')),
        endpoint: optional(formString(formData, 'endpoint')),
        links: formString(formData, 'links')
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => {
            const [label, ...rest] = line.split('|')
            return { label: label?.trim() ?? '', url: rest.join('|').trim() }
          }),
      }
      break
    case 'course': {
      const hours = formString(formData, 'estimatedHours')
      candidate = {
        level: optional(formString(formData, 'level')),
        estimatedHours: hours === '' ? undefined : Number(hours),
      }
      break
    }
  }

  const parsed = metaSchemas[type].safeParse(candidate)
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ')
    return { error: message }
  }
  return { meta: parsed.data }
}

export const typeForSection: Record<string, ResourceType> = Object.fromEntries(
  Object.entries(sectionForType).map(([type, section]) => [
    section,
    type as ResourceType,
  ]),
)
