import { HugeiconsIcon } from "@hugeicons/react"
import { api } from "@J-schedule/backend/convex/_generated/api"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@J-schedule/ui/components/sidebar"
import { Link, useMatchRoute } from "@tanstack/react-router"
import { useQuery } from "convex/react"

import ThemeToggle from "@/components/theme-toggle"
import { NAV_ITEMS } from "@/lib/nav-items"

export default function AppSidebar() {
  const player = useQuery(api.players.getCurrentPlayer)
  const matchRoute = useMatchRoute()

  return (
    <Sidebar variant="floating">
      <SidebarHeader>
        <Link to="/" className="block px-2 py-3">
          <span className="text-xl font-bold tracking-tight">One Padel</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu className="gap-1.5">
            {NAV_ITEMS.filter((item) => !item.adminOnly || player?.isAdmin).map((item) => (
              <SidebarMenuItem key={item.to}>
                <SidebarMenuButton
                  size="lg"
                  isActive={!!matchRoute({ to: item.to, fuzzy: !item.exact })}
                  render={<Link to={item.to} />}
                >
                  <HugeiconsIcon icon={item.icon} strokeWidth={2} />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <ThemeToggle render={<SidebarMenuButton size="lg" />} />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
