import { z } from 'zod'
import { defineModule } from '@/core/module/define'

// The catalog's facets are closed enums rather than tags: the listing counts
// them, the admin form offers them as a dropdown, and "Go" meaning the
// language has to stay distinct from someone tagging a course "go".
const CATEGORIES = [
  'build',
  'cicd',
  'observability',
  'testing',
  'security',
  'data',
  'platform',
  'runtime',
  'environments',
  'finops',
] as const

const MATURITIES = ['ga', 'beta', 'deprecated'] as const

const LANGUAGES = [
  'go',
  'typescript',
  'python',
  'rust',
  'java',
  'multi',
] as const

export const toolMeta = z.object({
  url: z.url().optional(),
  docsUrl: z.url().optional(),
  category: z.enum(CATEGORIES).optional(),
  maturity: z.enum(MATURITIES).optional(),
  language: z.enum(LANGUAGES).optional(),
})

export type ToolMeta = z.infer<typeof toolMeta>

// Stored values stay stable and lower-case; what a reader sees resolves in
// the module's own bundle, so a facet chip reads "Observability" or
// "可观测性" without the database knowing either word.
const options = (field: string, values: readonly string[]) =>
  values.map((value) => ({
    value,
    label: value,
    labelKey: `values.${field}.${value}`,
  }))

export const toolShelf = defineModule({
  id: 'tool-shelf',
  nav: [{ href: '/tools', labelKey: 'nav.title', order: 10 }],
  sections: [
    {
      key: 'tool',
      path: '/tools',
      titleKey: 'tools.title',
      descriptionKey: 'tools.description',
      meta: toolMeta,
      metaFields: [
        { name: 'url', kind: 'text', labelKey: 'meta.url' },
        { name: 'docsUrl', kind: 'text', labelKey: 'meta.docsUrl' },
        {
          name: 'category',
          kind: 'select',
          labelKey: 'meta.category',
          emptyOption: true,
          options: options('category', CATEGORIES),
        },
        {
          // "Maturity", not "Status": the admin form already has a Status
          // select for draft/published, and two of them on one page is a
          // trap for whoever is publishing.
          name: 'maturity',
          kind: 'select',
          labelKey: 'meta.maturity',
          emptyOption: true,
          options: options('maturity', MATURITIES),
        },
        {
          name: 'language',
          kind: 'select',
          labelKey: 'meta.language',
          emptyOption: true,
          options: options('language', LANGUAGES),
        },
      ],
      // Scanned and compared, not browsed — a table beats a card grid.
      listing: { kind: 'table' },
      facets: ['category', 'maturity', 'language'],
      landingTile: {
        kind: 'list',
        titleKey: 'tools.landing.title',
        descriptionKey: 'tools.landing.description',
      },
    },
  ],
  messages: {
    en: () => import('./messages/en.json'),
    zh: () => import('./messages/zh.json'),
  },
})
