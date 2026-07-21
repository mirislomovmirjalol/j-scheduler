import { api } from "@J-schedule/backend/convex/_generated/api"
import type { Doc, Id } from "@J-schedule/backend/convex/_generated/dataModel"
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@J-schedule/ui/components/dialog"
import { Empty, EmptyDescription } from "@J-schedule/ui/components/empty"
import { Input } from "@J-schedule/ui/components/input"
import { Label } from "@J-schedule/ui/components/label"
import { Skeleton } from "@J-schedule/ui/components/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@J-schedule/ui/components/table"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { useMutation, useQuery } from "convex/react"
import { ConvexError } from "convex/values"
import { useState } from "react"
import { toast } from "sonner"

import BackButton from "@/components/back-button"
import DigitGroup from "@/components/digit-group"
import DraftBadge from "@/components/draft-badge"
import Reveal from "@/components/reveal"
import SeatMeter from "@/components/seat-meter"
import ShakeField from "@/components/shake-field"
import SuccessCheck from "@/components/success-check"
import TextSwap from "@/components/text-swap"
import { formatTashkentDateTime } from "@/lib/format"
import { useDebouncedValue } from "@/lib/use-debounced-value"

export const Route = createFileRoute("/_authenticated/matches/$matchId")({
  component: MatchDetailPage,
})

