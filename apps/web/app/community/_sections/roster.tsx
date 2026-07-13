import DigitGroup from "@/app/_components/digit-group"
import { MotionStagger, MotionStaggerItem } from "@/app/_components/motion-reveal"

export default function Roster() {
  return (
    <section className="container-px py-14 md:py-20">
      <MotionStagger className="grid gap-10 md:grid-cols-2 md:items-center md:gap-16">
        <MotionStaggerItem>
          <p className="eyebrow">СОСТАВ И ЛИСТ ОЖИДАНИЯ</p>
          <h2 className="font-display mt-3 text-3xl font-bold tracking-tight text-ink md:text-4xl">
            Место освободилось — узнаешь первым
          </h2>
          <p className="mt-4 text-ink-soft">
            Когда игра заполняется, следующие записи уходят в лист ожидания —
            не пропадают и не теряются. Если кто-то из состава отменяется,
            организатор видит освободившееся место сразу и сообщает следующему
            в очереди.
          </p>
          <p className="mt-3 text-ink-soft">
            Можешь отменить участие сам — за это никто не «банит», но чем
            раньше отменишь, тем больше шанс, что место успеет занять кто-то
            из листа ожидания.
          </p>
        </MotionStaggerItem>

        <MotionStaggerItem className="rounded-3xl border border-ink/10 bg-white p-6">
          <p className="eyebrow" style={{ color: "var(--ink-soft)" }}>
            пример состава
          </p>
          <div className="mt-4 flex items-center justify-between border-b border-ink/10 pb-4">
            <span className="text-sm font-medium text-ink">Состав</span>
            <span className="font-mono text-lg font-semibold text-court">
              <DigitGroup value="8/8" />
            </span>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm font-medium text-ink">Лист ожидания</span>
            <span className="font-mono text-lg font-semibold text-clay">
              <DigitGroup value="3" />
            </span>
          </div>
        </MotionStaggerItem>
      </MotionStagger>
    </section>
  )
}
