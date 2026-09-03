import { z } from 'zod'
import { defineModule } from '@/core/module/define'

// The Handbook: the written material that teaches the toolchain. Two sections
// that read as one body of work — Getting started (tracks, the guided path a
// newcomer walks) and Docs & guides (reference and task-shaped how-tos).
//
// Tracks are the only section with sub-structure — steps, which this module
// owns outright (schema.ts, steps.ts, actions.ts).

export const trackMeta = z.object({
  level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  estimatedHours: z.number().positive().optional(),
})

// `group` is what lets the Docs listing render as the design's grouped rows
// rather than one flat grid; `readingTime` is the card's corner label, free
// text because "8 min read", "Reference" and "Policy" are all legitimate.
export const docMeta = z.object({
  group: z.enum(['foundations', 'guides', 'working-with-us']).optional(),
  readingTime: z.string().optional(),
  sourceUrl: z.url().optional(),
})

export type TrackMeta = z.infer<typeof trackMeta>
export type DocMeta = z.infer<typeof docMeta>

export const handbook = defineModule({
  id: 'handbook',
  // Two entries from one manifest: the module owns two peer sections and has
  // no index of its own, so each nav item points straight at a listing.
  nav: [
    { href: '/docs', labelKey: 'docs.nav', order: 20 },
    { href: '/start', labelKey: 'tracks.nav', order: 30 },
  ],
  sections: [
    {
      key: 'doc',
      path: '/docs',
      titleKey: 'docs.title',
      descriptionKey: 'docs.description',
      meta: docMeta,
      metaFields: [
        {
          name: 'group',
          kind: 'select',
          labelKey: 'meta.group',
          emptyOption: true,
          options: [
            { value: 'foundations', label: 'foundations' },
            { value: 'guides', label: 'guides' },
            { value: 'working-with-us', label: 'working-with-us' },
          ],
        },
        { name: 'readingTime', kind: 'text', labelKey: 'meta.readingTime' },
        { name: 'sourceUrl', kind: 'text', labelKey: 'meta.sourceUrl' },
      ],
      landingTile: {
        kind: 'stat',
        titleKey: 'docs.landing.title',
        descriptionKey: 'docs.landing.description',
      },
    },
    {
      key: 'track',
      path: '/start',
      titleKey: 'tracks.title',
      descriptionKey: 'tracks.description',
      meta: trackMeta,
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
      landingTile: {
        kind: 'stat',
        titleKey: 'tracks.landing.title',
        descriptionKey: 'tracks.landing.description',
      },
    },
  ],
  // Both sections moved out from under /help when this module stopped being
  // "Help & Tutorials". Nothing was ever public, but the proxy applies these
  // before it gates, and that ordering is worth keeping a live test on.
  redirects: [
    { from: '/help/courses', to: '/start' },
    { from: '/help/guides', to: '/docs' },
  ],
  messages: {
    en: () => import('./messages/en.json'),
    zh: () => import('./messages/zh.json'),
  },
})