function MatchDetailPage() {
  const player = useQuery(api.players.getCurrentPlayer)
  const settings = useQuery(api.communitySettings.get)
  const paymentInfo = settings?.paymentInfo
  const { matchId } = Route.useParams()
  const detail = useQuery(api.matches.getMatchDetail, {
    matchId: matchId as Id<"matches">,
  })
  const cancelMatch = useMutation(api.matches.cancelMatch)
  const publishMatch = useMutation(api.matches.publishMatch)
  const repostMatchToGroup = useMutation(api.matches.repostMatchToGroup)
  const leaveMatch = useMutation(api.memberships.leaveMatch)
  const joinMatchSelf = useMutation(api.memberships.joinMatchSelf)
  const navigate = useNavigate()
  const [pinOnRepost, setPinOnRepost] = useState(false)
  const [reposting, setReposting] = useState(false)

  if (detail === undefined) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-7 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-8 w-28" />
        </div>
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }
  if (detail === null) {
    return <p className="p-6 text-sm text-muted-foreground">Игра не найдена.</p>
  }

  const { match, roster, waitlist, cancelled, myMembership } = detail
  // Attendance only makes sense in hindsight — everyone defaults to
  // "attended" (schema.ts), so the flag-a-no-show toggle only appears once
  // there's something to correct.
  const isPastMatch = match.startsAt < Date.now()

  return (
    <Reveal className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
      <BackButton />
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight capitalize">
              {formatTashkentDateTime(match.startsAt, "long")}
            </h1>
            {player?.isAdmin && <DraftBadge show={!match.isPublished} />}
          </div>
          <p className="text-sm text-muted-foreground">
            {match.court} · {match.format} · Уровень {match.level}
            {match.pricePerPerson ? ` · ${match.pricePerPerson} с человека` : ""}
          </p>
          {match.pricePerPerson && paymentInfo && (
            <p className="mt-1 text-sm text-muted-foreground">💳 {paymentInfo}</p>
          )}
          {match.description && (
            <p className="mt-1 text-sm text-muted-foreground">{match.description}</p>
          )}
          {match.lundaUrl && (
            <a
              href={match.lundaUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block text-sm underline underline-offset-2"
            >
              Ссылка Lunda
            </a>
          )}
        </div>
        {player?.isAdmin && (
          <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row">
            {!match.isPublished && (
              <Button
                className="w-full sm:w-auto"
                onClick={async () => {
                  try {
                    await publishMatch({ matchId: match._id })
                    toast.success("Игра опубликована в группе")
                  } catch {
                    toast.error("Не получилось опубликовать игру")
                  }
                }}
              >
                Опубликовать
              </Button>
            )}
            {match.isPublished && (
              <div className="flex w-full items-center gap-2 sm:w-auto">
                <Label htmlFor="pin-on-repost" className="normal-case">
                  <Checkbox
                    id="pin-on-repost"
                    checked={pinOnRepost}
                    onCheckedChange={(checked) => setPinOnRepost(checked === true)}
                  />
                  Закрепить
                </Label>
                <Button
                  variant="outline"
                  disabled={reposting}
                  className="flex-1 sm:flex-none"
                  onClick={async () => {
                    setReposting(true)
                    try {
                      await repostMatchToGroup({ matchId: match._id, pin: pinOnRepost })
                      toast.success("Игра отправлена в группу")
                    } catch (err) {
                      toast.error(
                        err instanceof ConvexError
                          ? (err.data as string)
                          : "Не получилось отправить игру",
                      )
                    } finally {
                      setReposting(false)
                    }
                  }}
                >
                  <TextSwap>{reposting ? "Отправляем…" : "Отправить в группу"}</TextSwap>
                </Button>
              </div>
            )}
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              render={<Link to="/matches/$matchId/edit" params={{ matchId: match._id }} />}
            >
              Редактировать
            </Button>
            <AlertDialog>
              <AlertDialogTrigger
                render={<Button variant="destructive" className="w-full sm:w-auto" />}
              >
                Отменить
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Отменить эту игру?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Игра пропадёт с доски в группе. Это действие можно отменить только
                    вручную через базу данных.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Назад</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={async () => {
                      try {
                        await cancelMatch({ matchId: match._id })
                        toast.success("Игра отменена")
                        navigate({ to: "/matches" })
                      } catch {
                        toast.error("Не получилось отменить игру")
                      }
                    }}
                  >
                    Отменить игру
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      <SeatMeter
        rosterCount={roster.length}
        maxMembers={match.maxMembers}
        waitlistCount={waitlist.length}
      />

      {player?.isAdmin && match.pricePerPerson && roster.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Оплатили: <DigitGroup value={roster.filter((m) => m.membership.paid).length} />/
          <DigitGroup value={roster.length} />
        </p>
      )}

      {myMembership ? (
        <div className="flex flex-col items-start justify-between gap-3 rounded-md border border-input p-4 sm:flex-row sm:items-center">
          <p className="text-sm">
            Ты {myMembership.role === "roster" ? "в ростере" : "в листе ожидания"} этой игры.
          </p>
          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="outline" size="sm" />}>
              Не пойду
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Отменить участие?</AlertDialogTitle>
                <AlertDialogDescription>
                  {myMembership.role === "roster"
                    ? "Место освободится, лист ожидания будет уведомлён."
                    : "Ты выйдешь из листа ожидания."}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Назад</AlertDialogCancel>
                <AlertDialogAction
                  onClick={async () => {
                    try {
                      await leaveMatch({ membershipId: myMembership._id })
                      toast.success("Участие отменено")
                    } catch {
                      toast.error("Не получилось отменить участие")
                    }
                  }}
                >
                  Не пойду
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ) : (
        match.isPublished &&
        !isPastMatch && (
          <div className="flex flex-col items-start justify-between gap-3 rounded-md border border-input p-4 sm:flex-row sm:items-center">
            <p className="text-sm">Записаться на эту игру?</p>
            <Button
              size="sm"
              onClick={async () => {
                try {
                  const result = await joinMatchSelf({ matchId: match._id })
                  if (result.outcome === "match_gone") {
                    toast.error("Игра больше недоступна")
                  } else {
                    toast.success(
                      result.outcome === "roster"
                        ? "Ты в игре!"
                        : "Мест нет, ты в листе ожидания",
                    )
                  }
                } catch {
                  toast.error("Не получилось записаться")
                }
              }}
            >
              Записаться
            </Button>
          </div>
        )
      )}

      <MemberSection
        title="Ростер"
        members={roster}
        emptyText="Пока никто не записался."
        showPromote={false}
        showActions={!!player?.isAdmin}
        showAttendance={!!player?.isAdmin && isPastMatch}
        showPaid={!!match.pricePerPerson && !!player?.isAdmin}
        isAdmin={!!player?.isAdmin}
      />

      <MemberSection
        title="Лист ожидания"
        members={waitlist}
        emptyText="Лист ожидания пуст."
        showPromote
        showActions={!!player?.isAdmin}
        isAdmin={!!player?.isAdmin}
      />

      {player?.isAdmin && cancelled.length > 0 && (
        <MemberSection
          title="Отказались"
          members={cancelled}
          emptyText=""
          showPromote={false}
          showActions={false}
          isAdmin={!!player?.isAdmin}
        />
      )}

      {player?.isAdmin && (
        <div className="flex flex-wrap gap-2">
          <AddExistingMemberDialog matchId={match._id} />
          <AddGuestDialog matchId={match._id} />
        </div>
      )}
    </Reveal>
  )
}

