import type { Doc, Id } from "@J-schedule/backend/convex/_generated/dataModel"

import { tashkentLocalToEpochMs } from "@/lib/tashkent-time"

export type MatchesSort = "soonest" | "latest" | "created_desc"
export type MatchesStatus = "draft" | "published"

// The matches page's primary quick-access view — three mutually-exclusive
// time scopes, each backed by its own query (not a client-side filter over
// one combined list): "active" -> listUpcomingForPlayer, "past" ->
// listPastForPlayer, "all" -> the paginated listAllForPlayerPage. This is
// deliberately independent of `sort` — an earlier version coupled "show
// everything" to "sort by creation date," which made the two controls look
// like they were fighting each other instead of two separate axes.
export type MatchesView = "all" | "active" | "past"

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
  view?: MatchesView
}

// TanStack Router calls this with the raw parsed query string — every field
// is optional and independently validated, so a stray/garbage param never
// breaks the whole route, it just gets dropped.
export function parseMatchesSearch(search: Record<string, unknown>): MatchesSearch {
  const str = (v: unknown) => (typeof v === "string" && v.length > 0 ? v : undefined)
  const status = str(search.status)
  const sort = str(search.sort)
  const view = str(search.view)
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
    view: view === "all" || view === "past" ? view : undefined,
  }
}

// The filter fields a user actually sets from the panel — deliberately
// excludes `sort`, `mine`, and `view`, which aren't "filters" in the
// reset-button sense (sort always has a value, `mine` is set by the
// dashboard's "Мои игры" link, and `view` is the page's primary tab
// selector, not something a "Сбросить" click should silently change).
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

// Time-scope (active/past/all) is handled by which query the caller runs,
// not by this function — everything here is the remaining, orthogonal set
// of filters + sort applied on top of whichever list that query returned.
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
