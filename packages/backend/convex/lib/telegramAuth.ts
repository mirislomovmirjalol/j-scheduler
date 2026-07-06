// Verifies data from the Telegram Login Widget (legacy HMAC scheme —
// https://core.telegram.org/widgets/login-legacy). This project's bot has no
// "Web Login" OIDC registration in @BotFather, so this is the only option
// available without extra bot configuration.
//
// Algorithm: secret_key = SHA256(bot_token); data-check-string = every field
// except `hash`, sorted alphabetically as "key=value" lines joined by "\n";
// the received hash must equal HMAC-SHA256(data-check-string, secret_key)
// hex-encoded.

async function sha256(data: string): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(data) as BufferSource,
  );
  return new Uint8Array(digest);
}

async function hmacSha256Hex(key: Uint8Array, message: string): Promise<string> {
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
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export type TelegramWidgetAuth = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
};

export async function verifyTelegramWidgetAuth(
  data: TelegramWidgetAuth,
  botToken: string,
): Promise<boolean> {
  const { hash, ...fields } = data;
  if (!hash) return false;

  const checkString = Object.entries(fields)
    .filter(([, value]) => value !== undefined && value !== null)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = await sha256(botToken);
  const computedHash = await hmacSha256Hex(secretKey, checkString);

  return computedHash === hash;
}

// Telegram's own recommendation: reject stale auth payloads (replay
// protection). 1 day is a generous but standard window for this widget.
export function isAuthDateFresh(authDate: number, maxAgeSec = 86400): boolean {
  return Date.now() / 1000 - authDate <= maxAgeSec;
}
