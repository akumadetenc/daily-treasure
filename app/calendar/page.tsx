"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import BottomNav from "../components/BottomNav"

type DailyRecord = {
  id: string
  record_date: string
  overall_score: number | null
  bowel_count: number | null
  stool_consistency:
    | "柔柔"
    | "柔"
    | "普通"
    | "硬"
    | "硬硬"
    | null
  acne: "○" | "△" | "×" | null
  comedones: "○" | "△" | "×" | null
  roughness: "○" | "△" | "×" | null
  dryness: "○" | "△" | "×" | null
  redness: "○" | "△" | "×" | null
  exercise: "○" | "△" | "×" | null
  menstrual_status:
    | "ピル"
    | "休薬"
    | "生理中"
    | null
  memo: string | null
}

type TreatmentRecord = {
  id: string
  treatment_date: string
}

type TreatmentItem = {
  treatment_record_id: string
  treatment_id: string
}

type Treatment = {
  id: string
  name: string
}

type DailySkincare = {
  daily_record_id: string
  product_id: string
}

type Product = {
  id: string
  name: string
  brand: string | null
}

export default function CalendarPage() {
  const supabase = createClient()

  const [currentDate, setCurrentDate] = useState(new Date())
  const [records, setRecords] = useState<DailyRecord[]>([])
  const [treatmentRecords, setTreatmentRecords] = useState<
    TreatmentRecord[]
  >([])
  const [treatmentItems, setTreatmentItems] = useState<
    TreatmentItem[]
  >([])
  const [treatments, setTreatments] = useState<Treatment[]>([])
  const [dailySkincare, setDailySkincare] = useState<DailySkincare[]>([])
  const [products, setProducts] = useState<Product[]>([])

  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const monthLabel = `${year}年${month + 1}月`

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const calendarDays = useMemo(() => {
    const days: (number | null)[] = []

    for (let i = 0; i < firstDay; i++) {
      days.push(null)
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day)
    }

    while (days.length % 7 !== 0) {
      days.push(null)
    }

    return days
  }, [firstDay, daysInMonth])

  useEffect(() => {
    loadMonthData()
  }, [year, month])

  async function loadMonthData() {
    setLoading(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setLoading(false)
      return
    }

    const startDate = formatDate(year, month, 1)
    const endDate = formatDate(year, month, daysInMonth)

    const [
      dailyResult,
      treatmentRecordResult,
      treatmentItemResult,
      treatmentResult,
      skincareResult,
      productResult,
    ] = await Promise.all([
      supabase
        .from("daily_records")
        .select(
          "id, record_date, overall_score, bowel_count, stool_consistency, acne, comedones, roughness, dryness, redness, exercise, menstrual_status, memo"
        )
        .eq("user_id", user.id)
        .gte("record_date", startDate)
        .lte("record_date", endDate)
        .order("record_date"),

      supabase
        .from("treatment_records")
        .select("id, treatment_date")
        .eq("user_id", user.id)
        .gte("treatment_date", startDate)
        .lte("treatment_date", endDate)
        .order("treatment_date"),

      supabase
        .from("treatment_record_items")
        .select("treatment_record_id, treatment_id"),

      supabase
        .from("treatments")
        .select("id, name")
        .eq("user_id", user.id)
        .order("name"),

      supabase
        .from("daily_skincare")
        .select("daily_record_id, product_id"),

      supabase
        .from("skincare_products")
        .select("id, name, brand")
        .eq("user_id", user.id),
    ])

    if (!dailyResult.error) {
      setRecords(dailyResult.data ?? [])
    }

    if (!treatmentRecordResult.error) {
      setTreatmentRecords(treatmentRecordResult.data ?? [])
    }

    if (!treatmentItemResult.error) {
      setTreatmentItems(treatmentItemResult.data ?? [])
    }

    if (!treatmentResult.error) {
      setTreatments(treatmentResult.data ?? [])
    }

    if (!skincareResult.error) {
      setDailySkincare(skincareResult.data ?? [])
    }

    if (!productResult.error) {
      setProducts(productResult.data ?? [])
    }

    setLoading(false)
  }

  function formatDate(
    targetYear: number,
    targetMonth: number,
    day: number
  ) {
    const m = String(targetMonth + 1).padStart(2, "0")
    const d = String(day).padStart(2, "0")

    return `${targetYear}-${m}-${d}`
  }

  function getRecord(date: string) {
    return records.find(
      (record) => record.record_date === date
    )
  }

  function getTreatmentRecord(date: string) {
    return treatmentRecords.find(
      (record) => record.treatment_date === date
    )
  }

  function getTreatmentNames(recordId: string) {
    const ids = treatmentItems
      .filter(
        (item) =>
          item.treatment_record_id === recordId
      )
      .map(
        (item) => item.treatment_id
      )

    return treatments.filter((treatment) =>
      ids.includes(treatment.id)
    )
  }

  function getSkincareProducts(recordId: string) {
    const ids = dailySkincare
      .filter(
        (item) =>
          item.daily_record_id === recordId
      )
      .map(
        (item) => item.product_id
      )

    return products.filter((product) =>
      ids.includes(product.id)
    )
  }

  function goPreviousMonth() {
    setCurrentDate(
      new Date(year, month - 1, 1)
    )
    setSelectedDate(null)
  }

  function goNextMonth() {
    setCurrentDate(
      new Date(year, month + 1, 1)
    )
    setSelectedDate(null)
  }

  function goToday() {
    const today = new Date()

    setCurrentDate(
      new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      )
    )

    const todayString = formatDate(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    )

    setSelectedDate(todayString)
  }

  function getScoreColor(
    score: number | null
  ) {
    switch (score) {
      case 5:
        return "text-red-500"
      case 4:
        return "text-pink-500"
      case 3:
        return "text-yellow-500"
      case 2:
        return "text-green-500"
      case 1:
        return "text-blue-500"
      default:
        return "text-gray-300"
    }
  }

  function getScoreBadgeClass(
    score: number | null
  ) {
    switch (score) {
      case 5:
        return "bg-red-50 text-red-500"
      case 4:
        return "bg-pink-50 text-pink-500"
      case 3:
        return "bg-yellow-50 text-yellow-600"
      case 2:
        return "bg-green-50 text-green-600"
      case 1:
        return "bg-blue-50 text-blue-500"
      default:
        return "bg-gray-50 text-gray-400"
    }
  }

  const selectedRecord = selectedDate
    ? getRecord(selectedDate)
    : null

  const selectedTreatmentRecord = selectedDate
    ? getTreatmentRecord(selectedDate)
    : null

  const selectedTreatmentNames =
    selectedTreatmentRecord
      ? getTreatmentNames(
          selectedTreatmentRecord.id
        )
      : []

  const selectedSkincareProducts =
    selectedRecord
      ? getSkincareProducts(
          selectedRecord.id
        )
      : []

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F7FAFA] pb-28">
        <div className="fixed inset-x-0 top-0 z-40 bg-[#F7FAFA]">
          <div className="mx-auto max-w-xl px-4">
            <header className="border-b border-[#DFE9EC] pb-1 pt-[calc(env(safe-area-inset-top)+4px)]">
              <h1 className="text-2xl font-bold text-gray-800">
                カレンダー
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
              カレンダー
            </h1>
          </header>
        </div>
      </div>

      <div className="mx-auto max-w-xl px-4 pt-[calc(env(safe-area-inset-top)+40px)]">
        {/* 月移動 */}
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              onClick={goPreviousMonth}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-lg text-gray-600"
            >
              ‹
            </button>

            <div className="text-lg font-bold text-gray-800">
              {monthLabel}
            </div>

            <button
              type="button"
              onClick={goNextMonth}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-lg text-gray-600"
            >
              ›
            </button>
          </div>

          <button
            type="button"
            onClick={goToday}
            className="mb-4 w-full rounded-lg bg-[#F7FAFA] py-2 text-sm font-semibold text-[#647F89]"
          >
            今日
          </button>

          {/* 曜日 */}
          <div className="mb-2 grid grid-cols-7 text-center text-xs font-semibold text-gray-400">
            <div>日</div>
            <div>月</div>
            <div>火</div>
            <div>水</div>
            <div>木</div>
            <div>金</div>
            <div>土</div>
          </div>

          {/* カレンダー */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map(
              (day, index) => {
                if (day === null) {
                  return (
                    <div
                      key={`empty-${index}`}
                      className="h-[82px]"
                    />
                  )
                }

                const date = formatDate(
                  year,
                  month,
                  day
                )

                const record =
                  getRecord(date)

                const treatment =
                  getTreatmentRecord(date)

                const selected =
                  selectedDate === date

                return (
                  <button
                    key={date}
                    type="button"
                    onClick={() =>
                      setSelectedDate(date)
                    }
                    className={`h-[82px] overflow-hidden rounded-xl border p-1 transition ${
                      selected
                        ? "border-[#A8C6D1] bg-[#F7FAFA]"
                        : "border-transparent bg-white hover:bg-gray-50"
                    }`}
                  >
                    {/* ① 日付 */}
                    <div className="h-[22px] text-sm font-semibold text-gray-700">
                      {day}
                    </div>

                    {/* ② 総合点 */}
                    <div className="flex h-[24px] items-center justify-center">
                      {record?.overall_score !=
                      null ? (
                        <span
                          className={`text-lg font-bold ${getScoreColor(
                            record.overall_score
                          )}`}
                        >
                          {
                            record.overall_score
                          }
                        </span>
                      ) : (
                        <span className="text-lg font-bold text-transparent">
                          0
                        </span>
                      )}
                    </div>

                    {/* ③ 便回数 */}
                    <div className="flex h-[18px] items-center justify-center text-[10px] text-gray-400">
                      {record ? (
                        <>
                          🚽
                          {record.bowel_count ??
                            0}
                        </>
                      ) : (
                        <span className="invisible">
                          🚽0
                        </span>
                      )}
                    </div>

                    {/* ④ 施術 */}
                    <div className="flex h-[14px] items-center justify-center text-[9px] font-bold text-purple-500">
                      {treatment ? (
                        "施術"
                      ) : (
                        <span className="invisible">
                          施術
                        </span>
                      )}
                    </div>
                  </button>
                )
              }
            )}
          </div>
        </section>

        {/* 選択日の詳細 */}
        {selectedDate && (
          <section className="mt-5 rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-gray-800">
              {selectedDate.replaceAll(
                "-",
                "/"
              )}
            </h2>

            {!selectedRecord &&
            !selectedTreatmentRecord ? (
              <p className="mt-4 text-sm text-gray-500">
                この日の記録はありません。
              </p>
            ) : (
              <div className="mt-4 space-y-5">
                {/* 総合点 */}
                {selectedRecord && (
                  <div>
                    <p className="text-sm font-semibold text-gray-500">
                      総合点
                    </p>

                    {selectedRecord.overall_score !=
                    null ? (
                      <div
                        className={`mt-2 inline-flex h-14 w-14 items-center justify-center rounded-full text-3xl font-bold ${getScoreBadgeClass(
                          selectedRecord.overall_score
                        )}`}
                      >
                        {
                          selectedRecord.overall_score
                        }
                      </div>
                    ) : (
                      <p className="mt-1 text-gray-400">
                        未入力
                      </p>
                    )}
                  </div>
                )}

                {/* 肌の状態 */}
                {selectedRecord && (
                  <div>
                    <p className="mb-2 text-sm font-semibold text-gray-500">
                      肌の状態
                    </p>

                    <div className="grid grid-cols-2 gap-2">
                      <StatusItem
                        label="ニキビ"
                        value={
                          selectedRecord.acne
                        }
                      />

                      <StatusItem
                        label="毛穴"
                        value={
                          selectedRecord.comedones
                        }
                      />

                      <StatusItem
                        label="ざらつき"
                        value={
                          selectedRecord.roughness
                        }
                      />

                      <StatusItem
                        label="乾燥"
                        value={
                          selectedRecord.dryness
                        }
                      />

                      <StatusItem
                        label="赤み"
                        value={
                          selectedRecord.redness
                        }
                      />
                    </div>
                  </div>
                )}

                {/* 生活 */}
                {selectedRecord && (
                  <div>
                    <p className="mb-2 text-sm font-semibold text-gray-500">
                      生活
                    </p>

                    <div className="grid grid-cols-2 gap-2">
                      <StatusItem
                        label="運動"
                        value={
                          selectedRecord.exercise
                        }
                      />

                      <StatusItem
                        label="生理"
                        value={
                          selectedRecord.menstrual_status
                        }
                      />
                    </div>
                  </div>
                )}

                {/* 便通 */}
                {selectedRecord && (
                  <div>
                    <p className="mb-2 text-sm font-semibold text-gray-500">
                      便通
                    </p>

                    <div className="rounded-xl bg-gray-50 px-3 py-3">
                      <p className="text-sm text-gray-700">
                        回数：
                        <span className="font-semibold">
                          {selectedRecord.bowel_count ??
                            0}{" "}
                          回
                        </span>
                      </p>

                      {selectedRecord.stool_consistency && (
                        <p className="mt-1 text-sm text-gray-700">
                          状態：
                          <span className="font-semibold">
                            {
                              selectedRecord.stool_consistency
                            }
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* スキンケア */}
                {selectedSkincareProducts.length >
                  0 && (
                  <div>
                    <p className="mb-2 text-sm font-semibold text-gray-500">
                      使ったスキンケア
                    </p>

                    <div className="space-y-2">
                      {selectedSkincareProducts.map(
                        (product) => (
                          <div
                            key={product.id}
                            className="rounded-xl bg-[#F7FAFA] px-3 py-2"
                          >
                            <p className="text-sm font-semibold text-gray-700">
                              {
                                product.name
                              }
                            </p>

                            {product.brand && (
                              <p className="text-xs text-gray-500">
                                {
                                  product.brand
                                }
                              </p>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

                {/* 施術 */}
                {selectedTreatmentNames.length >
                  0 && (
                  <div>
                    <p className="mb-2 text-sm font-semibold text-gray-500">
                      施術
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {selectedTreatmentNames.map(
                        (treatment) => (
                          <span
                            key={treatment.id}
                            className="rounded-full bg-purple-50 px-3 py-1 text-sm text-purple-600"
                          >
                            {
                              treatment.name
                            }
                          </span>
                        )
                      )}
                    </div>
                  </div>
                )}

                {/* メモ */}
                {selectedRecord?.memo && (
                  <div>
                    <p className="mb-2 text-sm font-semibold text-gray-500">
                      メモ
                    </p>

                    <p className="whitespace-pre-wrap rounded-xl bg-gray-50 p-3 text-sm leading-relaxed text-gray-600">
                      {selectedRecord.memo}
                    </p>
                  </div>
                )}
              </div>
            )}
          </section>
        )}
      </div>

      <BottomNav />
    </main>
  )
}

function StatusItem({
  label,
  value,
}: {
  label: string
  value: string | null
}) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
      <span className="text-sm text-gray-600">
        {label}
      </span>

      <span className="font-bold text-gray-700">
        {value ?? "-"}
      </span>
    </div>
  )
}