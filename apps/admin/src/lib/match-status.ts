// Status is derived, never stored (CLAUDE.md: open/full/past comes from
// startsAt + roster count, not a stored field) — this is just the display
// edge for that same derivation, reused wherever a match card needs to
// show it at a glance now that past matches are visible on the list too.
export function matchStatus(
  match: { startsAt: number; maxMembers: number },
  rosterCount: number,
): "past" | "full" | "open" {
  if (match.startsAt < Date.now()) return "past"
  if (rosterCount >= match.maxMembers) return "full"
  return "open"
}
