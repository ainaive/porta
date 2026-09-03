import { handbook } from '@/modules/handbook/module'
import { toolShelf } from '@/modules/tool-shelf/module'

// The one file every module team shares: adding a module is one import and
// one array entry. Everything the platform needs — navigation, gated paths,
// section lookups, meta validation, message bundles, redirects — is derived
// from here in ./derive.ts, so nothing else has a per-module list to update.
//
// Kept free of JSX, database and server-only imports: `src/proxy.ts` reaches
// this file through `gating.ts`, so whatever a manifest drags in ends up in
// the middleware bundle.
export const modules = [toolShelf, handbook] as const

export type Modules = typeof modules
