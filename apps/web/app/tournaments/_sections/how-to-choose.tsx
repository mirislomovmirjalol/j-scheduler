import { MotionStagger, MotionStaggerItem } from "@/app/_components/motion-reveal"

export default function FormatNote() {
  return (
    <section className="bg-chalk-dim py-16 md:py-24">
      <MotionStagger className="container-px grid gap-10 md:grid-cols-2 md:gap-16">
        <MotionStaggerItem>
          <p className="eyebrow">ФОРМАТ ИГРЫ</p>
          <h2 className="font-display mt-3 text-3xl font-bold tracking-tight text-ink md:text-4xl">
            В основном — Американо
          </h2>
          <p className="mt-4 text-ink-soft">
            Играем в основном Американо с личным зачётом — партнёры меняются
            каждый раунд, счёт свой. В последнее время всё чаще собираем и
            парный зачёт (Американо Дуо), когда состав позволяет.
          </p>
          <p className="mt-3 text-ink-soft">
            Иногда пробуем Мексикано и King — не на постоянной основе, скорее
            для разнообразия, когда группа хочет сменить формат на вечер.
          </p>
        </MotionStaggerItem>

        <MotionStaggerItem>
          <p className="eyebrow">СЧЁТ ИГРЫ</p>
          <h2 className="font-display mt-3 text-3xl font-bold tracking-tight text-ink md:text-4xl">
            Ведём в Lunda
          </h2>
          <p className="mt-4 text-ink-soft">
            Счёт каждой игры фиксируется в Lunda — ссылка на игру есть у
            каждого турнира, так что результат всегда можно посмотреть после
            матча.
          </p>
        </MotionStaggerItem>
      </MotionStagger>
    </section>
  )
}
