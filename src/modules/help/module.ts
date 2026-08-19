import { z } from 'zod'
import { defineModule } from '@/core/module/define'

// Help & Tutorials: video courses, standalone teaching videos, and written
// guides. Courses are the only section with sub-structure — chapters, which
// this module owns outright (schema.ts, chapters.ts, actions.ts).

export const courseMeta = z.object({
  level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  estimatedHours: z.number().positive().optional(),
})

export const videoMeta = z.object({
  provider: z.enum(['youtube', 'bilibili']),
  embedUrl: z.url(),
  duration: z.string().optional(),
})

export const guideMeta = z.object({
  level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  sourceUrl: z.url().optional(),
})

export type CourseMeta = z.infer<typeof courseMeta>
export type VideoMeta = z.infer<typeof videoMeta>
export type GuideMeta = z.infer<typeof guideMeta>

const levelField = {
  name: 'level',
  kind: 'select',
  labelKey: 'meta.level',
  emptyOption: true,
  options: [
    { value: 'beginner', label: 'beginner' },
    { value: 'intermediate', label: 'intermediate' },
    { value: 'advanced', label: 'advanced' },
  ],
} as const

export const help = defineModule({
  id: 'help',
  nav: [{ href: '/help', labelKey: 'nav.title', order: 30 }],
  sections: [
    {
      key: 'course',
      path: '/help/courses',
      titleKey: 'courses.title',
      descriptionKey: 'courses.description',
      meta: courseMeta,
      metaFields: [
        levelField,
        {
          name: 'estimatedHours',
          kind: 'number',
          labelKey: 'meta.hours',
          min: '0',
          step: '0.5',
        },
      ],
    },
    {
      key: 'video',
      path: '/help/videos',
      titleKey: 'videos.title',
      descriptionKey: 'videos.description',
      meta: videoMeta,
      metaFields: [
        {
          name: 'provider',
          kind: 'select',
          labelKey: 'meta.provider',
          required: true,
          options: [
            { value: 'youtube', label: 'YouTube' },
            { value: 'bilibili', label: 'Bilibili' },
          ],
        },
        {
          name: 'embedUrl',
          kind: 'text',
          labelKey: 'meta.embedUrl',
          required: true,
          span: 'full',
        },
        {
          name: 'duration',
          kind: 'text',
          labelKey: 'meta.duration',
          placeholder: '12:34',
        },
      ],
    },
    {
      key: 'guide',
      path: '/help/guides',
      titleKey: 'guides.title',
      descriptionKey: 'guides.description',
      meta: guideMeta,
      metaFields: [
        levelField,
        { name: 'sourceUrl', kind: 'text', labelKey: 'meta.sourceUrl' },
      ],
    },
  ],
  // Courses and videos were top-level sections before this module existed.
  redirects: [
    { from: '/courses', to: '/help/courses' },
    { from: '/videos', to: '/help/videos' },
  ],
  messages: {
    en: () => import('./messages/en.json'),
    zh: () => import('./messages/zh.json'),
  },
})
