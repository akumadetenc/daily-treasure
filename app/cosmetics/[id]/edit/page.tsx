"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import BottomNav from "../../../components/BottomNav"

type Brand = {
  id: string
  name: string
  sort_order: number
}

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

type Effect = { id: string; name: string; sort_order: number }

const japaneseNameSort = <T extends { name: string }>(items: T[]): T[] =>
  [...items].sort((a, b) => a.name.localeCompare(b.name, "ja", { sensitivity: "base" }))

type ProductEffect = { product_id: string; effect_id: string }

type ProductIngredient = {
  product_id: string
  ingredient_id: string
}

type Product = {
  id: string
  name: string
  brand: string | null
  product_url: string | null
  category_id: string
  status: "未使用" | "使用中" | "使用済"
  stock_count: number
  started_at: string | null
  finished_at: string | null
  rating: number | null
  repeat_status: "リピあり" | "あるかも" | "なし" | null
  impression: string | null
  use_morning: boolean
  use_night: boolean
  default_morning: boolean
  default_night: boolean
}

export default function EditProductPage() {
  const supabase = createClient()
  const params = useParams()
  const router = useRouter()

  const productId = params.id as string

  const [product, setProduct] = useState<Product | null>(null)

  const [brands, setBrands] = useState<Brand[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [effectsList, setEffectsList] = useState<Effect[]>([])
  const [selectedEffects, setSelectedEffects] = useState<string[]>([])
  const [productEffects, setProductEffects] = useState<ProductEffect[]>([])
  const [newEffect, setNewEffect] = useState("")

  const [name, setName] = useState("")
  const [productUrl, setProductUrl] = useState("")
  const [effects, setEffects] = useState("")
  const [brandId, setBrandId] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [stockCount, setStockCount] = useState("0")

  const [startedAt, setStartedAt] = useState("")
  const [finishedAt, setFinishedAt] = useState("")

  const [selectedIngredients, setSelectedIngredients] =
    useState<string[]>([])

  const [useMorning, setUseMorning] = useState(false)
  const [useNight, setUseNight] = useState(false)
  const [defaultMorning, setDefaultMorning] = useState(false)
  const [defaultNight, setDefaultNight] = useState(false)

  const [rating, setRating] = useState<number | null>(null)

  const [repeatStatus, setRepeatStatus] = useState<
    "リピあり" | "あるかも" | "なし" | null
  >(null)

  const [impression, setImpression] = useState("")

  const [newBrand, setNewBrand] = useState("")
  const [newCategory, setNewCategory] = useState("")
  const [newIngredient, setNewIngredient] = useState("")

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (productId) {
      loadData()
    }
  }, [productId])

  async function loadData() {
    setLoading(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.push("/login")
      return
    }

    const [
      productResult,
      brandResult,
      categoryResult,
      ingredientResult,
      productIngredientResult,
      effectResult,
      productEffectResult,
    ] = await Promise.all([
      supabase
        .from("skincare_products")
        .select(
          "id, name, brand, product_url, category_id, status, stock_count, started_at, finished_at, rating, repeat_status, impression, use_morning, use_night, default_morning, default_night"
        )
        .eq("id", productId)
        .eq("user_id", user.id)
        .maybeSingle(),

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
        .from("skincare_product_ingredients")
        .select("product_id, ingredient_id")
        .eq("product_id", productId),

      supabase.from("skincare_effects").select("id, name, sort_order").eq("user_id", user.id).order("sort_order").order("name"),
      supabase.from("skincare_product_effects").select("product_id, effect_id").eq("product_id", productId),
    ])

    if (productResult.error || !productResult.data) {
      console.error(productResult.error)
      alert("商品を読み込めませんでした。")
      router.push("/cosmetics")
      return
    }

    if (brandResult.error) {
      console.error(brandResult.error)
    }

    if (categoryResult.error) {
      console.error(categoryResult.error)
    }

    if (ingredientResult.error) {
      console.error(ingredientResult.error)
    }

    if (productIngredientResult.error) {
      console.error(productIngredientResult.error)
    }

    const productData = productResult.data as Product

    setProduct(productData)

    setName(productData.name)
    setProductUrl(productData.product_url ?? "")
    setEffects((productData as Product & { effects?: string | null }).effects ?? "")

    const currentBrand = (brandResult.data ?? []).find(
      (item) => item.name === productData.brand
    )

    setBrandId(currentBrand?.id ?? "")

    setCategoryId(productData.category_id)
    setStockCount(String(productData.stock_count ?? 0))

    setStartedAt(productData.started_at ?? "")
    setFinishedAt(productData.finished_at ?? "")

    setUseMorning(productData.use_morning ?? false)
    setUseNight(productData.use_night ?? false)
    setDefaultMorning(productData.default_morning ?? productData.use_morning ?? false)
    setDefaultNight(productData.default_night ?? productData.use_night ?? false)

    setRating(productData.rating)
    setRepeatStatus(productData.repeat_status)
    setImpression(productData.impression ?? "")

    const productIngredientData =
      (productIngredientResult.data ?? []) as ProductIngredient[]

    setSelectedIngredients(
      productIngredientData.map(
        (item) => item.ingredient_id
      )
    )
    setEffectsList(japaneseNameSort((effectResult.data ?? []) as Effect[]))
    const loadedProductEffects = (productEffectResult.data ?? []) as ProductEffect[]
    setProductEffects(loadedProductEffects)
    setSelectedEffects(loadedProductEffects.map((item) => item.effect_id))

    setBrands(japaneseNameSort((brandResult.data ?? []) as Brand[]))

    setCategories(japaneseNameSort((categoryResult.data ?? []) as Category[]))

    setIngredients(japaneseNameSort((ingredientResult.data ?? []) as Ingredient[]))

    setLoading(false)
  }

  async function addEffect() {
    const effectName = newEffect.trim()
    if (!effectName) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { alert("ログインしてください。"); return }
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
    if (error) { console.error(error); alert("効果を追加できませんでした。SQLの実行状況を確認してください。"); return }
    setEffectsList((current) => japaneseNameSort([...current, data as Effect]))
    setSelectedEffects((current) => [...current, data.id])
    setNewEffect("")
  }

  function toggleEffect(id: string) {
    setSelectedEffects((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  }

  function toggleIngredient(id: string) {
    setSelectedIngredients((current) => {
      if (current.includes(id)) {
        return current.filter(
          (item) => item !== id
        )
      }

      return [...current, id]
    })
  }

  async function addBrand() {
    const brandName = newBrand.trim()

    if (!brandName) {
      return
    }

    const existing = brands.find(
      (item) =>
        item.name.toLowerCase() ===
        brandName.toLowerCase()
    )

    if (existing) {
      setBrandId(existing.id)
      setNewBrand("")
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      alert("ログインしてください。")
      return
    }

    const maxSortOrder =
      brands.length > 0
        ? Math.max(
            ...brands.map(
              (item) => item.sort_order
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
      alert(
        `ブランドの追加に失敗しました。\n${error.message}`
      )
      return
    }

    setBrands((current) => japaneseNameSort([...current, data as Brand]))

    setBrandId(data.id)
    setNewBrand("")
  }

  async function addCategory() {
    const categoryName = newCategory.trim()

    if (!categoryName) {
      return
    }

    const existing = categories.find(
      (item) =>
        item.name.toLowerCase() ===
        categoryName.toLowerCase()
    )

    if (existing) {
      setCategoryId(existing.id)
      setNewCategory("")
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      alert("ログインしてください。")
      return
    }

    const maxSortOrder =
      categories.length > 0
        ? Math.max(
            ...categories.map(
              (item) => item.sort_order
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
      alert(
        `カテゴリーの追加に失敗しました。\n${error.message}`
      )
      return
    }

    setCategories((current) => japaneseNameSort([...current, data as Category]))

    setCategoryId(data.id)
    setNewCategory("")
  }

  async function addIngredient() {
    const ingredientName =
      newIngredient.trim()

    if (!ingredientName) {
      return
    }

    const existing = ingredients.find(
      (ingredient) =>
        ingredient.name.toLowerCase() ===
        ingredientName.toLowerCase()
    )

    if (existing) {
      if (
        !selectedIngredients.includes(
          existing.id
        )
      ) {
        setSelectedIngredients((current) => [
          ...current,
          existing.id,
        ])
      }

      setNewIngredient("")
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      alert("ログインしてください。")
      return
    }

    const maxSortOrder =
      ingredients.length > 0
        ? Math.max(
            ...ingredients.map(
              (item) => item.sort_order
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
      alert(
        `成分の追加に失敗しました。\n${error.message}`
      )
      return
    }

    setIngredients((current) => japaneseNameSort([...current, data as Ingredient]))

    setSelectedIngredients((current) => [
      ...current,
      data.id,
    ])

    setNewIngredient("")
  }

  async function deleteIngredient(id: string) {
    const target = ingredients.find(
      (item) => item.id === id
    )

    if (!target) {
      return
    }

    setSelectedIngredients((current) =>
      current.filter((item) => item !== id)
    )

    const { error } = await supabase
      .from("ingredients")
      .delete()
      .eq("id", id)

    if (error) {
      console.error(error)

      setSelectedIngredients((current) =>
        current.includes(id)
          ? current
          : [...current, id]
      )

      alert(
        `成分の削除に失敗しました。\n${error.message}`
      )
      return
    }

    setIngredients((current) =>
      current.filter((item) => item.id !== id)
    )
  }

  function ratingClass(value: number) {
    switch (value) {
      case 1:
        return "border-blue-300 bg-blue-100 text-blue-700"
      case 2:
        return "border-green-300 bg-green-100 text-green-700"
      case 3:
        return "border-yellow-300 bg-yellow-100 text-yellow-800"
      case 4:
        return "border-pink-300 bg-pink-100 text-pink-700"
      case 5:
        return "border-red-300 bg-red-100 text-red-700"
      default:
        return "border-gray-200 bg-white text-gray-600"
    }
  }

  async function save() {
    if (!product) {
      return
    }

    if (!name.trim()) {
      alert("商品名を入力してください。")
      return
    }

    if (!brandId) {
      alert("ブランドを選択してください。")
      return
    }

    if (!categoryId) {
      alert("カテゴリーを選択してください。")
      return
    }

    if (
      startedAt &&
      finishedAt &&
      finishedAt < startedAt
    ) {
      alert(
        "使用終了日は使用開始日以降の日付にしてください。"
      )
      return
    }

    if (product.status === "使用済" && !rating) {
      alert("評価を選択してください。")
      return
    }

    if (
      product.status === "使用済" &&
      !repeatStatus
    ) {
      alert("リピートを選択してください。")
      return
    }

    setSaving(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      alert("ログインしてください。")
      setSaving(false)
      return
    }

    const selectedBrand = brands.find(
      (item) => item.id === brandId
    )

    const { error: productError } =
      await supabase
        .from("skincare_products")
        .update({
          name: name.trim(),
          brand: selectedBrand?.name ?? null,
          product_url: productUrl.trim() || null,
          effects: effects.trim() || null,
          category_id: categoryId,
          stock_count: Math.max(0, Number.parseInt(stockCount, 10) || 0),

          started_at: startedAt || null,
          finished_at: finishedAt || null,

          use_morning: useMorning,
          use_night: useNight,
          default_morning: useMorning && defaultMorning,
          default_night: useNight && defaultNight,

          ...(product.status === "使用済"
            ? {
                rating,
                repeat_status: repeatStatus,
                impression:
                  impression.trim() || null,
              }
            : {}),
        })
        .eq("id", productId)
        .eq("user_id", user.id)

    if (productError) {
      console.error(productError)
      alert(
        `商品の更新に失敗しました。\n${productError.message}`
      )
      setSaving(false)
      return
    }

    const {
      error: deleteIngredientsError,
    } = await supabase
      .from("skincare_product_ingredients")
      .delete()
      .eq("product_id", productId)

    if (deleteIngredientsError) {
      console.error(deleteIngredientsError)
      alert(
        `成分情報の更新に失敗しました。\n${deleteIngredientsError.message}`
      )
      setSaving(false)
      return
    }

    if (selectedIngredients.length > 0) {
      const rows = selectedIngredients.map(
        (ingredientId) => ({
          product_id: productId,
          ingredient_id: ingredientId,
        })
      )

      const {
        error: insertIngredientsError,
      } = await supabase
        .from("skincare_product_ingredients")
        .insert(rows)

      if (insertIngredientsError) {
        console.error(
          insertIngredientsError
        )
        alert(
          `成分情報の保存に失敗しました。\n${insertIngredientsError.message}`
        )
        setSaving(false)
        return
      }
    }

    const { error: deleteEffectsError } = await supabase.from("skincare_product_effects").delete().eq("product_id", productId)
    if (deleteEffectsError) {
      console.error(deleteEffectsError)
      alert(`効果情報の更新に失敗しました。\\n${deleteEffectsError.message}`)
      setSaving(false)
      return
    }
    if (selectedEffects.length > 0) {
      const { error: insertEffectsError } = await supabase.from("skincare_product_effects")
        .insert(selectedEffects.map((effectId) => ({ product_id: productId, effect_id: effectId })))
      if (insertEffectsError) {
        console.error(insertEffectsError)
        alert(`効果情報の保存に失敗しました。\\n${insertEffectsError.message}`)
        setSaving(false)
        return
      }
    }

    router.push(`/cosmetics/${productId}`)
    router.refresh()
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F7FAFA] pb-28">
        <div className="fixed inset-x-0 top-0 z-40 bg-[#F7FAFA]">
          <div className="mx-auto max-w-xl px-4">
            <header className="border-b border-[#DFE9EC] pb-1 pt-[calc(env(safe-area-inset-top)+4px)]">
              <h1 className="text-2xl font-bold text-gray-800">
                商品を編集
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
    <main className="min-h-screen bg-[#F7FAFA] pb-28">
      <div className="fixed inset-x-0 top-0 z-40 bg-[#F7FAFA]">
        <div className="mx-auto max-w-xl px-4">
          <header className="border-b border-[#DFE9EC] pb-1 pt-[calc(env(safe-area-inset-top)+4px)]">
            <h1 className="text-2xl font-bold text-gray-800">
              商品を編集
            </h1>
          </header>
        </div>
      </div>

      <div className="mx-auto max-w-xl px-4 pt-[calc(env(safe-area-inset-top)+40px)]">
        <div className="space-y-5 rounded-2xl bg-white p-5 shadow-sm">
          {/* 商品名 */}
          <div>
            <label className="block text-sm font-bold text-gray-700">
              商品名
            </label>

            <input
              type="text"
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
              className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700 outline-none focus:border-[#A8C6D1]"
            />
          </div>

          {/* 商品ページURL */}
          <div>
            <label className="block text-sm font-bold text-gray-700">
              商品ページURL
            </label>
            <input
              type="url"
              value={productUrl}
              onChange={(e) => setProductUrl(e.target.value)}
              placeholder="https://..."
              className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700 outline-none focus:border-[#A8C6D1]"
            />
          </div>

          {/* ブランド */}
          <div>
            <label className="mb-2 block text-sm font-bold text-gray-700">
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

          {/* 未使用ストック */}
          <div>
            <label className="block text-sm font-bold text-gray-700">
              未使用ストック数
            </label>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={stockCount}
                onChange={(e) =>
                  setStockCount(e.target.value.replace(/[^0-9]/g, ""))
                }
                className="w-28 rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700 outline-none focus:border-[#A8C6D1]"
              />
              <span className="text-sm text-gray-600">個（未使用分）</span>
            </div>
            <p className="mt-1 text-xs text-gray-400">
              使用開始すると1個減ります。
            </p>
          </div>

          {/* カテゴリー */}
          <div>
            <label className="mb-2 block text-sm font-bold text-gray-700">
              カテゴリー
            </label>

            <div className="flex gap-2">
              <select
                value={categoryId}
                onChange={(e) =>
                  setCategoryId(e.target.value)
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
                  setNewCategory(e.target.value)
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
            <label className="block text-sm font-bold text-gray-700">
              成分
            </label>

            {ingredients.length > 0 && (
              <div className="mt-2 grid grid-cols-2 gap-2">
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
                            ? "border-[#F4B78C] bg-[#F4B78C] text-[#704A32]"
                            : "border-gray-300 bg-white text-gray-700"
                        }`}
                      >
                        {ingredient.name}
                      </button>
                    )
                  }
                )}
              </div>
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
                className="min-w-0 flex-1 rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:border-[#D9A078] focus:ring-1 focus:ring-[#D9A078]"
              />

              <button
                type="button"
                onClick={addIngredient}
                className="shrink-0 rounded-xl border border-[#D9A078] px-4 py-2 text-sm font-medium text-[#B77B4F] transition active:scale-95 hover:bg-[#F8EBDD]"
              >
                ＋追加
              </button>
            </div>

            {ingredients.length === 0 && (
              <p className="mt-2 text-sm text-gray-500">
                まだ成分がありません。
              </p>
            )}
          </div>

          {/* 効果 */}
          <div>
            <label className="block text-sm font-bold text-gray-700">効果</label>
            {effectsList.length > 0 && <div className="mt-2 grid grid-cols-2 gap-2">
              {effectsList.map((effect) => {
                const selected = selectedEffects.includes(effect.id)
                return <button key={effect.id} type="button" onClick={() => toggleEffect(effect.id)}
                  className={`min-h-12 rounded-xl border px-3 py-3 text-left text-sm font-medium transition ${selected ? "border-[#A8C6D1] bg-[#A8C6D1] text-white" : "border-gray-300 bg-white text-gray-700"}`}>
                  {effect.name}
                </button>
              })}
            </div>}
            <div className="mt-3 flex gap-2">
              <input type="text" value={newEffect} onChange={(e) => setNewEffect(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void addEffect() } }}
                placeholder="新しい効果を入力" className="min-w-0 flex-1 rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:border-[#A8C6D1] focus:ring-1 focus:ring-[#A8C6D1]" />
              <button type="button" onClick={addEffect} className="shrink-0 rounded-xl border border-[#A8C6D1] px-4 py-2 text-sm font-medium text-[#647F89] transition active:scale-95 hover:bg-[#F7FAFA]">＋追加</button>
            </div>
          </div>

          {/* 使用期間 */}
          <div className="border-t border-gray-100 pt-5">
            <h2 className="text-lg font-bold text-gray-800">
              使用期間
            </h2>

            <div className="mt-4">
              <label className="block text-sm font-bold text-gray-700">
                使用開始日
              </label>

              <input
                type="date"
                value={startedAt}
                onChange={(e) =>
                  setStartedAt(e.target.value)
                }
                className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700 outline-none focus:border-[#A8C6D1]"
              />

              {startedAt && (
                <button
                  type="button"
                  onClick={() => setStartedAt("")}
                  className="mt-2 text-xs font-semibold text-gray-500 underline"
                >
                  日付を空欄にする
                </button>
              )}
            </div>

            <div className="mt-4">
              <label className="block text-sm font-bold text-gray-700">
                使用終了日
              </label>

              <input
                type="date"
                value={finishedAt}
                onChange={(e) =>
                  setFinishedAt(e.target.value)
                }
                className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700 outline-none focus:border-[#A8C6D1]"
              />

              {finishedAt && (
                <button
                  type="button"
                  onClick={() => setFinishedAt("")}
                  className="mt-2 text-xs font-semibold text-gray-500 underline"
                >
                  日付を空欄にする
                </button>
              )}
            </div>
          </div>

          {/* 使用時間 */}
          <div className="border-t border-gray-100 pt-5">
            <label className="block text-sm font-bold text-gray-700">
              使用時間
            </label>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  setUseMorning(
                    (current) => !current
                  )
                }
                className={`rounded-xl border py-3 text-sm font-bold transition active:scale-[0.98] ${
                  useMorning
                    ? "border-[#A8C6D1] bg-[#A8C6D1] text-white"
                    : "border-gray-200 bg-white text-gray-600 hover:bg-[#F7FAFA]"
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
                className={`rounded-xl border py-3 text-sm font-bold transition active:scale-[0.98] ${
                  useNight
                    ? "border-[#A8C6D1] bg-[#A8C6D1] text-white"
                    : "border-gray-200 bg-white text-gray-600 hover:bg-[#F7FAFA]"
                }`}
              >
                夜
              </button>
            </div>
            {useMorning && <label className="mt-3 flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={defaultMorning} onChange={(e) => setDefaultMorning(e.target.checked)} className="h-4 w-4 accent-[#A8C6D1]" />朝の記録でデフォルトチェックする</label>}
            {useNight && <label className="mt-2 flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={defaultNight} onChange={(e) => setDefaultNight(e.target.checked)} className="h-4 w-4 accent-[#A8C6D1]" />夜の記録でデフォルトチェックする</label>}
          </div>

          {/* 使用後の記録 */}
          {product?.status === "使用済" && (
            <div className="border-t border-gray-100 pt-5">
              <h2 className="text-lg font-bold text-gray-800">
                使用後の記録
              </h2>

              {/* 評価 */}
              <div className="mt-5">
                <label className="block text-sm font-bold text-gray-700">
                  評価
                </label>

                <div className="mt-3 grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map(
                    (value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() =>
                          setRating(value)
                        }
                        className={`rounded-xl border py-3 text-sm font-semibold transition ${
                          rating === value
                            ? ratingClass(value)
                            : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {value}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* リピート */}
              <div className="mt-5">
                <label className="block text-sm font-bold text-gray-700">
                  リピート
                </label>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  {([
                    { value: "リピあり", label: "あり" },
                    { value: "あるかも", label: "検討" },
                    { value: "なし", label: "なし" },
                  ] as const).map((option) => {
                    const selected = repeatStatus === option.value

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setRepeatStatus(option.value)}
                        className={`rounded-xl border px-2 py-3 text-sm font-semibold transition ${
                          selected
                            ? "border-[#A8C6D1] bg-[#A8C6D1] text-white"
                            : "border-gray-200 bg-white text-gray-600 hover:bg-[#F7FAFA]"
                        }`}
                      >
                        {option.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* 総評 */}
              <div className="mt-5">
                <label className="block text-sm font-bold text-gray-700">
                  総評
                </label>

                <textarea
                  value={impression}
                  onChange={(e) =>
                    setImpression(e.target.value)
                  }
                  rows={5}
                  className="mt-2 w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm leading-relaxed text-gray-700 outline-none focus:border-[#A8C6D1]"
                />
              </div>
            </div>
          )}

          {/* 保存 */}
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="w-full rounded-xl bg-[#A8C6D1] py-3.5 text-sm font-bold text-white transition hover:bg-[#8FB5C2] disabled:opacity-50"
          >
            {saving ? "保存中..." : "保存"}
          </button>

          {/* キャンセル */}
          <button
            type="button"
            onClick={() =>
              router.push(`/cosmetics/${productId}`)
            }
            className="w-full rounded-xl border border-gray-200 bg-white py-3 text-sm font-semibold text-gray-500"
          >
            キャンセル
          </button>
        </div>
      </div>

      <BottomNav />
    </main>
  )
}