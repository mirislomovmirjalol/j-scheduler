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
  "shrink-0 px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground [&.active]:bg-secondary [&.active]:text-foreground sm:px-3";

export default function AppNav({ player }: { player: Doc<"players"> }) {
  const router = useRouter();

  return (
    <header className="flex items-center justify-between gap-2 border-b px-3 py-3 sm:px-4">
      <div className="flex min-w-0 items-center gap-3 sm:gap-6">
        <Link to="/matches" className="shrink-0 text-sm font-semibold tracking-tight">
          Игры
        </Link>
        <nav className="flex min-w-0 gap-1 overflow-x-auto">
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

      <div className="flex shrink-0 items-center gap-1">
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" className="gap-2 text-sm">
                <span className="max-w-24 truncate sm:max-w-none">
                  {player.firstName}
                  {player.lastName ? ` ${player.lastName}` : ""}
                </span>
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
