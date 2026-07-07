import { api } from "@J-schedule/backend/convex/_generated/api"
import { Badge } from "@J-schedule/ui/components/badge"
import { Button } from "@J-schedule/ui/components/button"
import { Card, CardContent, CardHeader, CardTitle } from "@J-schedule/ui/components/card"
import { Empty, EmptyDescription, EmptyTitle } from "@J-schedule/ui/components/empty"
import { Skeleton } from "@J-schedule/ui/components/skeleton"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useMutation, useQuery } from "convex/react"
import { useState } from "react"
import { toast } from "sonner"

import MatchesFilterBar from "@/components/matches-filter-bar"
import StatCard from "@/components/stat-card"
import { formatTashkentDateTime } from "@/lib/format"
import { applyMatchesFilters, parseMatchesSearch } from "@/lib/matches-filters"

export const Route = createFileRoute("/_authenticated/matches/")({
  validateSearch: parseMatchesSearch,
  component: MatchesList,
})

function playerName(player: { firstName: string; lastName?: string } | null) {
  if (!player) return "—"
  return player.lastName ? `${player.firstName} ${player.lastName}` : player.firstName
}

function MatchesList() {
  const player = useQuery(api.players.getCurrentPlayer)
  const matches = useQuery(api.matches.listUpcomingForPlayer)
  const repostToGroup = useMutation(api.boardState.repostToGroup)
  const [reposting, setReposting] = useState(false)
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  const filtered = matches
    ? applyMatchesFilters(matches, search, player?._id)
    : undefined

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Матчи</h1>
        {player?.isAdmin && (
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <Button
              variant="outline"
              disabled={reposting}
              className="flex-1 sm:flex-none"
              onClick={async () => {
                setReposting(true)
                try {
                  await repostToGroup({})
                  toast.success("Доска отправлена в группу")
                } catch {
                  toast.error("Не получилось отправить доску")
                } finally {
                  setReposting(false)
                }
              }}
            >
              {reposting ? "Отправляем…" : "Отправить в группу"}
            </Button>
            <Button render={<Link to="/matches/new" />} className="flex-1 sm:flex-none">
              + Новая игра
            </Button>
          </div>
        )}
      </div>

      {matches && matches.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Предстоящих игр" value={matches.length} />
          <StatCard
            label="Свободных мест"
            value={matches.reduce(
              (sum, { match, roster }) => sum + Math.max(match.maxMembers - roster.length, 0),
              0,
            )}
            to="/matches"
            search={{ minOpenSeats: 1 }}
          />
          <StatCard
            label="Заполненность"
            value={`${Math.round(
              (matches.reduce((sum, { roster }) => sum + roster.length, 0) /
                Math.max(
                  matches.reduce((sum, { match }) => sum + match.maxMembers, 0),
                  1,
                )) *
                100,
            )}%`}
          />
        </div>
      )}

      {matches && matches.length > 0 && (
        <MatchesFilterBar
          courts={[...new Set(matches.map((m) => m.match.court))].sort()}
          formats={[...new Set(matches.map((m) => m.match.format))].sort()}
          levels={[...new Set(matches.map((m) => m.match.level))].sort()}
          search={search}
          showStatusFilter={!!player?.isAdmin}
          onChange={(patch) => navigate({ search: (prev) => ({ ...prev, ...patch }) })}
        />
      )}

      {matches === undefined ? (
        <div className="flex flex-col gap-4">
          {[0, 1].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-64" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-24" />
                <div className="mt-2 flex gap-1.5">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : matches.length === 0 ? (
        <Empty>
          <EmptyTitle>Пока нет игр</EmptyTitle>
          <EmptyDescription>
            {player?.isAdmin
              ? "Создай первую игру, и она появится на доске в группе."
              : "Как только админ создаст игру, она появится здесь."}
          </EmptyDescription>
          {player?.isAdmin && (
            <Button render={<Link to="/matches/new" />} className="mt-4">
              + Новая игра
            </Button>
          )}
        </Empty>
      ) : filtered && filtered.length === 0 ? (
        <Empty>
          <EmptyTitle>Нет игр по этим фильтрам</EmptyTitle>
          <EmptyDescription>Попробуй сбросить или изменить фильтры.</EmptyDescription>
        </Empty>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered!.map(({ match, roster, waitlist }) => (
            <Link key={match._id} to="/matches/$matchId" params={{ matchId: match._id }}>
              <Card className="transition-colors hover:bg-secondary">
                <CardHeader>
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-base font-medium capitalize">
                      {formatTashkentDateTime(match.startsAt, "long")}
                    </CardTitle>
                    {player?.isAdmin && !match.isPublished && (
                      <Badge variant="outline">Черновик</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {match.court} · {match.format} · Уровень {match.level}
                    {match.pricePerPerson ? ` · ${match.pricePerPerson} с человека` : ""}
                  </p>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {match.description && (
                    <p className="text-sm text-muted-foreground">{match.description}</p>
                  )}

                  <div>
                    <p className="mb-1.5 text-xs font-medium text-muted-foreground uppercase">
                      Ростер ({roster.length}/{match.maxMembers})
                    </p>
                    {roster.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Пока никто не записался.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {roster.map(({ player: p }, i) => (
                          <Badge key={i} variant="secondary">
                            {playerName(p)}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {waitlist.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-xs font-medium text-muted-foreground uppercase">
                        Лист ожидания ({waitlist.length})
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {waitlist.map(({ player: p }, i) => (
                          <Badge key={i} variant="outline">
                            {playerName(p)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
