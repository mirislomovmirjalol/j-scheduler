// Shared by every icon button in the floating nav (app-nav.tsx, theme
// toggle, account menu trigger) so hovering any of them reveals its label
// the same way: below the icon on the mobile top bar, to the right of it
// on the desktop left rail — matching the icon's own transform-origin so
// it visibly grows out from the trigger rather than fading in from nowhere.
export const navIconButtonClassName =
  "group relative flex size-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-[background-color,color,transform] duration-150 ease-out hover:text-foreground active:scale-90 [&.active]:bg-secondary [&.active]:text-foreground aria-expanded:bg-secondary aria-expanded:text-foreground"

export function NavTooltip({ label }: { label: string }) {
  return (
    <span className="pointer-events-none absolute top-full left-1/2 z-10 mt-2 -translate-x-1/2 translate-y-0 origin-top scale-95 rounded-md bg-foreground px-2 py-1 text-xs whitespace-nowrap text-background opacity-0 transition-[opacity,transform] duration-150 ease-out [@media(hover:hover)]:group-hover:scale-100 [@media(hover:hover)]:group-hover:opacity-100 sm:top-1/2 sm:left-full sm:mt-0 sm:ml-2 sm:translate-x-0 sm:-translate-y-1/2 sm:origin-left">
      {label}
    </span>
  )
}
