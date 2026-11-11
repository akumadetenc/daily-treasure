"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import BottomNav from "../components/BottomNav"

type DailyRecord = {
  id: string
  record_date: string
  overall_score: number | null
  acne: "○" | "△" | "×" | null
  comedones: "○" | "△" | "×" | null
  roughness: "○" | "△" | "×" | null
  dryness: "○" | "△" | "×" | null
  redness: "○" | "△" | "×" | null
}

type MetricKey =
  | "overall_score"
  | "acne"
  | "comedones"
  | "roughness"
  | "dryness"
  | "redness"

const metricLabels: Record<MetricKey, string> = {
  overall_score: "総合点",
  acne: "ニキビ",
  comedones: "毛穴",
  roughness: "ざらつき",
  dryness: "乾燥",
  redness: "赤み",
}

const statusMetrics: MetricKey[] = [
  "acne",
  "comedones",
  "roughness",
  "dryness",
  "redness",
]

export default function GraphPage() {
  const supabase = createClient()

  const [currentWeekStart, setCurrentWeekStart] = useState(
    getWeekStart(new Date())
  )

  const [records, setRecords] = useState<DailyRecord[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedMetric, setSelectedMetric] =
    useState<MetricKey>("overall_score")

  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(currentWeekStart)
      date.setDate(date.getDate() + index)
      return date
    })
  }, [currentWeekStart])

  const weekStartString = formatDate(currentWeekStart)

  const weekEnd = new Date(currentWeekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)

  const weekEndString = formatDate(weekEnd)

  useEffect(() => {
    loadWeekData()
  }, [weekStartString, weekEndString])

  async function loadWeekData() {
    setLoading(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from("daily_records")
      .select(
        "id, record_date, overall_score, acne, comedones, roughness, dryness, redness"
      )
      .eq("user_id", user.id)
      .gte("record_date", weekStartString)
      .lte("record_date", weekEndString)
      .order("record_date")

    if (!error) {
      setRecords(data ?? [])
    }

    setLoading(false)
  }

  function getRecord(date: Date) {
    const dateString = formatDate(date)

    return records.find(
      (record) => record.record_date === dateString
    )
  }

  function goPreviousWeek() {
    const date = new Date(currentWeekStart)
    date.setDate(date.getDate() - 7)
    setCurrentWeekStart(date)
  }

  function goNextWeek() {
    const date = new Date(currentWeekStart)
    date.setDate(date.getDate() + 7)
    setCurrentWeekStart(date)
  }

  function goCurrentWeek() {
    setCurrentWeekStart(getWeekStart(new Date()))
  }

  const weekLabel = `${currentWeekStart.getFullYear()}年${
    currentWeekStart.getMonth() + 1
  }月${currentWeekStart.getDate()}日〜${
    weekEnd.getMonth() + 1
  }月${weekEnd.getDate()}日`

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F7FAFA] pb-28">
        <div className="fixed inset-x-0 top-0 z-40 bg-[#F7FAFA]">
          <div className="mx-auto max-w-xl px-4">
            <header className="border-b border-[#DFE9EC] pb-1 pt-[calc(env(safe-area-inset-top)+4px)]">
              <h1 className="text-2xl font-bold text-gray-800">
                グラフ
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
              グラフ
            </h1>
          </header>
        </div>
      </div>

      <div className="mx-auto max-w-xl px-4 pt-[calc(env(safe-area-inset-top)+40px)]">
        {/* 週移動 */}
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={goPreviousWeek}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-lg text-gray-600"
            >
              ‹
            </button>

            <div className="text-center">
              <p className="text-sm font-bold text-gray-800">
                {weekLabel}
              </p>
            </div>

            <button
              type="button"
              onClick={goNextWeek}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-lg text-gray-600"
            >
              ›
            </button>
          </div>

          <button
            type="button"
            onClick={goCurrentWeek}
            className="mt-4 w-full rounded-lg bg-[#F7FAFA] py-2 text-sm font-semibold text-[#647F89]"
          >
            今週
          </button>
        </section>

        {/* 指標選択 */}
        <section className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
          <p className="mb-3 text-sm font-semibold text-gray-500">
            表示する項目
          </p>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(Object.keys(metricLabels) as MetricKey[]).map(
              (metric) => {
                const active = selectedMetric === metric

                return (
                  <button
                    key={metric}
                    type="button"
                    onClick={() => setSelectedMetric(metric)}
                    className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                      active
                        ? "border-[#A8C6D1] bg-[#F7FAFA] text-[#647F89]"
                        : "border-gray-200 bg-white text-gray-500"
                    }`}
                  >
                    {metricLabels[metric]}
                  </button>
                )
              }
            )}
          </div>
        </section>

        {/* グラフ */}
        <section className="mt-4 rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-800">
              {metricLabels[selectedMetric]}
            </h2>

            <span className="text-xs text-gray-400">
              {selectedMetric === "overall_score"
                ? "1〜5"
                : "× → △ → ○"}
            </span>
          </div>

          <LineGraph
            dates={weekDates}
            records={records}
            metric={selectedMetric}
          />
        </section>

        {/* その週の状態 */}
        <section className="mt-4 rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-gray-800">
            今週の記録
          </h2>

          <div className="mt-4 space-y-4">
            {weekDates.map((date) => {
              const record = getRecord(date)

              return (
                <div
                  key={formatDate(date)}
                  className="rounded-xl bg-gray-50 p-3"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-bold text-gray-700">
                      {formatDisplayDate(date)}
                    </p>

                    {record ? (
                      <span className="text-lg font-bold text-[#647F89]">
                        {record.overall_score ?? "-"}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">
                        未記録
                      </span>
                    )}
                  </div>

                  {record ? (
                    <div className="grid grid-cols-2 gap-2">
                      {statusMetrics.map((metric) => (
                        <StatusItem
                          key={metric}
                          label={metricLabels[metric]}
                          value={
                            record[metric] as
                              | "○"
                              | "△"
                              | "×"
                              | null
                          }
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">
                      この日の記録はありません。
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      </div>

      <BottomNav />
    </main>
  )
}

function LineGraph({
  dates,
  records,
  metric,
}: {
  dates: Date[]
  records: DailyRecord[]
  metric: MetricKey
}) {
  const width = 320
  const height = 190

  const paddingLeft = 30
  const paddingRight = 15
  const paddingTop = 15
  const paddingBottom = 30

  const graphWidth = width - paddingLeft - paddingRight
  const graphHeight = height - paddingTop - paddingBottom

  const values = dates.map((date) => {
    const dateString = formatDate(date)

    const record = records.find(
      (item) => item.record_date === dateString
    )

    if (!record) {
      return null
    }

    return getMetricValue(record, metric)
  })

  const maxValue = metric === "overall_score" ? 5 : 3
  const minValue = 0

  function getX(index: number) {
    if (dates.length === 1) {
      return paddingLeft + graphWidth / 2
    }

    return (
      paddingLeft +
      (graphWidth / (dates.length - 1)) * index
    )
  }

  function getY(value: number) {
    return (
      paddingTop +
      graphHeight -
      ((value - minValue) / (maxValue - minValue)) *
        graphHeight
    )
  }

  const points = values
    .map((value, index) => {
      if (value === null) {
        return null
      }

      return {
        x: getX(index),
        y: getY(value),
      }
    })
    .filter(
      (point): point is { x: number; y: number } =>
        point !== null
    )

  const pathParts: string[] = []

  let previousPoint: { x: number; y: number } | null = null

  values.forEach((value, index) => {
    if (value === null) {
      previousPoint = null
      return
    }

    const point = {
      x: getX(index),
      y: getY(value),
    }

    if (!previousPoint) {
      pathParts.push(`M ${point.x} ${point.y}`)
    } else {
      pathParts.push(`L ${point.x} ${point.y}`)
    }

    previousPoint = point
  })

  const path = pathParts.join(" ")

  const gridValues =
    metric === "overall_score"
      ? [1, 2, 3, 4, 5]
      : [1, 2, 3]

  return (
    <div className="w-full overflow-hidden">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        preserveAspectRatio="none"
      >
        {/* 横線 */}
        {gridValues.map((value) => {
          const y = getY(value)

          return (
            <g key={value}>
              <line
                x1={paddingLeft}
                x2={width - paddingRight}
                y1={y}
                y2={y}
                stroke="#e5e7eb"
                strokeWidth="1"
              />

              <text
                x={paddingLeft - 8}
                y={y + 4}
                textAnchor="end"
                fontSize="9"
                fill="#9ca3af"
              >
                {metric === "overall_score"
                  ? value
                  : value === 3
                    ? "○"
                    : value === 2
                      ? "△"
                      : "×"}
              </text>
            </g>
          )
        })}

        {/* 横軸 */}
        <line
          x1={paddingLeft}
          x2={width - paddingRight}
          y1={paddingTop + graphHeight}
          y2={paddingTop + graphHeight}
          stroke="#d1d5db"
          strokeWidth="1"
        />

        {/* グラフ線 */}
        {path && (
          <path
            d={path}
            fill="none"
            stroke="#f97316"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* データ点 */}
        {points.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r="4"
            fill="white"
            stroke="#f97316"
            strokeWidth="2"
          />
        ))}

        {/* 日付 */}
        {dates.map((date) => (
          <text
            key={formatDate(date)}
            x={getX(dates.indexOf(date))}
            y={height - 8}
            textAnchor="middle"
            fontSize="9"
            fill="#9ca3af"
          >
            {date.getMonth() + 1}/{date.getDate()}
          </text>
        ))}
      </svg>

      {records.length === 0 && (
        <p className="mt-2 text-center text-sm text-gray-400">
          この週には記録がありません。
        </p>
      )}
    </div>
  )
}

function getMetricValue(
  record: DailyRecord,
  metric: MetricKey
): number | null {
  if (metric === "overall_score") {
    return record.overall_score
  }

  const value = record[metric]

  if (value === "○") {
    return 3
  }

  if (value === "△") {
    return 2
  }

  if (value === "×") {
    return 1
  }

  return null
}

function StatusItem({
  label,
  value,
}: {
  label: string
  value: "○" | "△" | "×" | null
}) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
      <span className="text-xs text-gray-500">
        {label}
      </span>

      <span className="font-bold text-gray-700">
        {value ?? "-"}
      </span>
    </div>
  )
}

function getWeekStart(date: Date) {
  const result = new Date(date)
  const day = result.getDay()

  result.setDate(result.getDate() - day)
  result.setHours(0, 0, 0, 0)

  return result
}

function formatDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

function formatDisplayDate(date: Date) {
  const weekNames = [
    "日",
    "月",
    "火",
    "水",
    "木",
    "金",
    "土",
  ]

  return `${date.getMonth() + 1}/${date.getDate()}（${
    weekNames[date.getDay()]
  }）`
}