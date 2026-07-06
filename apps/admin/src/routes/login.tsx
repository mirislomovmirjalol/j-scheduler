import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@J-schedule/ui/components/card"
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router"

import TelegramLogin from "@/components/telegram-login"
import { authClient } from "@/lib/auth-client"

export const Route = createFileRoute("/login")({
  beforeLoad: async () => {
    const { data } = await authClient.getSession()
    if (data) {
      throw redirect({ to: "/" })
    }
  },
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()

  return (
    <div className="flex h-svh items-center justify-center bg-background p-6">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <span className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
            Игры
          </span>
          <CardTitle className="text-xl">Вход</CardTitle>
          <CardDescription>
            Войди через Telegram, чтобы попасть в панель организатора.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <TelegramLogin onSuccess={() => navigate({ to: "/" })} />
        </CardContent>
      </Card>
    </div>
  )
}
