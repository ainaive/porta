// Scaffolds a feature module: manifest, message bundles, a listing page, a
// route mount, and the one line in the registry that wires it in.
//
//   bun scripts/new-module.ts <id> [section-key]
//
// The generated module is registered and green — `bun run verify` passes
// immediately — so the first commit on a new module is real code rather than
// boilerplate. See docs/architecture.md, "Adding a module".
import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname
const REGISTRY = join(ROOT, 'src/core/module/registry.ts')

// The id must be kebab-case AND survive camelCasing into a legal, non-reserved
// TypeScript identifier — it becomes an exported binding in the manifest, so
// `2fa` or `default` would generate a file that cannot parse.
const KEBAB = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/
const SNAKE = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/
const RESERVED = new Set([
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'debugger',
  'default',
  'delete',
  'do',
  'else',
  'enum',
  'export',
  'extends',
  'false',
  'finally',
  'for',
  'function',
  'if',
  'import',
  'in',
  'instanceof',
  'new',
  'null',
  'return',
  'super',
  'switch',
  'this',
  'throw',
  'true',
  'try',
  'typeof',
  'var',
  'void',
  'while',
  'with',
  'as',
  'implements',
  'interface',
  'let',
  'package',
  'private',
  'protected',
  'public',
  'static',
  'yield',
  'any',
  'boolean',
  'number',
  'string',
  'symbol',
  'await',
])

function camel(id: string): string {
  return id.replace(/-(\w)/g, (_, c: string) => c.toUpperCase())
}

function title(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1)
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(join(ROOT, path))
    return true
  } catch {
    return false
  }
}

// `wx` fails rather than truncating: this script must never be able to eat a
// module someone else is working on, and the preflight below is not a
// substitute for the guarantee.
async function write(path: string, contents: string): Promise<void> {
  const full = join(ROOT, path)
  await mkdir(dirname(full), { recursive: true })
  await writeFile(full, contents, { flag: 'wx' })
  console.log(`  created ${path}`)
}

// The registry is the single shared file, so edit it precisely and fail loudly
// rather than guessing if its shape has changed.
async function register(id: string): Promise<void> {
  const source = await readFile(REGISTRY, 'utf8')
  const name = camel(id)

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
    'Usage: bun scripts/new-module.ts <kebab-case-id> [section_key]\n' +
      'The id must start with a letter and be kebab-case, e.g. "ai-eval".',
  )
  process.exit(1)
}
if (RESERVED.has(camel(id))) {
  console.error(
    `"${id}" camel-cases to "${camel(id)}", which is a reserved word — the ` +
      'manifest exports it as a binding. Pick another id.',
  )
  process.exit(1)
}
const section = sectionArg ?? id.replace(/-/g, '_')
if (!SNAKE.test(section)) {
  console.error(
    `Section key must start with a letter and be snake_case (it is stored in resources.type): ${section}`,
  )
  process.exit(1)
}
if (RESERVED.has(camel(section))) {
  console.error(
    `"${section}" camel-cases to a reserved word — it is exported as a zod schema binding. Pick another key.`,
  )
  process.exit(1)
}

const label = title(id.replace(/-/g, ' '))
const sectionLabel = title(section.replace(/_/g, ' '))
const base = `/${id}`
const listingFile = `${section.replace(/_/g, '-')}-listing`

// Preflight every destination before writing any of them, so a name clash
// leaves the tree untouched instead of half-scaffolded over someone's module.
const destinations = [
  `src/modules/${id}/module.ts`,
  `src/modules/${id}/messages/en.json`,
  `src/modules/${id}/messages/zh.json`,
  `src/modules/${id}/pages/${listingFile}.tsx`,
  `src/app/[locale]${base}/page.tsx`,
]
const clashes: string[] = []
for (const path of destinations) {
  if (await exists(path)) clashes.push(path)
}
if ((await readFile(REGISTRY, 'utf8')).includes(`@/modules/${id}/module`)) {
  clashes.push('src/core/module/registry.ts (already registers this module)')
}
if (clashes.length > 0) {
  console.error(
    `Refusing to scaffold "${id}" — these already exist:\n  ${clashes.join('\n  ')}`,
  )
  process.exit(1)
}

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
  `src/modules/${id}/pages/${listingFile}.tsx`,
  `import { createListingPage } from '@/core/content/listing-page'

export default createListingPage('${section}')
`,
)

await write(
  `src/app/[locale]${base}/page.tsx`,
  `// Route mount: the page itself belongs to the module that owns this section.
// \`dynamic\` is declared here rather than re-exported because route segment
// config is read from the route file (ADR 0013, ADR 0005 — no DB at build).
export { default } from '@/modules/${id}/pages/${listingFile}'

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
