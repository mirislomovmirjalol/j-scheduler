"use client"

import type { FunctionReturnType } from "convex/server"
import Image from "next/image"
import { useRef } from "react"
import { useScroll, useTransform, motion } from "motion/react"
import { useQuery } from "convex/react"

import { api } from "@J-schedule/backend/convex/_generated/api"

import DigitGroup from "@/app/_components/digit-group"
import MotionCta from "@/app/_components/motion-cta"
import TextReveal from "@/app/_components/text-reveal"
import { formatTashkentDateTime } from "@/app/_lib/format"
import { GROUP_URL } from "@/app/_lib/links"

type NextMatch = FunctionReturnType<typeof api.matches.listPublicUpcoming>[number]

export default function Hero({ bgImage }: { bgImage?: string | null }) {
  const sectionRef = useRef<HTMLElement>(null)
  // Client-side reactive query — page stays static/prerenderable, and the
  // roster count genuinely updates live if someone joins while a visitor
  // has the page open, instead of a once-per-request snapshot.
  const upcoming = useQuery(api.matches.listPublicUpcoming)
  const nextMatch = upcoming === undefined ? undefined : (upcoming[0] ?? null)
  // Scroll-linked parallax on the court-line backdrop — genuinely needs
  // Motion's scroll tracking (CSS scroll-driven animations still have
  // patchy support); everything else on this card stays CSS/transitions-dev.
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  })
  const bgY = useTransform(scrollYProgress, [0, 1], [0, 120])

  return (
    // isolate: without it, `relative` alone doesn't create a stacking
    // context (no z-index set), so children with negative z-index escape
    // to whatever ancestor context does establish one and can end up
    // painted behind an unrelated opaque background instead of just
    // behind this section's own content.
    // data-nav-theme="dark": lets the header's own dark/light observer
    // (see nav.tsx) pick this section up the same way it already does for
    // CtaBand/Guidelines/Footer, so the nav switches to light text while
    // it's sitting over the hero too.
    <section ref={sectionRef} data-nav-theme="dark" className="relative isolate bg-ink">
      {bgImage && (
        // -top-16/-top-20 matches the header's own h-16/h-20: the header is
        // `sticky`, which occupies normal flow space rather than overlaying
        // content, so without this the photo's own box starts right below
        // the header and a strip of the page's plain background shows
        // through above it. Bleeding the background layer up by the
        // header's height (overflow-hidden lives here, not on the section,
        // so the bleed isn't clipped) fills that gap with the photo
        // instead — it reads as one continuous image from y=0.
        <div className="absolute inset-x-0 -top-16 bottom-0 -z-20 overflow-hidden md:-top-20">
          <Image
            src={bgImage}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
            aria-hidden="true"
          />
          {/* Protects the text column on the left (opaque ink, fading out
              by ~60% width) rather than washing the whole photo out. */}
          <div
            className="absolute inset-0 bg-gradient-to-r from-ink from-0% via-ink/65 via-30% to-transparent to-60%"
            aria-hidden="true"
          />
          <div
            className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-ink to-transparent md:h-32"
            aria-hidden="true"
          />
          <div
            className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-ink to-transparent md:h-40"
            aria-hidden="true"
          />
        </div>
      )}
      <motion.svg
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[640px] w-full text-chalk opacity-[0.06]"
        viewBox="0 0 1200 640"
        preserveAspectRatio="xMidYMin slice"
        aria-hidden="true"
        style={{ y: bgY }}
      >
        <rect x="40" y="40" width="1120" height="560" fill="none" stroke="currentColor" strokeWidth="2" />
        <line x1="40" y1="320" x2="1160" y2="320" stroke="currentColor" strokeWidth="2" />
        <line x1="600" y1="40" x2="600" y2="600" stroke="currentColor" strokeWidth="2" />
        <line x1="40" y1="180" x2="1160" y2="180" stroke="currentColor" strokeWidth="1" />
        <line x1="40" y1="460" x2="1160" y2="460" stroke="currentColor" strokeWidth="1" />
      </motion.svg>

      <div className="container-px grid gap-12 pt-16 pb-20 md:grid-cols-[1.1fr_0.9fr] md:items-center md:pt-24 md:pb-28">
        <div>
          <p className="eyebrow mb-5" style={{ color: "var(--ball)" }}>
            ONE PADEL · СООБЩЕСТВО ИГРОКОВ
          </p>

          <TextReveal
            as="h1"
            className="font-display text-[2.75rem] leading-[0.98] font-extrabold tracking-tight text-chalk sm:text-6xl md:text-[4.5rem]"
            lines={["Играем.", "Растём.", "Вместе."]}
          />

          <p className="mt-6 max-w-md text-base text-chalk/70 md:text-lg">
            One Padel — не корт, а команда. Два турнира каждую неделю по
            уровням 1-2 и 2-3, составы и напоминания прямо в Telegram, счёт
            каждой игры — в Lunda.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <MotionCta
              href={GROUP_URL}
              className="rounded-full bg-ball px-6 py-3.5 text-sm font-semibold text-ink"
            >
              Вступить в клуб →
            </MotionCta>
            <MotionCta
              href="/tournaments"
              external={false}
              className="rounded-full border border-chalk/25 px-6 py-3.5 text-sm font-semibold text-chalk backdrop-blur"
            >
              Наши турниры
            </MotionCta>
          </div>
        </div>

        <MatchCard match={nextMatch} />
      </div>
    </section>
  )
}

