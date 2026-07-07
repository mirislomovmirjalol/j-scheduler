import { api } from "@J-schedule/backend/convex/_generated/api"
import { Card, CardContent, CardHeader, CardTitle } from "@J-schedule/ui/components/card"
import { createFileRoute } from "@tanstack/react-router"
import { useQuery } from "convex/react"

import MatchCalendarHeatmap from "@/components/match-calendar-heatmap"
import { FillRateTrendChart, MatchesPerMonthChart } from "@/components/match-trend-charts"
import StatCard from "@/components/stat-card"

export const Route = createFileRoute("/_authenticated/")({
  component: HomePage,
})

function HomePage() {
  const player = useQuery(api.players.getCurrentPlayer)
  const matches = useQuery(api.matches.listUpcomingForPlayer)
  const history = useQuery(api.matches.listMyHistory)
  const players = useQuery(api.players.listAll)
  const calendar = useQuery(api.matches.listAllForCalendar)

  const openSeats = matches?.reduce(
    (sum, { match, roster }) => sum + Math.max(match.maxMembers - roster.length, 0),
    0,
  )
  const draftCount = matches?.filter(({ match }) => !match.isPublished).length

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        Привет{player ? `, ${player.firstName}` : ""}!
      </h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Предстоящих игр" value={matches?.length ?? "—"} />
        <StatCard label="Свободных мест" value={openSeats ?? "—"} />
        <StatCard label="Сыграно игр" value={history?.length ?? "—"} />
        {player?.isAdmin && (
          <>
            <StatCard label="Черновики" value={draftCount ?? "—"} />
            <StatCard label="Игроков" value={players?.length ?? "—"} />
            <StatCard
              label="Админов"
              value={players?.filter((p) => p.isAdmin).length ?? "—"}
            />
          </>
        )}
      </div>

      {player?.isAdmin && calendar && calendar.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium">Активность по дням</CardTitle>
            </CardHeader>
            <CardContent>
              <MatchCalendarHeatmap matches={calendar} />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium">Игр в месяц</CardTitle>
              </CardHeader>
              <CardContent>
                <MatchesPerMonthChart matches={calendar} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium">Заполненность</CardTitle>
              </CardHeader>
              <CardContent>
                <FillRateTrendChart matches={calendar} />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
