import { Badge } from "@J-schedule/ui/components/badge"

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

const STATUS_LABEL: Record<ReturnType<typeof matchStatus>, string> = {
  past: "Прошла",
  full: "Заполнена",
  open: "Открыта",
}

const STATUS_VARIANT: Record<ReturnType<typeof matchStatus>, React.ComponentProps<typeof Badge>["variant"]> = {
  past: "outline",
  full: "secondary",
  open: "default",
}

export default function MatchStatusBadge({
  match,
  rosterCount,
}: {
  match: { startsAt: number; maxMembers: number }
  rosterCount: number
}) {
  const status = matchStatus(match, rosterCount)
  return <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>
}
