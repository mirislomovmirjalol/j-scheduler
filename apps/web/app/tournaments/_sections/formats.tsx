import DigitGroup from "@/app/_components/digit-group"
import { MotionReveal, MotionStagger, MotionStaggerItem } from "@/app/_components/motion-reveal"

const tournaments = [
  {
    level: "1-2",
    tone: "bg-court text-chalk",
    body: "Для тех, кто только осваивает корт или играет меньше года. Темп спокойнее, а состав всегда подбирается под этот уровень.",
  },
  {
    level: "2-3",
    tone: "bg-ink text-chalk",
    body: "Для уверенных игроков — быстрее темп, плотнее розыгрыши. Состав подбирается так, чтобы игра оставалась близкой по счёту.",
  },
]

export default function Formats() {
  return (
    <section className="container-px py-14 md:py-20">
      <MotionReveal>
        <p className="eyebrow">РЕГУЛЯРНЫЕ ТУРНИРЫ</p>
        <h2 className="font-display mt-3 max-w-md text-3xl font-bold tracking-tight text-ink md:text-4xl">
          Турниры по уровням
        </h2>
        <p className="mt-3 max-w-md text-sm text-ink-soft">
          Сейчас регулярно собираем эти два — состав турниров может меняться.
        </p>
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
    </section>
  )
}
