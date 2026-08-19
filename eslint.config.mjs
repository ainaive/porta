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
    files: ['src/**/*.{ts,tsx}'],
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
    files: ['src/modules/**/*.{ts,tsx}'],
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
            {
              group: ['@/db', '@/db/*', '@/db/**'],
              message:
                'Modules reach the database through @/core/content, not the schema directly. A module that needs its own tables declares them in src/modules/<id>/schema.ts.',
            },
            {
              group: ['@/lib/admin-actions', '@/lib/auth', '@/lib/invites'],
              message:
                'Platform internals are not a module API. Use @/core/* or @/lib/session.',
            },
          ],
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
