import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Padel community Telegram bot — data model (v1)
 *
 * Design principles:
 *  - ONE source of truth. Every write (Telegram tap OR web dashboard) routes
 *    through the same Convex mutations, so the group board, the DMs, and the
 *    read-only web view are always consistent. Convex is reactive → the
 *    dashboard is live with no polling.
 *  - Guests are first-class player rows (type: "guest", telegramUserId: null).
 *    This makes a future guest→authed MERGE trivial: repoint memberships and
 *    delete the guest row. No schema change needed later.
 *  - No user-facing status on matches (per product decision). Open / full /
 *    past is DERIVED from `startsAt` + roster count. Cancellation = soft delete
 *    (isDeleted flag), so a mistaken cancel is never permanent.
 *  - All timestamps are UTC epoch millis. Display in Tashkent (UTC+5) at the edge.
 *  - Free-text fields (court, level) are strings in v1; dashboard offers
 *    copy-paste autocomplete built from history. No venue/level tables yet.
 *
 * Reserved for v2 (NOT built now, but the shape leaves room):
 *  - Templates / one-click weekly spawn
 *  - Guest-bringing (host + N guests), payment tracking, court/venue table
 *  - Verified player levels + join-time level enforcement
 *  - Attendance / no-show reliability
 *  - Member merging (guest → authed)
 */

