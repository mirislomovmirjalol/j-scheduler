import Link from "next/link"

import AvatarRow from "@/app/_components/avatar-row"
import { MotionStagger, MotionStaggerItem } from "@/app/_components/motion-reveal"
import Photo from "@/app/_components/photo"
import { getImagePath } from "@/app/_lib/media"

const roles = ["Организатор", "Игрок", "Игрок", "Игрок", "Игрок", "Гость"]

export default function CommunityPreview() {
  return (
    <section className="container-px py-20 md:py-28">
      <MotionStagger className="grid gap-10 md:grid-cols-2 md:items-center md:gap-16">
        <MotionStaggerItem>
          <Photo
            src={getImagePath("community")}
            alt="Игроки One Padel на корте"
            label="Фото сообщества"
            tone="clay"
            className="aspect-4/3 w-full"
          />
        </MotionStaggerItem>

        <MotionStaggerItem>
          <p className="eyebrow">СООБЩЕСТВО</p>
          <h2 className="font-display mt-3 text-3xl font-bold tracking-tight text-ink md:text-4xl">
            Собираем состав вручную
          </h2>
          <p className="mt-4 text-ink-soft">
            За каждым составом стоит организатор, который знает игроков.
            Не всегда идеально (иногда с уровнем ошибаемся), и если хочешь
            попробовать турнир уровнем выше — присоединяйся, никто не будет
            против.
          </p>

          <AvatarRow
            className="mt-8 gap-1"
            items={roles.map((role, i) => (
              <div
                key={i}
                className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-chalk text-[10px] font-semibold text-chalk"
                style={{
                  backgroundColor: i === 0 ? "var(--clay)" : i === 1 ? "var(--court)" : "var(--court-bright)",
                }}
                title={role}
              >
                {role.slice(0, 2).toUpperCase()}
              </div>
            ))}
          />

          <Link
            href="/community"
            className="mt-6 inline-block text-sm font-semibold underline underline-offset-4"
            style={{ color: "var(--ball-deep)" }}
          >
            Как устроено сообщество →
          </Link>
        </MotionStaggerItem>
      </MotionStagger>
    </section>
  )
}
