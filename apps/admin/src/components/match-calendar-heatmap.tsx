import { useMemo, useState } from "react"

import { tashkentDayIndex, tashkentDayIndexToDate } from "@/lib/tashkent-time"

const WEEKS_TO_SHOW = 53
const WEEKDAY_LABELS = ["Пн", "", "Ср", "", "Пт", "", "Вс"]
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

// GitHub buckets by intensity relative to the busiest day in view, not by a
// fixed headcount — that's what keeps the heatmap meaningful whether a
// community's days peak at 8 players or 80.
const LEVEL_CLASSES = ["bg-muted", "bg-primary/25", "bg-primary/50", "bg-primary/75", "bg-primary"]

function levelFor(attendees: number, maxAttendees: number): number {
  if (attendees === 0) return 0
  const ratio = attendees / maxAttendees
  if (ratio > 0.75) return 4
  if (ratio > 0.5) return 3
  if (ratio > 0.25) return 2
  return 1
}

export type CalendarMatch = { startsAt: number; rosterCount: number }

export default function MatchCalendarHeatmap({ matches }: { matches: CalendarMatch[] }) {
  // Impure — captured once via a lazy useState initializer (not called
  // directly during render, which react-hooks/purity disallows anywhere in
  // the render path, not just inside useMemo) and passed in as an explicit
  // memo dependency. Not updating live past midnight is fine: this data
  // needs a manual reload to reflect new matches anyway.
  const [todayIndex] = useState(() => tashkentDayIndex(Date.now()))

  const { weeks, monthMarkers, maxAttendees } = useMemo(() => {
    const dayTotals = new Map<number, { matchCount: number; attendees: number }>()
    for (const m of matches) {
      const idx = tashkentDayIndex(m.startsAt)
      const entry = dayTotals.get(idx) ?? { matchCount: 0, attendees: 0 }
      entry.matchCount += 1
      entry.attendees += m.rosterCount
      dayTotals.set(idx, entry)
    }

    const rangeStart = todayIndex - WEEKS_TO_SHOW * 7 + 1
    const startWeekday = (tashkentDayIndexToDate(rangeStart).getUTCDay() + 6) % 7
    const gridStart = rangeStart - startWeekday

    const weeks: { dayIndex: number; date: Date; matchCount: number; attendees: number }[][] = []
    const monthMarkers: { weekColumn: number; label: string }[] = []
    let lastMonth = -1

    for (let week = 0; week < WEEKS_TO_SHOW + 1; week++) {
      const column: (typeof weeks)[number] = []
      for (let weekday = 0; weekday < 7; weekday++) {
        const dayIndex = gridStart + week * 7 + weekday
        const date = tashkentDayIndexToDate(dayIndex)
        if (weekday === 0) {
          const month = date.getUTCMonth()
          if (month !== lastMonth && dayIndex >= rangeStart) {
            monthMarkers.push({ weekColumn: week, label: MONTH_LABELS[month] })
            lastMonth = month
          }
        }
        const totals = dayTotals.get(dayIndex)
        column.push({
          dayIndex,
          date,
          matchCount: totals?.matchCount ?? 0,
          attendees: totals?.attendees ?? 0,
        })
      }
      weeks.push(column)
    }

    const maxAttendees = Math.max(1, ...[...dayTotals.values()].map((v) => v.attendees))
    return { weeks, monthMarkers, maxAttendees }
  }, [matches, todayIndex])

  return (
    <div className="overflow-x-auto">
      <div className="inline-flex flex-col gap-1">
        <div className="relative ml-6 h-4 text-xs text-muted-foreground">
          {monthMarkers.map(({ weekColumn, label }) => (
            <span
              key={weekColumn}
              className="absolute"
              style={{ left: `${weekColumn * 14}px` }}
            >
              {label}
            </span>
          ))}
        </div>
        <div className="flex gap-1">
          <div className="flex flex-col gap-1 pr-1 text-xs text-muted-foreground">
            {WEEKDAY_LABELS.map((label, i) => (
              <span key={i} className="flex h-2.5 items-center">
                {label}
              </span>
            ))}
          </div>
          <div className="flex gap-1">
            {weeks.map((column, weekIndex) => (
              <div key={weekIndex} className="flex flex-col gap-1">
                {column.map(({ dayIndex, date, matchCount, attendees }) => {
                  if (dayIndex > todayIndex) {
                    return <div key={dayIndex} className="size-2.5" />
                  }
                  return (
                    <div key={dayIndex} className="group relative">
                      <div
                        className={`size-2.5 rounded-[2px] ${LEVEL_CLASSES[levelFor(attendees, maxAttendees)]}`}
                      />
                      <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2 scale-95 rounded-md bg-foreground px-2 py-1 text-xs whitespace-nowrap text-background opacity-0 transition-[opacity,transform] duration-150 ease-out group-hover:scale-100 group-hover:opacity-100">
                        {date.toLocaleDateString("ru-RU", {
                          day: "2-digit",
                          month: "long",
                          timeZone: "UTC",
                        })}
                        {matchCount > 0
                          ? ` · ${matchCount} ${matchCount === 1 ? "игра" : "игры"} · ${attendees} чел.`
                          : " · нет игр"}
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
