import { api } from "@J-schedule/backend/convex/_generated/api"
import type { Doc } from "@J-schedule/backend/convex/_generated/dataModel"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@J-schedule/ui/components/alert-dialog"
import { Badge } from "@J-schedule/ui/components/badge"
import { Button } from "@J-schedule/ui/components/button"
import { Checkbox } from "@J-schedule/ui/components/checkbox"
import { Input } from "@J-schedule/ui/components/input"
import { Skeleton } from "@J-schedule/ui/components/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@J-schedule/ui/components/table"
import { createFileRoute, Link, Navigate } from "@tanstack/react-router"
import { useMutation, useQuery } from "convex/react"
import { useState } from "react"

import { useAdminGuard } from "@/lib/use-admin-guard"

export const Route = createFileRoute("/_authenticated/players")({
  component: PlayersPage,
})

function PlayersPage() {
  const { player, isChecking } = useAdminGuard()
  const players = useQuery(api.players.listAll)

  if (isChecking) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
        <Skeleton className="h-7 w-32" />
        <div className="flex flex-col gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-5 w-5" />
            </div>
          ))}
        </div>
      </div>
    )
  }
  if (!player?.isAdmin) return <Navigate to="/matches" />

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Игроки</h1>

      {players === undefined ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-5 w-5" />
            </div>
          ))}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Игрок</TableHead>
              <TableHead>Уровень</TableHead>
              <TableHead>Админ</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {players.map((p) => (
              <PlayerRow key={p._id} player={p} />
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}

function PlayerRow({ player }: { player: Doc<"players"> }) {
  const updateLevel = useMutation(api.players.updateLevel)
  const setIsAdmin = useMutation(api.players.setIsAdmin)
  const softDeletePlayer = useMutation(api.players.softDeletePlayer)
  const [level, setLevel] = useState(player.level ?? "")
  const [pendingAdmin, setPendingAdmin] = useState<boolean | null>(null)

  return (
    <TableRow>
      <TableCell>
        <Link
          to="/players/$playerId"
          params={{ playerId: player._id }}
          className="hover:underline underline-offset-2"
        >
          {player.firstName} {player.lastName ?? ""}
        </Link>
        {player.type === "guest" && (
          <Badge variant="secondary" className="ml-2">
            гость
          </Badge>
        )}
        {player.username && (
          <span className="ml-1 text-muted-foreground">@{player.username}</span>
        )}
      </TableCell>
      <TableCell>
        <Input
          className="h-8 w-20"
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          onBlur={() => {
            if (level !== (player.level ?? "")) {
              updateLevel({ playerId: player._id, level: level || undefined })
            }
          }}
        />
      </TableCell>
      <TableCell>
        <Checkbox
          checked={player.isAdmin}
          onCheckedChange={(checked) => setPendingAdmin(checked === true)}
        />
        <AlertDialog
          open={pendingAdmin !== null}
          onOpenChange={(open) => {
            if (!open) setPendingAdmin(null)
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {pendingAdmin
                  ? `Сделать ${player.firstName} администратором?`
                  : `Забрать права администратора у ${player.firstName}?`}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {pendingAdmin
                  ? "Администратор сможет создавать и редактировать игры, управлять игроками и назначать других администраторов."
                  : "Игрок потеряет доступ к управлению играми и игроками."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Назад</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (pendingAdmin !== null) {
                    setIsAdmin({ playerId: player._id, isAdmin: pendingAdmin })
                  }
                  setPendingAdmin(null)
                }}
              >
                Подтвердить
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TableCell>
      <TableCell className="text-right">
        <AlertDialog>
          <AlertDialogTrigger render={<Button size="sm" variant="ghost" />}>
            Удалить
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Удалить {player.firstName}?</AlertDialogTitle>
              <AlertDialogDescription>
                Игрок пропадёт из списков и ростеров новых игр. История прошлых игр
                сохранится.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Назад</AlertDialogCancel>
              <AlertDialogAction onClick={() => softDeletePlayer({ playerId: player._id })}>
                Удалить
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TableCell>
    </TableRow>
  )
}
