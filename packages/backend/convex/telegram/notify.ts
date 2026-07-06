import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { internalAction, type ActionCtx } from "../_generated/server";
import { strings } from "../lib/strings";
import { formatTashkentDateTime } from "../lib/time";
import { sendDMText } from "./dm";

// Shared fan-out: DMs every opted-in player in the list with the same text.
async function dmPlayers(ctx: ActionCtx, players: Doc<"players">[], text: string) {
  for (const player of players) {
    if (!player.wantsDms || player.telegramUserId === null) continue;
    await sendDMText(ctx, {
      playerId: player._id,
      telegramUserId: player.telegramUserId,
      text,
    });
  }
}

// Re-pings the confirmed roster when a match's startsAt changes.
export const matchRescheduled = internalAction({
  args: { matchId: v.id("matches") },
  handler: async (ctx, { matchId }) => {
    const match = await ctx.runQuery(internal.matches.getById, { matchId });
    if (!match) return;

    const roster = await ctx.runQuery(internal.matches.listRosterPlayers, {
      matchId,
    });

    await dmPlayers(
      ctx,
      roster,
      strings.matchRescheduled(formatTashkentDateTime(match.startsAt)),
    );
  },
});

// "Extra seats" flow: DMs the current waitlist when an admin raises
// maxMembers, or when a roster member drops and frees a seat. Doesn't
// auto-promote — an admin still promotes explicitly.
export const extraSeatsOpened = internalAction({
  args: { matchId: v.id("matches") },
  handler: async (ctx, { matchId }) => {
    const match = await ctx.runQuery(internal.matches.getById, { matchId });
    if (!match) return;

    const waitlist = await ctx.runQuery(internal.matches.listWaitlistPlayers, {
      matchId,
    });

    await dmPlayers(
      ctx,
      waitlist,
      strings.extraSeatsOpened(formatTashkentDateTime(match.startsAt)),
    );
  },
});

// DMs both roster and waitlist when an admin cancels a match — both had a
// stake in it, and otherwise it just silently vanishes from the board.
export const matchCancelled = internalAction({
  args: { matchId: v.id("matches") },
  handler: async (ctx, { matchId }) => {
    const match = await ctx.runQuery(internal.matches.getById, { matchId });
    if (!match) return;

    const [roster, waitlist] = await Promise.all([
      ctx.runQuery(internal.matches.listRosterPlayers, { matchId }),
      ctx.runQuery(internal.matches.listWaitlistPlayers, { matchId }),
    ]);

    await dmPlayers(
      ctx,
      [...roster, ...waitlist],
      strings.matchCancelled(formatTashkentDateTime(match.startsAt)),
    );
  },
});

// DMs the roster when an admin edits a match's details (court, format,
// level, price, description, duration, Lunda link) — anything other than a
// reschedule or a capacity increase, which already have their own, more
// specific notifications. Waitlist isn't DM'd — they haven't committed yet.
export const matchDetailsChanged = internalAction({
  args: { matchId: v.id("matches"), changes: v.array(v.string()) },
  handler: async (ctx, { matchId, changes }) => {
    const match = await ctx.runQuery(internal.matches.getById, { matchId });
    if (!match) return;

    const roster = await ctx.runQuery(internal.matches.listRosterPlayers, {
      matchId,
    });

    await dmPlayers(
      ctx,
      roster,
      strings.matchDetailsChanged(formatTashkentDateTime(match.startsAt), changes),
    );
  },
});

// DMs a single player after an admin removes them from a match, or promotes
// them from the waitlist to the roster. Shared by both since both start
// from just a membershipId and need to resolve the player + match.
export const membershipChanged = internalAction({
  args: {
    membershipId: v.id("memberships"),
    kind: v.union(v.literal("removed"), v.literal("promoted")),
  },
  handler: async (ctx, { membershipId, kind }) => {
    const result = await ctx.runQuery(
      internal.memberships.getWithPlayerAndMatch,
      { membershipId },
    );
    if (!result?.player || !result.match) return;
    const { player, match } = result;

    const dateTime = formatTashkentDateTime(match.startsAt);
    const text =
      kind === "removed"
        ? strings.removedFromMatch(dateTime)
        : strings.promotedFromWaitlist(dateTime);

    await dmPlayers(ctx, [player], text);
  },
});
