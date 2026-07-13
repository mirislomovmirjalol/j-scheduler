import Image from "next/image"

import { MotionReveal } from "@/app/_components/motion-reveal"
import MotionCta from "@/app/_components/motion-cta"
import { GROUP_URL } from "@/app/_lib/links"
import { getImagePath } from "@/app/_lib/media"

export default function CtaBand() {
  const bgImage = getImagePath("cta")

  return (
    <section
      data-nav-theme="dark"
      className="relative overflow-hidden bg-ink py-20 text-chalk md:py-24"
    >
      {bgImage && (
        <>
          <Image
            src={bgImage}
            alt=""
            fill
            sizes="100vw"
            className="object-cover opacity-40"
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-ink/70" aria-hidden="true" />
        </>
      )}

      <svg
        className="pointer-events-none absolute inset-0 h-full w-full text-court opacity-[0.15]"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <circle cx="10%" cy="30%" r="140" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="90%" cy="70%" r="180" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>

      <MotionReveal className="container-px relative text-center">
        <h2 className="font-display mx-auto max-w-xl text-3xl font-bold tracking-tight md:text-5xl">
          Готовы сыграть?
        </h2>
        <p className="mx-auto mt-4 max-w-md text-chalk/70">
          Открой группу, посмотри игры на неделю и записывайся в один тап.
        </p>
        <MotionCta
          href={GROUP_URL}
          className="mt-8 inline-block rounded-full bg-ball px-8 py-4 text-sm font-bold text-ink"
        >
          Вступить в клуб →
        </MotionCta>
      </MotionReveal>
    </section>
  )
}
