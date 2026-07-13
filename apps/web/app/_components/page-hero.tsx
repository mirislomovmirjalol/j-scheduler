import { MotionReveal } from "@/app/_components/motion-reveal"
import TextReveal from "@/app/_components/text-reveal"

export default function PageHero({
  eyebrow,
  lines,
  intro,
}: {
  eyebrow: string
  lines: string[]
  intro: string
}) {
  return (
    <section className="container-px pt-14 pb-10 md:pt-20 md:pb-14">
      <p className="eyebrow">{eyebrow}</p>
      <TextReveal
        as="h1"
        className="font-display mt-3 text-4xl font-extrabold tracking-tight text-ink sm:text-5xl md:text-6xl"
        lines={lines}
      />
      <MotionReveal delay={0.2}>
        <p className="mt-5 max-w-lg text-base text-ink-soft md:text-lg">{intro}</p>
      </MotionReveal>
    </section>
  )
}
