// Shared HMAC helpers for verifying Telegram-signed payloads. Used by the
// Mini App initData verification below (see its comment for the exact
// algorithm — the Telegram Login Widget this project originally used had a
// *different* secret-key derivation, but the widget was removed entirely in
// favor of the Mini App + deep-link login methods).

async function hmacSha256Raw(
  key: Uint8Array,
  message: string,
): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    new TextEncoder().encode(message) as BufferSource,
  );
  return new Uint8Array(signature);
}

async function hmacSha256Hex(key: Uint8Array, message: string): Promise<string> {
  const raw = await hmacSha256Raw(key, message);
  return Array.from(raw)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Telegram's own recommendation: reject stale auth payloads (replay
// protection). 1 day is a generous but standard window.
export function isAuthDateFresh(authDate: number, maxAgeSec = 86400): boolean {
  return Date.now() / 1000 - authDate <= maxAgeSec;
}

// Verifies Telegram Mini App initData (https://core.telegram.org/bots/webapps
// #validating-data-received-via-the-mini-app). A *different* HMAC scheme from
// the Login Widget above, despite the similar shape: here the secret key is
// itself an HMAC — secret_key = HMAC-SHA256(botToken, key="WebAppData") — as
// opposed to the widget's secret_key = SHA256(botToken). Mini Apps hand this
// string to the page automatically via window.Telegram.WebApp.initData the
// moment it's opened from within Telegram — no user action, no popups, no
// BotFather domain registration, which sidesteps every reliability problem
// the widget had. Only usable when the app is actually opened as a
// registered Mini App, so it's a progressive enhancement over the deep-link
// flow (webLogin.ts), not a replacement for it.
export type TelegramMiniAppUser = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
};

export async function verifyTelegramMiniAppInitData(
  initData: string,
  botToken: string,
): Promise<
  | { valid: true; user: TelegramMiniAppUser; authDate: number }
  | { valid: false }
> {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return { valid: false };
  params.delete("hash");

  const checkString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = await hmacSha256Raw(
    new TextEncoder().encode("WebAppData"),
    botToken,
  );
  const computedHash = await hmacSha256Hex(secretKey, checkString);
  if (computedHash !== hash) return { valid: false };

  const userJson = params.get("user");
  const authDateStr = params.get("auth_date");
  if (!userJson || !authDateStr) return { valid: false };

  let user: TelegramMiniAppUser;
  try {
    user = JSON.parse(userJson);
  } catch {
    return { valid: false };
  }

  return { valid: true, user, authDate: Number(authDateStr) };
}
