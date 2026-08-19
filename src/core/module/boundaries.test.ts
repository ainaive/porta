import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { Glob } from 'bun'

// ADR 0013 claims a cross-module or platform-internal import fails the verify
// gate. The `no-restricted-imports` rules in eslint.config.mjs only see the
// import *string*, so they catch `@/modules/other/thing` but not
// `../../other/thing` — and relative imports are the house style inside a
// module, so an escape is a plausible slip rather than a contrivance.
//
// This resolves every import to a repo-relative path first, which makes the
// two forms indistinguishable, and covers the core→module direction as well.
// It globs the module directories, so it needs no per-module list.

const ROOT = new URL('../../..', import.meta.url).pathname

// Platform internals: a module gets auth through @/lib/session, not by
// reaching for better-auth itself, and writes its own actions rather than
// importing the platform's.
const INTERNALS = [
  'src/lib/admin-actions',
  'src/lib/auth',
  'src/lib/auth-client',
  'src/lib/invites',
  'src/lib/email',
]

// The registry's whole job is to name every module; route files under
// src/app mount module pages.
const MAY_NAME_A_MODULE = 'src/core/module/registry.ts'

type Import = { file: string; target: string }

function sourceFiles(pattern: string): string[] {
  return [...new Glob(pattern).scanSync({ cwd: ROOT })].map((p) =>
    p.replaceAll('\\', '/'),
  )
}

/** Every import in `file`, resolved to a repo-relative path. Bare package
 *  specifiers are dropped — only in-repo edges are boundaries. */
function importsOf(file: string): Import[] {
  const source = readFileSync(resolve(ROOT, file), 'utf8')
  const specs = [
    ...source.matchAll(/from\s+['"]([^'"]+)['"]/g),
    ...source.matchAll(/import\(\s*['"]([^'"]+)['"]/g),
  ].map((match) => match[1])

  const out: Import[] = []
  for (const spec of specs) {
    let target: string
    if (spec.startsWith('@/')) {
      target = `src/${spec.slice(2)}`
    } else if (spec.startsWith('.')) {
      target = relative(ROOT, resolve(ROOT, dirname(file), spec))
    } else {
      continue
    }
    out.push({ file, target: target.replaceAll('\\', '/') })
  }
  return out
}

function moduleOf(path: string): string | null {
  return path.match(/^src\/modules\/([^/]+)/)?.[1] ?? null
}

const moduleImports = sourceFiles('src/modules/**/*.{ts,tsx}').flatMap(
  importsOf,
)
const platformImports = sourceFiles('src/{core,lib}/**/*.{ts,tsx}').flatMap(
  importsOf,
)

describe('module boundaries', () => {
  test('the glob actually found the modules', () => {
    // A silently empty scan would make every assertion below vacuous.
    const found = new Set(
      sourceFiles('src/modules/**/*.{ts,tsx}')
        .map(moduleOf)
        .filter(Boolean) as string[],
    )
    expect([...found].sort()).toEqual(['ai-eval', 'help', 'tool-shelf'])
    expect(moduleImports.length).toBeGreaterThan(20)
  })

  test('no module imports another module', () => {
    const crossing = moduleImports.filter((edge) => {
      const from = moduleOf(edge.file)
      const to = moduleOf(edge.target)
      return to !== null && from !== null && to !== from
    })
    expect(crossing).toEqual([])
  })

  test('no module imports a platform internal', () => {
    const reaching = moduleImports.filter((edge) =>
      INTERNALS.some(
        (internal) =>
          edge.target === internal || edge.target.startsWith(`${internal}/`),
      ),
    )
    expect(reaching).toEqual([])
  })

  test('only the registry names a module from core or lib', () => {
    const naming = platformImports.filter(
      (edge) =>
        moduleOf(edge.target) !== null && edge.file !== MAY_NAME_A_MODULE,
    )
    expect(naming).toEqual([])
  })
})
