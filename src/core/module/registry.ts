import { aiEval } from '../../modules/ai-eval/module'
import { help } from '../../modules/help/module'
import { toolShelf } from '../../modules/tool-shelf/module'

// The one file every module team shares: adding a module is one import and
// one array entry. Everything the platform needs — navigation, gated paths,
// section lookups, meta validation, message bundles, redirects — is derived
// from here in ./derive.ts, so nothing else has a per-module list to update.
//
// Relative imports on purpose: `next.config.ts` reads this module to build
// its redirect table, and TypeScript path aliases are not guaranteed to
// resolve there.
export const modules = [toolShelf, aiEval, help] as const

export type Modules = typeof modules
