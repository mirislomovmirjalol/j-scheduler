// All timestamps live in the DB as UTC epoch millis (CLAUDE.md #3). These
// helpers convert at the display edge only — board text, dashboard, DMs.
// Tashkent is a fixed UTC+5 offset with no DST, so plain arithmetic is safe.

const TASHKENT_TZ = "Asia/Tashkent";
const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;

export type TashkentParts = {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  weekday: string; // short Russian weekday, e.g. "пн"
};

// Epoch ms -> the wall-clock a Tashkent viewer would see.
export function toTashkent(ms: number): TashkentParts {
  const parts = new Intl.DateTimeFormat("ru-RU", {
    timeZone: TASHKENT_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  }).formatToParts(new Date(ms));

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";

  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    weekday: get("weekday"),
  };
}

// Tashkent wall-clock -> epoch ms (for parsing admin-entered date/time input).
export function fromTashkent(parts: {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
}): number {
  const utcMs = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
  );
  return utcMs - TASHKENT_OFFSET_MS;
}

const pad = (n: number) => String(n).padStart(2, "0");

// "02.07 18:00" — board rows, DM reminders.
export function formatTashkentDateTime(ms: number): string {
  const t = toTashkent(ms);
  return `${pad(t.day)}.${pad(t.month)} ${pad(t.hour)}:${pad(t.minute)}`;
}

// "18:00" only.
export function formatTashkentTime(ms: number): string {
  const t = toTashkent(ms);
  return `${pad(t.hour)}:${pad(t.minute)}`;
}
