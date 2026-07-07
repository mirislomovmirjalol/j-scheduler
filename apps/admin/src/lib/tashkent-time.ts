// Mirrors convex/lib/time.ts's fromTashkent — Tashkent is a fixed UTC+5
// offset (no DST), so this stays in sync with the backend's own logic.
const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000

// Parses a <input type="datetime-local"> value ("YYYY-MM-DDTHH:mm"),
// interpreted as Tashkent local time, into UTC epoch ms for storage.
export function tashkentLocalToEpochMs(value: string): number {
  const [datePart, timePart] = value.split("T")
  const [year, month, day] = datePart.split("-").map(Number)
  const [hour, minute] = timePart.split(":").map(Number)
  const utcMs = Date.UTC(year, month - 1, day, hour, minute)
  return utcMs - TASHKENT_OFFSET_MS
}

// Inverse, for pre-filling an edit form's datetime-local input.
export function epochMsToTashkentLocal(ms: number): string {
  const tashkentMs = ms + TASHKENT_OFFSET_MS
  const d = new Date(tashkentMs)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
}
