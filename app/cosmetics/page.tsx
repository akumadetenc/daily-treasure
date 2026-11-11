"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { createClient } from "@/utils/supabase/client"
import BottomNav from "../components/BottomNav"

type ProductStatus = "未使用" | "使用中" | "使用済"
type RepeatStatus = "リピあり" | "あるかも" | "なし"

type Category = {
  id: string
  name: string
}

type Ingredient = {
  id: string
  name: string
}

type Product = {
  id: string
  name: string
  brand: string | null
  product_url: string | null
  effects: string | null
  category_id: string
  status: ProductStatus
  stock_count: number
  started_at: string | null
  finished_at: string | null
  rating: number | null
  repeat_status: RepeatStatus | null
  impression: string | null
  use_morning: boolean
  use_night: boolean
}

type Effect = { id: string; name: string }

type ProductEffect = { product_id: string; effect_id: string }

type ProductIngredient = {
  product_id: string
  ingredient_id: string
}

type UsageHistory = {
  id: string
  product_id: string
  started_at: string | null
  finished_at: string | null
  status: ProductStatus
  rating: number | null
  repeat_status: RepeatStatus | null
  impression: string | null
  use_morning: boolean
  use_night: boolean
  created_at: string
}

const statusFilters: Array<"すべて" | ProductStatus> = [
  "すべて",
  "未使用",
  "使用中",
  "使用済",
]

