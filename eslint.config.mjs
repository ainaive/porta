import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

// Module boundaries are enforced here rather than by convention: `bun run
// lint` runs at --max-warnings 0, so a cross-module import fails the verify
// gate. `no-restricted-imports` is a core rule — no plugin, so ADR 0010's
// pinning of the eslint-config-next bundle is unaffected.
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  {
    name: 'porta/module-boundaries',
    files: ['src/**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}'],
    ignores: ['src/app/**', 'src/core/module/registry.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/modules/*', '@/modules/*/**'],
              message:
                'Only src/core/module/registry.ts (manifests) and src/app/** (route mounts) may name a module. Inside a module use relative imports; from core, go through the registry.',
            },
          ],
        },
      ],
    },
  },

  {
    name: 'porta/modules-use-published-core',
    files: ['src/modules/**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/modules/*', '@/modules/*/**'],
              message:
                'A module may not import another module. Use relative paths inside your own module.',
            },
            // `@/db` and `@/db/schema` stay open on purpose: a module that
            // outgrows the `meta` jsonb column declares its own tables in
            // src/modules/<id>/schema.ts and needs both the client and the
            // shared tables it references (ADR 0013).
            {
              group: [
                '@/lib/admin-actions',
                '@/lib/auth',
                '@/lib/auth-client',
                '@/lib/invites',
                '@/lib/email',
              ],
              message:
                'Platform internals are not a module API. Use @/core/*, @/lib/session, or @/lib/logger.',
            },
          ],
        },
      ],
    },
  },

  {
    name: 'porta/no-commonjs-loaders',
    files: ['src/**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}'],
    rules: {
      // src is ESM throughout. A CommonJS loader is both out of place and a
      // way round the import boundaries, since `module.require(...)` reads
      // nothing like an import — see src/core/module/boundaries.test.ts,
      // which rejects the same family however it is spelled.
      'no-restricted-syntax': [
        'error',
        {
          selector: 'CallExpression[callee.name="require"]',
          message:
            'src is ESM — use an import. CommonJS loaders also bypass the module boundary rules.',
        },
        {
          selector: 'CallExpression[callee.property.name="require"]',
          message:
            'src is ESM — use an import. CommonJS loaders also bypass the module boundary rules.',
        },
        {
          selector: 'MemberExpression[object.name="require"]',
          message:
            'src is ESM — use an import. CommonJS loaders also bypass the module boundary rules.',
        },
      ],
    },
  },

  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
  ]),
])

export default eslintConfig
