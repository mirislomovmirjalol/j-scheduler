const TELEGRAM_API_BASE = "https://api.telegram.org";
const MAX_RETRIES = 3;

type TelegramApiResponse<T> =
  | { ok: true; result: T }
  | {
      ok: false;
      error_code: number;
      description: string;
      parameters?: { retry_after?: number };
    };

export class TelegramApiError extends Error {
  constructor(
    public readonly method: string,
    public readonly errorCode: number,
    public readonly description: string,
  ) {
    super(`Telegram API ${method} failed (${errorCode}): ${description}`);
    this.name = "TelegramApiError";
  }
}

// Every Bot API call goes through here so rate-limit backoff (429 +
// retry_after) is handled in one place, not re-implemented per call site.
export async function callTelegramApi<T = unknown>(
  method: string,
  payload: Record<string, unknown> = {},
): Promise<T> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not set");

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const response = await fetch(
      `${TELEGRAM_API_BASE}/bot${token}/${method}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const data = (await response.json()) as TelegramApiResponse<T>;

    if (data.ok) return data.result;

    const retryAfter = data.parameters?.retry_after;
    if (data.error_code === 429 && retryAfter !== undefined && attempt < MAX_RETRIES) {
      await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
      continue;
    }

    throw new TelegramApiError(method, data.error_code, data.description);
  }

  throw new TelegramApiError(method, 429, "Exceeded retry budget on rate limit");
}
