import { useEffect, useState } from "react";

import TelegramDeepLinkLogin from "@/components/telegram-deep-link-login";
import { authClient } from "@/lib/auth-client";

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        ready: () => void;
      };
    };
  }
}

type SignInResponse = { success: true; userId: string };

// Picks the best available Telegram sign-in method (mirrors apps/admin's
// identical component):
//  - Opened as a registered Mini App (window.Telegram.WebApp.initData is
//    populated automatically by Telegram) -> sign in immediately, no user
//    action needed. Also avoids a real bug: a Mini App navigating to a
//    t.me deep link (the fallback below) closes the Mini App itself rather
//    than just opening the chat, losing all page state.
//  - Otherwise (a regular browser) -> fall back to the deep-link flow.
export default function TelegramLogin() {
  const [state, setState] = useState<
    "checking" | "none" | "signing-in" | "error"
  >("checking");

  useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    webApp?.ready?.();

    if (!webApp?.initData) {
      setState("none");
      return;
    }

    setState("signing-in");
    (async () => {
      try {
        const { error } = await authClient.$fetch<SignInResponse>(
          "/sign-in/telegram-miniapp",
          { method: "POST", body: { initData: webApp.initData } },
        );
        if (error) throw new Error("sign-in failed");
        window.location.href = "/matches";
      } catch {
        setState("error");
      }
    })();
  }, []);

  if (state === "checking") {
    return <p className="text-sm text-muted-foreground">Проверяем…</p>;
  }

  if (state === "signing-in") {
    return <p className="text-sm text-muted-foreground">Входим…</p>;
  }

  if (state === "error") {
    return <p className="text-sm text-destructive">Не получилось войти.</p>;
  }

  return <TelegramDeepLinkLogin />;
}
