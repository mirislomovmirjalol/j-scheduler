import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"

import { cn } from "@J-schedule/ui/lib/utils"

function Tabs({ className, ...props }: TabsPrimitive.Root.Props) {
  return <TabsPrimitive.Root data-slot="tabs" className={cn("flex flex-col gap-2", className)} {...props} />
}

function TabsList({ className, ...props }: TabsPrimitive.List.Props) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "relative inline-flex w-fit items-center gap-1 rounded-none bg-muted p-1",
        className,
      )}
      {...props}
    />
  )
}

function TabsTab({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-tab"
      className={cn(
        "relative z-10 inline-flex h-8 items-center justify-center rounded-none px-3 text-xs font-semibold tracking-widest whitespace-nowrap uppercase text-muted-foreground outline-none transition-colors select-none data-selected:text-foreground",
        className,
      )}
      {...props}
    />
  )
}

// Position/size come from Base UI's own measurement of the active tab (CSS
// vars exposed on this element) — no manual getBoundingClientRect/JS
// measuring needed, unlike a hand-rolled sliding-pill implementation.
function TabsIndicator({ className, ...props }: TabsPrimitive.Indicator.Props) {
  return (
    <TabsPrimitive.Indicator
      data-slot="tabs-indicator"
      className={cn(
        "absolute top-1 left-0 z-0 h-8 rounded-none bg-background shadow-sm transition-[transform,width] duration-200 ease-out",
        className,
      )}
      style={{
        transform: "translateX(var(--active-tab-left))",
        width: "var(--active-tab-width)",
      }}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTab, TabsIndicator }
