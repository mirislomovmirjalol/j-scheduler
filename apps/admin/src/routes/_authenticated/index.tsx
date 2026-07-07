import { api } from "@J-schedule/backend/convex/_generated/api"
import { Card, CardContent, CardHeader, CardTitle } from "@J-schedule/ui/components/card"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "convex/react"

import MatchCalendarHeatmap from "@/components/match-calendar-heatmap"
import { FillRateTrendChart, MatchesPerMonthChart } from "@/components/match-trend-charts"
import StatCard from "@/components/stat-card"
import { formatTashkentDateTime } from "@/lib/format"
import type { MatchListEntry } from "@/lib/matches-filters"

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

  const myUpcoming = player
    ? (matches ?? []).filter((m) =>
        [...m.roster, ...m.waitlist].some((x) => x.player?._id === player._id),
      )
    : []
  const newest = matches ? [...matches].sort((a, b) => b.match.createdAt - a.match.createdAt) : []

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        Привет{player ? `, ${player.firstName}` : ""}!
      </h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Предстоящих игр" value={matches?.length ?? "—"} to="/matches" />
        <StatCard
          label="Свободных мест"
          value={openSeats ?? "—"}
          to="/matches"
          search={{ minOpenSeats: 1 }}
        />
        <StatCard label="Сыграно игр" value={history?.length ?? "—"} to="/history" />
        {player?.isAdmin && (
          <>
            <StatCard
              label="Черновики"
              value={draftCount ?? "—"}
              to="/matches"
              search={{ status: "draft" }}
            />
            <StatCard label="Игроков" value={players?.length ?? "—"} to="/players" />
            <StatCard
              label="Админов"
              value={players?.filter((p) => p.isAdmin).length ?? "—"}
              to="/players"
              search={{ role: "admin" }}
            />
          </>
        )}
      </div>

      {matches && matches.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <MatchPreviewList
            title="Мои игры"
            entries={myUpcoming.slice(0, 3)}
            emptyText="Ты пока никуда не записан(а)."
            showMoreSearch={{ mine: true }}
          />
          <MatchPreviewList
            title="Новые игры"
            entries={newest.slice(0, 3)}
            emptyText="Пока нет игр."
            showMoreSearch={{ sort: "created_desc" }}
          />
        </div>
      )}

      {player?.isAdmin && calendar && calendar.length > 0 && (
        <>
          {/* overflow-visible: the heatmap's hover tooltips pop up above
              cells near the card's own edges — Card clips overflow by
              default (for rounded-corner image content), which was cutting
              tooltips off instead of letting them float above the card. */}
          <Card className="overflow-visible">
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

function MatchPreviewList({
  title,
  entries,
  emptyText,
  showMoreSearch,
}: {
  title: string
  entries: MatchListEntry[]
  emptyText: string
  showMoreSearch: Record<string, unknown>
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">{title}</CardTitle>
          <Link
            to="/matches"
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            search={showMoreSearch as any}
            className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            Показать все
          </Link>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          entries.map(({ match, roster }) => (
            <Link
              key={match._id}
              to="/matches/$matchId"
              params={{ matchId: match._id }}
              className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-secondary"
            >
              <span className="capitalize">{formatTashkentDateTime(match.startsAt, "short")}</span>
              <span className="text-muted-foreground">
                {match.court} · {roster.length}/{match.maxMembers}
              </span>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  )
}
