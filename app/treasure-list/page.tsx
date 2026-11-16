"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import BottomNav from "../components/BottomNav"

type Comment = { id: string; text: string; createdAt: string }
type Treasure = { id: string; date: string; url: string; title: string; note: string; comments?: Comment[]; thumbnail?: string; siteName?: string; category?: string; createdAt: string }
const TREASURES_KEY = "daily-treasure-items-v1"
const CATEGORIES_KEY = "daily-treasure-treasure-categories-v1"
const DEFAULT_CATEGORIES = ["動画", "漫画", "Webページ", "商品", "食べ物", "旅行", "写真", "メモ", "その他"]

export default function TreasureListPage() {
  const [treasures, setTreasures] = useState<Treasure[]>([])
  const [category, setCategory] = useState("すべて")
  const [openMemo, setOpenMemo] = useState<string | null>(null)
  const [memoDraft, setMemoDraft] = useState("")
  function load() {
    try { const raw = localStorage.getItem(TREASURES_KEY); const parsed = raw ? JSON.parse(raw) : []; setTreasures(Array.isArray(parsed) ? parsed : []) } catch { setTreasures([]) }
  }
  useEffect(() => { load() }, [])
  const categories = useMemo(() => {
    try { const raw = localStorage.getItem(CATEGORIES_KEY); const parsed = raw ? JSON.parse(raw) : DEFAULT_CATEGORIES; return ["すべて", ...(Array.isArray(parsed) && parsed.length ? parsed : DEFAULT_CATEGORIES)] } catch { return ["すべて", ...DEFAULT_CATEGORIES] }
  }, [treasures])
  const filtered = category === "すべて" ? treasures : treasures.filter((item) => (item.category || "その他") === category)
  function deleteTreasure(id: string) { if (!window.confirm("この宝物を削除しますか？")) return; const next = treasures.filter((item) => item.id !== id); localStorage.setItem(TREASURES_KEY, JSON.stringify(next)); setTreasures(next) }
  function addComment(id: string) { if (!memoDraft.trim()) return; const next = treasures.map((item) => item.id === id ? { ...item, comments: [...(item.comments || []), { id: `${Date.now()}-${Math.random()}`, text: memoDraft.trim(), createdAt: new Date().toISOString() }] } : item); localStorage.setItem(TREASURES_KEY, JSON.stringify(next)); setTreasures(next); setMemoDraft("") }
  return (
    <main className="min-h-screen bg-[#FFFAF6] pb-28">
      <header className="fixed inset-x-0 top-0 z-40 border-b border-[#EEE7E1] bg-[#FFFAF6] pt-[env(safe-area-inset-top)]"><div className="mx-auto max-w-2xl px-3 py-3"><div className="flex items-center justify-between gap-3"><h1 className="text-lg font-bold text-[#55585A]">宝物一覧</h1><Link href="/?view=treasures" prefetch={false} className="rounded-xl bg-[#E9A16F] px-4 py-2 text-sm font-semibold text-white">宝物追加</Link></div><div className="mt-3 flex gap-2 overflow-x-auto pb-1">{categories.map((item) => <button key={item} onClick={() => setCategory(item)} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs ${category === item ? "border-[#8EAAB3] bg-[#DCE8EC] text-[#64838D]" : "border-[#EEE7E1] bg-white text-[#888D90]"}`}>{item}</button>)}</div></div></header>
      <div className="mx-auto max-w-2xl px-3 pt-[calc(env(safe-area-inset-top)+112px)] sm:px-6"><section className="space-y-3 rounded-2xl border border-[#EEE7E1] bg-white p-3 shadow-sm shadow-[#E8E0D8]/30">
        {filtered.length ? filtered.map((item) => <article key={item.id} className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white">
          {item.thumbnail && <a href={item.url || undefined} target="_blank" rel="noreferrer" className="block bg-white"><img src={item.thumbnail} alt="" loading="lazy" className={item.category === "漫画" ? "mx-auto aspect-[3/4] max-h-[360px] w-auto max-w-full object-contain" : "aspect-video w-full object-cover"} onError={(event) => { event.currentTarget.style.display = "none" }} /></a>}
          <div className="p-3"><p className="mb-1 text-xs text-[#92999C]">{item.date} · {item.category || "その他"}{item.siteName ? ` · ${item.siteName}` : ""}</p>{item.url ? <a href={item.url} target="_blank" rel="noreferrer" className="break-words text-sm font-semibold text-[#374151] no-underline">{item.title}</a> : <p className="break-words text-sm font-semibold text-[#374151]">{item.title}</p>}{item.note && <p className="mt-2 whitespace-pre-wrap text-sm leading-5 text-[#62666A]">{item.note}</p>}
            {openMemo === item.id && (item.comments || []).length > 0 && <div className="mt-3 space-y-2">{(item.comments || []).map((comment) => <div key={comment.id} className="rounded-lg bg-[#FFFCF9] px-3 py-2"><p className="whitespace-pre-wrap text-sm text-[#55585A]">{comment.text}</p></div>)}</div>}
            {openMemo === item.id && <div className="mt-3 flex items-end gap-2"><textarea value={memoDraft} onChange={(event) => setMemoDraft(event.target.value)} rows={2} placeholder="見ている途中の一言メモ" className="min-w-0 flex-1 resize-y rounded-xl border border-[#E8E0D8] px-3 py-2 text-sm outline-none" /><button onClick={() => addComment(item.id)} disabled={!memoDraft.trim()} className="shrink-0 rounded-xl bg-[#E9A16F] px-4 py-3 text-sm font-semibold text-white disabled:opacity-40">追加</button></div>}
            <div className="mt-3 flex items-center justify-end gap-3"><button onClick={() => { setOpenMemo(openMemo === item.id ? null : item.id); setMemoDraft("") }} className="text-xs text-[#64838D]">💬{item.comments?.length ? ` ${item.comments.length}` : ""}</button><Link href={`/?view=treasures&edit=${encodeURIComponent(item.id)}`} prefetch={false} className="text-xs text-[#D9874F]">編集</Link><button onClick={() => deleteTreasure(item.id)} className="text-xs text-[#999999]">削除</button></div>
          </div>
        </article>) : <p className="py-8 text-center text-sm text-[#999999]">まだ宝物はありません。</p>}
        <Link href="/?view=treasures" prefetch={false} className="block w-full rounded-xl border border-dashed border-[#C6D9DF] py-3 text-center text-sm font-medium text-[#64838D]">＋ 宝物を追加</Link>
      </section></div>
      <BottomNav />
    </main>
  )
}
