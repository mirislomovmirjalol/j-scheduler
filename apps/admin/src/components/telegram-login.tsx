import { useEffect, useState } from "react"

import TelegramDeepLinkLogin from "@/components/telegram-deep-link-login"
import { authClient } from "@/lib/auth-client"

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string
        ready: () => void
      }
    }
  }
}

type SignInResponse = { success: true; userId: string }

// Picks the best available Telegram sign-in method:
//  - Opened as a registered Mini App (window.Telegram.WebApp.initData is
//    populated automatically by Telegram) -> sign in immediately, no user
//    action needed. Also avoids a real bug: a Mini App navigating to a
//    t.me deep link (the fallback below) closes the Mini App itself rather
//    than just opening the chat, losing all page state.
//  - Otherwise (a regular browser, e.g. local dev testing) -> fall back to
//    the deep-link flow.
export default function TelegramLogin({ onSuccess }: { onSuccess: () => void }) {
  // apps/admin is a client-only SPA (no SSR), so window.Telegram is already
  // populated by the time this component first renders — no need to route
  // that read through an effect+setState round trip just to derive the
  // initial state.
  const [state, setState] = useState<"none" | "signing-in" | "error">(() =>
    window.Telegram?.WebApp?.initData ? "signing-in" : "none"
  )

  useEffect(() => {
    const webApp = window.Telegram?.WebApp
    webApp?.ready?.()

    if (!webApp?.initData) return

    ;(async () => {
      try {
        const { error } = await authClient.$fetch<SignInResponse>(
          "/sign-in/telegram-miniapp",
          { method: "POST", body: { initData: webApp.initData } }
        )
        if (error) throw new Error("sign-in failed")
        onSuccess()
      } catch {
        setState("error")
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (state === "signing-in") {
    return <p className="text-sm text-muted-foreground">Входим…</p>
  }

  if (state === "error") {
    return <p className="text-sm text-destructive">Не получилось войти.</p>
  }

  return <TelegramDeepLinkLogin onSuccess={onSuccess} />
}
