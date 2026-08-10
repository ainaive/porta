// Resolve a user-supplied post-auth `next` to a same-origin path, or fall
// back. String checks are insufficient — URL parsing strips tab/newline and
// treats "\" as "/", so "/\evil.com" and "/<TAB>\evil.com" are both
// protocol-relative. Resolve exactly as the browser will and require our own
// origin, returning the normalized path rather than the raw string.
export function safeNextPath(
  next: string | null | undefined,
  origin: string,
  fallback: string,
): string {
  if (!next) return fallback
  try {
    const url = new URL(next, origin)
    if (url.origin === origin) return url.pathname + url.search + url.hash
  } catch {
    // Unparseable → fall through to the fallback.
  }
  return fallback
}
