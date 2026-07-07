import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@J-schedule/ui/components/chart"
import { useMemo, useState } from "react"
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"

import { tashkentDayIndex, tashkentDayIndexToDate } from "@/lib/tashkent-time"

const MONTH_LABELS = [
  "Янв",
  "Фев",
  "Мар",
  "Апр",
  "Май",
  "Июн",
  "Июл",
  "Авг",
  "Сен",
  "Окт",
  "Ноя",
  "Дек",
]
const MONTHS_TO_SHOW = 12

export type TrendMatch = { startsAt: number; rosterCount: number; maxMembers: number }

function monthKey(ms: number): string {
  const d = tashkentDayIndexToDate(tashkentDayIndex(ms))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
}

function useMonthlyBuckets(matches: TrendMatch[]) {
  // tashkentDayIndex(Date.now()) is impure — captured once via a lazy
  // useState initializer (not called directly during render, which
  // react-hooks/purity disallows anywhere in the render path, not just
  // inside useMemo) and passed in as an explicit memo dependency. Not
  // updating live past midnight is fine: this data needs a manual reload
  // to reflect new matches anyway.
  const [todayIndex] = useState(() => tashkentDayIndex(Date.now()))

  return useMemo(() => {
    const byMonth = new Map<string, { matchCount: number; roster: number; capacity: number }>()
    for (const m of matches) {
      const key = monthKey(m.startsAt)
      const entry = byMonth.get(key) ?? { matchCount: 0, roster: 0, capacity: 0 }
      entry.matchCount += 1
      entry.roster += m.rosterCount
      entry.capacity += m.maxMembers
      byMonth.set(key, entry)
    }

    const now = tashkentDayIndexToDate(todayIndex)
    const rows: { month: string; matches: number; fillRate: number }[] = []
    for (let i = MONTHS_TO_SHOW - 1; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
      const entry = byMonth.get(key)
      rows.push({
        month: `${MONTH_LABELS[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(2)}`,
        matches: entry?.matchCount ?? 0,
        fillRate: entry && entry.capacity > 0 ? Math.round((entry.roster / entry.capacity) * 100) : 0,
      })
    }
    return rows
  }, [matches, todayIndex])
}

const matchesChartConfig = {
  matches: { label: "Игр", color: "var(--primary)" },
} satisfies ChartConfig

export function MatchesPerMonthChart({ matches }: { matches: TrendMatch[] }) {
  const rows = useMonthlyBuckets(matches)

  return (
    <ChartContainer config={matchesChartConfig} className="aspect-auto h-56 w-full">
      <BarChart data={rows}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} width={24} allowDecimals={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="matches" fill="var(--color-matches)" radius={4} />
      </BarChart>
    </ChartContainer>
  )
}

const fillRateChartConfig = {
  fillRate: { label: "Заполненность, %", color: "var(--primary)" },
} satisfies ChartConfig

export function FillRateTrendChart({ matches }: { matches: TrendMatch[] }) {
  const rows = useMonthlyBuckets(matches)

  return (
    <ChartContainer config={fillRateChartConfig} className="aspect-auto h-56 w-full">
      <LineChart data={rows}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={32}
          domain={[0, 100]}
          tickFormatter={(v) => `${v}%`}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line
          dataKey="fillRate"
          type="monotone"
          stroke="var(--color-fillRate)"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ChartContainer>
  )
}
