import { api } from "@J-schedule/backend/convex/_generated/api"
import { env } from "@J-schedule/env/web"
import { Button } from "@J-schedule/ui/components/button"
import { useMutation, useQuery } from "convex/react"
import { useEffect, useRef, useState } from "react"

import { authClient } from "@/lib/auth-client"

type SignInResponse = { success: true; userId: string }

// Alternative to the Telegram Login Widget: generates a one-time code, sends
// the user to t.me/<bot>?start=<code> to confirm via the bot itself, then
// reactively picks up the confirmation (Convex's own subscription — no
// polling) and exchanges it for a session. See convex/webLogin.ts and
// convex/auth/telegramDeepLinkPlugin.ts for the backend half. This exists
// because the widget requires BotFather domain registration and has proven
// unreliable in practice (browser popup blockers, "not logged into
// web.telegram.org" fallback flows that silently stall).
export default function TelegramDeepLinkLogin({
  onSuccess,
}: {
  onSuccess: () => void
}) {
  const createRequest = useMutation(api.webLogin.create)
  const [code, setCode] = useState<string | null>(null)
  const [error, setError] = useState(false)
  // Guards against StrictMode's intentional double-invoke of mount effects
  // in dev — without this, two codes get created almost simultaneously and
  // whichever request resolves last silently swaps the displayed link out
  // from under a user who already opened the first one in Telegram.
  const startedRef = useRef(false)
  // Effect-internal lock against the "confirmed" effect re-firing the sign-in
  // request on every reactive re-render of `status` — a ref rather than
  // state since nothing in the render output reads it.
  const signingInRef = useRef(false)

  const status = useQuery(api.webLogin.getStatus, code ? { code } : "skip")

  const startRequest = () => {
    setError(false)
    signingInRef.current = false
    setCode(null)
    createRequest({})
      .then(({ code }) => setCode(code))
      .catch(() => setError(true))
  }

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    startRequest()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (status?.status !== "confirmed" || !code || signingInRef.current) return
    signingInRef.current = true
    ;(async () => {
      try {
        // Must go through authClient's own $fetch, not a raw fetch() — only
        // that instance carries crossDomainClient's header/localStorage
        // wrapping (see auth-client.ts). A plain fetch() would get a normal
        // Set-Cookie response that the browser silently drops for being
        // cross-site, with no error to catch.
        const { error } = await authClient.$fetch<SignInResponse>(
          "/sign-in/telegram-deeplink",
          { method: "POST", body: { code } }
        )
        if (error) throw new Error("sign-in failed")
        onSuccess()
      } catch {
        setError(true)
      }
    })()
  }, [status, code, onSuccess])

  if (error || status?.status === "expired") {
    return (
      <div className="flex flex-col items-center gap-2">
        <p className="text-sm text-destructive">
          {status?.status === "expired"
            ? "Ссылка устарела."
            : "Не получилось войти."}
        </p>
        <Button variant="outline" size="sm" onClick={startRequest}>
          Попробовать снова
        </Button>
      </div>
    )
  }

  if (!code) {
    return (
      <p className="text-sm text-muted-foreground">Готовим ссылку…</p>
    )
  }

  const deepLink = `https://t.me/${env.VITE_TELEGRAM_BOT_USERNAME}?start=${code}`

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <Button render={<a href={deepLink} target="_blank" rel="noreferrer" />}>
        Открыть Telegram и подтвердить
      </Button>
      <p className="text-xs text-muted-foreground">
        {status?.status === "confirmed"
          ? "Подтверждено, входим…"
          : "Откроется бот — просто нажми Start."}
      </p>
    </div>
  )
}
