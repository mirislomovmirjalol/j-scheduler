import type { Doc, Id } from "@J-schedule/backend/convex/_generated/dataModel"

import { tashkentLocalToEpochMs } from "@/lib/tashkent-time"

export type MatchesSort = "soonest" | "latest" | "created_desc"
export type MatchesStatus = "draft" | "published"

export type MatchesSearch = {
  court?: string
  format?: string
  level?: string
  minOpenSeats?: number
  status?: MatchesStatus
  from?: string
  to?: string
  sort?: MatchesSort
  mine?: boolean
}

// TanStack Router calls this with the raw parsed query string — every field
// is optional and independently validated, so a stray/garbage param never
// breaks the whole route, it just gets dropped.
export function parseMatchesSearch(search: Record<string, unknown>): MatchesSearch {
  const str = (v: unknown) => (typeof v === "string" && v.length > 0 ? v : undefined)
  const status = str(search.status)
  const sort = str(search.sort)
  return {
    court: str(search.court),
    format: str(search.format),
    level: str(search.level),
    minOpenSeats: search.minOpenSeats != null ? Number(search.minOpenSeats) : undefined,
    status: status === "draft" || status === "published" ? status : undefined,
    from: str(search.from),
    to: str(search.to),
    sort: sort === "latest" || sort === "created_desc" ? sort : undefined,
    mine: search.mine === true || search.mine === "true" ? true : undefined,
  }
}

// The filter fields a user actually sets from the panel — deliberately
// excludes `sort` and `mine`, which aren't "filters" in the reset-button
// sense (sort always has a value, and `mine` is set by the dashboard's
// "Мои игры" link, not a panel control).
const FILTER_KEYS = [
  "court",
  "format",
  "level",
  "minOpenSeats",
  "status",
  "from",
  "to",
] as const satisfies readonly (keyof MatchesSearch)[]

export function countActiveMatchesFilters(search: MatchesSearch): number {
  return FILTER_KEYS.filter((key) => search[key] != null).length
}

export function clearedMatchesFilters(): Pick<MatchesSearch, (typeof FILTER_KEYS)[number]> {
  return Object.fromEntries(FILTER_KEYS.map((key) => [key, undefined])) as Record<
    (typeof FILTER_KEYS)[number],
    undefined
  >
}

export type MatchListEntry = {
  match: Doc<"matches">
  roster: { player: Doc<"players"> | null }[]
  waitlist: { player: Doc<"players"> | null }[]
}

export function applyMatchesFilters<T extends MatchListEntry>(
  entries: T[],
  search: MatchesSearch,
  currentPlayerId: Id<"players"> | undefined,
): T[] {
  let result = entries

  if (search.court) result = result.filter((e) => e.match.court === search.court)
  if (search.format) result = result.filter((e) => e.match.format === search.format)
  if (search.level) result = result.filter((e) => e.match.level === search.level)
  if (search.minOpenSeats) {
    result = result.filter(
      (e) => e.match.maxMembers - e.roster.length >= search.minOpenSeats!,
    )
  }
  if (search.status) {
    result = result.filter((e) =>
      search.status === "published" ? e.match.isPublished : !e.match.isPublished,
    )
  }
  if (search.from) {
    const fromMs = tashkentLocalToEpochMs(`${search.from}T00:00`)
    result = result.filter((e) => e.match.startsAt >= fromMs)
  }
  if (search.to) {
    const toMs = tashkentLocalToEpochMs(`${search.to}T23:59`)
    result = result.filter((e) => e.match.startsAt <= toMs)
  }
  if (search.mine && currentPlayerId) {
    result = result.filter((e) =>
      [...e.roster, ...e.waitlist].some((m) => m.player?._id === currentPlayerId),
    )
  }

  const sorted = [...result]
  if (search.sort === "latest") {
    sorted.sort((a, b) => b.match.startsAt - a.match.startsAt)
  } else if (search.sort === "created_desc") {
    sorted.sort((a, b) => b.match.createdAt - a.match.createdAt)
  } else {
    sorted.sort((a, b) => a.match.startsAt - b.match.startsAt)
  }
  return sorted
}
