"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const menus = [
  { href: "/?view=graphs", label: "グラフ", icon: "/skinicon/graph.svg" },
  { href: "/?view=calendar", label: "カレンダー", icon: "/skinicon/calendar.svg" },
  { href: "/", label: "今日の記録", icon: "/icons/daily-add.svg" },
  { href: "/?view=treasure-list", label: "宝物一覧", icon: "/icons/diamond.svg" },
  { href: "/cosmetics", label: "キラキラ", icon: "/skinicon/cosmetics.svg" },
]

export default function BottomNav() {
  const pathname = usePathname()
  return <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white"><div className="mx-auto flex h-[72px] max-w-xl items-center justify-around">{menus.map(menu=>{const active=menu.label==="グラフ"?pathname==="/":menu.href==="/"?pathname==="/":menu.label==="キラキラ"?(pathname.startsWith("/cosmetics")||pathname.startsWith("/treatment")):pathname.startsWith(menu.href.split("?")[0]);return <Link key={menu.label} href={menu.href} aria-label={menu.label} className="flex h-full flex-1 items-center justify-center"><span className={`flex h-7 w-7 items-center justify-center ${active?"opacity-100":"opacity-35"}`}><img src={menu.icon} alt="" className="h-full w-full object-contain" /></span></Link>})}</div></nav>
}
