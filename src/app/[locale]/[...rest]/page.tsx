import { notFound } from 'next/navigation'

// Catch-all inside [locale]: any unknown localized path renders the
// localized not-found page instead of the bare framework 404.
export default function CatchAllPage() {
  notFound()
}
