"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"

const menus = [
  { href: "/?view=graphs", label: "グラフ", icon: "/skinicon/graph.svg", view: "graphs" },
  { href: "/?view=calendar", label: "カレンダー", icon: "/skinicon/calendar.svg", view: "calendar" },
  { href: "/", label: "今日の記録", icon: "/icons/daily-add.svg", view: "daily" },
  { href: "/?view=treasure-list", label: "宝物一覧", icon: "/icons/diamond.svg", view: "treasure-list" },
  { href: "/cosmetics", label: "キラキラ", icon: "/skinicon/cosmetics.svg", view: "cosmetics" },
]

function getViewFromLocation() {
  if (typeof window === "undefined") return "daily"
  return new URLSearchParams(window.location.search).get("view") || "daily"
}

export default function BottomNav() {
  const pathname = usePathname()
  // Hydration時はサーバーとクライアントで同じ初期値にする。
  // URLのviewはマウント後に同期することでhydration mismatchを防ぐ。
  const [view, setView] = useState("daily")

  useEffect(() => {
    const syncView = () => setView(getViewFromLocation())
    syncView()
    window.addEventListener("popstate", syncView)
    return () => window.removeEventListener("popstate", syncView)
  }, [pathname])

  function handleMenuClick(menuView: string) {
    setView(menuView)
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-[#E8E8E8] bg-white px-2 pb-[max(env(safe-area-inset-bottom),6px)] pt-1.5">
      <div className="mx-auto grid max-w-2xl grid-cols-5 gap-1">
        {menus.map((menu) => {
          const active =
            menu.label === "キラキラ"
              ? pathname.startsWith("/cosmetics") || pathname.startsWith("/treatment")
              : pathname === "/" && view === menu.view

          return (
            <Link
              key={menu.label}
              href={menu.href}
              aria-label={menu.label}
              title={menu.label}
              onClick={() => handleMenuClick(menu.view)}
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
