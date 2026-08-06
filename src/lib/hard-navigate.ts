// Full-document navigation so every server component — including the root
// layout's session-dependent chrome (user menu, admin link) — re-renders with
// fresh cookies. Client-side router.push would keep stale auth state in the
// layout; use this after any auth state change (sign-in/up/out).
export function hardNavigate(path: string) {
  window.location.assign(path)
}
