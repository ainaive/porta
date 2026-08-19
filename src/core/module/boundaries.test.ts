import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { Glob } from 'bun'
import ts from 'typescript'
import { modules } from './registry'

// ADR 0013 claims a cross-module or platform-internal import fails the verify
// gate. The `no-restricted-imports` rules in eslint.config.mjs only see the
// import *string*, so they catch `@/modules/other/thing` but not
// `../../other/thing` — and relative imports are the house style inside a
// module, so an escape is a plausible slip rather than a contrivance.
//
// Imports are read with TypeScript's own parser rather than a regex: side
// effect imports, re-exports, type-only imports and dynamic `import()` are all
// import edges, and a pattern that covers four of five forms is worse than
// useless because it reads as covered.

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

type Edge = { file: string; target: string }

function sourceFiles(...patterns: string[]): string[] {
  return patterns
    .flatMap((pattern) => [...new Glob(pattern).scanSync({ cwd: ROOT })])
    .map((p) => p.replaceAll('\\', '/'))
    .sort()
}

/** Every module specifier in `file`, in any syntactic form. */
function specifiers(file: string, source: string): string[] {
  const kind = file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  const tree = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    kind,
  )
  const found: string[] = []

  // `isStringLiteralLike`, not `isStringLiteral`: a backtick path with no
  // substitution is a NoSubstitutionTemplateLiteral, and `import(`../help`)`
  // is every bit as much a dependency as `import('../help')`.
  const push = (node: ts.Node | undefined): void => {
    if (node && ts.isStringLiteralLike(node)) found.push(node.text)
  }

  const visit = (node: ts.Node): void => {
    // `import x from 'y'`, `import 'y'`, `import type { x } from 'y'`
    if (ts.isImportDeclaration(node)) push(node.moduleSpecifier)
    // `export { x } from 'y'`, `export * from 'y'`
    if (ts.isExportDeclaration(node)) push(node.moduleSpecifier)
    // `import('y')` and `require('y')`
    if (ts.isCallExpression(node)) {
      const callee = node.expression
      const isDynamic = callee.kind === ts.SyntaxKind.ImportKeyword
      const isRequire = ts.isIdentifier(callee) && callee.text === 'require'
      if (isDynamic || isRequire) {
        const [first] = node.arguments
        push(first)
        // An interpolated path cannot be resolved, so judge it by its literal
        // head: `import(`../${name}/module`)` from a module directory still
        // aims at a sibling. src/i18n/request.ts uses this form legitimately,
        // and its head (`../../messages/`) is nowhere near src/modules.
        if (first && ts.isTemplateExpression(first)) {
          found.push(first.head.text)
        }
      }
    }
    ts.forEachChild(node, visit)
  }

  visit(tree)
  return found
}

/** In-repo import edges, resolved to repo-relative paths so an alias and a
 *  relative path to the same file become indistinguishable. */
function edgesOf(file: string): Edge[] {
  const source = readFileSync(resolve(ROOT, file), 'utf8')
  const out: Edge[] = []
  for (const spec of specifiers(file, source)) {
    let target: string
    if (spec.startsWith('@/')) {
      target = `src/${spec.slice(2)}`
    } else if (spec.startsWith('.')) {
      target = relative(ROOT, resolve(ROOT, dirname(file), spec))
    } else {
      continue // a package, not a boundary
    }
    out.push({ file, target: target.replaceAll('\\', '/') })
  }
  return out
}

function moduleOf(path: string): string | null {
  return path.match(/^src\/modules\/([^/]+)/)?.[1] ?? null
}

/** An interpolated path resolves only as far as its literal head, so
 *  `import(`../${name}/module`)` from a module lands on `src/modules` itself.
 *  Nothing legitimately imports the modules root, so treat it as aimed at
 *  whatever the substitution names. */
function aimsAtModuleRoot(path: string): boolean {
  return path === 'src/modules'
}

const moduleFiles = sourceFiles('src/modules/**/*.{ts,tsx}')
const moduleEdges = moduleFiles.flatMap(edgesOf)

// Everything that is not a module and not a route mount: core, lib,
// components, db, i18n, and the proxy. All of it is downstream of the
// registry and none of it may depend on a module.
const platformFiles = sourceFiles('src/**/*.{ts,tsx}').filter(
  (file) => !file.startsWith('src/modules/') && !file.startsWith('src/app/'),
)
const platformEdges = platformFiles.flatMap(edgesOf)

describe('module boundaries', () => {
  test('discovery matches the registry', () => {
    // Guards against a silently empty scan making every assertion below
    // vacuous. Compared against the registry rather than a hardcoded list, so
    // scaffolding a module does not fail the gate — and so a module directory
    // nobody registered does.
    const onDisk = new Set(
      moduleFiles.map(moduleOf).filter(Boolean) as string[],
    )
    const registered = new Set(modules.map((feature) => feature.id))
    expect([...onDisk].sort()).toEqual([...registered].sort())
    expect(moduleEdges.length).toBeGreaterThan(20)
  })

  test('platform scan reaches beyond core and lib', () => {
    // src/components and src/proxy.ts are as capable of importing a module as
    // src/core is; an earlier version of this test only looked at core+lib.
    expect(platformFiles).toContain('src/proxy.ts')
    expect(platformFiles.some((f) => f.startsWith('src/components/'))).toBe(
      true,
    )
  })

  test('no module imports another module', () => {
    const crossing = moduleEdges.filter((edge) => {
      const from = moduleOf(edge.file)
      const to = moduleOf(edge.target)
      if (to === null) return aimsAtModuleRoot(edge.target)
      return from !== null && to !== from
    })
    expect(crossing).toEqual([])
  })

  test('no module imports a platform internal', () => {
    const reaching = moduleEdges.filter((edge) =>
      INTERNALS.some(
        (internal) =>
          edge.target === internal || edge.target.startsWith(`${internal}/`),
      ),
    )
    expect(reaching).toEqual([])
  })

  test('only the registry names a module from outside src/app', () => {
    const naming = platformEdges.filter(
      (edge) =>
        (moduleOf(edge.target) !== null || aimsAtModuleRoot(edge.target)) &&
        edge.file !== MAY_NAME_A_MODULE,
    )
    expect(naming).toEqual([])
  })
})
