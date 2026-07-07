import { Badge } from "@J-schedule/ui/components/badge"
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

import MatchesFilterBar from "@/components/matches-filter-bar"
import type { MatchesSearch } from "@/lib/matches-filters"
import { clearedMatchesFilters, countActiveMatchesFilters } from "@/lib/matches-filters"
import { useMediaQuery } from "@/lib/use-media-query"

// Sheet (right side) on desktop, Drawer (bottom) on mobile — the filter
// form itself is the same MatchesFilterBar either way, just the container
// changes. sm: matches this app's other desktop/mobile breakpoint calls.
export default function MatchesFilterPanel({
  courts,
  formats,
  levels,
  search,
  onChange,
  showStatusFilter,
}: {
  courts: string[]
  formats: string[]
  levels: string[]
  search: MatchesSearch
  onChange: (patch: Partial<MatchesSearch>) => void
  showStatusFilter: boolean
}) {
  const [open, setOpen] = useState(false)
  const isDesktop = useMediaQuery("(min-width: 640px)")
  const activeCount = countActiveMatchesFilters(search)

  const trigger = (
    <Button variant="outline" className="gap-2">
      Фильтры
      {activeCount > 0 && <Badge variant="secondary">{activeCount}</Badge>}
    </Button>
  )

  const form = (
    <div className="flex flex-col gap-4 p-4">
      <MatchesFilterBar
        courts={courts}
        formats={formats}
        levels={levels}
        search={search}
        onChange={onChange}
        showStatusFilter={showStatusFilter}
      />
    </div>
  )

  const footer = (
    <>
      <Button
        variant="ghost"
        disabled={activeCount === 0}
        onClick={() => onChange(clearedMatchesFilters())}
      >
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
