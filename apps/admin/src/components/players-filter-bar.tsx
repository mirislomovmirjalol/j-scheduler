import { Label } from "@J-schedule/ui/components/label"

import type { PlayersRole, PlayersSearch, PlayersType } from "@/lib/players-filters"

const controlClassName =
  "h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm text-foreground outline-none focus-visible:border-ring"

// Same Sheet/Drawer filter-panel pattern as MatchesFilterBar — a plain
// form, styled and structured identically. Search lives outside this
// panel (see PlayersSearchInput, rendered directly on the page) since it's
// the primary, most-used control and deserves to be immediately visible
// rather than an extra click away; this bar only holds the secondary
// refinements.
export default function PlayersFilterBar({
  search,
  onChange,
}: {
  search: PlayersSearch
  onChange: (patch: Partial<PlayersSearch>) => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="filter-type">Тип</Label>
        <select
          id="filter-type"
          className={controlClassName}
          value={search.type ?? ""}
          onChange={(e) =>
            onChange({ type: (e.target.value || undefined) as PlayersType | undefined })
          }
        >
          <option value="">Все</option>
          <option value="authed">Игроки</option>
          <option value="guest">Гости</option>
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="filter-role">Роль</Label>
        <select
          id="filter-role"
          className={controlClassName}
          value={search.role ?? ""}
          onChange={(e) =>
            onChange({ role: (e.target.value || undefined) as PlayersRole | undefined })
          }
        >
          <option value="">Все роли</option>
          <option value="admin">Админы</option>
          <option value="member">Не админы</option>
        </select>
      </div>
    </div>
  )
}
