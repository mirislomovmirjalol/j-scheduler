import type { Doc } from "../_generated/dataModel";
import { formatTashkentDateTime, toTashkent } from "./time";

// Telegram hard-caps a message at 4096 UTF-16 code units. Full roster names
// are shown inline (explicit user decision — revisits CLAUDE.md's original
// "collapsed rosters" call). If that ever grows past the cap (many open
// matches, full rosters), the guard below degrades — first by dropping the
// mention-link markup (shorter), then by truncating plain text — rather
// than splitting into multiple board messages, which reintroduces the
// exact burial problem collapsed rosters existed to avoid.
const MAX_MESSAGE_LENGTH = 4096;

// Telegram stacks all inline-keyboard buttons in one block below the whole
// message text — it can't interleave a button between paragraphs. With
// several open matches, that leaves N text blocks followed by N buttons
// with no visual link between a paragraph and its own button. Prefixing
// both with the same ordinal marker fixes that at a glance.
const NUMBER_EMOJI = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
function ordinalMarker(index: number): string {
  return NUMBER_EMOJI[index] ?? `#${index + 1}`;
}

// Board text is sent with parse_mode HTML (so names can be clickable
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

// Pure function: matches (already sorted by startsAt, soonest first) -> the
// board message text + inline keyboard. No Telegram/DB calls in here so
// it's trivial to unit test and reuse from both the sync action and any
// future preview in the dashboard.
//
// withLinks=false renders names as plain escaped text (no <a> tags) — used
// as the first fallback if the linked version is too long; it's shorter
// and, having no tags, safe to further truncate if even that overflows.
export function renderBoard(
  matches: MatchWithRosterCount[],
  withLinks = true,
): RenderedBoard {
  if (matches.length === 0) {
    return { text: "Сейчас нет открытых игр 🙌", buttons: [] };
  }

  const nameText = (player: NamedPlayer) =>
    withLinks ? mentionLink(player) : escapeHtml(player.name);

  const lines: string[] = ["🎾 Открытые игры", ""];
  const buttons: BoardButton[][] = [];

  matches.forEach((match, index) => {
    const marker = ordinalMarker(index);
    const weekday = toTashkent(match.startsAt).weekday;
    const dateTime = formatTashkentDateTime(match.startsAt);
    const spotsLeft = match.maxMembers - match.rosterCount;
    const isFull = spotsLeft <= 0;

    const title = `${weekday}, ${dateTime}`;
    lines.push(
      `${marker} ${withLinks ? `<b>${title}</b>` : title}`,
      `📍 ${escapeHtml(match.court)}`,
      `🎾 ${escapeHtml(match.format)}`,
      `Уровень ${escapeHtml(match.level)}`,
      `👥 ${match.rosterCount}/${match.maxMembers}${isFull ? " · заполнено" : ""}`,
    );
    if (match.pricePerPerson) {
      lines.push(`💵 ${match.pricePerPerson} с человека`);
    }
    if (match.description) {
      lines.push(escapeHtml(match.description));
    }
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
    lines.push("");

    buttons.push([
      {
        text: isFull
          ? `${marker} В лист ожидания (${match.rosterCount}/${match.maxMembers})`
          : `${marker} Записаться (${match.rosterCount}/${match.maxMembers})`,
        callback_data: `join:${match._id}`,
      },
    ]);
  });

  const text = lines.join("\n").trimEnd();

  if (text.length > MAX_MESSAGE_LENGTH) {
    if (withLinks) {
      // Retry without mention-link markup — shorter, and safe to further
      // truncate below since there are no tags left to accidentally cut
      // through.
      return renderBoard(matches, false);
    }
    console.error("board text exceeds Telegram's 4096-char limit", {
      length: text.length,
      matchCount: matches.length,
    });
    return {
      text: `${text.slice(0, MAX_MESSAGE_LENGTH - 1)}…`,
      buttons,
    };
  }

  return { text, buttons };
}
