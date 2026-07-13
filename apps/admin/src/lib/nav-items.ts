import {
  Calendar03Icon,
  HistoryIcon,
  Home01Icon,
  Setting07Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons"

export const NAV_ITEMS = [
  { to: "/", label: "Дашборд", icon: Home01Icon, exact: true, adminOnly: false },
  { to: "/matches", label: "Матчи", icon: Calendar03Icon, exact: false, adminOnly: false },
  { to: "/history", label: "История", icon: HistoryIcon, exact: false, adminOnly: false },
  { to: "/players", label: "Игроки", icon: UserGroupIcon, exact: false, adminOnly: true },
  { to: "/settings", label: "Настройки", icon: Setting07Icon, exact: false, adminOnly: true },
] as const

// Same list plus /profile (footer-only, not part of the main nav group) —
// used by the layout header to show a page title instead of a bare
// collapse-trigger icon floating in an otherwise empty bar.
const PAGE_TITLES = [...NAV_ITEMS, { to: "/profile", label: "Профиль", exact: false }]

export function getPageTitle(pathname: string): string {
  if (pathname === "/") return "Дашборд"
  const match = PAGE_TITLES.find((item) => item.to !== "/" && pathname.startsWith(item.to))
  return match?.label ?? ""
}
