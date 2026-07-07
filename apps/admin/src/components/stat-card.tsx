import { Card, CardContent } from "@J-schedule/ui/components/card"
import { Link } from "@tanstack/react-router"

// Small at-a-glance number used across the dashboard/matches/players/history
// stat strips — a label and a value, nothing else. Kept tiny on purpose:
// these are summary counts, not a chart or a second page of detail.
//
// Optionally clickable two ways:
// - `to`/`search`: navigates — e.g. the dashboard's "Свободных мест" card
//   links to /matches pre-filtered to open-seat matches. Kept loosely typed
//   (not React.ComponentProps<typeof Link>): a generic wrapper component
//   loses TanStack Router's per-route literal-path type narrowing, since
//   it isn't itself generic over TFrom/TTo — not worth the complexity here.
// - `onClick`: a local toggle instead of navigation — e.g. История's
//   "В ростере" card filters the already-loaded list in place, since
//   there's no separate page to link to.
export default function StatCard({
  label,
  value,
  to,
  search,
  onClick,
  active,
}: {
  label: string
  value: string | number
  to?: string
  search?: Record<string, unknown>
  onClick?: () => void
  active?: boolean
}) {
  const content = (
    <CardContent className="flex flex-col gap-1 p-4">
      <span className="text-2xl font-semibold tabular-nums tracking-tight">{value}</span>
      <span className="text-xs text-muted-foreground uppercase">{label}</span>
    </CardContent>
  )

  if (to) {
    return (
      // `h-full` on both the link and the card: in a grid row, the grid
      // item (this Link) stretches to the row's height by default, but the
      // Card inside it doesn't — it sizes to its own content, so cards with
      // slightly different content (label length, wrapping) end up visibly
      // shorter than their row-mates even though the invisible wrapper is
      // already full height.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <Link to={to as any} search={search as any} className="block h-full">
        <Card className="h-full transition-colors hover:bg-secondary">{content}</Card>
      </Link>
    )
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="block h-full w-full text-left">
        {/* `active` uses a background tint, not a border color utility:
            this app's global Card override (apps/admin/src/index.css) sets
            a plain-CSS `border` on the card slot, which — same specificity
            as a Tailwind border-color utility, later in the cascade —
            would silently win over something like `border-primary` here. */}
        <Card
          className={`h-full transition-colors hover:bg-secondary ${active ? "bg-secondary" : ""}`}
        >
          {content}
        </Card>
      </button>
    )
  }

  return <Card className="h-full">{content}</Card>
}
