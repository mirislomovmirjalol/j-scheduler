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
