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

export const typeForSection: Record<string, ResourceType> = Object.fromEntries(
  Object.entries(sectionForType).map(([type, section]) => [
    section,
    type as ResourceType,
  ]),
)
