import { z } from 'zod'
import { defineModule } from '@/core/module/define'

export const modelApiMeta = z.object({
  provider: z.string().optional(),
  docsUrl: z.url().optional(),
  endpoint: z.string().optional(),
  links: z
    .array(z.object({ label: z.string().min(1), url: z.url() }))
    .default([]),
})

export type ModelApiMeta = z.infer<typeof modelApiMeta>

export const aiEval = defineModule({
  id: 'ai-eval',
  nav: [{ href: '/models', labelKey: 'nav.models', order: 40 }],
  sections: [
    {
      key: 'model_api',
      path: '/models',
      titleKey: 'models.title',
      descriptionKey: 'models.description',
      meta: modelApiMeta,
      metaFields: [
        { name: 'provider', kind: 'text', labelKey: 'meta.provider' },
        { name: 'docsUrl', kind: 'text', labelKey: 'meta.docsUrl' },
        {
          name: 'endpoint',
          kind: 'text',
          labelKey: 'meta.endpoint',
          span: 'full',
        },
        {
          name: 'links',
          kind: 'lines',
          labelKey: 'meta.links',
          span: 'full',
          mono: true,
        },
      ],
    },
  ],
  messages: {
    en: () => import('./messages/en.json'),
    zh: () => import('./messages/zh.json'),
  },
})
