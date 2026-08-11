import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Next delivers repeated query keys (?q=a&q=b) as arrays; queries and string
// methods downstream expect a single value.
export function firstParam(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

// First value per key from a query string. Mirrors firstParam's semantics for
// carrying a query across a navigation — URLSearchParams.entries() would keep
// the last duplicate instead.
export function firstValueQuery(
  params: URLSearchParams,
): Record<string, string> {
  return Object.fromEntries(
    Array.from(new Set(params.keys()), (key) => [key, params.get(key) ?? '']),
  )
}

// A `?page=` param, or undefined when it isn't a plain positive integer.
// Strict digits-only (rejects "2junk") and safe-integer (rejects overlong
// input that parseInt would round to Infinity and feed to the DB offset).
export function parsePageParam(
  value: string | string[] | undefined,
): number | undefined {
  const raw = firstParam(value)
  if (raw === undefined || !/^\d+$/.test(raw)) return undefined
  const n = Number.parseInt(raw, 10)
  return Number.isSafeInteger(n) && n > 0 ? n : undefined
}
