"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/utils/supabase/client"
import BottomNav from "../../components/BottomNav"

type ProductStatus = "未使用" | "使用中" | "使用済"

type RepeatStatus = "リピあり" | "あるかも" | "なし"

type Product = {
  id: string
  name: string
  brand: string | null
  category_id: string
  status: ProductStatus
  started_at: string | null
  finished_at: string | null
  rating: number | null
  repeat_status: RepeatStatus | null
  impression: string | null
  use_morning: boolean
  use_night: boolean
}

type Category = {
  id: string
  name: string
}

type Ingredient = {
  id: string
  name: string
}

type ProductIngredient = {
  ingredient_id: string
}

type ProductNote = {
  id: string
  note: string
  note_date: string
}

type UsagePeriod = {
  id: string
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

export default function ProductDetailPage() {
  const supabase = createClient()
  const params = useParams()
  const router = useRouter()

  const productId = params.id as string

  const [product, setProduct] = useState<Product | null>(null)
  const [category, setCategory] = useState<Category | null>(null)
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [notes, setNotes] = useState<ProductNote[]>([])
  const [usagePeriods, setUsagePeriods] = useState<UsagePeriod[]>([])

  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  const [repeatOpen, setRepeatOpen] = useState(false)
  const [savingRepeat, setSavingRepeat] = useState(false)

  // 使用履歴の個別編集
  const [editingPeriodId, setEditingPeriodId] = useState<string | null>(
    null
  )
  const [editingStartedAt, setEditingStartedAt] = useState("")
  const [editingFinishedAt, setEditingFinishedAt] = useState("")
  const [savingPeriod, setSavingPeriod] = useState(false)

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

    const { data: productData, error: productError } =
      await supabase
        .from("skincare_products")
        .select(
          "id, name, brand, category_id, status, started_at, finished_at, rating, repeat_status, impression, use_morning, use_night"
        )
        .eq("id", productId)
        .eq("user_id", user.id)
        .maybeSingle()

    if (productError || !productData) {
      console.error(productError)
      alert("商品を読み込めませんでした。")
      router.push("/cosmetics")
      return
    }

    setProduct(productData as Product)

    const [
      categoryResult,
      productIngredientResult,
      notesResult,
      usagePeriodsResult,
    ] = await Promise.all([
      supabase
        .from("skincare_categories")
        .select("id, name")
        .eq("id", productData.category_id)
        .maybeSingle(),

      supabase
        .from("skincare_product_ingredients")
        .select("ingredient_id")
        .eq("product_id", productId),

      supabase
        .from("skincare_product_notes")
        .select("id, note, note_date")
        .eq("product_id", productId)
        .order("note_date", {
          ascending: false,
        }),

      supabase
        .from("skincare_product_usage_periods")
        .select(
          "id, started_at, finished_at, status, rating, repeat_status, impression, use_morning, use_night, created_at"
        )
        .eq("product_id", productId)
        .eq("user_id", user.id)
        .order("started_at", {
          ascending: false,
          nullsFirst: false,
        })
        .order("created_at", {
          ascending: false,
        }),
    ])

    if (categoryResult.error) {
      console.error(categoryResult.error)
    }

    if (productIngredientResult.error) {
      console.error(productIngredientResult.error)
    }

    if (notesResult.error) {
      console.error(notesResult.error)
    }

    if (usagePeriodsResult.error) {
      console.error(usagePeriodsResult.error)
    }

    setCategory(categoryResult.data)

    const productIngredients =
      (productIngredientResult.data ??
        []) as ProductIngredient[]

    if (productIngredients.length > 0) {
      const ingredientIds =
        productIngredients.map(
          (item) => item.ingredient_id
        )

      const { data: ingredientData, error } =
        await supabase
          .from("ingredients")
          .select("id, name")
          .in("id", ingredientIds)
          .order("name")

      if (error) {
        console.error(error)
      }

      setIngredients(ingredientData ?? [])
    } else {
      setIngredients([])
    }

    setNotes((notesResult.data ?? []) as ProductNote[])

    setUsagePeriods(
      (usagePeriodsResult.data ?? []) as UsagePeriod[]
    )

    setLoading(false)
  }

  function openPeriodEdit(period: UsagePeriod) {
    setEditingPeriodId(period.id)
    setEditingStartedAt(period.started_at ?? "")
    setEditingFinishedAt(period.finished_at ?? "")
  }

  function closePeriodEdit() {
    if (savingPeriod) {
      return
    }

    setEditingPeriodId(null)
    setEditingStartedAt("")
    setEditingFinishedAt("")
  }

  async function savePeriodEdit() {
    if (!editingPeriodId) {
      return
    }

    if (
      editingStartedAt &&
      editingFinishedAt &&
      editingFinishedAt < editingStartedAt
    ) {
      alert("終了日は開始日以降の日付にしてください。")
      return
    }

    setSavingPeriod(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      alert("ログインしてください。")
      setSavingPeriod(false)
      return
    }

    const { error } = await supabase
      .from("skincare_product_usage_periods")
      .update({
        started_at: editingStartedAt || null,
        finished_at: editingFinishedAt || null,
      })
      .eq("id", editingPeriodId)
      .eq("product_id", productId)
      .eq("user_id", user.id)

    if (error) {
      console.error(error)
      alert(`使用履歴の更新に失敗しました。\n${error.message}`)
      setSavingPeriod(false)
      return
    }

    setEditingPeriodId(null)
    setEditingStartedAt("")
    setEditingFinishedAt("")
    setSavingPeriod(false)

    await loadData()
  }

  async function deleteProduct() {
    if (!product) {
      return
    }

    const confirmed = window.confirm(
      `「${product.name}」を削除しますか？\n\nこの操作は取り消せません。`
    )

    if (!confirmed) {
      return
    }

    setDeleting(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      alert("ログインしてください。")
      setDeleting(false)
      return
    }

    const { error } = await supabase
      .from("skincare_products")
      .delete()
      .eq("id", productId)
      .eq("user_id", user.id)

    if (error) {
      console.error(error)
      alert(
        `商品の削除に失敗しました。\n${error.message}`
      )
      setDeleting(false)
      return
    }

    router.push("/cosmetics")
    router.refresh()
  }

  function formatDate(date: string | null) {
    if (!date) {
      return "―"
    }

    const [year, month, day] = date.split("-")

    if (!year || !month || !day) {
      return date
    }

    return `${year}/${month}/${day}`
  }

  function displayRepeatStatus(
    status: RepeatStatus | null
  ) {
    if (!status) {
      return "―"
    }

    if (status === "あるかも") {
      return "リピあるかも"
    }

    if (status === "なし") {
      return "リピなし"
    }

    return "リピあり"
  }

  function statusClass(status: ProductStatus) {
    if (status === "未使用") {
      return "bg-gray-100 text-gray-600"
    }

    if (status === "使用中") {
      return "bg-[#F4B78C] text-[#8E542E]"
    }

    return "bg-[#A8C6D1] text-[#426875]"
  }

  function openRepeat() {
    setRepeatOpen(true)
  }

  function closeRepeat() {
    if (savingRepeat) {
      return
    }

    setRepeatOpen(false)
  }

  async function saveRepeat() {
    if (!product) {
      return
    }

    setSavingRepeat(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      alert("ログインしてください。")
      setSavingRepeat(false)
      return
    }

    /*
     * 現在の商品に使用履歴がある場合、
     * まだ履歴へ保存されていない現在の使用期間を保存する。
     */
    if (
      product.started_at ||
      product.finished_at ||
      product.status !== "未使用"
    ) {
      const { data: existingHistory, error: historyCheckError } =
        await supabase
          .from("skincare_product_usage_periods")
          .select("id")
          .eq("product_id", product.id)
          .eq("user_id", user.id)
          .eq("started_at", product.started_at)
          .eq("finished_at", product.finished_at)
          .limit(1)

      if (historyCheckError) {
        console.error(historyCheckError)

        alert(
          `過去の使用履歴を確認できませんでした。\n${historyCheckError.message}`
        )

        setSavingRepeat(false)
        return
      }

      if (
        !existingHistory ||
        existingHistory.length === 0
      ) {
        const { error: historyInsertError } =
          await supabase
            .from("skincare_product_usage_periods")
            .insert({
              product_id: product.id,
              user_id: user.id,
              started_at: product.started_at,
              finished_at: product.finished_at,
              status: product.status,
              rating: product.rating,
              repeat_status:
                product.repeat_status,
              impression: product.impression,
              use_morning: product.use_morning,
              use_night: product.use_night,
            })

        if (historyInsertError) {
          console.error(historyInsertError)

          alert(
            `過去の使用履歴を保存できませんでした。\n${historyInsertError.message}`
          )

          setSavingRepeat(false)
          return
        }
      }
    }

    /*
     * リピート後は必ず「未使用」からスタート。
     *
     * 朝・夜設定はここでは変更しない。
     * 使用開始するときに設定する。
     */
    const { error: updateError } = await supabase
      .from("skincare_products")
      .update({
        status: "未使用",
        started_at: null,
        finished_at: null,
        rating: null,
        repeat_status: null,
        impression: null,
      })
      .eq("id", product.id)
      .eq("user_id", user.id)

    if (updateError) {
      console.error(updateError)

      alert(
        `リピートの登録に失敗しました。\n${updateError.message}`
      )

      setSavingRepeat(false)
      return
    }

    setSavingRepeat(false)
    setRepeatOpen(false)

    await loadData()
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F7FAFA] pb-28">
        <div className="fixed inset-x-0 top-0 z-40 bg-[#F7FAFA]">
          <div className="mx-auto max-w-xl px-4">
            <header className="border-b border-[#DFE9EC] pb-1 pt-[calc(env(safe-area-inset-top)+4px)]">
              <h1 className="text-2xl font-bold text-gray-800">
                商品詳細
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

  if (!product) {
    return null
  }

  return (
    <main className="min-h-screen bg-[#F7FAFA] pb-28">
      <div className="fixed inset-x-0 top-0 z-40 bg-[#F7FAFA]">
        <div className="mx-auto max-w-xl px-4">
          <header className="flex items-center justify-between gap-2 border-b border-[#DFE9EC] pb-1 pt-[calc(env(safe-area-inset-top)+4px)]">
            <h1 className="text-2xl font-bold text-gray-800">
              商品詳細
            </h1>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={openRepeat}
                className="rounded-xl bg-[#A8C6D1] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#8FB5C2]"
              >
                リピ
              </button>

              <Link
                href={`/cosmetics/${productId}/edit`}
                className="rounded-xl border border-[#B7D0D8] bg-white px-4 py-2 text-sm font-bold text-[#647F89] transition hover:bg-[#F7FAFA]"
              >
                編集
              </Link>
            </div>
          </header>
        </div>
      </div>

      <div className="mx-auto max-w-xl px-4 pt-[calc(env(safe-area-inset-top)+52px)]">
        {/* 商品情報 */}
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <div>
            <h2 className="text-xl font-bold text-gray-800">
              {product.name}
            </h2>

            {product.brand && (
              <p className="mt-1 text-sm text-gray-500">
                {product.brand}
              </p>
            )}
          </div>

          {/* ステータス */}
          <div className="mt-4">
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusClass(
                product.status
              )}`}
            >
              {product.status}
            </span>
          </div>

          {/* カテゴリー */}
          <div className="mt-5 border-t border-gray-100 pt-4">
            <p className="text-xs font-bold text-gray-400">
              カテゴリー
            </p>

            <p className="mt-1 text-sm text-gray-700">
              {category?.name ?? "―"}
            </p>
          </div>

          {/* 成分 */}
          <div className="mt-5 border-t border-gray-100 pt-4">
            <p className="text-xs font-bold text-gray-400">
              成分
            </p>

            {ingredients.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {ingredients.map((ingredient) => (
                  <span
                    key={ingredient.id}
                    className="rounded-full bg-[#FFF0E4] px-3 py-1.5 text-xs font-semibold text-[#C77D45]"
                  >
                    {ingredient.name}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-sm text-gray-400">
                登録なし
              </p>
            )}
          </div>

          {/* 現在の使用期間 */}
          <div className="mt-5 border-t border-gray-100 pt-4">
            <p className="text-xs font-bold text-gray-400">
              現在の使用期間
            </p>

            {product.started_at ||
            product.finished_at ? (
              <p className="mt-1 text-sm text-gray-700">
                {formatDate(product.started_at)}
                {" 〜 "}
                {product.finished_at
                  ? formatDate(product.finished_at)
                  : "使用中"}
              </p>
            ) : (
              <p className="mt-1 text-sm text-gray-400">
                まだ使用していません
              </p>
            )}
          </div>

          {/* 現在の朝・夜設定 */}
          {product.status !== "未使用" && (
            <div className="mt-5 border-t border-gray-100 pt-4">
              <p className="text-xs font-bold text-gray-400">
                使用時間
              </p>

              <div className="mt-2 flex gap-2">
                {product.use_morning && (
                  <span className="rounded-full bg-[#F7FAFA] px-3 py-1.5 text-xs font-bold text-[#647F89]">
                    朝
                  </span>
                )}

                {product.use_night && (
                  <span className="rounded-full bg-[#F7FAFA] px-3 py-1.5 text-xs font-bold text-[#647F89]">
                    夜
                  </span>
                )}

                {!product.use_morning &&
                  !product.use_night && (
                    <span className="text-sm text-gray-400">
                      設定なし
                    </span>
                  )}
              </div>
            </div>
          )}
        </section>

        {/* 使用後の記録 */}
        {product.status === "使用済" && (
          <section className="mt-5 rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-gray-800">
              使用後の記録
            </h2>

            <div className="mt-5">
              <p className="text-xs font-bold text-gray-400">
                評価
              </p>

              <p className="mt-1 text-lg font-bold text-gray-800">
                {product.rating ?? "―"}
              </p>
            </div>

            <div className="mt-5 border-t border-gray-100 pt-4">
              <p className="text-xs font-bold text-gray-400">
                リピート
              </p>

              <p className="mt-1 text-sm font-semibold text-gray-700">
                {displayRepeatStatus(
                  product.repeat_status
                )}
              </p>
            </div>

            {product.impression && (
              <div className="mt-5 border-t border-gray-100 pt-4">
                <p className="text-xs font-bold text-gray-400">
                  総評
                </p>

                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                  {product.impression}
                </p>
              </div>
            )}
          </section>
        )}

        {/* 使用履歴 */}
        {usagePeriods.length > 0 && (
          <section className="mt-5 rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-gray-800">
              使用履歴
            </h2>

            <div className="mt-4 space-y-4">
              {usagePeriods.map(
                (period, index) => (
                  <div
                    key={period.id}
                    className="rounded-xl bg-gray-50 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-bold text-gray-700">
                        {usagePeriods.length - index}回目
                      </p>

                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${statusClass(
                            period.status
                          )}`}
                        >
                          {period.status}
                        </span>

                        <button
                          type="button"
                          onClick={() => openPeriodEdit(period)}
                          className="rounded-lg border border-[#B7D0D8] bg-white px-3 py-1.5 text-xs font-bold text-[#647F89] transition hover:bg-[#F7FAFA]"
                        >
                          編集
                        </button>
                      </div>
                    </div>

                    <div className="mt-3">
                      <p className="text-[10px] font-bold text-gray-400">
                        使用期間
                      </p>

                      <p className="mt-1 text-xs text-gray-700">
                        {period.started_at
                          ? formatDate(
                              period.started_at
                            )
                          : "―"}
                        {" 〜 "}
                        {period.finished_at
                          ? formatDate(
                              period.finished_at
                            )
                          : period.status ===
                              "使用中"
                            ? "使用中"
                            : "―"}
                      </p>
                    </div>

                    {(period.use_morning ||
                      period.use_night) && (
                      <div className="mt-3">
                        <p className="text-[10px] font-bold text-gray-400">
                          使用時間
                        </p>

                        <div className="mt-1 flex gap-2">
                          {period.use_morning && (
                            <span className="rounded-full bg-[#F7FAFA] px-2.5 py-1 text-[10px] font-bold text-[#647F89]">
                              朝
                            </span>
                          )}

                          {period.use_night && (
                            <span className="rounded-full bg-[#F7FAFA] px-2.5 py-1 text-[10px] font-bold text-[#647F89]">
                              夜
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {period.status === "使用済" && (
                      <>
                        <div className="mt-3 border-t border-gray-200 pt-3">
                          <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs">
                            <span className="text-gray-400">
                              評価
                            </span>

                            <span className="font-bold text-gray-700">
                              {period.rating ?? "―"}
                            </span>

                            <span className="text-gray-400">
                              リピ
                            </span>

                            <span className="font-semibold text-gray-700">
                              {displayRepeatStatus(
                                period.repeat_status
                              )}
                            </span>
                          </div>
                        </div>

                        {period.impression && (
                          <p className="mt-3 whitespace-pre-wrap text-xs leading-relaxed text-gray-600">
                            {period.impression}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )
              )}
            </div>
          </section>
        )}

        {/* 使用メモ */}
        <section className="mt-5 rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-gray-800">
            使用メモ
          </h2>

          {notes.length > 0 ? (
            <div className="mt-4 space-y-4">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="border-b border-gray-100 pb-4 last:border-b-0 last:pb-0"
                >
                  <p className="text-xs font-bold text-gray-400">
                    {formatDate(note.note_date)}
                  </p>

                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                    {note.note}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-gray-400">
              まだメモはありません。
            </p>
          )}
        </section>

        {/* 削除 */}
        <button
          type="button"
          onClick={deleteProduct}
          disabled={deleting}
          className="mt-6 w-full rounded-xl border border-red-200 bg-white py-3 text-sm font-bold text-red-500 transition hover:bg-red-50 disabled:opacity-50"
        >
          {deleting ? "削除中..." : "この商品を削除"}
        </button>
      </div>

      {/* 使用履歴の編集 */}
      {editingPeriodId && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 px-4 py-6">
          <div className="w-full max-w-xl rounded-3xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-gray-800">
                使用履歴の日付を編集
              </h2>

              <button
                type="button"
                onClick={closePeriodEdit}
                disabled={savingPeriod}
                className="text-xl text-gray-400 disabled:opacity-50"
                aria-label="編集を閉じる"
              >
                ×
              </button>
            </div>

            <p className="mt-2 text-sm text-gray-500">
              {product.name}
              {"・"}
              {usagePeriods.length -
                usagePeriods.findIndex(
                  (period) => period.id === editingPeriodId
                )}
              回目
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="history-started-at"
                  className="mb-2 block text-sm font-bold text-gray-700"
                >
                  使用開始日
                </label>

                <input
                  id="history-started-at"
                  type="date"
                  value={editingStartedAt}
                  onChange={(event) =>
                    setEditingStartedAt(event.target.value)
                  }
                  disabled={savingPeriod}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700 outline-none focus:border-[#A8C6D1] disabled:opacity-50"
                />

                {editingStartedAt && (
                  <button
                    type="button"
                    onClick={() => setEditingStartedAt("")}
                    disabled={savingPeriod}
                    className="mt-2 text-xs font-semibold text-[#647F89] disabled:opacity-50"
                  >
                    開始日を空欄にする
                  </button>
                )}
              </div>

              <div>
                <label
                  htmlFor="history-finished-at"
                  className="mb-2 block text-sm font-bold text-gray-700"
                >
                  使用終了日
                </label>

                <input
                  id="history-finished-at"
                  type="date"
                  value={editingFinishedAt}
                  onChange={(event) =>
                    setEditingFinishedAt(event.target.value)
                  }
                  disabled={savingPeriod}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700 outline-none focus:border-[#A8C6D1] disabled:opacity-50"
                />

                {editingFinishedAt && (
                  <button
                    type="button"
                    onClick={() => setEditingFinishedAt("")}
                    disabled={savingPeriod}
                    className="mt-2 text-xs font-semibold text-[#647F89] disabled:opacity-50"
                  >
                    終了日を空欄にする
                  </button>
                )}
              </div>

              <p className="text-xs leading-relaxed text-gray-400">
                日付を入力しない場合は空欄のまま保存できます。終了日は開始日より前の日付にはできません。
              </p>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={closePeriodEdit}
                disabled={savingPeriod}
                className="flex-1 rounded-xl border border-gray-200 bg-white py-3 text-sm font-bold text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
              >
                キャンセル
              </button>

              <button
                type="button"
                onClick={savePeriodEdit}
                disabled={savingPeriod}
                className="flex-1 rounded-xl bg-[#A8C6D1] py-3 text-sm font-bold text-white transition hover:bg-[#8FB5C2] disabled:opacity-50"
              >
                {savingPeriod ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* リピート */}
      {repeatOpen && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30 px-4 pb-4">
          <div className="w-full max-w-xl rounded-3xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800">
                リピート
              </h2>

              <button
                type="button"
                onClick={closeRepeat}
                disabled={savingRepeat}
                className="text-xl text-gray-400 disabled:opacity-50"
              >
                ×
              </button>
            </div>

            <p className="mt-2 text-sm text-gray-500">
              {product.name}
            </p>

            <button
              type="button"
              onClick={saveRepeat}
              disabled={savingRepeat}
              className="mt-5 w-full rounded-xl bg-[#A8C6D1] py-3.5 text-sm font-bold text-white transition hover:bg-[#8FB5C2] disabled:opacity-50"
            >
              {savingRepeat
                ? "保存中..."
                : "未使用として登録"}
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </main>
  )
}