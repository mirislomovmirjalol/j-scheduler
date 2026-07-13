import { cn } from "@J-schedule/ui/lib/utils"

// Shared responsive grid for StatCard strips — the card count varies by
// caller (3 for a regular player's dashboard, 6 once the admin-only cards
// are added in; always 3 on the matches/history pages) and by viewport, so
// a plain `grid-cols-N` div either looks cramped on mobile (3 narrow cards
// in a row) or leaves an odd trailing card alone on its own half-empty row
// whenever the count doesn't divide evenly (e.g. 3 cards in a 2-column
// grid). grid-cols-2 keeps cards comfortably sized on a phone, and the
// arbitrary-variant selector makes a lone trailing card span the full
// width instead of sitting orphaned — sm: switches to 3 columns, where 3
// and 6 (today's only counts) both tile exactly, so the same trick is
// switched back off there.
export default function StatCardGrid({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 [&>*:last-child:nth-child(odd)]:col-span-2",
        "sm:grid-cols-3 sm:[&>*:last-child:nth-child(odd)]:col-span-1",
        className,
      )}
    >
      {children}
    </div>
  )
}
