import Link from "next/link"

import DigitGroup from "@/app/_components/digit-group"
import { MotionReveal, MotionStagger, MotionStaggerItem } from "@/app/_components/motion-reveal"

const tournaments = [
  {
    level: "1-2",
    tone: "bg-court text-chalk",
    body: "Для тех, кто только осваивает корт или играет меньше года.",
  },
  {
    level: "2-3",
    tone: "bg-ink text-chalk",
    body: "Для уверенных игроков — быстрее темп, плотнее розыгрыши.",
  },
]

export default function TournamentsPreview() {
  return (
    <section className="bg-chalk-dim py-20 md:py-28">
      <div className="container-px">
        <MotionReveal className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="eyebrow">РЕГУЛЯРНЫЕ ТУРНИРЫ ПО УРОВНЯМ</p>
            <h2 className="font-display mt-3 text-3xl font-bold tracking-tight text-ink md:text-4xl">
              Играем в основном Американо
            </h2>
          </div>
          <Link
            href="/tournaments"
            className="text-sm font-semibold underline underline-offset-4"
            style={{ color: "var(--ball-deep)" }}
          >
            Все турниры →
          </Link>
        </MotionReveal>

        <MotionStagger className="mt-10 grid gap-6 md:grid-cols-2">
          {tournaments.map((t) => (
            <MotionStaggerItem key={t.level} className={`rounded-2xl p-8 ${t.tone}`}>
              <p className="eyebrow" style={{ color: "currentColor", opacity: 0.7 }}>
                Уровень
              </p>
              <p className="font-display mt-1 text-5xl font-extrabold">
                <DigitGroup value={t.level} />
              </p>
              <p className="mt-4 text-sm opacity-85">{t.body}</p>
            </MotionStaggerItem>
          ))}
        </MotionStagger>
      </div>
    </section>
  )
}
