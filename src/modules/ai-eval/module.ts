import { z } from 'zod'
import { defineModule } from '@/core/module/define'

// Evaluations of models, agents, and anything else worth measuring. The
// `model` section carries what used to be the standalone model_api catalog;
// agent and report sections start empty and are built out by this module's
// team without touching core.

export const modelMeta = z.object({
  provider: z.string().optional(),
  docsUrl: z.url().optional(),
  endpoint: z.string().optional(),
  links: z
    .array(z.object({ label: z.string().min(1), url: z.url() }))
    .default([]),
})

export const agentMeta = z.object({
  vendor: z.string().optional(),
  docsUrl: z.url().optional(),
  links: z
    .array(z.object({ label: z.string().min(1), url: z.url() }))
    .default([]),
})

export const reportMeta = z.object({
  subject: z.string().optional(),
  sourceUrl: z.url().optional(),
})

export type ModelMeta = z.infer<typeof modelMeta>
export type AgentMeta = z.infer<typeof agentMeta>
export type ReportMeta = z.infer<typeof reportMeta>

const linksField = {
  name: 'links',
  kind: 'lines',
  labelKey: 'meta.links',
  span: 'full',
  mono: true,
} as const

export const aiEval = defineModule({
  id: 'ai-eval',
  nav: [{ href: '/evals', labelKey: 'nav.title', order: 40 }],
  sections: [
    {
      key: 'agent',
      path: '/evals/agents',
      titleKey: 'agents.title',
      descriptionKey: 'agents.description',
      meta: agentMeta,
      metaFields: [
        { name: 'vendor', kind: 'text', labelKey: 'meta.vendor' },
        { name: 'docsUrl', kind: 'text', labelKey: 'meta.docsUrl' },
        linksField,
      ],
    },
    {
      key: 'model',
      path: '/evals/models',
      titleKey: 'models.title',
      descriptionKey: 'models.description',
      meta: modelMeta,
      metaFields: [
        { name: 'provider', kind: 'text', labelKey: 'meta.provider' },
        { name: 'docsUrl', kind: 'text', labelKey: 'meta.docsUrl' },
        {
          name: 'endpoint',
          kind: 'text',
          labelKey: 'meta.endpoint',
          span: 'full',
        },
        linksField,
      ],
    },
    {
      key: 'report',
      path: '/evals/reports',
      titleKey: 'reports.title',
      descriptionKey: 'reports.description',
      meta: reportMeta,
      metaFields: [
        { name: 'subject', kind: 'text', labelKey: 'meta.subject' },
        { name: 'sourceUrl', kind: 'text', labelKey: 'meta.sourceUrl' },
      ],
    },
  ],
  // The model catalog used to sit at the top level; keep those links alive.
  redirects: [{ from: '/models', to: '/evals/models' }],
  messages: {
    en: () => import('./messages/en.json'),
    zh: () => import('./messages/zh.json'),
  },
})
