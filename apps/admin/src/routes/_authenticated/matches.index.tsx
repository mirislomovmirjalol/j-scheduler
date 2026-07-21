import { api } from "@J-schedule/backend/convex/_generated/api"
import { Badge } from "@J-schedule/ui/components/badge"
import { Button } from "@J-schedule/ui/components/button"
import { Card, CardContent, CardHeader, CardTitle } from "@J-schedule/ui/components/card"
import { Checkbox } from "@J-schedule/ui/components/checkbox"
import { Empty, EmptyDescription, EmptyTitle } from "@J-schedule/ui/components/empty"
import { Label } from "@J-schedule/ui/components/label"
import { Skeleton } from "@J-schedule/ui/components/skeleton"
import { Tabs, TabsIndicator, TabsList, TabsTab } from "@J-schedule/ui/components/tabs"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useMutation, usePaginatedQuery, useQuery } from "convex/react"
import { ConvexError } from "convex/values"
import { useState } from "react"
import { toast } from "sonner"

import DigitGroup from "@/components/digit-group"
import DraftBadge from "@/components/draft-badge"
import MatchesActiveFilters from "@/components/matches-active-filters"
import MatchesFilterPanel from "@/components/matches-filter-panel"
import MatchStatusBadge from "@/components/match-status-badge"
import Reveal from "@/components/reveal"
import StatCard from "@/components/stat-card"
import StatCardGrid from "@/components/stat-card-grid"
import TextSwap from "@/components/text-swap"
import { formatTashkentDateTime } from "@/lib/format"
import { applyMatchesFilters, parseMatchesSearch, type MatchesView } from "@/lib/matches-filters"

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
  // Captured once (stable for this component's lifetime), not read fresh on
  // every render — the "Активные"/"Прошедшие" queries below use it as a
  // paginated index bound, and Date.now() ticking forward between page
  // fetches would shift that bound and invalidate the pagination cursor.
  const [now] = useState(() => Date.now())
  // Bounded — backs only the stat-card block below and the dashboard's
  // preview list, never rendered as the "Активные" tab's own list.
  const upcomingMatches = useQuery(api.matches.listUpcomingForPlayer)
  const {
    results: activeMatches,
    status: activeStatus,
    loadMore: loadMoreActive,
  } = usePaginatedQuery(api.matches.listUpcomingForPlayerPage, { now }, { initialNumItems: 20 })
  const {
    results: allMatches,
    status: allStatus,
    loadMore: loadMoreAll,
  } = usePaginatedQuery(api.matches.listAllForPlayerPage, {}, { initialNumItems: 20 })
  const {
    results: pastMatches,
    status: pastStatus,
    loadMore: loadMorePast,
  } = usePaginatedQuery(api.matches.listPastForPlayerPage, { now }, { initialNumItems: 20 })
  const repostAllToGroup = useMutation(api.matches.repostAllToGroup)
  const [reposting, setReposting] = useState(false)
  const [pinOnRepost, setPinOnRepost] = useState(false)
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  const view: MatchesView = search.view ?? "active"
  const matches = view === "all" ? allMatches : view === "past" ? pastMatches : activeMatches
  const paginatedStatus = view === "all" ? allStatus : view === "past" ? pastStatus : activeStatus
  const loadMore = view === "all" ? loadMoreAll : view === "past" ? loadMorePast : loadMoreActive
  const isLoadingFirstPage = paginatedStatus === "LoadingFirstPage"

  const filtered = matches ? applyMatchesFilters(matches, search, player?._id) : undefined

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Матчи</h1>
        {player?.isAdmin && (
          <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
            <Label htmlFor="pin-on-repost-all" className="normal-case">
              <Checkbox
                id="pin-on-repost-all"
                checked={pinOnRepost}
                onCheckedChange={(checked) => setPinOnRepost(checked === true)}
              />
              Закрепить
            </Label>
            <Button
              variant="outline"
              disabled={reposting}
              className="flex-1 sm:flex-none"
              onClick={async () => {
                setReposting(true)
                try {
                  await repostAllToGroup({ pin: pinOnRepost })
                  toast.success("Игры отправлены в группу")
                } catch (err) {
                  toast.error(
                    err instanceof ConvexError
                      ? (err.data as string)
                      : "Не получилось отправить игры",
                  )
                } finally {
                  setReposting(false)
                }
              }}
            >
              <TextSwap>{reposting ? "Отправляем…" : "Отправить все игры"}</TextSwap>
            </Button>
            <Button render={<Link to="/matches/new" />} className="flex-1 sm:flex-none">
              + Новая игра
            </Button>
          </div>
        )}
      </div>

      <Tabs
        value={view}
        onValueChange={(value) =>
          navigate({
            search: (prev) => ({
              ...prev,
              view: value === "active" ? undefined : (value as MatchesView),
            }),
          })
        }
      >
        <TabsList className="w-full sm:w-fit">
          <TabsIndicator />
          <TabsTab value="all" className="flex-1 sm:flex-none">
            Все игры
          </TabsTab>
          <TabsTab value="active" className="flex-1 sm:flex-none">
            Активные
          </TabsTab>
          <TabsTab value="past" className="flex-1 sm:flex-none">
            Прошедшие
          </TabsTab>
        </TabsList>
      </Tabs>

      {upcomingMatches && upcomingMatches.length > 0 && (
        <StatCardGrid>
          <StatCard label="Предстоящих игр" value={upcomingMatches.length} to="/matches" />
          <StatCard
            label="Свободных мест"
            value={upcomingMatches.reduce(
              (sum, { match, roster }) => sum + Math.max(match.maxMembers - roster.length, 0),
              0,
            )}
            to="/matches"
            search={{ minOpenSeats: 1 }}
          />
          <StatCard
            label="Заполненность"
            value={`${Math.round(
              (upcomingMatches.reduce((sum, { roster }) => sum + roster.length, 0) /
                Math.max(
                  upcomingMatches.reduce((sum, { match }) => sum + match.maxMembers, 0),
                  1,
                )) *
                100,
            )}%`}
            to="/matches"
          />
        </StatCardGrid>
      )}

      {matches && matches.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <MatchesFilterPanel
            courts={[...new Set(matches.map((m) => m.match.court))].sort()}
            formats={[...new Set(matches.map((m) => m.match.format))].sort()}
            levels={[...new Set(matches.map((m) => m.match.level))].sort()}
            search={search}
            showStatusFilter={!!player?.isAdmin}
            onChange={(patch) => navigate({ search: (prev) => ({ ...prev, ...patch }) })}
          />
          <MatchesActiveFilters
            search={search}
            onRemove={(key) => navigate({ search: (prev) => ({ ...prev, [key]: undefined }) })}
          />
        </div>
      )}

      {isLoadingFirstPage ? (
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
      ) : (
        <Reveal>
          {matches!.length === 0 ? (
            <Empty>
              <EmptyTitle>
                {view === "past" ? "Пока нет прошедших игр" : "Пока нет игр"}
              </EmptyTitle>
              <EmptyDescription>
                {player?.isAdmin
                  ? "Создай первую игру, и она появится на доске в группе."
                  : "Как только админ создаст игру, она появится здесь."}
              </EmptyDescription>
              {player?.isAdmin && view !== "past" && (
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
                        <MatchStatusBadge match={match} rosterCount={roster.length} />
                        {player?.isAdmin && <DraftBadge show={!match.isPublished} />}
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
                          Ростер (<DigitGroup value={`${roster.length}/${match.maxMembers}`} />)
                        </p>
                        {roster.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            Пока никто не записался.
                          </p>
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
                            Лист ожидания (<DigitGroup value={waitlist.length} />)
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

              {paginatedStatus !== "Exhausted" && (
                <Button
                  variant="outline"
                  disabled={paginatedStatus === "LoadingMore"}
                  onClick={() => loadMore(20)}
                >
                  <TextSwap>
                    {paginatedStatus === "LoadingMore" ? "Загружаем…" : "Показать ещё"}
                  </TextSwap>
                </Button>
              )}
            </div>
          )}
        </Reveal>
      )}
    </div>
  )
}
