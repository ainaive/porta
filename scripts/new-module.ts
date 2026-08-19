// Scaffolds a feature module: manifest, message bundles, a listing page, a
// route mount, and the one line in the registry that wires it in.
//
//   bun scripts/new-module.ts <id> [section-key]
//
// The generated module is registered and green — `bun run verify` passes
// immediately — so the first commit on a new module is real code rather than
// boilerplate. See docs/architecture.md, "Adding a module".
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname
const REGISTRY = join(ROOT, 'src/core/module/registry.ts')

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const SNAKE = /^[a-z0-9]+(?:_[a-z0-9]+)*$/

function camel(id: string): string {
  return id.replace(/-(\w)/g, (_, c: string) => c.toUpperCase())
}

function title(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1)
}

async function write(path: string, contents: string): Promise<void> {
  const full = join(ROOT, path)
  await mkdir(dirname(full), { recursive: true })
  await writeFile(full, contents)
  console.log(`  created ${path}`)
}

// The registry is the single shared file, so edit it precisely and fail loudly
// rather than guessing if its shape has changed.
async function register(id: string): Promise<void> {
  const source = await readFile(REGISTRY, 'utf8')
  const name = camel(id)

  if (source.includes(`@/modules/${id}/module`)) {
    console.log('  registry already lists this module')
    return
  }

  const listMatch = source.match(/export const modules = \[([^\]]*)\] as const/)
  if (!listMatch) {
    throw new Error(
      `Could not find the module list in ${REGISTRY}. Add it by hand:\n` +
        `  import { ${name} } from '@/modules/${id}/module'\n` +
        `  ...and append ${name} to \`modules\`.`,
    )
  }

  const imports = `import { ${name} } from '@/modules/${id}/module'\n`
  const entries = listMatch[1].trim()
  const updated = source
    .replace(/^(import .*\n)+/, (block) => block + imports)
    .replace(
      listMatch[0],
      `export const modules = [${entries}${entries.endsWith(',') ? '' : ','} ${name}] as const`,
    )

  await writeFile(REGISTRY, updated)
  console.log('  registered in src/core/module/registry.ts')
}

const [id, sectionArg] = process.argv.slice(2)
if (!id || !KEBAB.test(id)) {
  console.error(
    'Usage: bun scripts/new-module.ts <kebab-case-id> [section_key]',
  )
  process.exit(1)
}
const section = sectionArg ?? id.replace(/-/g, '_')
if (!SNAKE.test(section)) {
  console.error(
    `Section key must be snake_case (it is stored in resources.type): ${section}`,
  )
  process.exit(1)
}

const label = title(id.replace(/-/g, ' '))
const sectionLabel = title(section.replace(/_/g, ' '))
const base = `/${id}`

console.log(`Scaffolding module "${id}" at ${base}\n`)

await write(
  `src/modules/${id}/module.ts`,
  `import { z } from 'zod'
import { defineModule } from '@/core/module/define'

export const ${camel(section)}Meta = z.object({
  url: z.url().optional(),
})

export const ${camel(id)} = defineModule({
  id: '${id}',
  nav: [{ href: '${base}', labelKey: 'nav.title', order: 100 }],
  sections: [
    {
      key: '${section}',
      path: '${base}',
      titleKey: '${section}.title',
      descriptionKey: '${section}.description',
      meta: ${camel(section)}Meta,
      metaFields: [{ name: 'url', kind: 'text', labelKey: 'meta.url' }],
    },
  ],
  messages: {
    en: () => import('./messages/en.json'),
    zh: () => import('./messages/zh.json'),
  },
})
`,
)

for (const [locale, nav, sTitle, sDesc, url] of [
  ['en', label, sectionLabel, 'TODO: describe this section.', 'URL'],
  ['zh', label, sectionLabel, 'TODO：补充这个板块的描述。', 'URL'],
] as const) {
  await write(
    `src/modules/${id}/messages/${locale}.json`,
    `${JSON.stringify(
      {
        nav: { title: nav },
        [section]: { title: sTitle, description: sDesc },
        meta: { url },
      },
      null,
      2,
    )}\n`,
  )
}

await write(
  `src/modules/${id}/pages/${section.replace(/_/g, '-')}-listing.tsx`,
  `import { createListingPage } from '@/core/content/listing-page'

export default createListingPage('${section}')
`,
)

await write(
  `src/app/[locale]${base}/page.tsx`,
  `// Route mount: the page itself belongs to the module that owns this section.
// \`dynamic\` is declared here rather than re-exported because route segment
// config is read from the route file (ADR 0013, ADR 0005 — no DB at build).
export { default } from '@/modules/${id}/pages/${section.replace(/_/g, '-')}-listing'

export const dynamic = 'force-dynamic'
`,
)

await register(id)

console.log(`
Done. Next:
  1. Replace the TODO copy in src/modules/${id}/messages/*.json — both locales,
     or bun run i18n:check will fail.
  2. Give the section a real meta schema and metaFields in module.ts.
  3. Add a detail page if resources in this section have their own page.
  4. bun run format && bun run verify
`)
