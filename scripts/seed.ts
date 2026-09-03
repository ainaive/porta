// Dev seed: wipes content tables (not users) and inserts sample resources
// across all four sections, including zh-only and en-only entries to exercise
// the translation fallback, and a draft that must never surface publicly.
// Run with `bun run db:seed`.
//
// The catalog below is a fixture, not a claim: these tools do not exist, and
// the script refuses any non-local database (see the host check) so it cannot
// become one. What it is faithful to is shape — enough rows, in enough
// sections, with enough facet spread, that every page has something real to
// render and the empty states are reached deliberately rather than by
// accident.

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

type SeedStep = {
  position: number
  en: { title: string; body: string }
  zh?: { title: string; body: string }
}

type SeedResource = {
  type: ResourceType
  slug: string
  status?: 'draft' | 'published'
  tags: string[]
  meta?: Record<string, unknown>
  translations: SeedTranslation[]
  steps?: SeedStep[]
}

/** Events go stale the moment they are seeded, and a "Next up" band with
 *  nothing in it teaches nothing about the page. Dated relative to the run
 *  instead, so a fresh seed always has upcoming sessions. */
function inDays(days: number): string {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

const tool = (
  slug: string,
  category: string,
  maturity: string,
  language: string,
  tags: string[],
  translations: SeedTranslation[],
): SeedResource => ({
  type: 'tool',
  slug,
  tags,
  meta: {
    category,
    maturity,
    language,
    url: `https://example.internal/${slug}`,
    docsUrl: `https://example.internal/${slug}/docs`,
  },
  translations,
})

const SEED: SeedResource[] = [
  tool(
    'forge',
    'build',
    'ga',
    'go',
    ['scaffolding', 'ci'],
    [
      {
        locale: 'en',
        title: 'Forge',
        summary:
          'Scaffolds a new service with CI, logging and deploy config wired up.',
        body: 'Pick a language template and Forge writes the repo layout, the pipeline file and the deploy config, then registers ownership so the service is not orphaned on day one.',
      },
      {
        locale: 'zh',
        title: 'Forge',
        summary: '生成新服务骨架，自动接入 CI、日志与发布配置。',
        body: '选择语言模板后，Forge 会生成仓库结构、流水线文件与发布配置，并登记服务归属，避免新服务一开始就无人认领。',
      },
    ],
  ),
  tool(
    'lens',
    'observability',
    'ga',
    'typescript',
    ['tracing', 'debugging'],
    [
      {
        locale: 'en',
        title: 'Lens',
        summary:
          'Distributed trace viewer. Jump from a slow request to the exact span.',
        body: 'Filter by endpoint, sort spans by self time, and follow a request across every service it touched.',
      },
      {
        locale: 'zh',
        title: 'Lens',
        summary: '分布式链路查看器，从慢请求直接定位到具体 span。',
        body: '可按接口筛选、按自身耗时排序，并跨服务追踪同一个请求的完整路径。',
      },
    ],
  ),
  tool(
    'gatekeeper',
    'cicd',
    'ga',
    'go',
    ['ci', 'compliance'],
    [
      {
        locale: 'en',
        title: 'Gatekeeper',
        summary:
          'Runs policy and compliance checks in CI before a merge lands.',
        body: 'Every check names the rule it enforces and links to the fix, so a red build is a to-do list rather than a mystery.',
      },
      {
        locale: 'zh',
        title: 'Gatekeeper',
        summary: '在合并前于 CI 中执行策略与合规检查。',
        body: '每项检查都会说明所依据的规则并给出修复链接，让失败的构建成为一份待办清单，而不是一个谜。',
      },
    ],
  ),
  tool(
    'atlas',
    'platform',
    'ga',
    'typescript',
    ['ownership', 'catalog'],
    [
      {
        locale: 'en',
        title: 'Atlas',
        summary:
          'Service catalog: ownership, dependencies, on-call and SLOs in one place.',
        body: 'A service without an Atlas entry cannot get an on-call rotation or an SLO, which is the point: the catalog is the source of truth, not a copy of one.',
      },
      {
        locale: 'zh',
        title: 'Atlas',
        summary: '服务目录：归属、依赖、值班与 SLO 集中查看。',
        body: '未在 Atlas 登记的服务无法配置值班与 SLO——这正是设计意图：目录本身就是事实来源，而不是别处数据的副本。',
      },
    ],
  ),
  tool(
    'pipeline',
    'cicd',
    'ga',
    'go',
    ['builds', 'caching'],
    [
      {
        locale: 'en',
        title: 'Pipeline',
        summary:
          'Build orchestration with remote caching and reproducible steps.',
        body: 'Steps declare their inputs, so a cache hit is provable rather than hopeful.',
      },
      {
        locale: 'zh',
        title: 'Pipeline',
        summary: '构建编排，支持远程缓存与可复现步骤。',
        body: '每个步骤显式声明输入，因此缓存命中是可以验证的，而不是靠碰运气。',
      },
    ],
  ),
  tool(
    'sandbox',
    'environments',
    'beta',
    'python',
    ['preview', 'testing'],
    [
      {
        locale: 'en',
        title: 'Sandbox',
        summary:
          'Ephemeral preview environments per pull request, torn down on merge.',
        body: 'Each pull request gets its own URL and its own data, so a reviewer can click through the change instead of reading it.',
      },
      {
        locale: 'zh',
        title: 'Sandbox',
        summary: '为每个 PR 创建临时预览环境，合并后自动销毁。',
        body: '每个 PR 拥有独立地址与独立数据，评审者可以直接点开体验改动，而不必只靠读代码。',
      },
    ],
  ),
  tool(
    'vault-bridge',
    'security',
    'ga',
    'go',
    ['secrets'],
    [
      {
        locale: 'en',
        title: 'Vault Bridge',
        summary:
          'Injects short-lived secrets into local and CI runs. No plaintext files.',
        body: 'Credentials live for the length of the run. Nothing is written to disk, so nothing is left there.',
      },
      {
        locale: 'zh',
        title: 'Vault Bridge',
        summary: '向本地与 CI 运行注入短期密钥，不留明文文件。',
        body: '凭据的有效期与运行时长一致，全程不落盘，也就不会有残留。',
      },
    ],
  ),
  tool(
    'schema-registry',
    'data',
    'ga',
    'java',
    ['contracts', 'events'],
    [
      {
        locale: 'en',
        title: 'Schema Registry',
        summary:
          'Contract validation for events and RPC. Blocks breaking changes.',
        body: 'A producer cannot ship a change its consumers have not agreed to.',
      },
      {
        locale: 'zh',
        title: 'Schema Registry',
        summary: '事件与 RPC 的契约校验，阻断破坏性变更。',
        body: '生产方无法发布消费方尚未接受的变更。',
      },
    ],
  ),
  tool(
    'probe',
    'testing',
    'beta',
    'rust',
    ['load-testing'],
    [
      {
        locale: 'en',
        title: 'Probe',
        summary:
          'Load testing you can run from a laptop against a sandbox environment.',
        body: 'Replays a recorded traffic pattern so the test resembles production rather than a synthetic loop.',
      },
      {
        locale: 'zh',
        title: 'Probe',
        summary: '可在本地对沙箱环境执行的压测工具。',
        body: '回放真实录制的流量模式，让压测贴近生产，而不是跑一个人造循环。',
      },
    ],
  ),
  tool(
    'mocklab',
    'testing',
    'ga',
    'typescript',
    ['testing', 'contracts'],
    [
      {
        locale: 'en',
        title: 'Mocklab',
        summary: "Mock server generated from your service's own OpenAPI spec.",
        body: 'Because the mock is generated from the spec, it goes stale exactly when the spec does — and not quietly.',
      },
      {
        locale: 'zh',
        title: 'Mocklab',
        summary: '基于服务自身 OpenAPI 规范生成的 Mock 服务。',
        body: 'Mock 由规范生成，因此它只会随规范一起过期——而且不会悄无声息。',
      },
    ],
  ),
  tool(
    'beacon',
    'runtime',
    'ga',
    'multi',
    ['feature-flags'],
    [
      {
        locale: 'en',
        title: 'Beacon',
        summary:
          'Feature flag SDK with per-environment targeting and audit history.',
        body: 'Every flag change is attributed and reversible, which is what makes a gradual rollout safe to attempt.',
      },
      {
        locale: 'zh',
        title: 'Beacon',
        summary: '特性开关 SDK，支持分环境定向与审计记录。',
        body: '每次开关变更都有归属且可回滚，灰度放量因此才敢做。',
      },
    ],
  ),
  tool(
    'ledger',
    'finops',
    'beta',
    'python',
    ['cost'],
    [
      {
        locale: 'en',
        title: 'Ledger',
        summary: 'Attributes cloud spend down to service and team owners.',
        body: 'Ownership comes from Atlas, so a bill nobody owns is a catalog gap rather than an accounting one.',
      },
    ],
  ),
  tool(
    'codemod',
    'build',
    'ga',
    'typescript',
    ['refactoring'],
    [
      {
        locale: 'en',
        title: 'Codemod',
        summary:
          'Runs large-scale refactors across every repo and opens the PRs.',
        body: 'One transform, one review per repo — rather than one ticket per team and a quarter of chasing.',
      },
      {
        locale: 'zh',
        title: 'Codemod',
        summary: '跨仓库执行大规模重构并自动提交 PR。',
        body: '一次转换、每个仓库一次评审——而不是给每个团队开一张工单，然后追一个季度。',
      },
    ],
  ),
  tool(
    'dockmaster',
    'build',
    'deprecated',
    'go',
    ['containers'],
    [
      {
        locale: 'en',
        title: 'Dockmaster',
        summary:
          "Container image builder. Superseded by Pipeline's native image step.",
        body: 'Kept listed because the replacement path is documented. Deprecated tools disappear from the catalog only once nothing points at them.',
      },
      {
        locale: 'zh',
        title: 'Dockmaster',
        summary: '容器镜像构建工具，已由 Pipeline 内置镜像步骤取代。',
        body: '之所以仍然列出，是因为替代方案已有文档。已弃用的工具只有在无人引用后才会从目录中移除。',
      },
    ],
  ),
  {
    type: 'tool',
    slug: 'internal-mirror',
    tags: ['infra'],
    meta: {
      category: 'platform',
      maturity: 'ga',
      language: 'multi',
      url: 'https://example.internal/mirror',
    },
    // zh-only on purpose: exercises the fallback badge on an en page.
    translations: [
      {
        locale: 'zh',
        title: '内部镜像源',
        summary: 'npm、PyPI 与容器镜像的内网加速源。',
        body: '把 registry 指向 `mirror.example.internal` 即可。',
      },
    ],
  },
  {
    type: 'tool',
    slug: 'secret-draft-tool',
    status: 'draft',
    tags: ['unreleased'],
    meta: { category: 'testing', maturity: 'beta', language: 'python' },
    translations: [
      {
        locale: 'en',
        title: 'Secret draft tool',
        summary: 'Should never appear on public pages.',
      },
    ],
  },

  // --- Docs & guides, one per group so the grouped listing has every row ---
  {
    type: 'doc',
    slug: 'platform-concepts',
    tags: ['onboarding'],
    meta: { group: 'foundations', readingTime: '8 min read' },
    translations: [
      {
        locale: 'en',
        title: 'Platform concepts',
        summary: 'Services, environments, ownership and how the three relate.',
        body: 'Read this once. Every other guide assumes it.\n\nA **service** is the unit of ownership. An **environment** is where a version of it runs. Ownership is recorded in the catalog, not in a wiki page.',
      },
      {
        locale: 'zh',
        title: '平台概念',
        summary: '服务、环境、归属，以及三者之间的关系。',
        body: '只需读一次，其余所有指南都建立在这些前提之上。\n\n**服务**是归属的最小单位，**环境**是它某个版本的运行场所。归属信息记录在目录中，而不是某个 wiki 页面里。',
      },
    ],
  },
  {
    type: 'doc',
    slug: 'conventions',
    tags: ['onboarding'],
    meta: { group: 'foundations', readingTime: '6 min read' },
    translations: [
      {
        locale: 'en',
        title: 'Conventions',
        summary:
          'Repo layout, naming, and the defaults tools assume you follow.',
        body: 'Tools work without configuration when a repo follows the layout. When it does not, they still work — you just have to say so explicitly.',
      },
      {
        locale: 'zh',
        title: '约定',
        summary: '仓库结构、命名规范，以及工具默认遵循的配置。',
        body: '仓库遵循约定结构时，工具无需配置即可工作；不遵循也能用，只是需要显式声明。',
      },
    ],
  },
  {
    type: 'doc',
    slug: 'fixing-a-failed-ci-check',
    tags: ['ci', 'troubleshooting'],
    meta: { group: 'guides', readingTime: 'Guide' },
    translations: [
      {
        locale: 'en',
        title: 'Fixing a failed CI check',
        summary: 'The most common Gatekeeper failures and the fix for each.',
        body: 'Start with the rule name in the failure output; each one links to the change that satisfies it. Ask for a waiver last, not first.',
      },
      {
        locale: 'zh',
        title: '修复 CI 检查失败',
        summary: 'Gatekeeper 最常见的失败原因及对应修复方式。',
        body: '先看失败输出中的规则名称，每条规则都链接到满足它所需的改动。申请豁免应当是最后一步，而不是第一步。',
      },
    ],
  },
  {
    type: 'doc',
    slug: 'rolling-out-behind-a-flag',
    tags: ['feature-flags'],
    meta: { group: 'guides', readingTime: 'Guide' },
    translations: [
      {
        locale: 'en',
        title: 'Rolling out behind a flag',
        summary:
          'Targeting rules, gradual rollout, and cleaning up dead flags.',
        body: 'A flag with no removal date is not a rollout, it is a branch you cannot see.',
      },
      {
        locale: 'zh',
        title: '使用特性开关发布',
        summary: '定向规则、灰度放量，以及清理无用开关。',
        body: '没有下线时间的开关不是灰度发布，而是一条你看不见的分支。',
      },
    ],
  },
  {
    type: 'doc',
    slug: 'handling-secrets-locally',
    tags: ['security'],
    meta: { group: 'guides', readingTime: 'Guide' },
    translations: [
      {
        locale: 'en',
        title: 'Handling secrets locally',
        summary:
          'Why plaintext .env files are blocked and what to use instead.',
        body: 'Short-lived credentials are injected into the run. Nothing is written to disk, so nothing leaks from it later.',
      },
      {
        locale: 'zh',
        title: '本地处理密钥',
        summary: '为何禁用明文 .env 文件，以及应改用什么方式。',
        body: '短期凭据在运行时注入，全程不落盘，日后也就无从泄漏。',
      },
    ],
  },
  {
    type: 'doc',
    slug: 'request-an-invite',
    tags: ['onboarding'],
    meta: { group: 'working-with-us', readingTime: '1 min read' },
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
    slug: 'contributing-a-tool',
    tags: ['process'],
    meta: { group: 'working-with-us', readingTime: 'Process' },
    translations: [
      {
        locale: 'en',
        title: 'Contributing a tool',
        summary:
          'The bar for listing a tool in this catalog, and what support means.',
        body: 'Listing implies a maintainer, documentation, and a deprecation path. Without all three it is a link, not a tool.',
      },
      {
        locale: 'zh',
        title: '贡献工具',
        summary: '工具进入目录的标准，以及"受支持"的具体含义。',
        body: '进入目录意味着有维护者、有文档、有弃用路径。三者缺一，它就只是一个链接，而不是一个工具。',
      },
    ],
  },
  {
    type: 'doc',
    slug: 'publishing-a-resource',
    tags: ['admin'],
    meta: { group: 'working-with-us', readingTime: '2 min read' },
    // en-only on purpose: exercises the fallback badge on a zh page.
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

  // --- Getting started: three tracks, each ending with something running ---
  {
    type: 'track',
    slug: 'shipping-a-new-service',
    tags: ['onboarding'],
    meta: { level: 'beginner', estimatedHours: 0.5 },
    translations: [
      {
        locale: 'en',
        title: "I'm shipping a new service",
        summary:
          'The default path for a new backend. Ends with a deployed URL and a green pipeline.',
        body: 'Four steps, roughly half an hour if nothing surprises you.',
      },
      {
        locale: 'zh',
        title: '我要发布新服务',
        summary:
          '新建后端服务的默认路径。终点是一个已部署的地址和一条绿色流水线。',
        body: '共四步，顺利的话大约半小时。',
      },
    ],
    steps: [
      {
        position: 1,
        en: {
          title: 'Scaffold with Forge',
          body: 'Forge picks your language template and registers ownership in Atlas, so the service is not orphaned on day one.',
        },
        zh: {
          title: '用 Forge 生成骨架',
          body: 'Forge 会选择语言模板并在 Atlas 中登记归属，避免新服务一开始就无人认领。',
        },
      },
      {
        position: 2,
        en: {
          title: 'Run it locally',
          body: 'Dependencies start from the sandbox rather than your laptop, so a cold start is a download and not an afternoon.',
        },
        zh: {
          title: '本地运行',
          body: '依赖从沙箱拉起，而不是占用本机资源；冷启动只是一次下载，而不是一个下午。',
        },
      },
      {
        position: 3,
        en: {
          title: 'Open a pull request',
          body: 'Pipeline builds it, Gatekeeper checks it, and Sandbox gives the pull request its own URL to click through.',
        },
        zh: {
          title: '提交 PR',
          body: 'Pipeline 负责构建，Gatekeeper 执行检查，Sandbox 为该 PR 分配可点击体验的独立地址。',
        },
      },
      {
        position: 4,
        en: {
          title: 'Ship and watch',
          body: 'Merge, then confirm the first traces land in Lens before you close the ticket. A deploy nobody watched is a deploy nobody verified.',
        },
        zh: {
          title: '发布并观察',
          body: '合并后先在 Lens 中确认首批链路数据到达，再关闭工单。没人盯过的发布等于没人验证过。',
        },
      },
    ],
  },
  {
    type: 'track',
    slug: 'something-is-slow',
    tags: ['debugging'],
    meta: { level: 'intermediate', estimatedHours: 0.25 },
    translations: [
      {
        locale: 'en',
        title: 'Something is slow or broken',
        summary: 'Get from a complaint to a named cause without guessing.',
        body: 'Three steps. The goal is a cause you can point at, not a theory.',
      },
      {
        locale: 'zh',
        title: '有东西变慢或坏了',
        summary: '从一条反馈定位到明确的原因，不靠猜。',
        body: '共三步。目标是找到可以指认的原因，而不是一个猜想。',
      },
    ],
    steps: [
      {
        position: 1,
        en: {
          title: 'Find the service in Atlas',
          body: 'Confirm who owns it and whether an incident is already open before you start a second investigation of the same thing.',
        },
        zh: {
          title: '在 Atlas 中查到服务',
          body: '先确认归属方，以及是否已有故障单在处理，避免对同一问题重复排查。',
        },
      },
      {
        position: 2,
        en: {
          title: 'Open the trace in Lens',
          body: 'Filter by the slow endpoint and sort spans by self time — total time tells you where you waited, self time tells you who made you wait.',
        },
        zh: {
          title: '在 Lens 中打开链路',
          body: '按慢接口筛选，并按自身耗时排序：总耗时告诉你在哪等，自身耗时才告诉你是谁让你等。',
        },
      },
      {
        position: 3,
        en: {
          title: 'Reproduce under load',
          body: 'Probe replays the pattern against a sandbox, so you can test a fix without waiting for the next incident to confirm it.',
        },
        zh: {
          title: '在压力下复现',
          body: 'Probe 会在沙箱中回放该流量模式，让你能验证修复，而不必等下一次故障来确认。',
        },
      },
    ],
  },
  {
    type: 'track',
    slug: 'migrating-an-old-repo',
    tags: ['migration'],
    meta: { level: 'advanced', estimatedHours: 2 },
    translations: [
      {
        locale: 'en',
        title: "I'm migrating an old repo",
        summary:
          'For services older than the platform. Expect to fix conventions before tools work.',
        body: 'Longer than the other tracks, and mostly unglamorous. Do it in the order below; each step unblocks the next.',
      },
      {
        locale: 'zh',
        title: '我要迁移老仓库',
        summary: '适用于早于平台的服务。工具生效前通常需要先修正约定。',
        body: '比其他路径更长，也更琐碎。请按下面的顺序进行，每一步都会解锁下一步。',
      },
    ],
    steps: [
      {
        position: 1,
        en: {
          title: 'Report what the repo violates',
          body: 'Get the list of convention violations in fix order before changing anything — the order matters more than the count.',
        },
        zh: {
          title: '列出仓库违反的约定',
          body: '动手之前先按修复顺序拿到违规清单——顺序比数量更重要。',
        },
      },
      {
        position: 2,
        en: {
          title: 'Apply the codemods',
          body: 'Codemod handles layout, config and import moves in one pull request, which is far easier to review than forty.',
        },
        zh: {
          title: '执行 codemod',
          body: 'Codemod 在一个 PR 中完成结构、配置与引用调整，比拆成四十个 PR 好评审得多。',
        },
      },
      {
        position: 3,
        en: {
          title: 'Adopt Pipeline',
          body: "Replace the legacy build file. Dockmaster images map onto Pipeline's native image step, which is why Dockmaster is deprecated rather than removed.",
        },
        zh: {
          title: '接入 Pipeline',
          body: '替换旧的构建文件。Dockmaster 镜像可映射为 Pipeline 内置镜像步骤——这也是 Dockmaster 只被弃用而非直接移除的原因。',
        },
      },
      {
        position: 4,
        en: {
          title: 'Register ownership',
          body: 'A service without an Atlas owner cannot get an on-call rotation or an SLO, so this is the step that makes the rest real.',
        },
        // zh deliberately absent: exercises step-level fallback.
      },
    ],
  },

  // --- Events, dated relative to the run so "Next up" is never empty ---
  {
    type: 'event',
    slug: 'platform-office-hours',
    tags: ['office-hours'],
    meta: {
      date: inDays(5),
      time: '16:00–17:00',
      kind: 'office-hours',
      place: 'Room 4-2 + Zoom',
      registerUrl: 'https://example.internal/events/office-hours',
    },
    translations: [
      {
        locale: 'en',
        title: 'Platform office hours',
        summary:
          'Bring a broken build, a slow trace, or a question about ownership. No agenda.',
        body: 'Weekly. Drop in with whatever is blocking you; if it needs more than the hour we will book the follow-up there and then.',
      },
      {
        locale: 'zh',
        title: '平台答疑时间',
        summary: '带上失败的构建、慢链路，或关于服务归属的疑问。无固定议程。',
        body: '每周一次。带着当前卡住你的问题来即可；一小时不够的，当场约后续时间。',
      },
    ],
  },
  {
    type: 'event',
    slug: 'hands-on-sandbox',
    tags: ['workshop', 'preview'],
    meta: {
      date: inDays(8),
      time: '10:00–12:30',
      kind: 'workshop',
      place: 'Training room B',
      registerUrl: 'https://example.internal/events/sandbox-workshop',
    },
    translations: [
      {
        locale: 'en',
        title: 'Hands-on: Sandbox preview environments',
        summary:
          'Take one of your own services and get a per-PR environment running by the end of the session.',
        body: 'Bring a laptop and a service you can open a pull request against. You leave with it working, not with notes about it working.',
      },
      {
        locale: 'zh',
        title: '实操：Sandbox 预览环境',
        summary: '用你自己的服务实操，课程结束前跑通按 PR 创建的环境。',
        body: '请带上笔记本电脑和一个你能提 PR 的服务。结束时你带走的是跑通的环境，而不是一份笔记。',
      },
    ],
  },
  {
    type: 'event',
    slug: 'dockmaster-migration-clinic',
    tags: ['migration', 'clinic'],
    meta: {
      date: inDays(14),
      time: '14:00–15:30',
      kind: 'clinic',
      place: 'Zoom',
      registerUrl: 'https://example.internal/events/migration-clinic',
    },
    translations: [
      {
        locale: 'en',
        title: 'Migration clinic: Dockmaster to Pipeline images',
        summary:
          'Dockmaster is deprecated. We migrate your build config live and answer the edge cases.',
        body: 'Bring the build file. Most migrations are a ten-minute mechanical change; the clinic exists for the ones that are not.',
      },
      {
        locale: 'zh',
        title: '迁移诊所：Dockmaster 迁移到 Pipeline 镜像',
        summary: 'Dockmaster 已弃用。现场迁移你的构建配置，并解答边缘场景。',
        body: '带上构建文件即可。多数迁移是十分钟的机械改动；这场诊所是为剩下那些准备的。',
      },
    ],
  },
  {
    type: 'event',
    slug: 'tracing-for-sceptics',
    tags: ['workshop', 'tracing'],
    meta: {
      date: inDays(21),
      time: '10:00–12:00',
      kind: 'workshop',
      place: 'Training room B',
    },
    translations: [
      {
        locale: 'en',
        title: "Tracing for people who don't like tracing",
        summary:
          'How to read a flame graph, what to instrument, and what to ignore.',
        body: 'Most tracing advice tells you to instrument everything. This session is mostly about what not to.',
      },
      {
        locale: 'zh',
        title: '写给不爱看链路的人的追踪课',
        summary: '如何读火焰图、该埋哪些点、哪些可以忽略。',
        body: '多数追踪教程让你什么都埋。这一场主要讲什么不该埋。',
      },
    ],
  },
  {
    type: 'event',
    slug: 'quarterly-platform-review',
    tags: ['review'],
    meta: {
      date: inDays(29),
      time: '13:00–17:00',
      kind: 'review',
      place: 'Auditorium',
    },
    translations: [
      {
        locale: 'en',
        title: 'Quarterly platform review',
        summary:
          'What shipped, what is being deprecated, and the roadmap we are asking you to push back on.',
        body: 'The roadmap section is the point. Come with objections.',
      },
      {
        locale: 'zh',
        title: '季度平台评审',
        summary:
          '本季度交付内容、即将弃用的能力，以及需要你们提出异议的路线图。',
        body: '路线图环节才是重点。欢迎带着反对意见来。',
      },
    ],
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

    // Steps hang off the track that declares them, rather than off a slug
    // this script has to remember — adding a second track with steps is now
    // data, not another branch here.
    for (const step of item.steps ?? []) {
      const [row] = await db
        .insert(trackSteps)
        .values({ trackId: inserted.id, position: step.position })
        .returning({ id: trackSteps.id })
      await db.insert(trackStepTranslations).values(
        (['en', 'zh'] as const)
          .map((locale) => ({ locale, text: step[locale] }))
          .filter((entry) => entry.text !== undefined)
          .map((entry) => ({
            stepId: row.id,
            locale: entry.locale,
            title: entry.text!.title,
            body: entry.text!.body,
          })),
      )
    }
  }

  const steps = SEED.reduce((sum, item) => sum + (item.steps?.length ?? 0), 0)
  console.log(`Seeded ${SEED.length} resources and ${steps} track steps`)
  process.exit(0)
}

seed()
