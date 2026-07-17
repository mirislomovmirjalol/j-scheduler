import { api } from "@J-schedule/backend/convex/_generated/api"
import { Button } from "@J-schedule/ui/components/button"
import { Card, CardContent } from "@J-schedule/ui/components/card"
import { Skeleton } from "@J-schedule/ui/components/skeleton"
import { createFileRoute } from "@tanstack/react-router"
import { usePaginatedQuery, useQuery } from "convex/react"
import { useState } from "react"

import MatchHistoryList from "@/components/match-history-list"
import Reveal from "@/components/reveal"
import StatCard from "@/components/stat-card"
import StatCardGrid from "@/components/stat-card-grid"
import TextSwap from "@/components/text-swap"

export const Route = createFileRoute("/_authenticated/history")({
  component: HistoryPage,
})

type RoleFilter = "roster" | "waitlist" | undefined

function HistoryPage() {
  // Bounded — backs only the stat-card counts, never rendered as a list, so
  // its take(200) cap is an acceptable approximation for a numeric label.
  const stats = useQuery(api.matches.listMyHistory)
  const [roleFilter, setRoleFilter] = useState<RoleFilter>(undefined)

  // The actual scrollable list — real cursor pagination, no cap. Changing
  // role re-queries from scratch (Convex resets pagination when args
  // change), which reads as "the list filtered" rather than a glitch.
  const {
    results: entries,
    status,
    loadMore,
  } = usePaginatedQuery(
    api.matches.listMyHistoryPage,
    { role: roleFilter },
    { initialNumItems: 20 },
  )
  const isLoadingFirstPage = status === "LoadingFirstPage"

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Моя история</h1>

      {stats && stats.length > 0 && (
        <StatCardGrid>
          <StatCard
            label="Сыграно игр"
            value={stats.length}
            onClick={() => setRoleFilter(undefined)}
            active={roleFilter === undefined}
          />
          <StatCard
            label="В ростере"
            value={stats.filter((h) => h.membership.role === "roster").length}
            onClick={() => setRoleFilter(roleFilter === "roster" ? undefined : "roster")}
            active={roleFilter === "roster"}
          />
          <StatCard
            label="В листе ожидания"
            value={stats.filter((h) => h.membership.role === "waitlist").length}
            onClick={() => setRoleFilter(roleFilter === "waitlist" ? undefined : "waitlist")}
            active={roleFilter === "waitlist"}
          />
        </StatCardGrid>
      )}

      {isLoadingFirstPage ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <Card key={i}>
              <CardContent className="flex items-center justify-between gap-4">
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-56" />
                </div>
                <Skeleton className="h-5 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Reveal className="flex flex-col gap-3">
          <MatchHistoryList
            entries={entries}
            emptyTitle="Пока нет прошедших игр"
            emptyDescription="Сыгранные игры, в которых ты участвовал(-а), появятся здесь."
          />

          {status !== "Exhausted" && (
            <Button
              variant="outline"
              disabled={status === "LoadingMore"}
              onClick={() => loadMore(20)}
            >
              <TextSwap>{status === "LoadingMore" ? "Загружаем…" : "Показать ещё"}</TextSwap>
            </Button>
          )}
        </Reveal>
      )}
    </div>
  )
}
