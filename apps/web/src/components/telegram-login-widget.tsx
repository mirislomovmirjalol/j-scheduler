import { env } from "@J-schedule/env/web";
import { useEffect, useRef, useState } from "react";

type TelegramAuthUser = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
};

declare global {
  interface Window {
    onTelegramAuth?: (user: TelegramAuthUser) => void;
  }
}

// Renders Telegram's own login button (an iframe it injects itself), then
// forwards the signed payload it hands back to our backend for HMAC
// verification — see convex/auth/telegramPlugin.ts.
export default function TelegramLoginWidget() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"idle" | "verifying" | "error">("idle");

  useEffect(() => {
    window.onTelegramAuth = async (user) => {
      setStatus("verifying");
      try {
        const res = await fetch("/api/auth/sign-in/telegram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(user),
        });
        if (!res.ok) throw new Error("verification failed");
        window.location.href = "/matches";
      } catch {
        setStatus("error");
      }
    };

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", env.VITE_TELEGRAM_BOT_USERNAME);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "10");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    script.setAttribute("data-request-access", "write");
    containerRef.current?.appendChild(script);

    return () => {
      window.onTelegramAuth = undefined;
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-3">
      <div ref={containerRef} className="min-h-11" />
      {status === "verifying" && (
        <p className="text-muted-foreground text-sm">Проверяем…</p>
      )}
      {status === "error" && (
        <p className="text-destructive text-sm">
          Не получилось войти. Попробуй ещё раз.
        </p>
      )}
    </div>
  );
}
