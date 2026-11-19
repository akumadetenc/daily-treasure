"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/utils/localSupabase"

type Product = {
  id: string
  name: string
  brand: string | null
  status: string
  category_id: string
  use_morning: boolean
  use_night: boolean
  default_morning: boolean
  default_night: boolean
  started_at: string | null
}

type Category = {
  id: string
  name: string
  sort_order: number
}

type TimeOfDay = "朝" | "夜"
type RepeatStatus = "リピあり" | "あるかも" | "なし"

export default function TodaySkincare({
  selected,
  onChange,
  memoSelected,
  onMemoChange,
  memoText,
  onMemoTextChange,
  hasSavedRecord,
  localDataLoaded,
  onStartProduct,
}: {
  selected: string[]
  onChange: (next: string[]) => void
  memoSelected: string[]
  onMemoChange: (next: string[]) => void
  memoText: string
  onMemoTextChange: (next: string) => void
  hasSavedRecord: boolean
  localDataLoaded: boolean
  onStartProduct: () => void
}) {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  const [finishProduct, setFinishProduct] = useState<Product | null>(null)
  const [rating, setRating] = useState<number | null>(null)
  const [repeatStatus, setRepeatStatus] = useState<RepeatStatus | null>(null)
  const [impression, setImpression] = useState("")
  const [savingFinish, setSavingFinish] = useState(false)

  useEffect(() => {
    if (localDataLoaded) loadProducts()
  }, [localDataLoaded])

  async function loadProducts() {
    setLoading(true)
    const supabase = createClient()

    const [productResult, categoryResult] = await Promise.all([
      supabase
        .from("skincare_products")
        .select(
          "id, name, brand, status, category_id, use_morning, use_night, default_morning, default_night, started_at"
        )
        .order("name", { ascending: true }),
      supabase
        .from("skincare_categories")
        .select("id, name, sort_order")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),
    ])

    const loadedProducts = (productResult.data || []) as Product[]
    const loadedCategories = (categoryResult.data || []) as Category[]

    setProducts(loadedProducts)
    setCategories(loadedCategories)

    if (!hasSavedRecord && selected.length === 0) {
      const defaults = loadedProducts
        .filter(
          (product) =>
            (product.use_morning && product.default_morning) ||
            (product.use_night && product.default_night)
        )
        .map((product) => product.id)

      if (defaults.length > 0) onChange(defaults)
    }

    setLoading(false)
  }

  function openFinish(product: Product) {
    setFinishProduct(product)
    setRating(null)
    setRepeatStatus(null)
    setImpression("")
  }

  function closeFinish() {
    if (savingFinish) return
    setFinishProduct(null)
    setRating(null)
    setRepeatStatus(null)
    setImpression("")
  }

  async function finishUsing() {
    if (!finishProduct) return

    if (!rating) {
      alert("評価を選択してください。")
      return
    }

    if (!repeatStatus) {
      alert("リピートを選択してください。")
      return
    }

    setSavingFinish(true)
    const supabase = createClient()
    const today = new Date().toISOString().slice(0, 10)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      alert("ログイン情報を確認できませんでした。")
      setSavingFinish(false)
      return
    }

    const finalImpression = impression.trim() || null

    const { error: historyError } = await supabase
      .from("skincare_product_usage_periods")
      .insert({
        product_id: finishProduct.id,
        user_id: user.id,
        started_at: finishProduct.started_at,
        finished_at: today,
        status: "使用済",
        rating,
        repeat_status: repeatStatus,
        impression: finalImpression,
        use_morning: finishProduct.use_morning,
        use_night: finishProduct.use_night,
      })

    if (historyError) {
      console.error(historyError)
      alert(`使用履歴の保存に失敗しました。\n${historyError.message}`)
      setSavingFinish(false)
      return
    }

    const { error } = await supabase
      .from("skincare_products")
      .update({
        status: "使用済",
        finished_at: today,
        rating,
        repeat_status: repeatStatus,
        impression: finalImpression,
      })
      .eq("id", finishProduct.id)

    if (error) {
      console.error(error)
      alert(`使い切りの登録に失敗しました。\n${error.message}`)
      setSavingFinish(false)
      return
    }

    setProducts((current) =>
      current.filter((product) => product.id !== finishProduct.id)
    )
    onChange(selected.filter((id) => id !== finishProduct.id))
    setSavingFinish(false)
    closeFinish()
  }

  function toggle(id: string) {
    onChange(
      selected.includes(id)
        ? selected.filter((item) => item !== id)
        : [...selected, id]
    )
  }

  const activeProducts = useMemo(() => products.filter((product) => product.status === "使用中"), [products])
  const memoProducts = useMemo(() => {
    const memoCategoryIds = new Set(categories.filter((category) => category.name === "メモ").map((category) => category.id))
    return products.filter((product) => memoCategoryIds.has(product.category_id))
  }, [products, categories])

  const productsByCategory = useMemo(() => {
    const grouped = new Map<string, Product[]>()

    for (const product of products) {
      const current = grouped.get(product.category_id) || []
      current.push(product)
      grouped.set(product.category_id, current)
    }

    return grouped
  }, [products])

  function getCategorySections(timeOfDay: TimeOfDay) {
    const filteredProducts = activeProducts.filter((product) =>
      timeOfDay === "朝" ? product.use_morning : product.use_night
    )

    const usedCategoryIds = new Set(
      filteredProducts.map((product) => product.category_id)
    )

    const sections: Array<{
      id: string
      name: string
      products: Product[]
    }> = []

    for (const category of categories) {
      if (!usedCategoryIds.has(category.id)) continue

      const categoryProducts = (productsByCategory.get(category.id) || []).filter(
        (product) =>
          timeOfDay === "朝" ? product.use_morning : product.use_night
      )

      if (categoryProducts.length === 0) continue

      sections.push({
        id: category.id,
        name: category.name,
        products: categoryProducts,
      })
    }

    const uncategorized = filteredProducts.filter(
      (product) =>
        !categories.some((category) => category.id === product.category_id)
    )

    if (uncategorized.length > 0) {
      sections.push({
        id: "__other__",
        name: "その他",
        products: uncategorized,
      })
    }

    return sections
  }

  const morningSections = useMemo(
    () => getCategorySections("朝"),
    [categories, activeProducts, productsByCategory]
  )

  const nightSections = useMemo(
    () => getCategorySections("夜"),
    [categories, activeProducts, productsByCategory]
  )

  function renderTimeSection(
    timeOfDay: TimeOfDay,
    sections: Array<{ id: string; name: string; products: Product[] }>
  ) {
    return (
      <div>
        <div className="mb-2 flex items-center gap-2">
          <span className="h-5 w-1 rounded-full bg-[#A8C6D1]" />
          <h3 className="text-sm font-bold text-[#55585A]">{timeOfDay}</h3>
        </div>

        {sections.length === 0 ? (
          <p className="text-xs text-[#9AA8AD]">
            「{timeOfDay}」に使う使用中の商品がありません。
          </p>
        ) : (
          <div className="space-y-3">
            {sections.map((category) => (
              <div key={`${timeOfDay}-${category.id}`}>
                <p className="mb-1 text-[11px] font-bold text-[#65777D]">
                  {category.name}
                </p>

                <div className="space-y-1">
                  {category.products.map((product) => {
                    const active = selected.includes(product.id)

                    return (
                      <div
                        key={`${timeOfDay}-${product.id}`}
                        className={`flex w-full items-center gap-1.5 rounded-lg border px-2 py-1.5 transition ${
                          active
                            ? "border-[#A8C6D1] bg-[#A8C6D1]"
                            : "border-[#DCE7EA] bg-white"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => toggle(product.id)}
                          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                        >
                          <span
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[9px] font-bold ${
                              active
                                ? "border-white bg-white text-[#8FB5C2]"
                                : "border-[#C9D7DB] bg-white text-transparent"
                            }`}
                          >
                            ✓
                          </span>

                          <span className="min-w-0 flex-1">
                            <span
                              className={`block truncate text-[12px] font-semibold ${
                                active ? "text-white" : "text-[#65777D]"
                              }`}
                            >
                              {product.name}
                            </span>

                            {product.brand && (
                              <span
                                className={`block truncate text-[10px] ${
                                  active ? "text-white/80" : "text-[#9AA8AD]"
                                }`}
                              >
                                {product.brand}
                              </span>
                            )}
                          </span>
                        </button>

                        <button
                          type="button"
                          aria-label={`${product.name}の使い切り記録を入力`}
                          onClick={() => openFinish(product)}
                          className="h-6 w-6 shrink-0 rounded-full border border-[#D5E2E6] bg-white text-[10px] font-bold text-[#8A9DA3] shadow-sm"
                        >
                          E
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <section className="rounded-xl border border-[#DDEBF0] bg-[#F8FCFD] p-2.5 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-[#5D727A]">今日使ったスキンケア</h2>
        <span className="text-[10px] text-[#9AA8AD]">使用中のみ</span>
      </div>

      {loading ? (
        <p className="text-xs text-[#9AA8AD]">読み込み中…</p>
      ) : products.length ? (
        <div className="space-y-4">
          {renderTimeSection("朝", morningSections)}
          {renderTimeSection("夜", nightSections)}
        </div>
      ) : (
        <p className="text-xs leading-5 text-[#9AA8AD]">
          使用中の商品がありません。
        </p>
      )}

      <div className="mt-5 border-t border-[#DDEBF0] pt-4">
        <div className="mb-2">
          <h2 className="text-sm font-bold text-[#5D727A]">メモ</h2>
        </div>
        <textarea
          value={memoText}
          onChange={(event) => onMemoTextChange(event.target.value)}
          rows={2}
          placeholder="メモを入力"
          className="w-full resize-none rounded-xl border border-[#DDEBF0] bg-white px-3 py-2.5 text-sm leading-5 text-[#55585A] outline-none placeholder:text-[#AAB3B6] focus:border-[#A8C6D1]"
        />
      </div>

      <button
        type="button"
        onClick={onStartProduct}
        className="mt-3 w-full rounded-lg border border-dashed border-[#A8C6D1] bg-white py-2.5 text-xs font-bold text-[#64838D]"
      >
        ＋ 使い始めた！
      </button>

      {finishProduct && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/30 px-4 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:items-center sm:pb-4">
          <div className="max-h-[calc(100dvh-6rem-env(safe-area-inset-bottom))] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-5 shadow-xl sm:max-h-[90vh]">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#55585A]">使い切り記録</h2>
              <button
                type="button"
                onClick={closeFinish}
                disabled={savingFinish}
                className="text-xl text-[#999999]"
              >
                ×
              </button>
            </div>

            <p className="mt-2 text-sm text-[#65777D]">{finishProduct.name}</p>

            <div className="mt-5">
              <label className="text-sm font-bold text-[#55585A]">評価</label>
              <div className="mt-2 grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRating(value)}
                    className={`rounded-xl border py-3 text-sm font-bold ${
                      rating === value
                        ? "border-[#A8C6D1] bg-[#A8C6D1] text-white"
                        : "border-[#E2E8EA] bg-white text-[#65777D]"
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <label className="text-sm font-bold text-[#55585A]">リピート</label>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {([
                  { value: "リピあり", label: "あり" },
                  { value: "あるかも", label: "検討" },
                  { value: "なし", label: "なし" },
                ] as const).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setRepeatStatus(option.value)}
                    className={`rounded-xl border py-3 text-sm font-bold ${
                      repeatStatus === option.value
                        ? "border-[#A8C6D1] bg-[#A8C6D1] text-white"
                        : "border-[#E2E8EA] bg-white text-[#65777D]"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <label className="text-sm font-bold text-[#55585A]">総評</label>
              <textarea
                value={impression}
                onChange={(event) => setImpression(event.target.value)}
                rows={4}
                placeholder="使用してみた感想など"
                className="mt-2 w-full resize-none rounded-xl border border-[#E2E8EA] bg-white px-3 py-3 text-sm leading-relaxed text-[#55585A] outline-none placeholder:text-[#AAB3B6] focus:border-[#A8C6D1]"
              />
            </div>

            <button
              type="button"
              onClick={finishUsing}
              disabled={savingFinish}
              className="mt-4 w-full rounded-xl bg-[#A8C6D1] py-3.5 text-sm font-bold text-white disabled:opacity-50"
            >
              {savingFinish ? "保存中…" : "使い切りとして保存"}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
