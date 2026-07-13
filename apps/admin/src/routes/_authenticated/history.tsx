import { api } from "@J-schedule/backend/convex/_generated/api"
import { Card, CardContent } from "@J-schedule/ui/components/card"
import { Skeleton } from "@J-schedule/ui/components/skeleton"
import { createFileRoute } from "@tanstack/react-router"
import { useQuery } from "convex/react"
import { useState } from "react"

import MatchHistoryList from "@/components/match-history-list"
import Reveal from "@/components/reveal"
import StatCard from "@/components/stat-card"
import StatCardGrid from "@/components/stat-card-grid"

export const Route = createFileRoute("/_authenticated/history")({
  component: HistoryPage,
})

type RoleFilter = "roster" | "waitlist" | null

function HistoryPage() {
  const history = useQuery(api.matches.listMyHistory)
  const [roleFilter, setRoleFilter] = useState<RoleFilter>(null)

  const visible = roleFilter ? history?.filter((h) => h.membership.role === roleFilter) : history

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Моя история</h1>

      {history && history.length > 0 && (
        <StatCardGrid>
          <StatCard
            label="Сыграно игр"
            value={history.length}
            onClick={() => setRoleFilter(null)}
            active={roleFilter === null}
          />
          <StatCard
            label="В ростере"
            value={history.filter((h) => h.membership.role === "roster").length}
            onClick={() => setRoleFilter(roleFilter === "roster" ? null : "roster")}
            active={roleFilter === "roster"}
          />
          <StatCard
            label="В листе ожидания"
            value={history.filter((h) => h.membership.role === "waitlist").length}
            onClick={() => setRoleFilter(roleFilter === "waitlist" ? null : "waitlist")}
            active={roleFilter === "waitlist"}
          />
        </StatCardGrid>
      )}

      {history === undefined ? (
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
        <Reveal>
          {visible && visible.length === 0 && history.length > 0 ? (
            <p className="text-sm text-muted-foreground">Нет игр в этой категории.</p>
          ) : (
            <MatchHistoryList
              entries={visible ?? []}
              emptyTitle="Пока нет прошедших игр"
              emptyDescription="Сыгранные игры, в которых ты участвовал(-а), появятся здесь."
            />
          )}
        </Reveal>
      )}
    </div>
  )
}
