import { MotionReveal, MotionStagger, MotionStaggerItem } from "@/app/_components/motion-reveal"

const values = [
  {
    title: "Клуб, а не приложение",
    body: "За составами и уровнем стоят организаторы, которые знают игроков лично — это то, чем клуб отличается от сервиса бронирования.",
  },
  {
    title: "Любой уровень — не проблема",
    body: "Новичок и игрок с опытом найдут свой формат и свой состав, а не будут ждать «пока подтянутся».",
  },
  {
    title: "Всё в одном чате",
    body: "Расписание, запись, напоминания и общение живут там же, где клуб общается каждый день — в Telegram.",
  },
]

export default function Values() {
  return (
    <section className="bg-chalk-dim py-16 md:py-24">
      <div className="container-px">
        <MotionReveal>
          <p className="eyebrow">НА ЧЁМ МЫ СТОИМ</p>
        </MotionReveal>
        <MotionStagger className="mt-8 grid gap-8 md:grid-cols-3">
          {values.map((value) => (
            <MotionStaggerItem key={value.title}>
              <p className="font-display text-xl font-bold text-ink">{value.title}</p>
              <p className="mt-2 text-sm text-ink-soft">{value.body}</p>
            </MotionStaggerItem>
          ))}
        </MotionStagger>
      </div>
    </section>
  )
}
