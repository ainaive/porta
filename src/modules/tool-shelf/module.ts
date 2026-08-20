import { z } from 'zod'
import { defineModule } from '@/core/module/define'

export const toolMeta = z.object({
  url: z.url().optional(),
  docsUrl: z.url().optional(),
})

export type ToolMeta = z.infer<typeof toolMeta>

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
      ],
    },
  ],
  messages: {
    en: () => import('./messages/en.json'),
    zh: () => import('./messages/zh.json'),
  },
})
