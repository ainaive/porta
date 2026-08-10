// Installs a DOM (window/document/etc.) so component tests (*.test.tsx) can
// render with Testing Library. Imported at the top of each component test —
// deliberately NOT a global bunfig preload, so the node and DB suites keep
// Bun's native fetch/URL/Request/Response/FormData primitives. Idempotent:
// several component files may import it in one run, and register() throws if
// a DOM is already registered.
import { GlobalRegistrator } from '@happy-dom/global-registrator'

if (!GlobalRegistrator.isRegistered) {
  GlobalRegistrator.register()
}
