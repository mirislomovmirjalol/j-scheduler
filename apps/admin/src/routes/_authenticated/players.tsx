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
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import StatCard from "@/components/stat-card"
import { applyPlayersFilters, parsePlayersSearch, type PlayersType } from "@/lib/players-filters"
import { useAdminGuard } from "@/lib/use-admin-guard"
import { useDebouncedValue } from "@/lib/use-debounced-value"

const controlClassName =
  "h-9 rounded-md border border-input bg-transparent px-2 text-sm text-foreground outline-none focus-visible:border-ring"

export const Route = createFileRoute("/_authenticated/players")({
  validateSearch: parsePlayersSearch,
  component: PlayersPage,
})

// Owns the debounce timer and every keystroke's state itself, so typing
// only re-renders this small input — not the whole players table (which
// was the actual cause of the "laggy" feel: every keystroke was
// re-rendering every row, each with its own mutations/dialogs/checkbox).
// Keyed by the parent's `resetKey`, which only changes on an explicit
// "Сбросить" click — never on our own debounced updates — so typing never
// remounts (and never loses focus).
function PlayersSearchInput({
  initialValue,
  onDebouncedChange,
}: {
  initialValue: string
  onDebouncedChange: (value: string) => void
}) {
  const [value, setValue] = useState(initialValue)
  const debounced = useDebouncedValue(value, 300)
  const onDebouncedChangeRef = useRef(onDebouncedChange)
  // Refs must not be written during render (breaks under concurrent
  // rendering) — keep it fresh via an every-render effect instead, same
  // as the useLatest/useEffectEvent pattern.
  useEffect(() => {
    onDebouncedChangeRef.current = onDebouncedChange
  })
  const mounted = useRef(false)

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      return
    }
    onDebouncedChangeRef.current(debounced)
  }, [debounced])

  return (
    <input
      type="text"
      placeholder="Имя или @username"
      className={`${controlClassName} w-48`}
      value={value}
      onChange={(e) => setValue(e.target.value)}
    />
  )
}

function PlayersPage() {
  const { player, isChecking } = useAdminGuard()
  const players = useQuery(api.players.listAll)
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const [resetKey, setResetKey] = useState(0)

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

  const filtered = players ? applyPlayersFilters(players, search) : undefined

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Игроки</h1>

      {players && players.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Всего игроков" value={players.length} to="/players" />
          <StatCard
            label="Админов"
            value={players.filter((p) => p.isAdmin).length}
            to="/players"
            search={{ role: "admin" }}
          />
          <StatCard
            label="Гостей"
            value={players.filter((p) => p.type === "guest").length}
            to="/players"
            search={{ type: "guest" }}
          />
        </div>
      )}

      {players && players.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <PlayersSearchInput
            key={resetKey}
            initialValue={search.q ?? ""}
            onDebouncedChange={(q) => navigate({ search: (prev) => ({ ...prev, q: q || undefined }) })}
          />
          <select
            className={controlClassName}
            value={search.type ?? ""}
            onChange={(e) =>
              navigate({
                search: (prev) => ({
                  ...prev,
                  type: (e.target.value || undefined) as PlayersType | undefined,
                }),
              })
            }
          >
            <option value="">Все</option>
            <option value="authed">Игроки</option>
            <option value="guest">Гости</option>
          </select>
          <select
            className={controlClassName}
            value={search.role ?? ""}
            onChange={(e) =>
              navigate({
                search: (prev) => ({
                  ...prev,
                  role: (e.target.value || undefined) as "admin" | "member" | undefined,
                }),
              })
            }
          >
            <option value="">Все роли</option>
            <option value="admin">Админы</option>
            <option value="member">Не админы</option>
          </select>
          {(search.q || search.type || search.role) && (
            <button
              type="button"
              className="h-9 rounded-md px-2 text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
              onClick={() => {
                navigate({ search: { q: undefined, type: undefined, role: undefined } })
                setResetKey((k) => k + 1)
              }}
            >
              Сбросить
            </button>
          )}
        </div>
      )}

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
      ) : filtered && filtered.length === 0 && players.length > 0 ? (
        <p className="text-sm text-muted-foreground">Никого не найдено по этим фильтрам.</p>
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
            {(filtered ?? players).map((p) => (
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
          onBlur={async () => {
            if (level !== (player.level ?? "")) {
              try {
                await updateLevel({ playerId: player._id, level: level || undefined })
              } catch {
                toast.error("Не получилось сохранить уровень")
              }
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
                onClick={async () => {
                  if (pendingAdmin !== null) {
                    try {
                      await setIsAdmin({ playerId: player._id, isAdmin: pendingAdmin })
                    } catch {
                      toast.error("Не получилось изменить права")
                    }
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
              <AlertDialogAction
                onClick={async () => {
                  try {
                    await softDeletePlayer({ playerId: player._id })
                  } catch {
                    toast.error("Не получилось удалить игрока")
                  }
                }}
              >
                Удалить
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TableCell>
    </TableRow>
  )
}
