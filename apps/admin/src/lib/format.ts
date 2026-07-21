// Tashkent-local date/time formatting shared across the Матчи/История/Игроки
// pages. `apps/web` repeats this same Intl.DateTimeFormat shape per-file with
// only the weekday option varying (long for match headers, short for history
// entries, omitted for roster "joined at" timestamps) — one parameterized
// function instead of three near-identical copies.
export function formatTashkentDateTime(ms: number, weekday?: "long" | "short"): string {
  return new Date(ms).toLocaleString("ru-RU", {
    ...(weekday ? { weekday } : {}),
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tashkent",
  })
}

// Russian plural forms: 1 игра, 2-4 игры, 0/5-20 игр (and the same pattern
// for any other noun — тень 11-14 always takes the "many" form regardless
// of the last digit).
export function pluralizeRu(n: number, [one, few, many]: [string, string, string]): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}
