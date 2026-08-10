// Structured JSON logging to stdout/stderr. Both deploy targets capture the
// process output — Vercel's log drains and `docker logs` alike — so no
// transport or dependency is needed; one line per event keeps it greppable.
// Errors that used to vanish (rethrows in server actions, error boundaries)
// route through here so a production failure leaves a trace.

type Level = 'debug' | 'info' | 'warn' | 'error'

type Context = Record<string, unknown>

function emit(level: Level, message: string, context?: Context): void {
  // Spread context first so a stray context.level/message/time can't shadow
  // the real fields.
  const line = JSON.stringify({
    ...context,
    level,
    message,
    time: new Date().toISOString(),
  })
  // warn/error to stderr, the rest to stdout — the conventional split.
  if (level === 'warn' || level === 'error') console.error(line)
  else console.log(line)
}

export const logger = {
  debug: (message: string, context?: Context) =>
    emit('debug', message, context),
  info: (message: string, context?: Context) => emit('info', message, context),
  warn: (message: string, context?: Context) => emit('warn', message, context),
  error: (message: string, context?: Context) =>
    emit('error', message, context),
}

// Normalize an unknown thrown value into loggable fields.
export function errorFields(error: unknown): Context {
  if (error instanceof Error) {
    return { error: error.message, name: error.name, stack: error.stack }
  }
  return { error: String(error) }
}
