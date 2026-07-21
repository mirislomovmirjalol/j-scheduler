import type { Doc } from "../_generated/dataModel";
import { formatTashkentDateTime, toTashkent } from "./time";

// Telegram hard-caps a message at 4096 UTF-16 code units. A single match's
// card is far less likely to hit this than the old combined board ever was,
// but the guard stays as a defensive net for a match with a very full
// roster + waitlist: first by dropping the mention-link markup (shorter),
// then by truncating plain text.
const MAX_MESSAGE_LENGTH = 4096;

// Message text is sent with parse_mode HTML (so names can be clickable
// mentions) — every admin-entered free-text field must be escaped, or a
// stray "<" or "&" in a court/format/level value would break the message.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type NamedPlayer = { name: string; telegramUserId: number | null };

// Wraps a name in a tg://user mention link when we have a Telegram id (this
// works even for users with no public @username) — falls back to plain
// escaped text for guests, who have no Telegram account to link to.
function mentionLink(player: NamedPlayer): string {
  const safeName = escapeHtml(player.name);
  if (player.telegramUserId === null) return safeName;
  return `<a href="tg://user?id=${player.telegramUserId}">${safeName}</a>`;
}

export type MatchWithRosterCount = Doc<"matches"> & {
  rosterCount: number;
  rosterNames: NamedPlayer[];
  waitlistNames: NamedPlayer[];
};

export type BoardButton = { text: string; callback_data: string };

export type RenderedBoard = {
  text: string;
  buttons: BoardButton[][];
};

// Pure function: one match -> its own Telegram message text + inline
// keyboard. No Telegram/DB calls in here so it's trivial to unit test and
// reuse from both the sync action and any future preview in the dashboard.
//
// withLinks=false renders names as plain escaped text (no <a> tags) — used
// as the first fallback if the linked version is too long; it's shorter
// and, having no tags, safe to further truncate if even that overflows.
export function renderMatchMessage(
  match: MatchWithRosterCount,
  paymentInfo?: string,
  withLinks = true,
): RenderedBoard {
  const nameText = (player: NamedPlayer) =>
    withLinks ? mentionLink(player) : escapeHtml(player.name);

  const weekday = toTashkent(match.startsAt).weekday;
  const dateTime = formatTashkentDateTime(match.startsAt);
  const spotsLeft = match.maxMembers - match.rosterCount;
  const isFull = spotsLeft <= 0;

  const title = `${weekday}, ${dateTime}`;
  const lines: string[] = [
    withLinks ? `<b>${title}</b>` : title,
    "",
    `📍 ${escapeHtml(match.court)}`,
    `🎾 ${escapeHtml(match.format)}`,
    `Уровень ${escapeHtml(match.level)}`,
    `👥 ${match.rosterCount}/${match.maxMembers}${isFull ? " · заполнено" : ""}`,
  ];
  if (match.pricePerPerson) {
    lines.push(`💵 ${match.pricePerPerson} с человека`);
  }
  if (match.description) {
    lines.push(escapeHtml(match.description));
  }
  lines.push("");
  for (const player of match.rosterNames) {
    lines.push(`• ${nameText(player)}`);
  }
  if (match.waitlistNames.length > 0) {
    lines.push("⏳ Лист ожидания:");
    for (const player of match.waitlistNames) {
      lines.push(`• ${nameText(player)}`);
    }
  }
  if (match.lundaUrl) {
    lines.push(
      withLinks
        ? `🔗 <a href="${escapeHtml(match.lundaUrl)}">Ссылка Lunda</a>`
        : `🔗 ${escapeHtml(match.lundaUrl)}`,
    );
  }
  if (paymentInfo) {
    lines.push("", `💳 ${escapeHtml(paymentInfo)}`);
  }

  const buttons: BoardButton[][] = [
    [
      {
        text: `Записаться${isFull ? " ⏳" : ""} · ${match.rosterCount}/${match.maxMembers}`,
        callback_data: `join:${match._id}`,
      },
    ],
  ];

  const text = lines.join("\n").trimEnd();

  if (text.length > MAX_MESSAGE_LENGTH) {
    if (withLinks) {
      // Retry without mention-link markup — shorter, and safe to further
      // truncate below since there are no tags left to accidentally cut
      // through.
      return renderMatchMessage(match, paymentInfo, false);
    }
    console.error("match message exceeds Telegram's 4096-char limit", {
      length: text.length,
      matchId: match._id,
    });
    return {
      text: `${text.slice(0, MAX_MESSAGE_LENGTH - 1)}…`,
      buttons,
    };
  }

  return { text, buttons };
}
