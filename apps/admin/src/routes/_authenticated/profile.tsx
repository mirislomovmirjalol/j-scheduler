import { api } from "@J-schedule/backend/convex/_generated/api"
import { Badge } from "@J-schedule/ui/components/badge"
import { Button } from "@J-schedule/ui/components/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@J-schedule/ui/components/card"
import { Skeleton } from "@J-schedule/ui/components/skeleton"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useMutation, useQuery } from "convex/react"
import { toast } from "sonner"

import Reveal from "@/components/reveal"
import { authClient } from "@/lib/auth-client"

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
})

function ProfilePage() {
  const player = useQuery(api.players.getCurrentPlayer)
  const setWantsDmsSelf = useMutation(api.players.setWantsDmsSelf)
  const navigate = useNavigate()

  if (player === undefined) {
    return (
      <div className="mx-auto flex max-w-lg flex-col gap-4 p-6">
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  return (
    <Reveal className="mx-auto flex max-w-lg flex-col gap-4 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Профиль</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-lg font-medium">
              {player?.firstName} {player?.lastName ?? ""}
            </span>
            {player?.isAdmin && <Badge>Администратор</Badge>}
          </div>
          {player?.username && (
            <p className="text-sm text-muted-foreground">@{player.username}</p>
          )}
          <div>
            <p className="text-sm text-muted-foreground">Уровень</p>
            <p className="text-sm">{player?.level ?? "не указан"}</p>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!player?.wantsDms}
              onChange={async (e) => {
                try {
                  await setWantsDmsSelf({ wantsDms: e.target.checked })
                  toast.success(
                    e.target.checked
                      ? "Напоминания в Telegram включены"
                      : "Напоминания в Telegram выключены",
                  )
                } catch {
                  toast.error("Не получилось изменить настройку")
                }
              }}
            />
            Напоминания об играх в Telegram
          </label>

          <Button
            variant="destructive"
            className="self-start"
            onClick={() => {
              authClient.signOut({
                fetchOptions: {
                  onSuccess: () => navigate({ to: "/login" }),
                  onError: () => {
                    toast.error("Не получилось выйти")
                  },
                },
              })
            }}
          >
            Выйти
          </Button>
        </CardContent>
      </Card>
    </Reveal>
  )
}
