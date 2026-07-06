// Single source of truth for all bot/DM/dashboard copy (CLAUDE.md #4, #7).
// All user-facing text is Russian. Interpolate values into these templates —
// don't concatenate sentences, word order matters for v2 localization.

export const strings = {
  dmWelcome:
    "Привет! Теперь тебе будут приходить напоминания об играх в личку.",
  dmAlreadySubscribed: "Ты уже подписан(-а) на напоминания 👍",
  webLoginConfirmed: "✅ Вход подтверждён — вернись на сайт.",
  matchRescheduled: (newDateTime: string) =>
    `⏰ Время игры изменилось: теперь ${newDateTime}.`,
  joinedRoster: "Ты в игре! ✅",
  alreadyOnRoster: "Ты уже в игре 👍",
  joinedWaitlist: "Мест нет, ты в листе ожидания ⏳",
  alreadyOnWaitlist: "Ты уже в листе ожидания ⏳",
  matchGone: "Эта игра больше недоступна",
  genericError: "Что-то пошло не так, попробуй ещё раз",
  reminderText: (params: {
    kind: "t_minus_3h" | "t_minus_30m";
    dateTime: string;
    court: string;
  }) =>
    params.kind === "t_minus_3h"
      ? `⏳ Через 3 часа игра: ${params.dateTime} · ${params.court}`
      : `⏰ Через 30 минут игра: ${params.dateTime} · ${params.court}`,
  dropButtonLabel: "Не смогу прийти",
  dropped: "Ты отменил(а) участие. Место освободилось.",
  dropNotAMember: "Ты не записан(а) на эту игру.",
  extraSeatsOpened: (dateTime: string) =>
    `🎉 Открылись места на игру ${dateTime}! Жди, админ может добавить тебя из листа ожидания.`,
  matchCancelled: (dateTime: string) => `❌ Игра ${dateTime} отменена.`,
  matchDetailsChanged: (dateTime: string, changes: string[]) =>
    `✏️ Изменения в игре ${dateTime}:\n${changes.map((c) => `• ${c}`).join("\n")}`,
  removedFromMatch: (dateTime: string) => `Тебя убрали из игры ${dateTime}.`,
  promotedFromWaitlist: (dateTime: string) =>
    `🎉 Место освободилось — ты в ростере на игру ${dateTime}!`,
};
