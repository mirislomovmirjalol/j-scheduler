import { useMemo, useState } from "react"
import { createPortal } from "react-dom"

import { tashkentDayIndex, tashkentDayIndexToDate } from "@/lib/tashkent-time"
import { usePresence } from "@/lib/use-presence"

const TOOLTIP_CLOSE_MS = 50

const WEEKS_TO_SHOW = 53
// Cell + gap footprint in px — kept uniform across breakpoints (not shrunk
// on desktop) so mobile touch targets stay usable; must match CELL_PX +
// gap-1 below, since the month labels are positioned from it directly.
const CELL_PX = 14
const GAP_PX = 4
const COLUMN_PX = CELL_PX + GAP_PX

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

type HoverState = { x: number; y: number; text: string }

export default function MatchCalendarHeatmap({ matches }: { matches: CalendarMatch[] }) {
  // Impure — captured once via a lazy useState initializer (not called
  // directly during render, which react-hooks/purity disallows anywhere in
  // the render path, not just inside useMemo) and passed in as an explicit
  // memo dependency. Not updating live past midnight is fine: this data
  // needs a manual reload to reflect new matches anyway.
  const [todayIndex] = useState(() => tashkentDayIndex(Date.now()))
  // Portaled to <body> (see render below) instead of an absolutely
  // positioned child of the cell: this grid lives inside an
  // overflow-x-auto scroll container (needed for horizontal scrolling on
  // narrow screens), and CSS forces overflow-y to clip too the moment
  // overflow-x isn't `visible` — so a tooltip anchored inside the grid
  // gets cut off for any cell near the top edge. Fixed-position + portal
  // sidesteps the whole containing-block problem.
  const [hover, setHover] = useState<HoverState | null>(null)
  const [lastHover, setLastHover] = useState<HoverState | null>(null)
  const { rendered: tooltipRendered, open: tooltipOpen } = usePresence(
    hover !== null,
    TOOLTIP_CLOSE_MS,
  )

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
              style={{ left: `${weekColumn * COLUMN_PX}px` }}
            >
              {label}
            </span>
          ))}
        </div>
        <div className="flex gap-1">
          <div className="flex flex-col gap-1 pr-1 text-xs text-muted-foreground">
            {WEEKDAY_LABELS.map((label, i) => (
              <span key={i} className="flex items-center" style={{ height: CELL_PX }}>
                {label}
              </span>
            ))}
          </div>
          <div className="flex gap-1">
            {weeks.map((column, weekIndex) => (
              <div key={weekIndex} className="flex flex-col gap-1">
                {column.map(({ dayIndex, date, matchCount, attendees }) => {
                  if (dayIndex > todayIndex) {
                    return (
                      <div key={dayIndex} style={{ width: CELL_PX, height: CELL_PX }} />
                    )
                  }
                  const text = `${date.toLocaleDateString("ru-RU", {
                    day: "2-digit",
                    month: "long",
                    timeZone: "UTC",
                  })}${
                    matchCount > 0
                      ? ` · ${matchCount} ${matchCount === 1 ? "игра" : "игры"} · ${attendees} чел.`
                      : " · нет игр"
                  }`
                  return (
                    <button
                      key={dayIndex}
                      type="button"
                      className={`rounded-[2px] transition-transform hover:scale-125 ${LEVEL_CLASSES[levelFor(attendees, maxAttendees)]}`}
                      style={{ width: CELL_PX, height: CELL_PX }}
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect()
                        const next = { x: rect.left + rect.width / 2, y: rect.top, text }
                        setHover(next)
                        setLastHover(next)
                      }}
                      onMouseLeave={() => setHover(null)}
                      onFocus={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect()
                        const next = { x: rect.left + rect.width / 2, y: rect.top, text }
                        setHover(next)
                        setLastHover(next)
                      }}
                      onBlur={() => setHover(null)}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {tooltipRendered &&
        lastHover &&
        createPortal(
          <div
            className={`t-tt-floating pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full rounded-md bg-foreground px-2 py-1 text-xs whitespace-nowrap text-background ${
              tooltipOpen ? "is-open" : ""
            }`}
            style={{ left: lastHover.x, top: lastHover.y - 6 }}
          >
            {lastHover.text}
          </div>,
          document.body,
        )}
    </div>
  )
}
