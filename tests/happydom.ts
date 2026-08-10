import { afterAll, beforeAll } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'

// Call at the top of a component test (*.test.tsx) to install a DOM for that
// file's tests and tear it down afterwards. Registering (and unregistering)
// per file — rather than a global bunfig preload — keeps the node and DB
// suites on Bun's native fetch/URL/Request/Response/FormData globals even in a
// mixed `bun test` run. A concrete URL gives window.location a real origin
// (happy-dom's default about:blank origin is the string "null").
export function setupHappyDom(url = 'http://localhost:3000'): void {
  beforeAll(() => {
    if (!GlobalRegistrator.isRegistered) {
      GlobalRegistrator.register({ url })
    }
  })
  afterAll(async () => {
    if (GlobalRegistrator.isRegistered) {
      await GlobalRegistrator.unregister()
    }
  })
}
