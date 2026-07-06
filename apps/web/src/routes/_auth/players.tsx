import { api } from "@J-schedule/backend/convex/_generated/api";
import type { Doc } from "@J-schedule/backend/convex/_generated/dataModel";
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
import { Checkbox } from "@J-schedule/ui/components/checkbox";
import { Input } from "@J-schedule/ui/components/input";
import { Skeleton } from "@J-schedule/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@J-schedule/ui/components/table";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";

export const Route = createFileRoute("/_auth/players")({
  component: PlayersPage,
});

function PlayersPage() {
  const players = useQuery(api.players.listAll);

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
            {players.map((player) => (
              <PlayerRow key={player._id} player={player} />
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function PlayerRow({ player }: { player: Doc<"players"> }) {
  const updateLevel = useMutation(api.players.updateLevel);
  const setIsAdmin = useMutation(api.players.setIsAdmin);
  const softDeletePlayer = useMutation(api.players.softDeletePlayer);
  const [level, setLevel] = useState(player.level ?? "");

  return (
    <TableRow>
      <TableCell>
        {player.firstName} {player.lastName ?? ""}
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
              updateLevel({ playerId: player._id, level: level || undefined });
            }
          }}
        />
      </TableCell>
      <TableCell>
        <Checkbox
          checked={player.isAdmin}
          onCheckedChange={(checked) =>
            setIsAdmin({ playerId: player._id, isAdmin: checked === true })
          }
        />
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
                Игрок пропадёт из списков и ростеров новых игр. История
                прошлых игр сохранится.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Назад</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => softDeletePlayer({ playerId: player._id })}
              >
                Удалить
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TableCell>
    </TableRow>
  );
}
