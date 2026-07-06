import { api } from "@J-schedule/backend/convex/_generated/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@J-schedule/ui/components/card";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

import TelegramLogin from "@/components/telegram-login";
import { fetchAuthQuery } from "@/lib/auth-server";

const getCurrentPlayer = createServerFn({ method: "GET" }).handler(async () => {
  return await fetchAuthQuery(api.players.getCurrentPlayer, {});
});

export const Route = createFileRoute("/login")({
  component: LoginPage,
  beforeLoad: async () => {
    const player = await getCurrentPlayer();
    if (player) {
      throw redirect({ to: "/matches" });
    }
  },
});

function LoginPage() {
  return (
    <div className="flex h-full items-center justify-center bg-background p-6">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <span className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
            Игры
          </span>
          <CardTitle className="text-xl">Вход</CardTitle>
          <CardDescription>
            Войди через Telegram, чтобы увидеть расписание игр и записи.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <TelegramLogin />
        </CardContent>
      </Card>
    </div>
  );
}