export default function CosmeticsPage() {
  const supabase = createClient()

  const [products, setProducts] = useState<Product[]>([])
  const [productImages, setProductImages] = useState<Record<string, string>>({})
  const [categories, setCategories] = useState<Category[]>([])
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [effectsList, setEffectsList] = useState<Effect[]>([])
  const [productEffects, setProductEffects] = useState<ProductEffect[]>([])
  const [productIngredients, setProductIngredients] = useState<
    ProductIngredient[]
  >([])
  const [usageHistories, setUsageHistories] = useState<UsageHistory[]>([])

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] =
    useState<"すべて" | ProductStatus>("すべて")

  const [loading, setLoading] = useState(true)
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({})

  const [startProduct, setStartProduct] = useState<Product | null>(null)
  const [startMorning, setStartMorning] = useState(false)
  const [startNight, setStartNight] = useState(false)
  const [savingStart, setSavingStart] = useState(false)

  const [memoProduct, setMemoProduct] = useState<Product | null>(null)
  const [memoText, setMemoText] = useState("")
  const [savingMemo, setSavingMemo] = useState(false)

  const [finishProduct, setFinishProduct] = useState<Product | null>(null)
  const [rating, setRating] = useState<number | null>(null)
  const [repeatStatus, setRepeatStatus] = useState<RepeatStatus | null>(null)
  const [impression, setImpression] = useState("")
  const [savingFinish, setSavingFinish] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      window.location.href = "/login"
      return
    }

    const [
      productsResult,
      categoriesResult,
      ingredientsResult,
      productIngredientsResult,
      effectsResult,
      productEffectsResult,
      usageHistoriesResult,
    ] = await Promise.all([
      supabase
        .from("skincare_products")
        .select(
          "id, name, brand, product_url, category_id, status, stock_count, started_at, finished_at, rating, repeat_status, impression, use_morning, use_night"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),

      supabase
        .from("skincare_categories")
        .select("id, name")
        .order("name"),

      supabase
        .from("ingredients")
        .select("id, name")
        .order("name"),

      supabase
        .from("skincare_product_ingredients")
        .select("product_id, ingredient_id"),

      supabase.from("skincare_effects").select("id, name").order("name"),
      supabase.from("skincare_product_effects").select("product_id, effect_id"),

      supabase
        .from("skincare_product_usage_periods")
        .select(
          "id, product_id, started_at, finished_at, status, rating, repeat_status, impression, use_morning, use_night, created_at"
        )
        .eq("user_id", user.id)
        .order("started_at", {
          ascending: false,
          nullsFirst: false,
        })
        .order("created_at", { ascending: false }),
    ])

    if (productsResult.error) {
      console.error(productsResult.error)
      alert(`商品一覧の読み込みに失敗しました。\n${productsResult.error.message}`)
    }

    if (categoriesResult.error) {
      console.error(categoriesResult.error)
    }

    if (ingredientsResult.error) {
      console.error(ingredientsResult.error)
    }

    if (productIngredientsResult.error) {
      console.error(productIngredientsResult.error)
    }

    if (usageHistoriesResult.error) {
      console.error(usageHistoriesResult.error)
      alert(`使用履歴の読み込みに失敗しました。\n${usageHistoriesResult.error.message}`)
    }

    setProducts((productsResult.data ?? []) as Product[])
    setCategories(categoriesResult.data ?? [])
    setIngredients(ingredientsResult.data ?? [])
    setProductIngredients(
      (productIngredientsResult.data ?? []) as ProductIngredient[]
    )
    setUsageHistories((usageHistoriesResult.data ?? []) as UsageHistory[])
    setEffectsList((effectsResult.data ?? []) as Effect[])
    setProductEffects((productEffectsResult.data ?? []) as ProductEffect[])

    setLoading(false)
  }

  const categoryMap = useMemo(() => {
    const map = new Map<string, string>()
    categories.forEach((category) => map.set(category.id, category.name))
    return map
  }, [categories])

  const ingredientMap = useMemo(() => {
    const map = new Map<string, string>()
    ingredients.forEach((ingredient) => map.set(ingredient.id, ingredient.name))
    return map
  }, [ingredients])

  const usageHistoryMap = useMemo(() => {
    const map = new Map<string, UsageHistory[]>()

    usageHistories.forEach((history) => {
      const current = map.get(history.product_id) ?? []
      current.push(history)
      map.set(history.product_id, current)
    })

    return map
  }, [usageHistories])

  function getProductIngredients(productId: string) {
    return productIngredients
      .filter((item) => item.product_id === productId)
      .map((item) => ingredientMap.get(item.ingredient_id))
      .filter((name): name is string => Boolean(name))
  }

  function getProductUsageHistory(productId: string) {
    return usageHistoryMap.get(productId) ?? []
  }

  function getCompletedUsageHistory(productId: string) {
    return getProductUsageHistory(productId).filter(
      (history) => history.status === "使用済"
    )
  }

  function hasUsedHistory(productId: string) {
    return getCompletedUsageHistory(productId).length > 0
  }

  function getLatestUsedHistory(productId: string) {
    const histories = getCompletedUsageHistory(productId)
    return histories.length === 0 ? null : histories[0]
  }

  function formatDate(date: string | null) {
    if (!date) return ""

    const [year, month, day] = date.split("-")
    if (!year || !month || !day) return date

    return `${year}-${month}-${day}`
  }

  function matchesSearch(product: Product) {
    const keyword = search.trim().toLowerCase()
    if (!keyword) return true

    const categoryName = categoryMap.get(product.category_id) ?? ""
    const ingredientNames = getProductIngredients(product.id)

    const target = [
      product.name,
      product.brand ?? "",
      categoryName,
      ...ingredientNames,
    ]
      .join(" ")
      .toLowerCase()

    return target.includes(keyword)
  }

  useEffect(() => {
    let cancelled = false

    async function loadProductImages() {
      const withUrls = products.filter((product) => product.product_url?.trim())
      const entries = await Promise.all(
        withUrls.map(async (product) => {
          try {
            const response = await fetch("/api/product-image", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ url: product.product_url }),
            })
            if (!response.ok) return [product.id, ""] as const
            const data = await response.json()
            return [product.id, typeof data.imageUrl === "string" ? data.imageUrl : ""] as const
          } catch {
            return [product.id, ""] as const
          }
        })
      )
      if (!cancelled) {
        setProductImages(Object.fromEntries(entries.filter(([, imageUrl]) => imageUrl)))
      }
    }

    if (products.length > 0) loadProductImages()
    else setProductImages({})

    return () => { cancelled = true }
  }, [products])

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      let statusMatch = true

      if (statusFilter === "未使用") {
        statusMatch = product.status === "未使用"
      } else if (statusFilter === "使用中") {
        statusMatch = product.status === "使用中"
      } else if (statusFilter === "使用済") {
        statusMatch =
          product.status === "使用済" || hasUsedHistory(product.id)
      }

      return statusMatch && matchesSearch(product)
    })
  }, [
    products,
    statusFilter,
    search,
    categoryMap,
    ingredientMap,
    productIngredients,
    usageHistoryMap,
  ])

  const groupedProducts = useMemo(() => {
    const groups = new Map<
      string,
      {
        categoryId: string
        categoryName: string
        products: Product[]
      }
    >()

    filteredProducts.forEach((product) => {
      const categoryName = categoryMap.get(product.category_id) ?? "未分類"

      if (!groups.has(product.category_id)) {
        groups.set(product.category_id, {
          categoryId: product.category_id,
          categoryName,
          products: [],
        })
      }

      groups.get(product.category_id)!.products.push(product)
    })

    return Array.from(groups.values())
  }, [filteredProducts, categoryMap])

  function openStart(product: Product) {
    setStartProduct(product)
    setStartMorning(false)
    setStartNight(false)
  }

  function closeStart() {
    if (savingStart) return

    setStartProduct(null)
    setStartMorning(false)
    setStartNight(false)
  }

  async function startUsing() {
    if (!startProduct) return

    setSavingStart(true)

    const today = new Date().toISOString().slice(0, 10)

    const { error } = await supabase
      .from("skincare_products")
      .update({
        status: "使用中",
        stock_count: Math.max(0, (startProduct.stock_count ?? 0) - 1),
        started_at: today,
        finished_at: null,
        rating: null,
        repeat_status: null,
        impression: null,
        use_morning: startMorning,
        use_night: startNight,
      })
      .eq("id", startProduct.id)

    if (error) {
      console.error(error)
      alert(`使用開始に失敗しました。\n${error.message}`)
      setSavingStart(false)
      return
    }

    setProducts((current) =>
      current.map((item) =>
        item.id === startProduct.id
          ? {
              ...item,
              status: "使用中",
              stock_count: Math.max(0, (item.stock_count ?? 0) - 1),
              started_at: today,
              finished_at: null,
              rating: null,
              repeat_status: null,
              impression: null,
              use_morning: startMorning,
              use_night: startNight,
            }
          : item
      )
    )

    setSavingStart(false)
    setStartProduct(null)
    setStartMorning(false)
    setStartNight(false)
  }

  function openMemo(product: Product) {
    setMemoProduct(product)
    setMemoText("")
  }

  function closeMemo() {
    if (savingMemo) return

    setMemoProduct(null)
    setMemoText("")
  }

  async function saveMemo() {
    if (!memoProduct) return

    const text = memoText.trim()
    if (!text) {
      alert("メモを入力してください。")
      return
    }

    setSavingMemo(true)

    const today = new Date().toISOString().slice(0, 10)

    const { error } = await supabase
      .from("skincare_product_notes")
      .insert({
        product_id: memoProduct.id,
        note: text,
        note_date: today,
      })

    if (error) {
      console.error(error)
      alert(`メモを保存できませんでした。\n${error.message}`)
      setSavingMemo(false)
      return
    }

    setSavingMemo(false)
    setMemoProduct(null)
    setMemoText("")
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

    const today = new Date().toISOString().slice(0, 10)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      alert("ログインしてください。")
      setSavingFinish(false)
      return
    }

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
        impression: impression.trim() || null,
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
        impression: impression.trim() || null,
      })
      .eq("id", finishProduct.id)

    if (error) {
      console.error(error)
      alert(
        `使用履歴は保存されましたが、商品情報の更新に失敗しました。\n${error.message}`
      )
      setSavingFinish(false)
      await loadData()
      return
    }

    setProducts((current) =>
      current.map((item) =>
        item.id === finishProduct.id
          ? {
              ...item,
              status: "使用済",
              finished_at: today,
              rating,
              repeat_status: repeatStatus,
              impression: impression.trim() || null,
            }
          : item
      )
    )

    setUsageHistories((current) => [
      {
        id: crypto.randomUUID(),
        product_id: finishProduct.id,
        started_at: finishProduct.started_at,
        finished_at: today,
        status: "使用済",
        rating,
        repeat_status: repeatStatus,
        impression: impression.trim() || null,
        use_morning: finishProduct.use_morning,
        use_night: finishProduct.use_night,
        created_at: new Date().toISOString(),
      },
      ...current,
    ])

    setSavingFinish(false)
    setFinishProduct(null)
    setRating(null)
    setRepeatStatus(null)
    setImpression("")
  }

  function statusClass(status: ProductStatus) {
    if (status === "未使用") return "bg-gray-100 text-gray-600"
    if (status === "使用中") return "bg-[#F4B78C] text-[#8E542E]"
    return "bg-[#A8C6D1] text-[#426875]"
  }

  function ratingClass(value: number | null) {
    switch (value) {
      case 1:
        return "bg-blue-100 text-blue-700"
      case 2:
        return "bg-green-100 text-green-700"
      case 3:
        return "bg-yellow-100 text-yellow-700"
      case 4:
        return "bg-pink-100 text-pink-700"
      case 5:
        return "bg-red-100 text-red-700"
      default:
        return "bg-gray-100 text-gray-500"
    }
  }

  function displayRepeatStatus(value: RepeatStatus | null) {
    if (value === "あるかも") return "検討"
    if (value === "なし") return "なし"
    if (value === "リピあり") return "あり"
    return "―"
  }

  if (loading) {
    return (
      <main className="h-[100dvh] overflow-y-auto overscroll-y-auto bg-[#F7FAFA] pb-28 [-webkit-overflow-scrolling:touch]">
        <div className="fixed inset-x-0 top-0 z-40 bg-[#F7FAFA]">
          <div className="mx-auto max-w-xl px-4">
            <header className="border-b border-[#DFE9EC] pb-2 pt-[calc(env(safe-area-inset-top)+4px)]">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <Link href="/cosmetics/settings" className="shrink-0 text-xs font-medium text-[#647F89]">カテゴリ設定</Link>
                  <Link href="/skincare" className="shrink-0 rounded-full bg-[#A8C6D1] px-3 py-1.5 text-xs font-bold text-white">＋追加</Link>
                </div>
                <Link href="/treatment" className="shrink-0 rounded-full border border-[#D6E6EA] bg-white px-3 py-1.5 text-xs font-semibold text-[#647F89]">施術</Link>
              </div>
            </header>
          </div>
        </div>

        <div className="mx-auto max-w-xl px-4 pt-[calc(env(safe-area-inset-top)+40px)]">
          <p className="text-gray-600">読み込み中...</p>
        </div>

        <BottomNav />
      </main>
    )
  }

  return (
    <main className="h-[100dvh] overflow-y-auto overscroll-y-auto bg-[#F7FAFA] pb-28 [-webkit-overflow-scrolling:touch]">
      <div className="fixed inset-x-0 top-0 z-40 bg-[#F7FAFA]">
        <div className="mx-auto max-w-xl px-4">
          <header className="border-b border-[#DFE9EC] pb-2 pt-[calc(env(safe-area-inset-top)+4px)]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <Link href="/cosmetics/settings" className="shrink-0 text-xs font-medium text-[#647F89]">カテゴリ設定</Link>
                <Link href="/skincare" className="shrink-0 rounded-full bg-[#A8C6D1] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-[#8FB5C2]">＋追加</Link>
              </div>
              <Link href="/treatment" className="shrink-0 rounded-full border border-[#D6E6EA] bg-white px-3 py-1.5 text-xs font-semibold text-[#647F89]">施術</Link>
            </div>
          </header>
        </div>
      </div>

      <div className="mx-auto max-w-xl px-4 pt-[calc(env(safe-area-inset-top)+52px)]">
        {/* 検索 */}
        <div className="mt-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="商品名・ブランド・カテゴリー・成分を検索"
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none placeholder:text-gray-400 focus:border-[#A8C6D1]"
          />
        </div>

        {/* ステータス：スクロールしても固定 */}
        <div className="sticky top-[calc(env(safe-area-inset-top)+52px)] z-30 -mx-4 bg-[#F7FAFA] px-4 pb-2 pt-2">
        <div className="grid grid-cols-4 gap-1 rounded-xl bg-gray-200 p-1">
          {statusFilters.map((status) => {
            const active = statusFilter === status

            return (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`rounded-lg py-2 text-xs font-bold transition ${
                  active
                    ? "bg-[#A8C6D1] text-white"
                    : "text-gray-500 hover:bg-white"
                }`}
              >
                {status}
              </button>
            )
          })}
        </div>
        </div>

        {/* 商品 */}
        <div className="mt-4 space-y-6">
          {groupedProducts.length === 0 ? (
            <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
              <p className="text-sm text-gray-400">商品がありません。</p>
            </div>
          ) : (
            groupedProducts.map((group) => (
              <section key={group.categoryId}>
                <button
                  type="button"
                  onClick={() => setCollapsedCategories((current) => ({ ...current, [group.categoryId]: !((current[group.categoryId]) ?? true) }))}
                  className="mb-3 flex w-full items-center justify-between rounded-xl px-1 py-1 text-left text-sm font-bold text-gray-700"
                  aria-expanded={!(collapsedCategories[group.categoryId] ?? true)}
                >
                  <span>{group.categoryName} <span className="font-normal text-gray-400">{group.products.length}</span></span>
                  <span className="text-gray-400">{(collapsedCategories[group.categoryId] ?? true) ? "＋" : "−"}</span>
                </button>

                {!(collapsedCategories[group.categoryId] ?? true) && <div className="space-y-3">
                  {group.products.map((product) => {
                    const productIngredientNames = getProductIngredients(product.id)
                    const productEffectNames = productEffects
                      .filter((item) => item.product_id === product.id)
                      .map((item) => effectsList.find((effect) => effect.id === item.effect_id)?.name)
                      .filter((name): name is string => Boolean(name))
                    const completedHistories = getCompletedUsageHistory(product.id)
                    const latestUsedHistory = getLatestUsedHistory(product.id)
                    const hasHistory = completedHistories.length > 0

                    return (
                      <article
                        key={product.id}
                        className="rounded-2xl bg-white p-4 shadow-sm"
                      >
                        <Link href={`/cosmetics/${product.id}`} className="block">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <h3 className="text-base font-bold text-gray-800">
                                {product.name}
                              </h3>

                              <div className="mt-1 flex items-center justify-between gap-2">
                                {product.brand ? (
                                  <span className="min-w-0 truncate text-xs text-gray-500">
                                    {product.brand}
                                  </span>
                                ) : (
                                  <span />
                                )}
                                <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-bold text-gray-600">
                                    {product.stock_count ?? 0}個
                                  </span>
                                  <span
                                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${statusClass(
                                      product.status
                                    )}`}
                                  >
                                    {product.status}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* 成分 */}
                          {productIngredientNames.length > 0 && (
                            <div className="mt-3">
                              <div className="flex flex-wrap gap-1.5">
                                {productIngredientNames.map((ingredient) => (
                                  <span
                                    key={ingredient}
                                    className="rounded-full bg-[#FFF0E4] px-2 py-1 text-[10px] font-semibold text-[#C77D45]"
                                  >
                                    {ingredient}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 効果 */}
                          {productEffectNames.length > 0 && (
                            <div className="mt-2">
                              <div className="flex flex-wrap gap-1.5">
                                {productEffectNames.map((effect) => (
                                  <span key={effect} className="rounded-full bg-[#DDEFF2] px-2 py-1 text-[10px] font-semibold text-[#5F91A0]">
                                    {effect}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 使用期間：使用中は現在の期間、使用済みは直近の完了期間 */}
                          {(() => {
                            const period = product.status === "使用中" ? product : (product.status === "使用済" && (product.started_at || product.finished_at) ? product : latestUsedHistory)
                            if (!period || (!period.started_at && !period.finished_at)) return null
                            return <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl bg-gray-50 px-3 py-2 text-xs">
                              {period.started_at && <span className="whitespace-nowrap"><span className="text-[10px] text-gray-400">使用開始 </span><span className="font-semibold text-gray-600">{formatDate(period.started_at)}</span></span>}
                              {period.finished_at && <span className="whitespace-nowrap"><span className="text-[10px] text-gray-400">使用終了 </span><span className="font-semibold text-gray-600">{formatDate(period.finished_at)}</span></span>}
                            </div>
                          })()}

                        </Link>

                        {/* 評価・リピ・使用回数・操作ボタン */}
                        <div className={`mt-3 flex gap-3 ${productImages[product.id] ? "items-stretch" : "items-center"}`}>
                          {productImages[product.id] && (
                            <a
                              href={product.product_url || undefined}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(event) => event.stopPropagation()}
                              className="flex min-w-0 flex-[8] items-center justify-center overflow-hidden rounded-xl bg-white"
                              aria-label="商品ページを開く"
                            >
                              <img src={productImages[product.id]} alt={product.name} className="aspect-square h-auto max-h-44 w-full rounded-xl object-contain" loading="lazy" />
                            </a>
                          )}

                          <div className={`min-w-0 ${productImages[product.id] ? "flex flex-[2] flex-col items-stretch justify-between gap-2" : "flex-1 flex items-center justify-between gap-2"}`}>
                            <div className={`min-w-0 text-xs ${productImages[product.id] ? "flex flex-col items-start gap-3" : "flex flex-row flex-wrap items-center gap-x-3 gap-y-1"}`}>
                              {(product.status === "使用済" || (hasHistory && latestUsedHistory)) && (() => {
                                const record = product.status === "使用済" ? product : latestUsedHistory
                                if (!record) return null
                                return (
                                  <div className={`flex ${productImages[product.id] ? "flex-col items-start gap-3" : "flex-row flex-wrap items-center gap-x-3 gap-y-1"}`}>
                                    <div className="flex items-center gap-2 whitespace-nowrap">
                                      <span className="text-gray-400">評価</span>
                                      <span className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 font-bold ${ratingClass(record.rating)}`}>{record.rating ?? "―"}</span>
                                    </div>
                                    <div className="flex items-center gap-2 whitespace-nowrap">
                                      <span className="text-gray-400">リピ</span>
                                      <span className="font-semibold text-gray-700">{displayRepeatStatus(record.repeat_status)}</span>
                                    </div>
                                  </div>
                                )
                              })()}
                              <p className="whitespace-nowrap text-[10px] font-semibold text-gray-400">使用済 {completedHistories.length}回</p>
                            </div>

                            <div className={`${productImages[product.id] ? "mt-2" : "shrink-0"} flex items-center justify-end gap-1`}>
                              {product.status === "使用中" && (
                                <button type="button" onClick={() => openMemo(product)} title="メモ" aria-label="メモ" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-50">
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h8M8 14h5m-8 6 3.5-3H18a3 3 0 0 0 3-3V6a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3v11a3 3 0 0 0 3 3Z" /></svg>
                                </button>
                              )}
                              {product.status === "未使用" && <button type="button" onClick={() => openStart(product)} title="使用開始" aria-label="使用開始" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[#A8C6D1] bg-white text-xs font-extrabold text-[#647F89] transition hover:bg-[#F7FAFA]">S</button>}
                              {product.status === "使用中" && <button type="button" onClick={() => openFinish(product)} title="使い切り" aria-label="使い切り" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#A8C6D1] text-xs font-extrabold text-white transition hover:bg-[#8FB5C2]">E</button>}
                            </div>
                          </div>
                        </div>
                      </article>
                    )
                  })}
                </div>}
              </section>
            ))
          )}
        </div>
      </div>

      {/* 使用開始 */}
      {startProduct && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30 px-4 pb-4">
          <div className="w-full max-w-xl rounded-3xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800">使用開始</h2>
              <button
                type="button"
                onClick={closeStart}
                className="text-xl text-gray-400"
              >
                ×
              </button>
            </div>

            <p className="mt-2 text-sm text-gray-500">{startProduct.name}</p>

            <div className="mt-5">
              <p className="text-sm font-bold text-gray-700">使用時間</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setStartMorning((current) => !current)}
                  className={`rounded-xl border py-3 text-sm font-bold transition ${
                    startMorning
                      ? "border-[#A8C6D1] bg-[#A8C6D1] text-white"
                      : "border-gray-200 bg-white text-gray-600 hover:bg-[#F7FAFA]"
                  }`}
                >
                  朝
                </button>

                <button
                  type="button"
                  onClick={() => setStartNight((current) => !current)}
                  className={`rounded-xl border py-3 text-sm font-bold transition ${
                    startNight
                      ? "border-[#A8C6D1] bg-[#A8C6D1] text-white"
                      : "border-gray-200 bg-white text-gray-600 hover:bg-[#F7FAFA]"
                  }`}
                >
                  夜
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={startUsing}
              disabled={savingStart}
              className="mt-5 w-full rounded-xl bg-[#A8C6D1] py-3.5 text-sm font-bold text-white transition hover:bg-[#8FB5C2] disabled:opacity-50"
            >
              {savingStart ? "保存中..." : "使用開始"}
            </button>
          </div>
        </div>
      )}

      {/* 使用中メモ */}
      {memoProduct && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30 px-4 pb-4">
          <div className="w-full max-w-xl rounded-3xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800">使用中メモ</h2>
              <button
                type="button"
                onClick={closeMemo}
                className="text-xl text-gray-400"
              >
                ×
              </button>
            </div>

            <textarea
              value={memoText}
              onChange={(e) => setMemoText(e.target.value)}
              rows={5}
              autoFocus
              placeholder="使用して感じたことをメモ"
              className="mt-4 w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm leading-relaxed text-gray-700 outline-none placeholder:text-gray-400 focus:border-[#A8C6D1]"
            />

            <button
              type="button"
              onClick={saveMemo}
              disabled={savingMemo}
              className="mt-3 w-full rounded-xl bg-[#A8C6D1] py-3 text-sm font-bold text-white transition hover:bg-[#8FB5C2] disabled:opacity-50"
            >
              {savingMemo ? "保存中..." : "メモを保存"}
            </button>
          </div>
        </div>
      )}

      {/* 使い切り */}
      {finishProduct && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30 px-4 pb-4">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800">使い切り</h2>
              <button
                type="button"
                onClick={closeFinish}
                className="text-xl text-gray-400"
              >
                ×
              </button>
            </div>

            <p className="mt-2 text-sm text-gray-500">{finishProduct.name}</p>

            {/* 評価 */}
            <div className="mt-5">
              <label className="text-sm font-bold text-gray-700">評価</label>
              <div className="mt-2 grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRating(value)}
                    className={`rounded-xl border py-3 text-sm font-bold transition ${
                      rating === value
                        ? "border-[#A8C6D1] bg-[#A8C6D1] text-white"
                        : "border-gray-200 bg-white text-gray-600 hover:bg-[#F7FAFA]"
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>

            {/* リピート */}
            <div className="mt-5">
              <label className="text-sm font-bold text-gray-700">リピート</label>
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
                    className={`rounded-xl border py-3 text-sm font-bold transition ${
                      repeatStatus === option.value
                        ? "border-[#A8C6D1] bg-[#A8C6D1] text-white"
                        : "border-gray-200 bg-white text-gray-600 hover:bg-[#F7FAFA]"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 総評 */}
            <div className="mt-5">
              <label className="text-sm font-bold text-gray-700">総評</label>
              <textarea
                value={impression}
                onChange={(e) => setImpression(e.target.value)}
                rows={5}
                placeholder="使用してみた感想など"
                className="mt-2 w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm leading-relaxed text-gray-700 outline-none placeholder:text-gray-400 focus:border-[#A8C6D1]"
              />
            </div>

            <button
              type="button"
              onClick={finishUsing}
              disabled={savingFinish}
              className="mt-4 w-full rounded-xl bg-[#A8C6D1] py-3.5 text-sm font-bold text-white transition hover:bg-[#8FB5C2] disabled:opacity-50"
            >
              {savingFinish ? "保存中..." : "使い切りとして保存"}
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </main>
  )
}