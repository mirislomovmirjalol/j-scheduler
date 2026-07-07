import { Card, CardContent } from "@J-schedule/ui/components/card"
import { Link } from "@tanstack/react-router"

// Small at-a-glance number used across the dashboard/matches/players/history
// stat strips — a label and a value, nothing else. Kept tiny on purpose:
// these are summary counts, not a chart or a second page of detail.
// Optionally clickable: pass `to`/`search` to make the card navigate — e.g.
// the dashboard's "Свободных мест" card links to /matches pre-filtered to
// open-seat matches. Kept loosely typed (not React.ComponentProps<typeof
// Link>): a generic wrapper component loses TanStack Router's per-route
// literal-path type narrowing, since it isn't itself generic over
// TFrom/TTo — trying to preserve that here isn't worth the complexity for
// a stat card.
export default function StatCard({
  label,
  value,
  to,
  search,
}: {
  label: string
  value: string | number
  to?: string
  search?: Record<string, unknown>
}) {
  const content = (
    <CardContent className="flex flex-col gap-1 p-4">
      <span className="text-2xl font-semibold tabular-nums tracking-tight">{value}</span>
      <span className="text-xs text-muted-foreground uppercase">{label}</span>
    </CardContent>
  )

  if (to) {
    return (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <Link to={to as any} search={search as any} className="block">
        <Card className="transition-colors hover:bg-secondary">{content}</Card>
      </Link>
    )
  }

  return <Card>{content}</Card>
}
