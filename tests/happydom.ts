// Registers a DOM (window/document/etc.) for component tests (*.test.tsx) so
// Testing Library can render. Node and DB suites are unaffected — DOM globals
// simply go unused there. Loaded via bunfig preload alongside tests/preload.ts.
import { GlobalRegistrator } from '@happy-dom/global-registrator'

GlobalRegistrator.register()