// Signature element: the real shape of a match card (see
// packages/backend/convex/lib/board.ts + the admin dashboard), fed by
// matches.listPublicUpcoming — grounds the marketing site in the actual
// product instead of stock sports imagery. No player names (public,
// unauthenticated query — see the backend comment on that query).
function MatchCard({ match }: { match: NextMatch | null | undefined }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, rotate: 0, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, rotate: 1, scale: 1 }}
      transition={{ type: "spring", duration: 0.7, bounce: 0.25, delay: 0.15 }}
      className="relative mx-auto w-full max-w-sm rounded-3xl border border-white/40 bg-white/70 p-6 shadow-[0_30px_60px_-20px_rgba(20,40,35,0.35)] backdrop-blur-xl"
    >
      {match === undefined ? (
        <MatchCardSkeleton />
      ) : match ? (
        <>
          <p className="eyebrow" style={{ color: "var(--ink-soft)" }}>
            ближайшая игра
          </p>
          <p className="font-display mt-2 text-xl font-bold text-ink">
            {formatTashkentDateTime(match.startsAt, "long")}
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            {match.court} · {match.format} · Уровень {match.level}
          </p>

          <div className="mt-5 flex items-center justify-between rounded-2xl bg-chalk-dim px-4 py-3">
            <span className="text-sm font-medium text-ink-soft">Состав</span>
            <span className="font-mono text-lg font-semibold text-court">
              <DigitGroup value={`${match.rosterCount}/${match.maxMembers}`} />
            </span>
          </div>

          <div className="mt-4 flex -space-x-2">
            {Array.from({ length: Math.min(match.rosterCount, 6) }).map((_, i) => (
              <span
                key={i}
                className="h-8 w-8 rounded-full border-2 border-white"
                style={{ backgroundColor: i % 2 === 0 ? "var(--court)" : "var(--clay)" }}
              />
            ))}
            {match.rosterCount > 6 && (
              <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-dashed border-ink/20 text-xs text-ink-soft">
                +{match.rosterCount - 6}
              </span>
            )}
          </div>

          {match.rosterCount < match.maxMembers ? (
            <div className="mt-5 rounded-full bg-ball/25 px-4 py-2 text-center text-xs font-semibold text-ink">
              Осталось {match.maxMembers - match.rosterCount}{" "}
              {match.maxMembers - match.rosterCount === 1 ? "место" : "места"}
            </div>
          ) : (
            <div className="mt-5 rounded-full bg-clay-soft px-4 py-2 text-center text-xs font-semibold text-clay">
              Мест нет — лист ожидания открыт
            </div>
          )}
        </>
      ) : (
        <>
          <p className="eyebrow" style={{ color: "var(--ink-soft)" }}>
            расписание
          </p>
          <p className="font-display mt-2 text-xl font-bold text-ink">
            Скоро новая игра
          </p>
          <p className="mt-2 text-sm text-ink-soft">
            Сейчас открытых игр нет — новые турниры публикуются в группе
            заранее.
          </p>
        </>
      )}
    </motion.div>
  )
}

function MatchCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-3 w-24 rounded-full bg-ink/10" />
      <div className="mt-3 h-6 w-40 rounded-full bg-ink/10" />
      <div className="mt-2 h-4 w-48 rounded-full bg-ink/10" />
      <div className="mt-5 h-11 rounded-2xl bg-chalk-dim" />
      <div className="mt-4 flex -space-x-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <span key={i} className="h-8 w-8 rounded-full border-2 border-white bg-ink/10" />
        ))}
      </div>
      <div className="mt-5 h-8 rounded-full bg-ink/10" />
    </div>
  )
}