export default defineSchema({
  // ─────────────────────────────────────────────────────────────────────────
  // PLAYERS — authed Telegram users AND admin-added guests, unified.
  // ─────────────────────────────────────────────────────────────────────────
  players: defineTable({
    type: v.union(v.literal("authed"), v.literal("guest")),

    // Present for authed players; null for guests. This is the stable key we
    // match on for RSVP taps and DMs (usernames change, so never key on those).
    telegramUserId: v.union(v.number(), v.null()),

    // Display info. For authed: pulled from Telegram on first Join.
    // For guests: entered by an admin via the quick form.
    firstName: v.string(),
    lastName: v.optional(v.string()),
    username: v.optional(v.string()), // Telegram @handle, no leading @; authed only
    guestNote: v.optional(v.string()), // free-text description for guests

    // Admin-assigned, free text (e.g. "1-2", "1.5-2.5"). Not enforced in v1.
    level: v.optional(v.string()),

    // Roles & permissions. Global admins for v1.
    isAdmin: v.boolean(),

    // DM opt-in. Flips true when the user presses /start in the bot DM,
    // flips false again if we ever get a 403 (user blocked the bot).
    wantsDms: v.boolean(),
    reminderLeadMin: v.optional(v.number()), // personal override, opted-in only

    isDeleted: v.boolean(), // soft delete
    createdAt: v.number(),

    // The better-auth user id this player is linked to, once they've ever
    // logged into the web dashboard (never set for players who only ever
    // interact via Telegram). Convex functions gate admin actions by
    // matching this against ctx.auth.getUserIdentity().subject.
    authUserId: v.optional(v.string()),
  })
    // Fast lookup on RSVP tap / DM send. (nulls for guests never queried here.)
    .index("by_telegramUserId", ["telegramUserId"])
    .index("by_type", ["type"])
    .index("by_isAdmin", ["isAdmin"])
    .index("by_authUserId", ["authUserId"]),

  // ─────────────────────────────────────────────────────────────────────────
  // MATCHES — one row per scheduled game. Admin-created in v1.
  // ─────────────────────────────────────────────────────────────────────────
  matches: defineTable({
    startsAt: v.number(), // UTC epoch ms — the board sorts on this
    durationMin: v.optional(v.number()), // e.g. 120; drives "ends at" + reminders

    description: v.string(), // free text from admin
    level: v.string(), // free-text range label, e.g. "1-2"
    court: v.string(), // free text (dashboard autocompletes from history)
    format: v.string(), // "Американо" | "Мексикано" | "King" | ... (free text)

    maxMembers: v.number(), // seats; raising this triggers the "extra seats" flow
    pricePerPerson: v.optional(v.number()),

    lundaUrl: v.optional(v.string()), // per-match link, pasted at creation

    createdBy: v.id("players"), // admin who created it
    isDeleted: v.boolean(), // soft delete == cancel (users see no status)
    createdAt: v.number(),
  })
    .index("by_startsAt", ["startsAt"])
    .index("by_isDeleted_startsAt", ["isDeleted", "startsAt"]),

  // ─────────────────────────────────────────────────────────────────────────
  // MEMBERSHIPS — links a player to a match. Roster vs waitlist by `role`.
  // Waitlist promotion is admin-only in v1 (just flip role → "roster").
  // ─────────────────────────────────────────────────────────────────────────
  memberships: defineTable({
    matchId: v.id("matches"),
    playerId: v.id("players"),

    role: v.union(v.literal("roster"), v.literal("waitlist")),

    joinedAt: v.number(), // "trigger time" — shown in the admin panel
    // How the membership was created: self-serve Join button, or an admin.
    addedBy: v.union(
      v.literal("self"),
      v.object({ admin: v.id("players") }),
    ),

    isDeleted: v.boolean(), // soft delete (admin removal / future self-leave)
  })
    .index("by_match", ["matchId"])
    .index("by_match_and_role", ["matchId", "role"])
    .index("by_player", ["playerId"])
    // Guard against a double-Join creating two live rows for the same pair.
    .index("by_match_and_player", ["matchId", "playerId"]),

  // ─────────────────────────────────────────────────────────────────────────
  // BOARD STATE — the single live "board" message per chat.
  // Lets us edit-in-place, and repost-to-bottom when buried by chatter.
  // One row per Telegram chat (you have one flat chat "игры" for now).
  // ─────────────────────────────────────────────────────────────────────────
  boardState: defineTable({
    chatId: v.number(),
    messageId: v.union(v.number(), v.null()), // current board message, if any
    messagesSincePost: v.number(), // burial counter → repost past threshold
    lastPostedAt: v.number(),
  }).index("by_chatId", ["chatId"]),

  // ─────────────────────────────────────────────────────────────────────────
  // SCHEDULED REMINDERS — track Convex scheduler job ids per match so a
  // reschedule can CANCEL stale jobs (otherwise people get pinged for the
  // old time). Cancelled jobs are deleted outright. Fired jobs are kept
  // with `firedAt` set (briefly — pruned by a cron) rather than deleted, so
  // the dead-man's-switch can tell "never scheduled / silently failed"
  // apart from "fired successfully".
  // ─────────────────────────────────────────────────────────────────────────
  matchReminders: defineTable({
    matchId: v.id("matches"),
    jobId: v.id("_scheduled_functions"),
    kind: v.union(v.literal("t_minus_3h"), v.literal("t_minus_30m")),
    firedAt: v.optional(v.number()),
  }).index("by_match", ["matchId"]),

  // ─────────────────────────────────────────────────────────────────────────
  // PROCESSED UPDATES — Telegram retries webhooks on any non-200, so dedup on
  // update_id. Rows are pruned by a cron after a short TTL.
  // ─────────────────────────────────────────────────────────────────────────
  processedUpdates: defineTable({
    updateId: v.number(),
    processedAt: v.number(),
  }).index("by_updateId", ["updateId"]),

  // ─────────────────────────────────────────────────────────────────────────
  // WEB LOGIN REQUESTS — deep-link alternative to the Telegram Login Widget.
  // The widget requires BotFather domain registration and has real-world
  // reliability issues (browser popup blockers, "not logged into
  // web.telegram.org" fallback flows that silently stall). This flow instead
  // rides on the bot's own webhook: the web app generates a one-time code,
  // the user opens t.me/<bot>?start=<code> and taps Start, the webhook
  // confirms the code, and the web app (reactively watching status) then
  // exchanges the confirmed code for a session. "confirmed" -> "used" is a
  // one-way, one-time transition to prevent replay.
  // ─────────────────────────────────────────────────────────────────────────
  webLoginRequests: defineTable({
    code: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("used"),
    ),
    telegramUserId: v.optional(v.number()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    username: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_code", ["code"]),
});
