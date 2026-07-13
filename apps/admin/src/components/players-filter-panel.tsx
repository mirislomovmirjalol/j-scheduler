import { Button } from "@J-schedule/ui/components/button"
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@J-schedule/ui/components/drawer"
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@J-schedule/ui/components/sheet"
import { useState } from "react"

import PlayersFilterBar from "@/components/players-filter-bar"
import PresenceBadge from "@/components/presence-badge"
import {
  clearedPlayersFilters,
  countActivePlayersFilters,
  type PlayersSearch,
} from "@/lib/players-filters"
import { useMediaQuery } from "@/lib/use-media-query"

// Sheet (right side) on desktop, Drawer (bottom) on mobile — same shell as
// MatchesFilterPanel, so "Filters" behaves identically everywhere in the
// app regardless of which list it's filtering.
export default function PlayersFilterPanel({
  search,
  onChange,
}: {
  search: PlayersSearch
  onChange: (patch: Partial<PlayersSearch>) => void
}) {
  const [open, setOpen] = useState(false)
  const isDesktop = useMediaQuery("(min-width: 640px)")
  const activeCount = countActivePlayersFilters(search)

  const trigger = (
    <Button variant="outline" className="gap-2">
      Фильтры
      <PresenceBadge show={activeCount > 0} variant="secondary">
        {activeCount}
      </PresenceBadge>
    </Button>
  )

  const form = (
    <div className="flex flex-col gap-4 p-4">
      <PlayersFilterBar search={search} onChange={onChange} />
    </div>
  )

  const footer = (
    <>
      <Button variant="ghost" disabled={activeCount === 0} onClick={() => onChange(clearedPlayersFilters())}>
        Сбросить
      </Button>
      <Button onClick={() => setOpen(false)}>Готово</Button>
    </>
  )

  if (isDesktop) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger render={trigger} />
        <SheetContent side="right" className="flex flex-col">
          <SheetHeader>
            <SheetTitle>Фильтры</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto">{form}</div>
          <SheetFooter className="flex-row justify-end gap-2">{footer}</SheetFooter>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Drawer open={open} onOpenChange={setOpen} showSwipeHandle>
      <DrawerTrigger render={trigger} />
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Фильтры</DrawerTitle>
        </DrawerHeader>
        {form}
        <DrawerFooter className="flex-row gap-2">{footer}</DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
