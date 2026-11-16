"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import type { MouseEvent } from "react"

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
  const [view, setView] = useState<string | null>(null)

  useEffect(() => {
    const syncView = () => {
      setView(new URLSearchParams(window.location.search).get("view") || "daily")
    }
    syncView()
    window.addEventListener("popstate", syncView)
    window.addEventListener("takarabako-view-change", syncView)
    return () => {
      window.removeEventListener("popstate", syncView)
      window.removeEventListener("takarabako-view-change", syncView)
    }
  }, [pathname])

  function handleMenuClick(event: MouseEvent<HTMLAnchorElement>, menuView: string, href: string) {
    // ルート内のメニューはNext.jsのページ遷移を使わず、
    // 同じ画面のviewだけを即時切り替える。これで連続タップ時の
    // ルート再評価や遷移待ちを避け、v50の画面構成を維持する。
    if (pathname === "/" && href.startsWith("/?view=")) {
      event.preventDefault()
      const url = new URL(window.location.href)
      url.searchParams.set("view", menuView)
      window.history.pushState({}, "", url.toString())
      setView(menuView)
      window.dispatchEvent(new CustomEvent("takarabako-view-change", { detail: menuView }))
    }
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
              prefetch={false}
              aria-label={menu.label}
              title={menu.label}
              onClick={(event) => handleMenuClick(event, menu.view, menu.href)}
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
