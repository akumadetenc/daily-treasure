"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"

type Product = {
  id: string
  name: string
  brand: string | null
  status: string
}

export default function TodaySkincare({
  selected,
  onChange,
}: {
  selected: string[]
  onChange: (next: string[]) => void
}) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProducts()
  }, [])

  async function loadProducts() {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from("skincare_products")
      .select("id, name, brand, status")
      .order("name", { ascending: true })
    setProducts((data || []) as Product[])
    setLoading(false)
  }

  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id])
  }

  return (
    <section className="rounded-2xl border border-[#DDEBF0] bg-[#F8FCFD] p-4 shadow-sm">
      <h2 className="mb-4 text-base font-bold text-[#5D727A]">今日使ったスキンケア</h2>

      {loading ? (
        <p className="text-sm text-[#9AA8AD]">読み込み中…</p>
      ) : products.length ? (
        <div className="space-y-2">
          {products.map((product) => {
            const active = selected.includes(product.id)
            return (
              <button
                key={product.id}
                type="button"
                onClick={() => toggle(product.id)}
                className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${
                  active
                    ? "border-[#A8C6D1] bg-[#DDEFF4]"
                    : "border-[#DCE7EA] bg-white"
                }`}
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                    active
                      ? "border-[#8FB5C2] bg-[#8FB5C2] text-white"
                      : "border-[#C9D7DB] bg-white text-transparent"
                  }`}
                >
                  ✓
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-[#65777D]">
                    {product.name}
                  </span>
                  {product.brand && (
                    <span className="mt-0.5 block truncate text-xs text-[#9AA8AD]">
                      {product.brand}
                    </span>
                  )}
                </span>
              </button>
            )
          })}
        </div>
      ) : (
        <p className="text-sm leading-6 text-[#9AA8AD]">
          キラキラの商品一覧に登録したスキンケアがここに表示されます。
        </p>
      )}
    </section>
  )
}
