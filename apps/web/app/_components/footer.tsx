import Image from "next/image"
import Link from "next/link"

import { GROUP_URL } from "@/app/_lib/links"
import { getImagePath } from "@/app/_lib/media"

const columns = [
  {
    title: "Клуб",
    links: [
      { href: "/about", label: "О клубе" },
      { href: "/community", label: "Сообщество" },
    ],
  },
  {
    title: "Игра",
    links: [
      { href: "/tournaments", label: "Турниры" },
      { href: GROUP_URL, label: "Открыть группу" },
    ],
  },
]

export default function Footer() {
  const logoWhite = getImagePath("logo-white")

  return (
    <footer data-nav-theme="dark" className="border-t border-chalk/10 bg-ink text-chalk">
      <div className="container-px flex flex-col gap-10 py-14 md:flex-row md:justify-between md:py-16">
        <div className="max-w-xs">
          {logoWhite ? (
            <span className="relative block h-14 w-56">
              <Image
                src={logoWhite}
                alt="One Padel"
                fill
                sizes="224px"
                className="object-contain object-left"
              />
            </span>
          ) : (
            <p className="font-display text-xl font-bold">One Padel</p>
          )}
          <p className="mt-3 text-sm text-chalk/60">
            Сообщество игроков в паделл. Не корт — команда.
          </p>
        </div>

        <div className="flex flex-wrap gap-12">
          {columns.map((col) => (
            <div key={col.title}>
              <p className="eyebrow" style={{ color: "var(--ball)" }}>
                {col.title}
              </p>
              <ul className="mt-3 flex flex-col gap-2">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-chalk/70 transition-colors hover:text-chalk"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="container-px flex flex-col gap-2 border-t border-chalk/10 py-6 text-xs text-chalk/40 md:flex-row md:items-center md:justify-between">
        <p>© {new Date().getFullYear()} One Padel</p>
        <p>Играем вместе — каждую неделю</p>
      </div>
    </footer>
  )
}
