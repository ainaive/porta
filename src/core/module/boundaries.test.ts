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
/** A dynamic import whose argument this verifier cannot reduce to a path. */
type Opaque = { file: string; expression: string }

// tsconfig includes .mts, and .mjs/.cjs/.js can appear at any time. A scan
// narrower than the language is a hole that opens itself, so the list is
// declared once here and pinned by a test below.
const SOURCE_EXTENSIONS = ['ts', 'tsx', 'mts', 'cts', 'js', 'jsx', 'mjs', 'cjs']
// Extensions that cannot carry an import, so need no scanning.
const INERT_EXTENSIONS = [
  'json',
  'css',
  'ico',
  'png',
  'jpg',
  'svg',
  'webp',
  'md',
]

function sourceFiles(...patterns: string[]): string[] {
  return patterns
    .flatMap((pattern) => [...new Glob(pattern).scanSync({ cwd: ROOT })])
    .map((p) => p.replaceAll('\\', '/'))
    .sort()
}

const SOURCE_GLOB = `src/**/*.{${SOURCE_EXTENSIONS.join(',')}}`

/** Every module specifier in `file`, plus any dynamic import argument that
 *  could not be reduced to one. Chasing expression forms one at a time is a
 *  losing game — `'a' + 'b'`, a ternary, a variable — so anything the
 *  verifier cannot classify is surfaced and fails the gate instead of
 *  passing silently. */
function specifiers(
  file: string,
  source: string,
): { literals: string[]; opaque: Opaque[] } {
  const kind = file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  const tree = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    kind,
  )
  const found: string[] = []
  const opaque: Opaque[] = []

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
    // `typeof import('y')` / `import('y').Thing` in a type position — a
    // type-only dependency is still a dependency.
    if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) {
      push(node.argument.literal)
    }
    // `import('y')` and `require('y')`
    if (ts.isCallExpression(node)) {
      const callee = node.expression
      const isDynamic = callee.kind === ts.SyntaxKind.ImportKeyword
      const isRequire = ts.isIdentifier(callee) && callee.text === 'require'
      if (isDynamic || isRequire) {
        const [first] = node.arguments
        if (first && ts.isStringLiteralLike(first)) {
          found.push(first.text)
        } else if (first) {
          // Note there is no branch for an interpolated template. Judging one
          // by its literal head looked reasonable and was not: a head of
          // `./` accepts `import(`./${'../help/module'}`)`, which lands in
          // another module. A prefix constrains nothing about where the
          // substitution goes, so interpolation is simply unresolvable.
          opaque.push({ file, expression: first.getText().slice(0, 80) })
        }
      }
    }
    ts.forEachChild(node, visit)
  }

  visit(tree)
  return { literals: found, opaque }
}

/** In-repo import edges, resolved to repo-relative paths so an alias and a
 *  relative path to the same file become indistinguishable. */
function edgesOf(file: string): Edge[] {
  const source = readFileSync(resolve(ROOT, file), 'utf8')
  const out: Edge[] = []
  for (const spec of specifiers(file, source).literals) {
    let target: string
    if (spec.startsWith('@/')) {
      target = `src/${spec.slice(2)}`
    } else if (spec.startsWith('.')) {
      target = relative(ROOT, resolve(ROOT, dirname(file), spec))
    } else {
      continue // a package, not a boundary
    }
    // Normalised: `@/modules/` resolves to `src/modules/` while `../`
    // resolves to `src/modules`, and a trailing slash must not be the
    // difference between caught and missed.
    out.push({
      file,
      target: target.replaceAll('\\', '/').replace(/\/+$/, ''),
    })
  }
  return out
}

function opaqueOf(file: string): Opaque[] {
  return specifiers(file, readFileSync(resolve(ROOT, file), 'utf8')).opaque
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

const moduleFiles = sourceFiles(
  `src/modules/**/*.{${SOURCE_EXTENSIONS.join(',')}}`,
)
const moduleEdges = moduleFiles.flatMap(edgesOf)

// Everything that is not a module and not a route mount: core, lib,
// components, db, i18n, and the proxy. All of it is downstream of the
// registry and none of it may depend on a module.
const platformFiles = sourceFiles(SOURCE_GLOB).filter(
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

  test('every file under src that can carry an import is scanned', () => {
    // The gap this closes is structural: .mts was in tsconfig's include and
    // in neither the glob nor the ESLint `files` list, so a whole file could
    // sit outside every boundary check. A new extension now fails here rather
    // than quietly widening the blind spot.
    const scanned = new Set([...moduleFiles, ...platformFiles])
    const unscanned = sourceFiles('src/**/*').filter((file) => {
      if (scanned.has(file) || file.startsWith('src/app/')) return false
      const ext = file.match(/\.([^./]+)$/)?.[1] ?? ''
      return !INERT_EXTENSIONS.includes(ext)
    })
    expect(unscanned).toEqual([])
  })

  test('every dynamic import can be reduced to a path', () => {
    // Fail closed. `import('../help/' + 'module')` is neither a literal nor a
    // template, and enumerating expression forms would just invite the next
    // one. If the verifier cannot say where an import points, that is a
    // finding, not a pass.
    const unresolvable = [...moduleFiles, ...platformFiles].flatMap(opaqueOf)
    expect(unresolvable).toEqual([])
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