function MemberSection({
  title,
  members,
  emptyText,
  showPromote,
  showActions,
  showAttendance = false,
  showPaid = false,
  isAdmin = false,
}: {
  title: string
  members: { membership: Doc<"memberships">; player: Doc<"players"> | null }[]
  emptyText: string
  showPromote: boolean
  showActions: boolean
  showAttendance?: boolean
  showPaid?: boolean
  isAdmin?: boolean
}) {
  const removeMember = useMutation(api.memberships.removeMember)
  const promoteFromWaitlist = useMutation(api.memberships.promoteFromWaitlist)
  const setNoShow = useMutation(api.memberships.setNoShow)
  const setPaid = useMutation(api.memberships.setPaid)

  return (
    <div>
      <h2 className="mb-2 text-lg font-medium">
        {title}{" "}
        <span className="text-muted-foreground">
          (<DigitGroup value={members.length} />)
        </span>
      </h2>
      {members.length === 0 ? (
        <Empty className="p-4">
          <EmptyDescription>{emptyText}</EmptyDescription>
        </Empty>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Игрок</TableHead>
              <TableHead>Записан</TableHead>
              {showAttendance && <TableHead>Пришёл</TableHead>}
              {showPaid && <TableHead>Оплата</TableHead>}
              {showActions && <TableHead className="text-right">Действия</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map(({ membership, player }) => (
              <TableRow key={membership._id}>
                <TableCell>
                  {player ? (
                    <Link
                      to={isAdmin ? "/players/$playerId" : "/p/$playerId"}
                      params={{ playerId: player._id }}
                      className="hover:underline underline-offset-2"
                    >
                      {player.firstName} {player.lastName ?? ""}
                    </Link>
                  ) : (
                    "—"
                  )}
                  {player?.type === "guest" && (
                    <Badge variant="secondary" className="ml-2">
                      гость
                    </Badge>
                  )}
                  {player?.username && (
                    <span className="ml-1 text-muted-foreground">@{player.username}</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatTashkentDateTime(membership.joinedAt)}
                </TableCell>
                {showAttendance && (
                  <TableCell>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={!membership.noShow}
                        onChange={async (e) => {
                          try {
                            await setNoShow({
                              membershipId: membership._id,
                              noShow: !e.target.checked,
                            })
                          } catch {
                            toast.error("Не получилось отметить посещение")
                          }
                        }}
                      />
                      {membership.noShow ? (
                        <span className="text-muted-foreground">не пришёл</span>
                      ) : (
                        <span>пришёл</span>
                      )}
                    </label>
                  </TableCell>
                )}
                {showPaid && (
                  <TableCell>
                    <Button
                      size="sm"
                      variant={membership.paid ? "default" : "outline"}
                      onClick={async () => {
                        try {
                          await setPaid({
                            membershipId: membership._id,
                            paid: !membership.paid,
                          })
                        } catch {
                          toast.error("Не получилось отметить оплату")
                        }
                      }}
                    >
                      {membership.paid ? "✅ Оплачено" : "Отметить оплату"}
                    </Button>
                  </TableCell>
                )}
                {showActions && (
                  <TableCell className="flex justify-end gap-2 text-right">
                    {showPromote && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          try {
                            await promoteFromWaitlist({ membershipId: membership._id })
                            toast.success("Игрок переведён в ростер")
                          } catch {
                            toast.error("Мест нет")
                          }
                        }}
                      >
                        В ростер
                      </Button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger render={<Button size="sm" variant="ghost" />}>
                        Убрать
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Убрать {player?.firstName ?? "игрока"}?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Игрок будет удалён из этой игры и получит уведомление в
                            Telegram, если подписан на напоминания.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Назад</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={async () => {
                              try {
                                await removeMember({ membershipId: membership._id })
                              } catch {
                                toast.error("Не получилось убрать игрока")
                              }
                            }}
                          >
                            Убрать
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}

function AddGuestDialog({ matchId }: { matchId: Id<"matches"> }) {
  const addGuest = useMutation(api.memberships.addGuestToMatch)
  const [name, setName] = useState("")
  const [note, setNote] = useState("")
  const [level, setLevel] = useState("")
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [nameError, setNameError] = useState<string | undefined>(undefined)
  const [submitAttempt, setSubmitAttempt] = useState(0)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" className="self-start" />}>
        + Добавить гостя
      </DialogTrigger>
      <DialogContent>
        <form
          className="flex flex-col gap-4"
          noValidate
          onSubmit={async (e) => {
            e.preventDefault()
            if (submitting) return
            if (!name.trim()) {
              setNameError("Укажи имя")
              setSubmitAttempt((a) => a + 1)
              return
            }
            setSubmitting(true)
            try {
              await addGuest({
                matchId,
                firstName: name,
                guestNote: note || undefined,
                level: level || undefined,
              })
              setName("")
              setNote("")
              setLevel("")
              setOpen(false)
              toast.success("Гость добавлен")
            } catch {
              toast.error("Не получилось добавить гостя")
            } finally {
              setSubmitting(false)
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>Новый гость</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="guestName">Имя</Label>
              <ShakeField error={nameError} attempt={submitAttempt}>
                <Input
                  id="guestName"
                  autoFocus
                  aria-invalid={!!nameError}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    if (nameError) setNameError(undefined)
                  }}
                />
              </ShakeField>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="guestLevel">Уровень</Label>
                <Input id="guestLevel" value={level} onChange={(e) => setLevel(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="guestNote">Заметка</Label>
                <Input id="guestNote" value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              <TextSwap>{submitting ? "Добавляем…" : "Добавить"}</TextSwap>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function AddExistingMemberDialog({ matchId }: { matchId: Id<"matches"> }) {
  const addExisting = useMutation(api.memberships.addExistingPlayerToMatch)
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const debouncedQuery = useDebouncedValue(query, 300).trim()
  const results = useQuery(
    api.players.search,
    debouncedQuery.length >= 2 ? { query: debouncedQuery } : "skip",
  )

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) setQuery("")
      }}
    >
      <DialogTrigger render={<Button variant="outline" className="self-start" />}>
        + Добавить участника
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Добавить участника</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <Input
            placeholder="Имя или @username"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="flex max-h-64 flex-col gap-1 overflow-y-auto">
            {debouncedQuery.length < 2 ? (
              <p className="text-sm text-muted-foreground">Введите минимум 2 символа.</p>
            ) : results === undefined ? (
              <p className="text-sm text-muted-foreground">Ищем…</p>
            ) : results.length === 0 ? (
              <p className="text-sm text-muted-foreground">Никого не найдено.</p>
            ) : (
              results.map((p) => (
                <button
                  key={p._id}
                  type="button"
                  className="flex items-center justify-between gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-accent"
                  onClick={async () => {
                    try {
                      const result = await addExisting({ matchId, playerId: p._id })
                      toast.success(result.alreadyJoined ? "Уже в игре" : "Игрок добавлен")
                      setOpen(false)
                      setQuery("")
                    } catch {
                      toast.error("Не получилось добавить игрока")
                    }
                  }}
                >
                  <span>
                    {p.firstName} {p.lastName ?? ""}
                  </span>
                  {p.username && (
                    <span className="text-muted-foreground">@{p.username}</span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
