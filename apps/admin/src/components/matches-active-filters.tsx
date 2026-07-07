import { Cancel01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import type { MatchesSearch } from "@/lib/matches-filters"

const FILTER_LABELS: {
  key: keyof MatchesSearch
  label: (search: MatchesSearch) => string | null
}[] = [
  { key: "court", label: (s) => (s.court ? `Корт: ${s.court}` : null) },
  { key: "format", label: (s) => (s.format ? `Формат: ${s.format}` : null) },
  { key: "level", label: (s) => (s.level ? `Уровень: ${s.level}` : null) },
  { key: "minOpenSeats", label: (s) => (s.minOpenSeats ? "Есть свободные места" : null) },
  {
    key: "status",
    label: (s) =>
      s.status === "draft" ? "Черновики" : s.status === "published" ? "Опубликованные" : null,
  },
  { key: "from", label: (s) => (s.from ? `С ${s.from}` : null) },
  { key: "to", label: (s) => (s.to ? `По ${s.to}` : null) },
  { key: "mine", label: (s) => (s.mine ? "Мои игры" : null) },
  {
    key: "sort",
    label: (s) =>
      s.sort === "created_desc" ? "Сначала новые" : s.sort === "latest" ? "Сначала поздние" : null,
  },
]

// Shown next to the filter trigger so the active state is visible without
// opening the panel — each chip clears just that one filter.
export default function MatchesActiveFilters({
  search,
  onRemove,
}: {
  search: MatchesSearch
  onRemove: (key: keyof MatchesSearch) => void
}) {
  const active = FILTER_LABELS.map(({ key, label }) => ({ key, text: label(search) })).filter(
    (f): f is { key: keyof MatchesSearch; text: string } => f.text !== null,
  )

  if (active.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5">
      {active.map(({ key, text }) => (
        <button
          key={key}
          type="button"
          className="flex items-center gap-1 rounded-md border border-input px-2 py-1 text-xs text-foreground transition-colors hover:bg-secondary"
          onClick={() => onRemove(key)}
        >
          {text}
          <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} className="size-3" />
        </button>
      ))}
    </div>
  )
}
