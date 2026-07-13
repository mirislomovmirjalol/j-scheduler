"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion } from "motion/react"

import MotionCta from "@/app/_components/motion-cta"
import { ProgressiveBlur } from "@/app/_components/progressive-blur"
import { GROUP_URL } from "@/app/_lib/links"

const links = [
  { href: "/tournaments", label: "Турниры" },
  { href: "/community", label: "Сообщество" },
  { href: "/about", label: "О клубе" },
]

// Sections with a dark (bg-ink) background opt in via data-nav-theme="dark"
// (see cta-band.tsx, community/guidelines.tsx). Everything else is assumed
// light, so the header only has to track "is a dark section currently
// behind me", not the full page background.
function useIsOverDarkSection(headerRef: React.RefObject<HTMLElement | null>) {
  const [isDark, setIsDark] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const header = headerRef.current
    if (!header) return

    const intersecting = new Set<Element>()
    let observer: IntersectionObserver | null = null

    function setup() {
      observer?.disconnect()
      const headerHeight = header!.getBoundingClientRect().height
      // Shrink the observation root to a thin line right at the header's
      // own bottom edge, not the header's full height — a section counts
      // as "behind the header" once it reaches that line. Anchoring to the
      // header's own 0-to-height band instead is a coin flip at exact
      // sub-pixel boundaries: a section that starts precisely at
      // y = headerHeight (like the hero, which sits right below a sticky
      // header that isn't overlaying it yet) only *touches* that band
      // without overlapping it, so whether it registers depends on
      // rounding and can differ between renders of the same page.
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) intersecting.add(entry.target)
            else intersecting.delete(entry.target)
          }
          setIsDark(intersecting.size > 0)
        },
        {
          rootMargin: `-${headerHeight}px 0px -${window.innerHeight - headerHeight - 1}px 0px`,
          threshold: 0,
        },
      )
      intersecting.clear()
      document.querySelectorAll('[data-nav-theme="dark"]').forEach((el) => observer!.observe(el))
    }

    setup()
    window.addEventListener("resize", setup)
    return () => {
      window.removeEventListener("resize", setup)
      observer?.disconnect()
    }
  }, [headerRef, pathname])

  // Keeps Safari/WKWebView's own toolbar tinted to match whatever's
  // actually behind it, live as the page crosses light/dark sections —
  // without this the native bar shows a generic mismatched color
  // regardless of how the page's own blur/nav looks (see layout.tsx).
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute("content", isDark ? "#16211c" : "#f7f5ef")
  }, [isDark])

  return isDark
}

// Renders the real wordmark (crossfading between the black/white variants
// as the header's dark/light theme flips) once both files exist in
// public/images, and falls back to the plain text logo until then — same
// conditional-asset pattern as Photo/getImagePath elsewhere in the site.
function Logo({
  logoBlack,
  logoWhite,
  isDark,
  className = "",
}: {
  logoBlack?: string | null
  logoWhite?: string | null
  isDark: boolean
  className?: string
}) {
  if (!logoBlack || !logoWhite) {
    return (
      <span
        className={`font-display text-lg font-bold tracking-tight transition-colors duration-300 md:text-xl ${
          isDark ? "text-chalk" : "text-ink"
        } ${className}`}
      >
        One Padel
      </span>
    )
  }

  return (
    <span className={`relative block h-14 w-56 md:h-16 md:w-64 ${className}`}>
      <Image
        src={logoBlack}
        alt="One Padel"
        fill
        priority
        sizes="256px"
        className={`object-contain object-left transition-opacity duration-300 ${
          isDark ? "opacity-0" : "opacity-100"
        }`}
      />
      <Image
        src={logoWhite}
        alt=""
        aria-hidden="true"
        fill
        priority
        sizes="256px"
        className={`object-contain object-left transition-opacity duration-300 ${
          isDark ? "opacity-100" : "opacity-0"
        }`}
      />
    </span>
  )
}

