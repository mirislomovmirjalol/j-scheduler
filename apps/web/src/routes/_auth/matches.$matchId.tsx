import { api } from "@J-schedule/backend/convex/_generated/api";
import type { Doc, Id } from "@J-schedule/backend/convex/_generated/dataModel";
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
} from "@J-schedule/ui/components/alert-dialog";
import { Badge } from "@J-schedule/ui/components/badge";
import { Button } from "@J-schedule/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@J-schedule/ui/components/dialog";
import { Input } from "@J-schedule/ui/components/input";
import { Label } from "@J-schedule/ui/components/label";
import { Skeleton } from "@J-schedule/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@J-schedule/ui/components/table";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";

import SeatMeter from "@/components/seat-meter";

export const Route = createFileRoute("/_auth/matches/$matchId")({
  component: MatchDetailPage,
});

function formatDateTime(ms: number) {
  return new Date(ms).toLocaleString("ru-RU", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tashkent",
  });
}

function MatchDetailPage() {
  const { matchId } = Route.useParams();
  const detail = useQuery(api.matches.getMatchDetail, {
    matchId: matchId as Id<"matches">,
  });
  const cancelMatch = useMutation(api.matches.cancelMatch);
  const navigate = useNavigate();

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
    );
  }
  if (detail === null) {
    return <p className="p-6 text-sm text-muted-foreground">Игра не найдена.</p>;
  }

  const { match, roster, waitlist } = detail;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight capitalize">
            {formatDateTime(match.startsAt)}
          </h1>
          <p className="text-sm text-muted-foreground">
            {match.court} · {match.format} · Уровень {match.level}
            {match.pricePerPerson ? ` · ${match.pricePerPerson} с человека` : ""}
          </p>
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
        <div className="flex shrink-0 gap-2">
          <Button
            variant="outline"
            render={<Link to="/matches/$matchId/edit" params={{ matchId: match._id }} />}
          >
            Редактировать
          </Button>
          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="destructive" />}>
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
                    await cancelMatch({ matchId: match._id });
                    toast.success("Игра отменена");
                    navigate({ to: "/matches" });
                  }}
                >
                  Отменить игру
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <SeatMeter
        rosterCount={roster.length}
        maxMembers={match.maxMembers}
        waitlistCount={waitlist.length}
      />

      <MemberSection
        title="Ростер"
        members={roster}
        emptyText="Пока никто не записался."
        showPromote={false}
      />

      <MemberSection
        title="Лист ожидания"
        members={waitlist}
        emptyText="Лист ожидания пуст."
        showPromote
      />

      <AddGuestDialog matchId={match._id} />
    </div>
  );
}

function MemberSection({
  title,
  members,
  emptyText,
  showPromote,
}: {
  title: string;
  members: { membership: Doc<"memberships">; player: Doc<"players"> | null }[];
  emptyText: string;
  showPromote: boolean;
}) {
  const removeMember = useMutation(api.memberships.removeMember);
  const promoteFromWaitlist = useMutation(api.memberships.promoteFromWaitlist);

  return (
    <div>
      <h2 className="mb-2 text-lg font-medium">
        {title} <span className="text-muted-foreground">({members.length})</span>
      </h2>
      {members.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Игрок</TableHead>
              <TableHead>Записан</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map(({ membership, player }) => (
              <TableRow key={membership._id}>
                <TableCell>
                  {player?.firstName} {player?.lastName ?? ""}
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
                  {new Date(membership.joinedAt).toLocaleString("ru-RU", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: "Asia/Tashkent",
                  })}
                </TableCell>
                <TableCell className="flex justify-end gap-2 text-right">
                  {showPromote && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        try {
                          await promoteFromWaitlist({ membershipId: membership._id });
                          toast.success("Игрок переведён в ростер");
                        } catch {
                          toast.error("Мест нет");
                        }
                      }}
                    >
                      В ростер
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeMember({ membershipId: membership._id })}
                  >
                    Убрать
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function AddGuestDialog({ matchId }: { matchId: Id<"matches"> }) {
  const addGuest = useMutation(api.memberships.addGuestToMatch);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [level, setLevel] = useState("");
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" className="self-start" />}>
        + Добавить гостя
      </DialogTrigger>
      <DialogContent>
        <form
          className="flex flex-col gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            await addGuest({
              matchId,
              firstName: name,
              guestNote: note || undefined,
              level: level || undefined,
            });
            setName("");
            setNote("");
            setLevel("");
            setOpen(false);
            toast.success("Гость добавлен");
          }}
        >
          <DialogHeader>
            <DialogTitle>Новый гость</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="guestName">Имя</Label>
              <Input
                id="guestName"
                required
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
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
            <Button type="submit">Добавить</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
