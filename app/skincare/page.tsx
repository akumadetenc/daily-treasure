"use client"

import BottomNav from "../components/BottomNav"
import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"

type Category = {
  id: string
  name: string
  sort_order: number
}

type Ingredient = {
  id: string
  name: string
  sort_order: number
}

const japaneseNameSort = <T extends { name: string }>(items: T[]): T[] =>
  [...items].sort((a, b) => a.name.localeCompare(b.name, "ja", { sensitivity: "base" }))

type Effect = {
  id: string
  name: string
  sort_order: number
}

type Brand = {
  id: string
  name: string
  sort_order: number
}

export default function SkincarePage() {
  const supabase = createClient()

  const [categories, setCategories] = useState<Category[]>([])
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [effectsList, setEffectsList] = useState<Effect[]>([])
  const [selectedEffects, setSelectedEffects] = useState<string[]>([])
  const [brands, setBrands] = useState<Brand[]>([])

  const [name, setName] = useState("")
  const [productUrl, setProductUrl] = useState("")
  const [effects, setEffects] = useState("")
  const [brandId, setBrandId] = useState("")
  const [categoryId, setCategoryId] = useState("")

  const [selectedIngredients, setSelectedIngredients] =
    useState<string[]>([])

  const [useMorning, setUseMorning] = useState(false)
  const [useNight, setUseNight] = useState(false)
  const [defaultMorning, setDefaultMorning] = useState(false)
  const [defaultNight, setDefaultNight] = useState(false)
  const [stockCount, setStockCount] = useState("0")

  // 過去の使用済み回数
  const [pastUsedCount, setPastUsedCount] = useState("0")

  const [newBrand, setNewBrand] = useState("")
  const [newCategory, setNewCategory] = useState("")
  const [newIngredient, setNewIngredient] = useState("")
  const [newEffect, setNewEffect] = useState("")

  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    setMessage("")

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMessage("ログインしてください。")
      setLoading(false)
      return
    }

    const [
      brandResult,
      categoryResult,
      ingredientResult,
      effectResult,
    ] = await Promise.all([
      supabase
        .from("skincare_brands")
        .select("id, name, sort_order")
        .eq("user_id", user.id)
        .order("sort_order", {
          ascending: true,
        })
        .order("name", {
          ascending: true,
        }),

      supabase
        .from("skincare_categories")
        .select("id, name, sort_order")
        .eq("user_id", user.id)
        .order("sort_order", {
          ascending: true,
        })
        .order("name", {
          ascending: true,
        }),

      supabase
        .from("ingredients")
        .select("id, name, sort_order")
        .eq("user_id", user.id)
        .order("sort_order", {
          ascending: true,
        })
        .order("name", {
          ascending: true,
        }),

      supabase
        .from("skincare_effects")
        .select("id, name, sort_order")
        .eq("user_id", user.id)
        .order("sort_order")
        .order("name"),
    ])

    if (brandResult.error) {
      console.error(brandResult.error)
      setMessage(
        "ブランドの読み込みに失敗しました。"
      )
    } else {
      setBrands(japaneseNameSort((brandResult.data ?? []) as Brand[]))
    }

    if (categoryResult.error) {
      console.error(categoryResult.error)
      setMessage(
        "カテゴリーの読み込みに失敗しました。"
      )
    } else {
      setCategories(japaneseNameSort((categoryResult.data ?? []) as Category[]))
    }

    if (ingredientResult.error) {
      console.error(ingredientResult.error)
      setMessage(
        "成分の読み込みに失敗しました。"
      )
    } else {
      setIngredients(japaneseNameSort((ingredientResult.data ?? []) as Ingredient[]))
    }

    if (effectResult.error) {
      console.error(effectResult.error)
      setMessage("効果の読み込みに失敗しました。SupabaseのSQLを実行してください。")
    } else {
      setEffectsList(japaneseNameSort((effectResult.data ?? []) as Effect[]))
    }

    setLoading(false)
  }

  async function addBrand() {
    const brandName = newBrand.trim()

    if (!brandName) {
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMessage("ログインしてください。")
      return
    }

    const existing = brands.find(
      (brand) =>
        brand.name.toLowerCase() ===
        brandName.toLowerCase()
    )

    if (existing) {
      setBrandId(existing.id)
      setNewBrand("")
      setMessage("既存のブランドを選択しました。")
      return
    }

    const maxSortOrder =
      brands.length > 0
        ? Math.max(
            ...brands.map(
              (brand) => brand.sort_order
            )
          )
        : -1

    const { data, error } = await supabase
      .from("skincare_brands")
      .insert({
        user_id: user.id,
        name: brandName,
        sort_order: maxSortOrder + 1,
      })
      .select("id, name, sort_order")
      .single()

    if (error) {
      console.error(error)

      if (error.code === "23505") {
        setMessage(
          "同じブランドがすでにあります。"
        )
      } else {
        setMessage(
          "ブランドを追加できませんでした。"
        )
      }

      return
    }

    setBrands((current) => japaneseNameSort([...current, data as Brand]))

    setBrandId(data.id)
    setNewBrand("")
    setMessage("")
  }

  async function addCategory() {
    const categoryName = newCategory.trim()

    if (!categoryName) {
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMessage("ログインしてください。")
      return
    }

    const existing = categories.find(
      (category) =>
        category.name.toLowerCase() ===
        categoryName.toLowerCase()
    )

    if (existing) {
      setCategoryId(existing.id)
      setNewCategory("")
      setMessage(
        "既存のカテゴリーを選択しました。"
      )
      return
    }

    const maxSortOrder =
      categories.length > 0
        ? Math.max(
            ...categories.map(
              (category) =>
                category.sort_order
            )
          )
        : -1

    const { data, error } = await supabase
      .from("skincare_categories")
      .insert({
        user_id: user.id,
        name: categoryName,
        sort_order: maxSortOrder + 1,
      })
      .select("id, name, sort_order")
      .single()

    if (error) {
      console.error(error)

      if (error.code === "23505") {
        setMessage(
          "同じカテゴリーがすでにあります。"
        )
      } else {
        setMessage(
          "カテゴリーを追加できませんでした。"
        )
      }

      return
    }

    setCategories((current) => japaneseNameSort([...current, data as Category]))

    setCategoryId(data.id)
    setNewCategory("")
    setMessage("")
  }

  async function addIngredient() {
    const ingredientName =
      newIngredient.trim()

    if (!ingredientName) {
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMessage("ログインしてください。")
      return
    }

    const existing = ingredients.find(
      (ingredient) =>
        ingredient.name.toLowerCase() ===
        ingredientName.toLowerCase()
    )

    if (existing) {
      setSelectedIngredients((current) =>
        current.includes(existing.id)
          ? current
          : [...current, existing.id]
      )

      setNewIngredient("")
      setMessage("既存の成分を選択しました。")
      return
    }

    const maxSortOrder =
      ingredients.length > 0
        ? Math.max(
            ...ingredients.map(
              (ingredient) =>
                ingredient.sort_order
            )
          )
        : -1

    const { data, error } = await supabase
      .from("ingredients")
      .insert({
        user_id: user.id,
        name: ingredientName,
        sort_order: maxSortOrder + 1,
      })
      .select("id, name, sort_order")
      .single()

    if (error) {
      console.error(error)

      if (error.code === "23505") {
        setMessage(
          "同じ成分がすでにあります。"
        )
      } else {
        setMessage(
          "成分を追加できませんでした。"
        )
      }

      return
    }

    setIngredients((current) => japaneseNameSort([...current, data as Ingredient]))

    setSelectedIngredients((current) => [
      ...current,
      data.id,
    ])

    setNewIngredient("")
    setMessage("")
  }

  async function addEffect() {
    const effectName = newEffect.trim()
    if (!effectName) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setMessage("ログインしてください。")
      return
    }
    const existing = effectsList.find((item) => item.name.toLowerCase() === effectName.toLowerCase())
    if (existing) {
      setSelectedEffects((current) => current.includes(existing.id) ? current : [...current, existing.id])
      setNewEffect("")
      return
    }
    const maxSortOrder = effectsList.length ? Math.max(...effectsList.map((item) => item.sort_order)) : -1
    const { data, error } = await supabase.from("skincare_effects")
      .insert({ user_id: user.id, name: effectName, sort_order: maxSortOrder + 1 })
      .select("id, name, sort_order").single()
    if (error) {
      console.error(error)
      setMessage("効果を追加できませんでした。SQLの実行状況を確認してください。")
      return
    }
    setEffectsList((current) => japaneseNameSort([...current, data as Effect]))
    setSelectedEffects((current) => [...current, data.id])
    setNewEffect("")
    setMessage("")
  }

  function toggleEffect(id: string) {
    setSelectedEffects((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  }

  function toggleIngredient(id: string) {
    setSelectedIngredients((current) =>
      current.includes(id)
        ? current.filter(
            (item) => item !== id
          )
        : [...current, id]
    )
  }

  async function saveProduct() {
    setMessage("")

    if (!name.trim()) {
      setMessage(
        "商品名を入力してください。"
      )
      return
    }

    if (!brandId) {
      setMessage(
        "ブランドを選択してください。"
      )
      return
    }

    if (!categoryId) {
      setMessage(
        "カテゴリーを選択してください。"
      )
      return
    }

    const parsedPastUsedCount =
      Number(pastUsedCount)

    if (
      pastUsedCount.trim() === "" ||
      !Number.isInteger(parsedPastUsedCount) ||
      parsedPastUsedCount < 0 ||
      parsedPastUsedCount > 500
    ) {
      setMessage(
        "過去の使用済み回数は0〜500の整数で入力してください。"
      )
      return
    }

    setSaving(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMessage("ログインしてください。")
      setSaving(false)
      return
    }

    const selectedBrand = brands.find(
      (brand) => brand.id === brandId
    )

    const { data: product, error } =
      await supabase
        .from("skincare_products")
        .insert({
          user_id: user.id,
          name: name.trim(),
          product_url: productUrl.trim() || null,
          effects: effects.trim() || null,
          brand:
            selectedBrand?.name ?? null,
          category_id: categoryId,
          started_at: null,
          status: "未使用",
          use_morning: useMorning,
          use_night: useNight,
          default_morning: useMorning && defaultMorning,
          default_night: useNight && defaultNight,
          stock_count: Math.max(0, Number.parseInt(stockCount, 10) || 0),
        })
        .select("id")
        .single()

    if (error) {
      console.error(error)
      setMessage(
        "商品を保存できませんでした。"
      )
      setSaving(false)
      return
    }

    if (selectedIngredients.length > 0) {
      const ingredientRows =
        selectedIngredients.map(
          (ingredientId) => ({
            product_id: product.id,
            ingredient_id: ingredientId,
          })
        )

      const {
        error: ingredientError,
      } = await supabase
        .from("skincare_product_ingredients")
        .insert(ingredientRows)

      if (ingredientError) {
        console.error(ingredientError)

        await supabase
          .from("skincare_products")
          .delete()
          .eq("id", product.id)

        setMessage(
          "成分の保存に失敗したため、商品も保存しませんでした。"
        )
        setSaving(false)
        return
      }
    }

    if (selectedEffects.length > 0) {
      const { error: effectSaveError } = await supabase
        .from("skincare_product_effects")
        .insert(selectedEffects.map((effectId) => ({ product_id: product.id, effect_id: effectId })))
      if (effectSaveError) {
        console.error(effectSaveError)
        await supabase.from("skincare_products").delete().eq("id", product.id)
        setMessage("効果の保存に失敗したため、商品も保存しませんでした。")
        setSaving(false)
        return
      }
    }

    // 過去の使用済み回数を、日付なしの履歴として登録する。
    // 商品本体は「未使用」のままなので、これから使用を開始できる。
    if (parsedPastUsedCount > 0) {
      const pastUsageRows = Array.from(
        { length: parsedPastUsedCount },
        () => ({
          product_id: product.id,
          user_id: user.id,
          started_at: null,
          finished_at: null,
          status: "使用済" as const,
          rating: null,
          repeat_status: null,
          impression: null,
          use_morning: useMorning,
          use_night: useNight,
        })
      )

      const { error: usageHistoryError } =
        await supabase
          .from("skincare_product_usage_periods")
          .insert(pastUsageRows)

      if (usageHistoryError) {
        console.error(usageHistoryError)

        // 履歴の登録に失敗した場合は、作成した商品も削除する。
        await supabase
          .from("skincare_products")
          .delete()
          .eq("id", product.id)
          .eq("user_id", user.id)

        setMessage(
          `過去の使用履歴を保存できませんでした。商品は登録していません。\n${usageHistoryError.message}`
        )
        setSaving(false)
        return
      }
    }

    setName("")
    setProductUrl("")
    setEffects("")
    setBrandId("")
    setCategoryId("")
    setSelectedIngredients([])
    setSelectedEffects([])
    setNewEffect("")
    setStockCount("0")
    setUseMorning(false)
    setUseNight(false)
    setDefaultMorning(false)
    setDefaultNight(false)
    setPastUsedCount("0")

    setMessage(
      parsedPastUsedCount > 0
        ? `商品を登録しました。過去の使用済み回数：${parsedPastUsedCount}回`
        : "商品を登録しました。"
    )

    setSaving(false)
  }

  if (loading) {
    return (
      <main className="h-screen min-h-0 overflow-y-auto overscroll-y-auto bg-[#F7FAFA] pb-28 [-webkit-overflow-scrolling:touch]">
        <div className="fixed inset-x-0 top-0 z-40 bg-[#F7FAFA]">
          <div className="mx-auto max-w-xl px-4">
            <header className="border-b border-[#DFE9EC] pb-1 pt-[calc(env(safe-area-inset-top)+4px)]">
              <h1 className="text-2xl font-bold text-gray-800">
                商品登録
              </h1>
            </header>
          </div>
        </div>

        <div className="mx-auto max-w-xl px-4 pt-[calc(env(safe-area-inset-top)+40px)]">
          <p className="text-gray-600">
            読み込み中...
          </p>
        </div>

        <BottomNav />
      </main>
    )
  }

  return (
    <main className="h-screen min-h-0 overflow-y-auto overscroll-y-auto bg-[#F7FAFA] pb-28 [-webkit-overflow-scrolling:touch]">
      <div className="fixed inset-x-0 top-0 z-40 bg-[#F7FAFA]">
        <div className="mx-auto max-w-xl px-4">
          <header className="border-b border-[#DFE9EC] pb-1 pt-[calc(env(safe-area-inset-top)+4px)]">
            <h1 className="text-2xl font-bold text-gray-800">
              商品登録
            </h1>
          </header>
        </div>
      </div>

      <div className="mx-auto max-w-xl px-4 pt-[calc(env(safe-area-inset-top)+40px)]">
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="space-y-5">
            {/* 商品名 */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                商品名
              </label>

              <input
                type="text"
                value={name}
                onChange={(e) =>
                  setName(e.target.value)
                }
                placeholder="例：○○ローション"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-800 placeholder:text-gray-400 outline-none focus:border-[#A8C6D1] focus:ring-1 focus:ring-[#A8C6D1]"
              />
            </div>

            {/* 商品ページURL */}
            <div>
              <label className="block text-sm font-semibold text-gray-700">商品ページURL</label>
              <input type="url" value={productUrl} onChange={(e) => setProductUrl(e.target.value)} placeholder="https://..." className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-800 outline-none focus:border-[#A8C6D1] focus:ring-1 focus:ring-[#A8C6D1]" />
            </div>

            {/* ブランド */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                ブランド
              </label>

              <div className="flex gap-2">
                <select
                  value={brandId}
                  onChange={(e) =>
                    setBrandId(e.target.value)
                  }
                  className="min-w-0 flex-1 appearance-none rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 outline-none focus:border-[#A8C6D1] focus:ring-1 focus:ring-[#A8C6D1]"
                >
                  <option value="">
                    ブランドを選択
                  </option>

                  {brands.map((brand) => (
                    <option
                      key={brand.id}
                      value={brand.id}
                    >
                      {brand.name}
                    </option>
                  ))}
                </select>

                <span className="pointer-events-none -ml-10 flex items-center pr-4 text-gray-400">
                  ▼
                </span>
              </div>

              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={newBrand}
                  onChange={(e) =>
                    setNewBrand(e.target.value)
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      addBrand()
                    }
                  }}
                  placeholder="新しいブランド"
                  className="min-w-0 flex-1 rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:border-[#A8C6D1] focus:ring-1 focus:ring-[#A8C6D1]"
                />

                <button
                  type="button"
                  onClick={addBrand}
                  className="shrink-0 rounded-xl border border-[#A8C6D1] px-4 py-2 text-sm font-medium text-[#647F89] transition active:scale-95 hover:bg-[#F7FAFA]"
                >
                  ＋追加
                </button>
              </div>
            </div>

            {/* カテゴリー */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                カテゴリー
              </label>

              <div className="flex gap-2">
                <select
                  value={categoryId}
                  onChange={(e) =>
                    setCategoryId(
                      e.target.value
                    )
                  }
                  className="min-w-0 flex-1 appearance-none rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 outline-none focus:border-[#A8C6D1] focus:ring-1 focus:ring-[#A8C6D1]"
                >
                  <option value="">
                    カテゴリーを選択
                  </option>

                  {categories.map(
                    (category) => (
                      <option
                        key={category.id}
                        value={category.id}
                      >
                        {category.name}
                      </option>
                    )
                  )}
                </select>

                <span className="pointer-events-none -ml-10 flex items-center pr-4 text-gray-400">
                  ▼
                </span>
              </div>

              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) =>
                    setNewCategory(
                      e.target.value
                    )
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      addCategory()
                    }
                  }}
                  placeholder="新しいカテゴリー"
                  className="min-w-0 flex-1 rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:border-[#A8C6D1] focus:ring-1 focus:ring-[#A8C6D1]"
                />

                <button
                  type="button"
                  onClick={addCategory}
                  className="shrink-0 rounded-xl border border-[#A8C6D1] px-4 py-2 text-sm font-medium text-[#647F89] transition active:scale-95 hover:bg-[#F7FAFA]"
                >
                  ＋追加
                </button>
              </div>
            </div>

            {/* 成分 */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                成分
              </label>

              {ingredients.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {ingredients.map(
                    (ingredient) => {
                      const selected =
                        selectedIngredients.includes(
                          ingredient.id
                        )

                      return (
                        <button
                          key={ingredient.id}
                          type="button"
                          onClick={() =>
                            toggleIngredient(
                              ingredient.id
                            )
                          }
                          className={`min-h-12 rounded-xl border px-3 py-3 text-left text-sm font-medium transition active:scale-[0.98] ${
                            selected
                              ? "border-[#A8C6D1] bg-[#A8C6D1] text-white"
                              : "border-gray-300 bg-white text-gray-700"
                          }`}
                        >
                          {ingredient.name}
                        </button>
                      )
                    }
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  まだ成分がありません。
                </p>
              )}

              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={newIngredient}
                  onChange={(e) =>
                    setNewIngredient(
                      e.target.value
                    )
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      addIngredient()
                    }
                  }}
                  placeholder="新しい成分"
                  className="min-w-0 flex-1 rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:border-[#A8C6D1] focus:ring-1 focus:ring-[#A8C6D1]"
                />

                <button
                  type="button"
                  onClick={addIngredient}
                  className="shrink-0 rounded-xl border border-[#A8C6D1] px-4 py-2 text-sm font-medium text-[#647F89] transition active:scale-95 hover:bg-[#F7FAFA]"
                >
                  ＋追加
                </button>
              </div>
            </div>

            {/* 効果 */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                効果
              </label>
              {effectsList.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {effectsList.map((effect) => {
                    const selected = selectedEffects.includes(effect.id)
                    return <button key={effect.id} type="button" onClick={() => toggleEffect(effect.id)}
                      className={`min-h-12 rounded-xl border px-3 py-3 text-left text-sm font-medium transition active:scale-[0.98] ${selected ? "border-[#A8C6D1] bg-[#A8C6D1] text-white" : "border-gray-300 bg-white text-gray-700"}`}>
                      {effect.name}
                    </button>
                  })}
                </div>
              ) : <p className="text-sm text-gray-500">まだ効果がありません。</p>}
              <div className="mt-3 flex gap-2">
                <input type="text" value={newEffect} onChange={(e) => setNewEffect(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void addEffect() } }}
                  placeholder="新しい効果を入力" className="min-w-0 flex-1 rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:border-[#A8C6D1] focus:ring-1 focus:ring-[#A8C6D1]" />
                <button type="button" onClick={addEffect} className="shrink-0 rounded-xl border border-[#A8C6D1] px-4 py-2 text-sm font-medium text-[#647F89] transition active:scale-95 hover:bg-[#F7FAFA]">＋追加</button>
              </div>
            </div>

            {/* 未使用ストック */}
            <div>
              <label htmlFor="stock-count" className="mb-2 block text-sm font-semibold text-gray-700">未使用ストック</label>
              <div className="flex items-center gap-3">
                <input id="stock-count" type="number" min="0" step="1" inputMode="numeric" value={stockCount} onChange={(e) => setStockCount(e.target.value)} className="w-28 rounded-xl border border-gray-300 px-4 py-3 text-center text-gray-800 outline-none focus:border-[#A8C6D1] focus:ring-1 focus:ring-[#A8C6D1]" />
                <span className="text-sm text-gray-600">個</span>
              </div>
            </div>

            {/* 過去の使用済み回数 */}
            <div>
              <label
                htmlFor="past-used-count"
                className="mb-2 block text-sm font-semibold text-gray-700"
              >
                過去の使用済み回数
              </label>

              <div className="flex items-center gap-3">
                <input
                  id="past-used-count"
                  type="number"
                  min="0"
                  max="500"
                  step="1"
                  inputMode="numeric"
                  value={pastUsedCount}
                  onChange={(e) =>
                    setPastUsedCount(
                      e.target.value
                    )
                  }
                  className="w-28 rounded-xl border border-gray-300 px-4 py-3 text-center text-gray-800 outline-none focus:border-[#A8C6D1] focus:ring-1 focus:ring-[#A8C6D1]"
                />

                <span className="text-sm text-gray-600">
                  回
                </span>
              </div>

            </div>

            {/* 朝・夜 */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                使う時間帯
              </label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setUseMorning(
                      (current) => !current
                    )
                  }
                  className={`rounded-xl border py-3 text-sm font-medium transition active:scale-[0.98] ${
                    useMorning
                      ? "border-[#A8C6D1] bg-[#A8C6D1] text-white"
                      : "border-gray-300 bg-white text-gray-700"
                  }`}
                >
                  朝
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setUseNight(
                      (current) => !current
                    )
                  }
                  className={`rounded-xl border py-3 text-sm font-medium transition active:scale-[0.98] ${
                    useNight
                      ? "border-[#A8C6D1] bg-[#A8C6D1] text-white"
                      : "border-gray-300 bg-white text-gray-700"
                  }`}
                >
                  夜
                </button>
              </div>
              {useMorning && <label className="mt-3 flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={defaultMorning} onChange={(e) => setDefaultMorning(e.target.checked)} className="h-4 w-4 accent-[#A8C6D1]" />朝の記録でデフォルトチェックする</label>}
              {useNight && <label className="mt-2 flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={defaultNight} onChange={(e) => setDefaultNight(e.target.checked)} className="h-4 w-4 accent-[#A8C6D1]" />夜の記録でデフォルトチェックする</label>}
            </div>

            {/* メッセージ */}
            {message && (
              <p className="whitespace-pre-wrap rounded-xl bg-[#F7FAFA] px-4 py-3 text-center text-sm font-medium text-[#526F7A]">
                {message}
              </p>
            )}

            {/* 登録 */}
            <button
              type="button"
              onClick={saveProduct}
              disabled={saving}
              className="w-full rounded-2xl bg-[#A8C6D1] py-4 text-base font-bold text-white shadow-sm transition active:scale-[0.99] hover:bg-[#8FB5C2] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "登録中..."
                : "商品を登録"}
            </button>
          </div>
        </section>

        <div className="h-8" />
      </div>

      <BottomNav />
    </main>
  )
}