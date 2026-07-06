import type { Doc } from "@J-schedule/backend/convex/_generated/dataModel";
import { Button } from "@J-schedule/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@J-schedule/ui/components/dropdown-menu";
import { Link, useRouter } from "@tanstack/react-router";

import ThemeToggle from "@/components/theme-toggle";
import { authClient } from "@/lib/auth-client";

const linkClassName =
  "px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground [&.active]:bg-secondary [&.active]:text-foreground";

export default function AppNav({ player }: { player: Doc<"players"> }) {
  const router = useRouter();

  return (
    <header className="flex items-center justify-between border-b px-4 py-3">
      <div className="flex items-center gap-6">
        <Link to="/matches" className="text-sm font-semibold tracking-tight">
          Игры
        </Link>
        <nav className="flex gap-1">
          <Link to="/matches" className={linkClassName}>
            Матчи
          </Link>
          <Link to="/history" className={linkClassName}>
            История
          </Link>
          {player.isAdmin && (
            <Link to="/players" className={linkClassName}>
              Игроки
            </Link>
          )}
        </nav>
      </div>

      <div className="flex items-center gap-1">
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" className="gap-2 text-sm">
                {player.firstName}
                {player.lastName ? ` ${player.lastName}` : ""}
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                {player.username
                  ? `@${player.username}`
                  : player.isAdmin
                    ? "Администратор"
                    : "Профиль"}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => {
                  authClient.signOut({
                    fetchOptions: {
                      onSuccess: () => {
                        router.navigate({ to: "/login" });
                      },
                    },
                  });
                }}
              >
                Выйти
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
