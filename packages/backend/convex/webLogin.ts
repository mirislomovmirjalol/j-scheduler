import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";

// Deep-link login (see schema.ts for the full flow description). Codes
// expire quickly — this is a short-lived handshake, not a magic link email.
const EXPIRY_MS = 10 * 60 * 1000;

function isFresh(createdAt: number) {
  return Date.now() - createdAt < EXPIRY_MS;
}

function generateCode(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

// The login page calls this to start a new attempt, then reactively watches
// getStatus for the code to be confirmed via Telegram.
export const create = mutation({
  args: {},
  handler: async (ctx) => {
    const code = generateCode();
    await ctx.db.insert("webLoginRequests", {
      code,
      status: "pending",
      createdAt: Date.now(),
    });
    return { code };
  },
});

// Reactive status check — Convex's own subscription means the login page
// updates the instant the Telegram webhook confirms the code, no polling.
export const getStatus = query({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const req = await ctx.db
      .query("webLoginRequests")
      .withIndex("by_code", (q) => q.eq("code", code))
      .unique();
    if (!req || !isFresh(req.createdAt)) {
      return { status: "expired" as const };
    }
    return { status: req.status, firstName: req.firstName };
  },
});

// Called from the Telegram webhook (telegram/router.ts) when "/start <code>"
// arrives — trusts the caller, since only our own webhook handler (which
// already verified the request came from Telegram) calls this.
export const confirm = internalMutation({
  args: {
    code: v.string(),
    telegramUserId: v.number(),
    firstName: v.string(),
    lastName: v.optional(v.string()),
    username: v.optional(v.string()),
  },
  handler: async (ctx, { code, telegramUserId, firstName, lastName, username }) => {
    const req = await ctx.db
      .query("webLoginRequests")
      .withIndex("by_code", (q) => q.eq("code", code))
      .unique();
    if (!req || req.status !== "pending" || !isFresh(req.createdAt)) {
      return { ok: false as const };
    }

    await ctx.db.patch("webLoginRequests", req._id, {
      status: "confirmed",
      telegramUserId,
      firstName,
      lastName,
      username,
    });
    return { ok: true as const };
  },
});

// Called from the deep-link auth endpoint once the frontend sees status
// "confirmed" — atomically consumes the code (confirmed -> used) so it
// can't be replayed, returning the Telegram identity to sign in as.
export const consume = internalMutation({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const req = await ctx.db
      .query("webLoginRequests")
      .withIndex("by_code", (q) => q.eq("code", code))
      .unique();
    if (!req || req.status !== "confirmed" || !isFresh(req.createdAt)) {
      return null;
    }

    await ctx.db.patch("webLoginRequests", req._id, { status: "used" });
    return {
      telegramUserId: req.telegramUserId!,
      firstName: req.firstName!,
      lastName: req.lastName,
      username: req.username,
    };
  },
});
