import type { Doc } from "@J-schedule/backend/convex/_generated/dataModel"

export type PlayersType = "authed" | "guest"
export type PlayersRole = "admin" | "member"

export type PlayersSearch = {
  q?: string
  type?: PlayersType
  role?: PlayersRole
}

export function parsePlayersSearch(search: Record<string, unknown>): PlayersSearch {
  const str = (v: unknown) => (typeof v === "string" && v.length > 0 ? v : undefined)
  const type = str(search.type)
  const role = str(search.role)
  return {
    q: str(search.q),
    type: type === "authed" || type === "guest" ? type : undefined,
    role: role === "admin" || role === "member" ? role : undefined,
  }
}

export function applyPlayersFilters(
  players: Doc<"players">[],
  search: PlayersSearch,
): Doc<"players">[] {
  let result = players

  if (search.q) {
    const needle = search.q.trim().toLowerCase()
    result = result.filter(
      (p) =>
        p.firstName.toLowerCase().includes(needle) ||
        p.lastName?.toLowerCase().includes(needle) ||
        p.username?.toLowerCase().includes(needle),
    )
  }
  if (search.type) result = result.filter((p) => p.type === search.type)
  if (search.role) {
    result = result.filter((p) => (search.role === "admin" ? p.isAdmin : !p.isAdmin))
  }

  return result
}
