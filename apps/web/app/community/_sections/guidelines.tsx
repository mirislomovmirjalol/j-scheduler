import { MotionReveal, MotionStagger, MotionStaggerItem } from "@/app/_components/motion-reveal"

const rules = [
  {
    title: "Приходи вовремя",
    body: "Игра начинается с полным составом — опоздание на 10-15 минут сокращает игру всем, кто уже на корте.",
  },
  {
    title: "Отменяйся заранее",
    body: "Не можешь прийти — отмени участие в боте как можно раньше. Место сразу уходит следующему в листе ожидания.",
  },
  {
    title: "Уважай уровень партнёров",
    body: "Уровень в клубе не строгий рейтинг, а ориентир для организатора. Если чувствуешь, что состав тебе не по силам — так и скажи, тебя пересоберут в другой.",
  },
  {
    title: "Гостей приводи заранее",
    body: "Хочешь привести друга — предупреди организатора до игры, а не на корте. Гостю тоже нужно место в составе.",
  },
]

export default function Guidelines() {
  return (
    <section data-nav-theme="dark" className="bg-ink py-16 text-chalk md:py-24">
      <div className="container-px">
        <MotionReveal>
          <p className="eyebrow" style={{ color: "var(--ball)" }}>
            ПРАВИЛА КЛУБА
          </p>
          <h2 className="font-display mt-3 max-w-md text-3xl font-bold tracking-tight md:text-4xl">
            Немного правил, чтобы игра была честной
          </h2>
        </MotionReveal>

        <MotionStagger className="mt-10 grid gap-8 border-t border-chalk/15 pt-8 md:grid-cols-2 md:gap-x-12 md:gap-y-10">
          {rules.map((rule) => (
            <MotionStaggerItem key={rule.title}>
              <p className="font-display text-lg font-bold">{rule.title}</p>
              <p className="mt-2 text-sm text-chalk/65">{rule.body}</p>
            </MotionStaggerItem>
          ))}
        </MotionStagger>
      </div>
    </section>
  )
}