export default function Nav({
  logoBlack,
  logoWhite,
}: {
  logoBlack?: string | null
  logoWhite?: string | null
}) {
  const headerRef = useRef<HTMLElement>(null)
  const isDark = useIsOverDarkSection(headerRef)

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-50 transition-colors duration-300"
      // Safari 26+ no longer honors the theme-color meta tag — it now
      // tints its own toolbar by sampling the background-color of a
      // fixed/sticky element near the top of the viewport, falling back to
      // <body>'s background if none is set. That's a single flat value that
      // can't itself fade — trying to make it double as the visible gradient
      // (an earlier version of this) always left a visible step wherever
      // that flat value stopped. Kept it, but as faint as possible: just
      // enough for Safari's sample to register, invisible in the page
      // itself. The actual visible gradient lives entirely on the separate
      // overlay div below, which fades to true 0% opacity on its own —
      // nothing here for it to visibly cut off against.
      style={{
        backgroundColor: isDark ? "rgba(22,33,28,0.05)" : "rgba(247,245,239,0.05)",
      }}
    >
      {/* The real, fully-transparent-at-the-end gradient — its own
          absolutely-positioned layer, sized independently of the header's
          own (short, nav-row-height) box, so it has room to taper all the
          way to nothing with no edge for it to cut off against. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-[15] transition-[background-image] duration-300"
        style={{
          height: "160px",
          backgroundImage: isDark
            ? "linear-gradient(to bottom, rgba(22,33,28,0.9) 0%, rgba(22,33,28,0.55) 45%, transparent 100%)"
            : "linear-gradient(to bottom, rgba(247,245,239,0.9) 0%, rgba(247,245,239,0.55) 45%, transparent 100%)",
        }}
      />
      {/* Single backdrop-filter layer, single mask — see progressive-blur.tsx
          for why the two stacked-layer techniques tried before this both
          made things worse on real devices. */}
      <ProgressiveBlur height="160px" />
      {/* min-h (not a fixed h) plus a top padding driven by the safe-area
          env variable below: viewport-fit=cover (layout.tsx) lets the page
          draw under the notch/status bar, so the row needs to grow on
          notch devices rather than clip its content within a fixed
          height. Resolves to 0 padding on devices without a safe area. */}
      <div className="container-px relative z-20 flex min-h-16 items-center justify-between pt-[env(safe-area-inset-top)] md:min-h-20">
        <Link href="/" aria-label="One Padel">
          <Logo logoBlack={logoBlack} logoWhite={logoWhite} isDark={isDark} />
        </Link>

        <DesktopNav isDark={isDark} />

        <div className="flex items-center gap-3">
          <MotionCta
            href={GROUP_URL}
            className="rounded-full bg-ball px-4 py-2 text-sm font-semibold text-ink md:px-5 md:py-2.5"
          >
            Вступить
          </MotionCta>
          <MobileMenu isDark={isDark} logoWhite={logoWhite} />
        </div>
      </div>
    </header>
  )
}

