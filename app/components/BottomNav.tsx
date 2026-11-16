"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"

const menus = [
  { href: "/?view=graphs", label: "グラフ", icon: "/skinicon/graph.svg" },
  { href: "/?view=calendar", label: "カレンダー", icon: "/skinicon/calendar.svg" },
  { href: "/", label: "今日の記録", icon: "/icons/daily-add.svg" },
  { href: "/?view=treasure-list", label: "宝物一覧", icon: "/icons/diamond.svg" },
  { href: "/cosmetics", label: "キラキラ", icon: "/skinicon/cosmetics.svg" },
]

export default function BottomNav() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const view = searchParams.get("view") || "daily"

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-[#E8E8E8] bg-white px-2 pb-[max(env(safe-area-inset-bottom),6px)] pt-1.5">
      <div className="mx-auto grid max-w-2xl grid-cols-5 gap-1">
        {menus.map((menu) => {
          const active =
            menu.label === "グラフ"
              ? pathname === "/" && view === "graphs"
              : menu.label === "カレンダー"
                ? pathname === "/" && view === "calendar"
                : menu.label === "今日の記録"
                  ? pathname === "/" && (view === "daily" || !searchParams.get("view"))
                  : menu.label === "宝物一覧"
                    ? pathname === "/" && (view === "treasure-list" || view === "treasures")
                    : pathname.startsWith("/cosmetics") || pathname.startsWith("/treatment")

          return (
            <Link
              key={menu.label}
              href={menu.href}
              aria-label={menu.label}
              title={menu.label}
              className="flex min-w-0 items-center justify-center rounded-xl p-2.5"
            >
              <img
                src={menu.icon}
                alt=""
                className={`h-6 w-6 object-contain ${active ? "opacity-100" : "opacity-40"}`}
              />
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
