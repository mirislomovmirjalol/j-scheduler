import { MotionStagger, MotionStaggerItem } from "@/app/_components/motion-reveal"
import Photo from "@/app/_components/photo"
import { getImagePath } from "@/app/_lib/media"

export default function Mission() {
  return (
    <section className="container-px py-14 md:py-20">
      <MotionStagger className="grid gap-10 md:grid-cols-2 md:items-center md:gap-16">
        <MotionStaggerItem>
          <p className="eyebrow">ЗАЧЕМ МЫ ЭТО ДЕЛАЕМ</p>
          <h2 className="font-display mt-3 text-3xl font-bold tracking-tight text-ink md:text-4xl">
            Клуб начался с одного чата
          </h2>
          <p className="mt-4 text-ink-soft">
            One Padel — это не сеть кортов и не приложение для бронирования.
            Это группа людей, которым хотелось стабильно играть по выходным,
            не собирая состав в личных сообщениях каждую неделю заново.
          </p>
          <p className="mt-3 text-ink-soft">
            Мы выросли из одного Telegram-чата в клуб с расписанием и двумя
            регулярными турнирами по уровням — но принцип остался тем же:
            сначала люди, а не приложение.
          </p>
        </MotionStaggerItem>

        <MotionStaggerItem>
          <Photo
            src={getImagePath("about")}
            alt="One Padel"
            label="Фото клуба"
            tone="court"
            className="aspect-4/3 w-full"
          />
        </MotionStaggerItem>
      </MotionStagger>
    </section>
  )
}
