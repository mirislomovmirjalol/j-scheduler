// Same convention as apps/admin/src/lib/format.ts and
// packages/backend/convex/lib/time.ts — UTC storage, Tashkent (UTC+5)
// conversion only at the display edge (CLAUDE.md Golden Rule 3).
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
