// Dev seed: wipes content tables (not users) and inserts sample resources,
// including zh-only and en-only entries to exercise the translation fallback,
// and a draft that must never surface publicly. Run with `bun run db:seed`.

import type { ResourceType } from '../src/core/content/meta'
import { db } from '../src/db'
import { resources, resourceTranslations } from '../src/db/schema'
import {
  trackSteps,
  trackStepTranslations,
} from '../src/modules/handbook/schema'

// The seed starts by deleting all content, and bun auto-loads .env — so a
// production DATABASE_URL sitting in the environment must not be enough to
// point the wipe at production. Same posture as tests/preload.ts.
const host = process.env.DATABASE_URL
  ? new URL(process.env.DATABASE_URL).hostname
  : 'localhost' // unset falls through to the db client's own error
if (
  // URL.hostname keeps the brackets on IPv6 literals, hence '[::1]'.
  !['localhost', '127.0.0.1', '[::1]'].includes(host) &&
  process.env.SEED_FORCE !== '1'
) {
  console.error(
    `Refusing to seed non-local database host "${host}" — the seed deletes all content. Set SEED_FORCE=1 to override.`,
  )
  process.exit(1)
}

type SeedTranslation = {
  locale: 'en' | 'zh'
  title: string
  summary: string
  body?: string
}

type SeedResource = {
  type: ResourceType
  slug: string
  status?: 'draft' | 'published'
  tags: string[]
  meta?: Record<string, unknown>
  translations: SeedTranslation[]
}

const SEED: SeedResource[] = [
  {
    type: 'tool',
    slug: 'silicon-cli',
    tags: ['cli', 'devops'],
    meta: {
      url: 'https://example.com/silicon-cli',
      docsUrl: 'https://example.com/silicon-cli/docs',
    },
    translations: [
      {
        locale: 'en',
        title: 'Silicon CLI',
        summary: 'Command-line companion for the Silicon Ecosystem toolchain.',
        body: '## Install\n\n```bash\nbrew install silicon-cli\n```\n\nThen run `silicon login` to authenticate.',
      },
      {
        locale: 'zh',
        title: '硅基命令行工具',
        summary: '硅基生态平台工具链的命令行助手。',
        body: '## 安装\n\n```bash\nbrew install silicon-cli\n```\n\n然后运行 `silicon login` 完成认证。',
      },
    ],
  },
  {
    type: 'tool',
    slug: 'internal-mirror',
    tags: ['infra'],
    meta: { url: 'https://mirror.example.internal' },
    translations: [
      {
        locale: 'zh',
        title: '内部镜像源',
        summary: 'npm、PyPI 与容器镜像的内网加速源。',
        body: '### 用法\n\n把 registry 指向 `mirror.example.internal` 即可。',
      },
    ],
  },
  {
    type: 'tool',
    slug: 'ci-dashboard',
    tags: ['devops', 'ci'],
    meta: { url: 'https://ci.example.internal' },
    translations: [
      {
        locale: 'en',
        title: 'CI Dashboard',
        summary: 'Live view of pipelines, flaky tests, and deploy status.',
        body: 'Single pane of glass for all CI pipelines.',
      },
    ],
  },
  {
    type: 'tool',
    slug: 'secret-draft-tool',
    status: 'draft',
    tags: ['wip'],
    translations: [
      {
        locale: 'en',
        title: 'Secret draft tool',
        summary: 'Should never appear on public pages.',
      },
    ],
  },
  {
    type: 'track',
    slug: 'prompt-engineering-101',
    tags: ['llm', 'prompting'],
    meta: { level: 'beginner', estimatedHours: 3 },
    translations: [
      {
        locale: 'en',
        title: 'Prompt Engineering 101',
        summary: 'A practical introduction to writing effective prompts.',
        body: 'Three short steps that take you from zero to productive prompting.',
      },
      {
        locale: 'zh',
        title: '提示词工程入门',
        summary: '编写高质量提示词的实用入门课。',
        body: '三个短章节，带你从零开始高效使用提示词。',
      },
    ],
  },
  {
    type: 'doc',
    slug: 'request-an-invite',
    tags: ['onboarding'],
    meta: { level: 'beginner' },
    translations: [
      {
        locale: 'en',
        title: 'Requesting an invite',
        summary:
          'How to get a Silicon Ecosystem account, and what to do when a link expires.',
        body: 'There is no open sign-up. Ask an admin for an invite link; it lasts seven days and works once.',
      },
      {
        locale: 'zh',
        title: '如何申请邀请',
        summary: '怎样获得硅基生态平台账号，以及邀请链接过期后该怎么办。',
        body: '平台不开放自助注册。请向管理员索取邀请链接，有效期七天，且只能使用一次。',
      },
    ],
  },
  {
    type: 'doc',
    slug: 'publishing-a-resource',
    tags: ['admin'],
    meta: { level: 'intermediate' },
    translations: [
      {
        locale: 'en',
        title: 'Publishing a resource',
        summary:
          'The draft-to-published path, and why a translation is required.',
        body: 'A resource needs at least one translation before it can be published — otherwise it would render blank in both locales.',
      },
    ],
  },
]

const COURSE_CHAPTERS = [
  {
    position: 1,
    en: {
      title: 'Why prompts matter',
      body: 'Models do what you ask — the craft is in the asking.',
    },
    zh: {
      title: '为什么提示词重要',
      body: '模型按你的要求行事——关键在于怎么问。',
    },
  },
  {
    position: 2,
    en: {
      title: 'Structure and examples',
      body: 'Use structure, delimiters, and few-shot examples.',
    },
    zh: { title: '结构与示例', body: '使用结构化格式、分隔符和少样本示例。' },
  },
  {
    position: 3,
    en: {
      title: 'Iterating and evaluating',
      body: 'Treat prompts like code: version, test, refine.',
    },
    // Intentionally zh-untranslated to exercise step fallback.
  },
]

async function seed() {
  await db.delete(resources)

  for (const item of SEED) {
    const [inserted] = await db
      .insert(resources)
      .values({
        type: item.type,
        slug: item.slug,
        status: item.status ?? 'published',
        tags: item.tags,
        meta: item.meta ?? {},
      })
      .returning({ id: resources.id })

    await db.insert(resourceTranslations).values(
      item.translations.map((t) => ({
        resourceId: inserted.id,
        locale: t.locale,
        title: t.title,
        summary: t.summary,
        body: t.body ?? '',
      })),
    )

    if (item.slug === 'prompt-engineering-101') {
      for (const step of COURSE_CHAPTERS) {
        const [ch] = await db
          .insert(trackSteps)
          .values({ trackId: inserted.id, position: step.position })
          .returning({ id: trackSteps.id })
        const rows = []
        if (step.en) {
          rows.push({
            stepId: ch.id,
            locale: 'en' as const,
            title: step.en.title,
            body: step.en.body,
          })
        }
        if ('zh' in step && step.zh) {
          rows.push({
            stepId: ch.id,
            locale: 'zh' as const,
            title: step.zh.title,
            body: step.zh.body,
          })
        }
        await db.insert(trackStepTranslations).values(rows)
      }
    }
  }

  console.log(`Seeded ${SEED.length} resources`)
  process.exit(0)
}

seed()