// transitions-dev tabs-sliding, adapted from click-driven tab switching to
// route-driven: the active link is whatever matches the current pathname,
// and the pill re-measures on route change instead of a click handler.
function DesktopNav({ isDark }: { isDark: boolean }) {
  const pathname = usePathname()
  const containerRef = useRef<HTMLDivElement>(null)
  const pillRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const container = containerRef.current
    const pill = pillRef.current
    if (!container || !pill) return

    const activeLink = container.querySelector<HTMLAnchorElement>('[data-active="true"]')
    if (!activeLink) {
      pill.style.width = "0px"
      return
    }
    pill.style.transform = `translateX(${activeLink.offsetLeft}px)`
    pill.style.width = `${activeLink.offsetWidth}px`
  }, [pathname])

  return (
    <nav ref={containerRef} className="t-tabs hidden items-center gap-1 md:flex">
      {/* Bare .t-tabs-pill background (transitions.css) beats a Tailwind bg-*
          utility regardless of source order, so the dark variant has to be
          set inline to actually win. */}
      <span
        ref={pillRef}
        className="t-tabs-pill"
        aria-hidden="true"
        style={{ background: isDark ? "rgba(250, 248, 240, 0.14)" : "var(--chalk-dim)" }}
      />
      {links.map((link) => {
        const active = pathname === link.href
        return (
          <Link
            key={link.href}
            href={link.href}
            data-active={active}
            className={`t-tab rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              isDark
                ? active
                  ? "text-chalk"
                  : "text-chalk/70 hover:text-chalk"
                : active
                  ? "text-ink"
                  : "text-ink-soft hover:text-ink"
            }`}
          >
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}

// Full-screen takeover, not a small corner dropdown — deliberately a bold
// "moment" (dark panel, huge display type) rather than a quiet utility
// menu. Built with Motion (AnimatePresence + staggered variants) since a
// full-screen choreographed sequence is exactly what the motion skill
// calls out as Motion's territory.
//
// Open trigger (header, hamburger) and close trigger (inside the portal,
// X) are two separate buttons on purpose — an earlier version reused one
// button for both and fought a stacking-context bug: the portal renders
// at document.body, outside the header's own stacking context, so no
// z-index on the header's button could reliably win against it (z-index
// never compares across a context boundary). A close button that lives
// *inside* the portal's own tree sidesteps the problem entirely — it's
// already on top of everything else in that same context, no z-index
// war required.
function MobileMenu({ isDark, logoWhite }: { isDark: boolean; logoWhite?: string | null }) {
  const [open, setOpen] = useState(false)
  // Portal-mount guard — document.body doesn't exist during SSR, and this
  // also sidesteps a real CSS gotcha: backdrop-filter/filter/transform on
  // an ancestor makes that ancestor the containing block for any
  // `position: fixed` descendant, so a fixed inset-0 menu rendered
  // *inside* the header would position itself relative to the header's
  // own ~70px box instead of the viewport. Portaling to body escapes
  // that ancestor entirely regardless of what the header does.
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.body.style.overflow = prevOverflow
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [open])

  return (
    <>
      <button
        type="button"
        aria-label="Открыть меню"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 items-center justify-center rounded-full active:scale-90 md:hidden"
      >
        <span className="flex flex-col gap-1">
          <span
            className={`h-[1.5px] w-4 transition-colors duration-300 ${isDark ? "bg-chalk" : "bg-ink"}`}
          />
          <span
            className={`h-[1.5px] w-4 transition-colors duration-300 ${isDark ? "bg-chalk" : "bg-ink"}`}
          />
        </span>
      </button>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                key="mobile-menu"
                className="fixed inset-0 z-[60] flex flex-col bg-ink text-chalk"
                initial={{ clipPath: "inset(0 0 100% 0)" }}
                animate={{ clipPath: "inset(0 0 0% 0)" }}
                exit={{ clipPath: "inset(0 0 100% 0)" }}
                transition={{ duration: 0.5, ease: [0.77, 0, 0.175, 1] }}
              >
                <div className="container-px flex min-h-16 items-center justify-between pt-[env(safe-area-inset-top)] md:min-h-20">
                  <Link href="/" onClick={() => setOpen(false)} aria-label="One Padel">
                    {logoWhite ? (
                      <span className="relative block h-14 w-56 md:h-16 md:w-64">
                        <Image
                          src={logoWhite}
                          alt="One Padel"
                          fill
                          priority
                          sizes="256px"
                          className="object-contain object-left"
                        />
                      </span>
                    ) : (
                      <span className="font-display text-lg font-bold tracking-tight text-chalk">
                        One Padel
                      </span>
                    )}
                  </Link>
                  <button
                    type="button"
                    aria-label="Закрыть меню"
                    onClick={() => setOpen(false)}
                    className="flex h-9 w-9 items-center justify-center rounded-full active:scale-90"
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
                      <path
                        d="M6 6L18 18M18 6L6 18"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </div>

                <motion.nav
                  className="flex flex-1 flex-col justify-center gap-2 px-6"
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  variants={{
                    visible: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
                    hidden: { transition: { staggerChildren: 0.03 } },
                  }}
                >
                  {links.map((link) => (
                    <motion.div
                      key={link.href}
                      variants={{
                        hidden: { opacity: 0, y: 24, filter: "blur(6px)" },
                        visible: {
                          opacity: 1,
                          y: 0,
                          filter: "blur(0px)",
                          transition: { duration: 0.5, ease: [0.23, 1, 0.32, 1] },
                        },
                      }}
                    >
                      <Link
                        href={link.href}
                        className="font-display block py-2 text-5xl font-extrabold tracking-tight text-chalk transition-colors hover:text-ball sm:text-6xl"
                      >
                        {link.label}
                      </Link>
                    </motion.div>
                  ))}
                </motion.nav>

                <motion.div
                  className="container-px flex items-center justify-between border-t border-chalk/15 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, transition: { delay: 0.3, duration: 0.3 } }}
                  exit={{ opacity: 0, transition: { duration: 0.15 } }}
                >
                  <span className="text-sm text-chalk/50">Играем вместе — каждую неделю</span>
                  <MotionCta
                    href={GROUP_URL}
                    className="rounded-full bg-ball px-5 py-2.5 text-sm font-bold text-ink"
                  >
                    Вступить →
                  </MotionCta>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  )
}
