import { api } from "@J-schedule/backend/convex/_generated/api"
import type { Id } from "@J-schedule/backend/convex/_generated/dataModel"
import { Skeleton } from "@J-schedule/ui/components/skeleton"
import { useQuery } from "convex/react"

import MatchCalendarHeatmap from "@/components/match-calendar-heatmap"
import { pluralizeRu } from "@/lib/format"

// Shared by the admin player-profile page and the public profile page —
// same GitHub-style heatmap the admin dashboard already uses for
// community-wide activity, fed by one player's attended-match dates
// instead, with tooltip copy that fits "did I play that day" rather than
// "how many people showed up".
export default function PlayerActivityCalendar({ playerId }: { playerId: Id<"players"> }) {
  const days = useQuery(api.matches.getAttendedMatchDays, { playerId })

  if (days === undefined) {
    return <Skeleton className="h-32 w-full" />
  }
  if (days.length === 0) {
    return <p className="text-sm text-muted-foreground">Пока нет сыгранных игр.</p>
  }

  return (
    <MatchCalendarHeatmap
      matches={days}
      formatTooltip={({ date, matchCount }) => {
        const dateText = date.toLocaleDateString("ru-RU", {
          day: "2-digit",
          month: "long",
          timeZone: "UTC",
        })
        if (matchCount === 0) return `${dateText} · не играл(а)`
        if (matchCount === 1) return `${dateText} · играл(а)`
        return `${dateText} · играл(а) ${matchCount} ${pluralizeRu(matchCount, ["раз", "раза", "раз"])}`
      }}
    />
  )
}
