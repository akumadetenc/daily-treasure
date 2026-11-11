"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import BottomNav from "../../components/BottomNav"

type MasterItem = {
  id: string
  name: string
  sort_order: number
}

const japaneseNameSort = <T extends { name: string }>(items: T[]): T[] =>
  [...items].sort((a, b) => a.name.localeCompare(b.name, "ja", { sensitivity: "base" }))

export default function CosmeticsSettingsPage() {
  const supabase = createClient()

  const [brands, setBrands] = useState<MasterItem[]>([])
  const [categories, setCategories] = useState<MasterItem[]>([])
  const [ingredients, setIngredients] = useState<MasterItem[]>([])

  const [newBrand, setNewBrand] = useState("")
  const [newCategory, setNewCategory] = useState("")
  const [newIngredient, setNewIngredient] = useState("")

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)

    const [
      { data: brandData, error: brandError },
      { data: categoryData, error: categoryError },
      { data: ingredientData, error: ingredientError },
    ] = await Promise.all([
      supabase
        .from("skincare_brands")
        .select("id, name, sort_order")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),

      supabase
        .from("skincare_categories")
        .select("id, name, sort_order")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),

      supabase
        .from("ingredients")
        .select("id, name, sort_order")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),
    ])

    if (brandError) {
      console.error(brandError)
      alert(
        `ブランドの読み込みに失敗しました。\n${brandError.message}`
      )
    }

    if (categoryError) {
      console.error(categoryError)
      alert(
        `カテゴリーの読み込みに失敗しました。\n${categoryError.message}`
      )
    }

    if (ingredientError) {
      console.error(ingredientError)
      alert(
        `成分の読み込みに失敗しました。\n${ingredientError.message}`
      )
    }

    setBrands(japaneseNameSort((brandData ?? []) as MasterItem[]))
    setCategories(japaneseNameSort((categoryData ?? []) as MasterItem[]))
    setIngredients(japaneseNameSort((ingredientData ?? []) as MasterItem[]))

    setLoading(false)
  }

  async function addItem(
    table:
      | "skincare_brands"
      | "skincare_categories"
      | "ingredients",
    name: string,
    setName: (value: string) => void,
    items: MasterItem[],
    setItems: (items: MasterItem[]) => void
  ) {
    const trimmed = name.trim()

    if (!trimmed) {
      return
    }

    if (
      items.some(
        (item) => item.name === trimmed
      )
    ) {
      alert("同じ名前がすでに登録されています。")
      return
    }

    const maxSortOrder =
      items.length > 0
        ? Math.max(
            ...items.map(
              (item) => item.sort_order
            )
          )
        : -1

    const { data, error } = await supabase
      .from(table)
      .insert({
        name: trimmed,
        sort_order: maxSortOrder + 1,
      })
      .select("id, name, sort_order")
      .single()

    if (error) {
      console.error(error)
      alert(
        `追加に失敗しました。\n${error.message}`
      )
      return
    }

    setItems(japaneseNameSort([...items, data as MasterItem]))

    setName("")
  }

  async function deleteItem(
    table:
      | "skincare_brands"
      | "skincare_categories"
      | "ingredients",
    item: MasterItem,
    items: MasterItem[],
    setItems: (items: MasterItem[]) => void
  ) {
    const ok = window.confirm(
      `「${item.name}」を削除しますか？`
    )

    if (!ok) {
      return
    }

    const { error } = await supabase
      .from(table)
      .delete()
      .eq("id", item.id)

    if (error) {
      console.error(error)
      alert(
        `削除できませんでした。\n\nこの項目が登録済みの商品で使われている可能性があります。\n\n${error.message}`
      )
      return
    }

    setItems(japaneseNameSort(items.filter((current) => current.id !== item.id)))
  }

  async function moveItem(
    table:
      | "skincare_brands"
      | "skincare_categories"
      | "ingredients",
    index: number,
    direction: "up" | "down",
    items: MasterItem[],
    setItems: (items: MasterItem[]) => void
  ) {
    const targetIndex =
      direction === "up"
        ? index - 1
        : index + 1

    if (
      targetIndex < 0 ||
      targetIndex >= items.length
    ) {
      return
    }

    const current = items[index]
    const target = items[targetIndex]

    const currentSort =
      current.sort_order
    const targetSort =
      target.sort_order

    const { error: currentError } =
      await supabase
        .from(table)
        .update({
          sort_order: targetSort,
        })
        .eq("id", current.id)

    if (currentError) {
      console.error(currentError)
      alert(
        `並び替えに失敗しました。\n${currentError.message}`
      )
      return
    }

    const { error: targetError } =
      await supabase
        .from(table)
        .update({
          sort_order: currentSort,
        })
        .eq("id", target.id)

    if (targetError) {
      await supabase
        .from(table)
        .update({
          sort_order: currentSort,
        })
        .eq("id", current.id)

      console.error(targetError)
      alert(
        `並び替えに失敗しました。\n${targetError.message}`
      )
      return
    }

    const newItems = [...items]

    newItems[index] = {
      ...current,
      sort_order: targetSort,
    }

    newItems[targetIndex] = {
      ...target,
      sort_order: currentSort,
    }

    newItems.sort((a, b) => {
      if (
        a.sort_order !== b.sort_order
      ) {
        return (
          a.sort_order - b.sort_order
        )
      }

      return a.name.localeCompare(
        b.name,
        "ja"
      )
    })

    setItems(japaneseNameSort(newItems))
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F7FAFA] pb-28">
        <div className="fixed inset-x-0 top-0 z-40 bg-[#F7FAFA]">
          <div className="mx-auto max-w-xl px-4">
            <header className="border-b border-[#DFE9EC] pb-1 pt-[calc(env(safe-area-inset-top)+4px)]">
              <h1 className="text-2xl font-bold text-gray-800">
                設定編集
              </h1>
            </header>
          </div>
        </div>

        <div className="mx-auto max-w-xl px-4 pt-[calc(env(safe-area-inset-top)+40px)]">
          <p className="text-sm text-gray-500">
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
              設定編集
            </h1>
          </header>
        </div>
      </div>

      <div className="mx-auto max-w-xl px-4 pt-[calc(env(safe-area-inset-top)+40px)]">
        {/* ブランド */}
        <section className="mt-2">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="text-base font-bold text-gray-800">
              ブランド
            </h2>

            <div className="mt-4 flex gap-2">
              <input
                type="text"
                value={newBrand}
                onChange={(e) =>
                  setNewBrand(e.target.value)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()

                    addItem(
                      "skincare_brands",
                      newBrand,
                      setNewBrand,
                      brands,
                      setBrands
                    )
                  }
                }}
                placeholder="ブランド名"
                className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700 outline-none placeholder:text-gray-400 focus:border-[#A8C6D1]"
              />

              <button
                type="button"
                onClick={() =>
                  addItem(
                    "skincare_brands",
                    newBrand,
                    setNewBrand,
                    brands,
                    setBrands
                  )
                }
                className="shrink-0 rounded-xl bg-[#A8C6D1] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#8FB5C2]"
              >
                追加
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {brands.map(
                (item, index) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 rounded-xl bg-[#F7FAFA] px-3 py-2.5"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-700">
                      {item.name}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        moveItem(
                          "skincare_brands",
                          index,
                          "up",
                          brands,
                          setBrands
                        )
                      }
                      disabled={
                        index === 0
                      }
                      className="h-8 w-8 shrink-0 rounded-lg border border-[#D6E6EA] bg-white text-sm font-bold text-[#647F89] disabled:opacity-30"
                      aria-label="上へ"
                    >
                      ↑
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        moveItem(
                          "skincare_brands",
                          index,
                          "down",
                          brands,
                          setBrands
                        )
                      }
                      disabled={
                        index ===
                        brands.length - 1
                      }
                      className="h-8 w-8 shrink-0 rounded-lg border border-[#D6E6EA] bg-white text-sm font-bold text-[#647F89] disabled:opacity-30"
                      aria-label="下へ"
                    >
                      ↓
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        deleteItem(
                          "skincare_brands",
                          item,
                          brands,
                          setBrands
                        )
                      }
                      className="h-8 shrink-0 rounded-lg border border-red-200 bg-white px-3 text-xs font-bold text-red-500"
                    >
                      削除
                    </button>
                  </div>
                )
              )}

              {brands.length === 0 && (
                <p className="py-2 text-sm text-gray-400">
                  まだ登録されていません。
                </p>
              )}
            </div>
          </div>
        </section>

        {/* カテゴリー */}
        <section className="mt-4">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="text-base font-bold text-gray-800">
              カテゴリー
            </h2>

            <div className="mt-4 flex gap-2">
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

                    addItem(
                      "skincare_categories",
                      newCategory,
                      setNewCategory,
                      categories,
                      setCategories
                    )
                  }
                }}
                placeholder="カテゴリー名"
                className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700 outline-none placeholder:text-gray-400 focus:border-[#A8C6D1]"
              />

              <button
                type="button"
                onClick={() =>
                  addItem(
                    "skincare_categories",
                    newCategory,
                    setNewCategory,
                    categories,
                    setCategories
                  )
                }
                className="shrink-0 rounded-xl bg-[#A8C6D1] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#8FB5C2]"
              >
                追加
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {categories.map(
                (item, index) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 rounded-xl bg-[#F7FAFA] px-3 py-2.5"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-700">
                      {item.name}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        moveItem(
                          "skincare_categories",
                          index,
                          "up",
                          categories,
                          setCategories
                        )
                      }
                      disabled={
                        index === 0
                      }
                      className="h-8 w-8 shrink-0 rounded-lg border border-[#D6E6EA] bg-white text-sm font-bold text-[#647F89] disabled:opacity-30"
                      aria-label="上へ"
                    >
                      ↑
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        moveItem(
                          "skincare_categories",
                          index,
                          "down",
                          categories,
                          setCategories
                        )
                      }
                      disabled={
                        index ===
                        categories.length - 1
                      }
                      className="h-8 w-8 shrink-0 rounded-lg border border-[#D6E6EA] bg-white text-sm font-bold text-[#647F89] disabled:opacity-30"
                      aria-label="下へ"
                    >
                      ↓
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        deleteItem(
                          "skincare_categories",
                          item,
                          categories,
                          setCategories
                        )
                      }
                      className="h-8 shrink-0 rounded-lg border border-red-200 bg-white px-3 text-xs font-bold text-red-500"
                    >
                      削除
                    </button>
                  </div>
                )
              )}

              {categories.length === 0 && (
                <p className="py-2 text-sm text-gray-400">
                  まだ登録されていません。
                </p>
              )}
            </div>
          </div>
        </section>

        {/* 成分 */}
        <section className="mt-4">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="text-base font-bold text-gray-800">
              成分
            </h2>

            <div className="mt-4 flex gap-2">
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

                    addItem(
                      "ingredients",
                      newIngredient,
                      setNewIngredient,
                      ingredients,
                      setIngredients
                    )
                  }
                }}
                placeholder="成分名"
                className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700 outline-none placeholder:text-gray-400 focus:border-[#A8C6D1]"
              />

              <button
                type="button"
                onClick={() =>
                  addItem(
                    "ingredients",
                    newIngredient,
                    setNewIngredient,
                    ingredients,
                    setIngredients
                  )
                }
                className="shrink-0 rounded-xl bg-[#A8C6D1] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#8FB5C2]"
              >
                追加
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {ingredients.map(
                (item, index) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 rounded-xl bg-[#F7FAFA] px-3 py-2.5"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-700">
                      {item.name}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        moveItem(
                          "ingredients",
                          index,
                          "up",
                          ingredients,
                          setIngredients
                        )
                      }
                      disabled={
                        index === 0
                      }
                      className="h-8 w-8 shrink-0 rounded-lg border border-[#D6E6EA] bg-white text-sm font-bold text-[#647F89] disabled:opacity-30"
                      aria-label="上へ"
                    >
                      ↑
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        moveItem(
                          "ingredients",
                          index,
                          "down",
                          ingredients,
                          setIngredients
                        )
                      }
                      disabled={
                        index ===
                        ingredients.length - 1
                      }
                      className="h-8 w-8 shrink-0 rounded-lg border border-[#D6E6EA] bg-white text-sm font-bold text-[#647F89] disabled:opacity-30"
                      aria-label="下へ"
                    >
                      ↓
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        deleteItem(
                          "ingredients",
                          item,
                          ingredients,
                          setIngredients
                        )
                      }
                      className="h-8 shrink-0 rounded-lg border border-red-200 bg-white px-3 text-xs font-bold text-red-500"
                    >
                      削除
                    </button>
                  </div>
                )
              )}

              {ingredients.length === 0 && (
                <p className="py-2 text-sm text-gray-400">
                  まだ登録されていません。
                </p>
              )}
            </div>
          </div>
        </section>
      </div>

      <BottomNav />
    </main>
  )
}