import type { MatchesSearch, MatchesSort, MatchesStatus } from "@/lib/matches-filters"

const controlClassName =
  "h-9 rounded-md border border-input bg-transparent px-2 text-sm text-foreground outline-none focus-visible:border-ring"

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
  const hasActiveFilters =
    search.court ||
    search.format ||
    search.level ||
    search.minOpenSeats ||
    search.status ||
    search.from ||
    search.to ||
    search.mine

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        className={controlClassName}
        value={search.court ?? ""}
        onChange={(e) => onChange({ court: e.target.value || undefined })}
      >
        <option value="">Корт: все</option>
        {courts.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      <select
        className={controlClassName}
        value={search.format ?? ""}
        onChange={(e) => onChange({ format: e.target.value || undefined })}
      >
        <option value="">Формат: все</option>
        {formats.map((f) => (
          <option key={f} value={f}>
            {f}
          </option>
        ))}
      </select>

      <select
        className={controlClassName}
        value={search.level ?? ""}
        onChange={(e) => onChange({ level: e.target.value || undefined })}
      >
        <option value="">Уровень: все</option>
        {levels.map((l) => (
          <option key={l} value={l}>
            {l}
          </option>
        ))}
      </select>

      {showStatusFilter && (
        <select
          className={controlClassName}
          value={search.status ?? ""}
          onChange={(e) =>
            onChange({ status: (e.target.value || undefined) as MatchesStatus | undefined })
          }
        >
          <option value="">Статус: все</option>
          <option value="published">Опубликованные</option>
          <option value="draft">Черновики</option>
        </select>
      )}

      <select
        className={controlClassName}
        value={search.sort ?? "soonest"}
        onChange={(e) => onChange({ sort: e.target.value as MatchesSort })}
      >
        <option value="soonest">Сначала ближайшие</option>
        <option value="latest">Сначала поздние</option>
        <option value="created_desc">Сначала новые</option>
      </select>

      <input
        type="date"
        className={controlClassName}
        value={search.from ?? ""}
        onChange={(e) => onChange({ from: e.target.value || undefined })}
      />
      <input
        type="date"
        className={controlClassName}
        value={search.to ?? ""}
        onChange={(e) => onChange({ to: e.target.value || undefined })}
      />

      <label className="flex h-9 items-center gap-1.5 rounded-md border border-input px-2 text-sm">
        <input
          type="checkbox"
          checked={!!search.minOpenSeats}
          onChange={(e) => onChange({ minOpenSeats: e.target.checked ? 1 : undefined })}
        />
        Есть места
      </label>

      {hasActiveFilters && (
        <button
          type="button"
          className="h-9 rounded-md px-2 text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
          onClick={() =>
            onChange({
              court: undefined,
              format: undefined,
              level: undefined,
              minOpenSeats: undefined,
              status: undefined,
              from: undefined,
              to: undefined,
              mine: undefined,
            })
          }
        >
          Сбросить
        </button>
      )}
    </div>
  )
}
