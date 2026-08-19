import { z } from 'zod'
import { defineModule } from '@/core/module/define'

export const courseMeta = z.object({
  level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  estimatedHours: z.number().positive().optional(),
})

export const videoMeta = z.object({
  provider: z.enum(['youtube', 'bilibili']),
  embedUrl: z.url(),
  duration: z.string().optional(),
})

export type CourseMeta = z.infer<typeof courseMeta>
export type VideoMeta = z.infer<typeof videoMeta>

export const help = defineModule({
  id: 'help',
  nav: [
    { href: '/courses', labelKey: 'nav.courses', order: 20 },
    { href: '/videos', labelKey: 'nav.videos', order: 30 },
  ],
  sections: [
    {
      key: 'course',
      path: '/courses',
      titleKey: 'courses.title',
      descriptionKey: 'courses.description',
      meta: courseMeta,
      metaFields: [
        {
          name: 'level',
          kind: 'select',
          labelKey: 'meta.level',
          emptyOption: true,
          options: [
            { value: 'beginner', label: 'beginner' },
            { value: 'intermediate', label: 'intermediate' },
            { value: 'advanced', label: 'advanced' },
          ],
        },
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
      path: '/videos',
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
  ],
  messages: {
    en: () => import('./messages/en.json'),
    zh: () => import('./messages/zh.json'),
  },
})
