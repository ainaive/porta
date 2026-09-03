import { z } from 'zod'
import { defineModule } from '@/core/module/define'

// Events: office hours, workshops, migration clinics and quarterly reviews.
// One section, no sub-structure — a session is a resource with a date on it.

// `date` is an ISO calendar day rather than a timestamp: these are scheduled
// in a room, in one office's day, and storing an instant would invite a
// timezone conversion nobody asked for. `time` and `place` are free text for
// the same reason — "16:00–17:00" and "Room 4-2 + Zoom" are what the calendar
// invite says, and parsing them would buy nothing.
export const eventMeta = z.object({
  // Required: the listing orders on this, and a session with no date is an
  // announcement, not an event.
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  time: z.string().optional(),
  place: z.string().optional(),
  kind: z.enum(['office-hours', 'workshop', 'clinic', 'review']).optional(),
  registerUrl: z.url().optional(),
})

export type EventMeta = z.infer<typeof eventMeta>

export const events = defineModule({
  id: 'events',
  nav: [{ href: '/events', labelKey: 'nav.title', order: 40 }],
  sections: [
    {
      key: 'event',
      path: '/events',
      titleKey: 'events.title',
      descriptionKey: 'events.description',
      meta: eventMeta,
      metaFields: [
        {
          name: 'date',
          kind: 'text',
          labelKey: 'meta.date',
          required: true,
          placeholder: '2026-09-08',
        },
        { name: 'time', kind: 'text', labelKey: 'meta.time' },
        { name: 'place', kind: 'text', labelKey: 'meta.place' },
        {
          name: 'kind',
          kind: 'select',
          labelKey: 'meta.kind',
          emptyOption: true,
          options: [
            { value: 'office-hours', label: 'office-hours' },
            { value: 'workshop', label: 'workshop' },
            { value: 'clinic', label: 'clinic' },
            { value: 'review', label: 'review' },
          ],
        },
        {
          name: 'registerUrl',
          kind: 'text',
          labelKey: 'meta.registerUrl',
          span: 'full',
        },
      ],
      landingTile: {
        kind: 'stat',
        titleKey: 'events.landing.title',
        descriptionKey: 'events.landing.description',
      },
    },
  ],
  messages: {
    en: () => import('./messages/en.json'),
    zh: () => import('./messages/zh.json'),
  },
})
