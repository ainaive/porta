import { z } from 'zod'
import { defineModule } from '@/core/module/define'

// Help & Tutorials: courses and written guides. Courses are the only section
// with sub-structure — chapters, which this module owns outright (schema.ts,
// chapters.ts, actions.ts).

export const courseMeta = z.object({
  level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  estimatedHours: z.number().positive().optional(),
})

export const guideMeta = z.object({
  level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  sourceUrl: z.url().optional(),
})

export type CourseMeta = z.infer<typeof courseMeta>
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
      landingTile: {
        kind: 'stat',
        titleKey: 'courses.landing.title',
        descriptionKey: 'courses.landing.description',
      },
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
      landingTile: {
        kind: 'stat',
        titleKey: 'guides.landing.title',
        descriptionKey: 'guides.landing.description',
      },
    },
  ],
  // Courses were a top-level section before this module existed.
  redirects: [{ from: '/courses', to: '/help/courses' }],
  messages: {
    en: () => import('./messages/en.json'),
    zh: () => import('./messages/zh.json'),
  },
})
