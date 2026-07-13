"use client"

import { motion } from "motion/react"

import { MotionReveal } from "@/app/_components/motion-reveal"

const steps = [
  {
    n: "01",
    title: "Заходишь в Telegram",
    body: "Открываешь бота или группу клуба — весь список игр на неделю виден сразу, без регистраций и форм.",
  },
  {
    n: "02",
    title: "Записываешься на игру",
    body: "Один тап — и ты в составе. Если мест нет, попадаешь в лист ожидания и узнаёшь первым, когда место освободится.",
  },
  {
    n: "03",
    title: "Получаешь напоминания",
    body: "За 3 часа и за 30 минут до игры — если подписан на напоминания. Не хочешь — не подписывайся, доска работает и без этого.",
  },
]

const listVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.23, 1, 0.32, 1] as const } },
}

export default function HowItWorks() {
  return (
    <section className="container-px py-20 md:py-28">
      <MotionReveal className="max-w-lg">
        <p className="eyebrow">КАК ЭТО РАБОТАЕТ</p>
        <h2 className="font-display mt-3 text-3xl font-bold tracking-tight text-ink md:text-4xl">
          Не корт. Команда.
        </h2>
        <p className="mt-4 text-ink-soft">
          One Padel не сдаёт корты в аренду — мы организуем товарищеские игры.
          Составы, уровни и напоминания держит один живой Telegram-чат, а не
          приложение, в которое нужно отдельно заходить.
        </p>
      </MotionReveal>

      <motion.ol
        className="mt-12 grid gap-8 md:grid-cols-3 md:gap-6"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={listVariants}
      >
        {steps.map((step) => (
          <motion.li
            key={step.n}
            variants={itemVariants}
            className="rounded-2xl border border-ink/10 bg-white p-6"
          >
            <span className="font-mono text-sm font-semibold text-clay">{step.n}</span>
            <p className="font-display mt-3 text-lg font-bold text-ink">{step.title}</p>
            <p className="mt-2 text-sm text-ink-soft">{step.body}</p>
          </motion.li>
        ))}
      </motion.ol>
    </section>
  )
}
