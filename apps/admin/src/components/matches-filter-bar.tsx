import { Label } from "@J-schedule/ui/components/label"

import type { MatchesSearch, MatchesSort, MatchesStatus } from "@/lib/matches-filters"

const controlClassName =
  "h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm text-foreground outline-none focus-visible:border-ring"

export default function MatchesFilterBar({
  courts,
  formats,
  levels,
  search,
  onChange,
  showStatusFilter,
}: {
  courts: string[]
  formats: string[]
  levels: string[]
  search: MatchesSearch
  onChange: (patch: Partial<MatchesSearch>) => void
  showStatusFilter: boolean
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filter-court">Корт</Label>
          <select
            id="filter-court"
            className={controlClassName}
            value={search.court ?? ""}
            onChange={(e) => onChange({ court: e.target.value || undefined })}
          >
            <option value="">Все</option>
            {courts.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filter-format">Формат</Label>
          <select
            id="filter-format"
            className={controlClassName}
            value={search.format ?? ""}
            onChange={(e) => onChange({ format: e.target.value || undefined })}
          >
            <option value="">Все</option>
            {formats.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filter-level">Уровень</Label>
          <select
            id="filter-level"
            className={controlClassName}
            value={search.level ?? ""}
            onChange={(e) => onChange({ level: e.target.value || undefined })}
          >
            <option value="">Все</option>
            {levels.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>

        {showStatusFilter && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="filter-status">Статус</Label>
            <select
              id="filter-status"
              className={controlClassName}
              value={search.status ?? ""}
              onChange={(e) =>
                onChange({ status: (e.target.value || undefined) as MatchesStatus | undefined })
              }
            >
              <option value="">Все</option>
              <option value="published">Опубликованные</option>
              <option value="draft">Черновики</option>
            </select>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="filter-sort">Сортировка</Label>
        <select
          id="filter-sort"
          className={controlClassName}
          value={search.sort ?? "soonest"}
          onChange={(e) => onChange({ sort: e.target.value as MatchesSort })}
        >
          <option value="soonest">Сначала ближайшие</option>
          <option value="latest">Сначала поздние</option>
          <option value="created_desc">Сначала новые</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filter-from">С даты</Label>
          <input
            id="filter-from"
            type="date"
            className={controlClassName}
            value={search.from ?? ""}
            onChange={(e) => onChange({ from: e.target.value || undefined })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filter-to">По дату</Label>
          <input
            id="filter-to"
            type="date"
            className={controlClassName}
            value={search.to ?? ""}
            onChange={(e) => onChange({ to: e.target.value || undefined })}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={!!search.minOpenSeats}
          onChange={(e) => onChange({ minOpenSeats: e.target.checked ? 1 : undefined })}
        />
        Есть свободные места
      </label>
    </div>
  )
}
