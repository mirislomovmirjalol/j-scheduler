import { Cancel01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import type { PlayersSearch } from "@/lib/players-filters"

const FILTER_LABELS: {
  key: keyof PlayersSearch
  label: (search: PlayersSearch) => string | null
}[] = [
  { key: "q", label: (s) => (s.q ? `Поиск: ${s.q}` : null) },
  {
    key: "type",
    label: (s) => (s.type === "authed" ? "Игроки" : s.type === "guest" ? "Гости" : null),
  },
  {
    key: "role",
    label: (s) => (s.role === "admin" ? "Админы" : s.role === "member" ? "Не админы" : null),
  },
]

// Same chip pattern as MatchesActiveFilters.
export default function PlayersActiveFilters({
  search,
  onRemove,
}: {
  search: PlayersSearch
  onRemove: (key: keyof PlayersSearch) => void
}) {
  const active = FILTER_LABELS.map(({ key, label }) => ({ key, text: label(search) })).filter(
    (f): f is { key: keyof PlayersSearch; text: string } => f.text !== null,
  )

  if (active.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5">
      {active.map(({ key, text }) => (
        <button
          key={key}
          type="button"
          className="t-chip flex items-center gap-1 rounded-md border border-input px-2 py-1 text-xs text-foreground transition-colors hover:bg-secondary"
          onClick={() => onRemove(key)}
        >
          {text}
          <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} className="size-3" />
        </button>
      ))}
    </div>
  )
}
