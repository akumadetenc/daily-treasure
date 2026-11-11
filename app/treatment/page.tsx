"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import BottomNav from "../components/BottomNav"

type TreatmentRecord = {
  id: string
  treatment_date: string
  clinic_id: string | null
}

type TreatmentItem = {
  treatment_record_id: string
  treatment_id: string
  session_number: number | null
  body_parts: string[] | null
}

type Treatment = {
  id: string
  name: string
}

type Clinic = {
  id: string
  name: string
}

type TreatmentNote = {
  id: string
  treatment_record_id: string
  note: string
  note_date: string
}

type TreatmentDisplay = {
  recordId: string
  treatmentId: string
  treatmentName: string
  treatmentDate: string
  clinicName: string | null
  sessionNumber: number | null
  bodyParts: string[]
}

export default function TreatmentPage() {
  const supabase = createClient()

  const [records, setRecords] = useState<TreatmentRecord[]>([])
  const [items, setItems] = useState<TreatmentItem[]>([])
  const [treatments, setTreatments] = useState<Treatment[]>([])
  const [clinics, setClinics] = useState<Clinic[]>([])
  const [notes, setNotes] = useState<TreatmentNote[]>([])

  const [viewMode, setViewMode] = useState<"recent" | "treatment">(
    "recent"
  )

  const [loading, setLoading] = useState(true)

  const [memoTarget, setMemoTarget] = useState<string | null>(null)
  const [memoText, setMemoText] = useState("")
  const [memoDate, setMemoDate] = useState("")
  const [savingMemo, setSavingMemo] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setLoading(false)
      return
    }

    const [
      recordResult,
      itemResult,
      treatmentResult,
      clinicResult,
      noteResult,
    ] = await Promise.all([
      supabase
        .from("treatment_records")
        .select("id, treatment_date, clinic_id")
        .eq("user_id", user.id)
        .order("treatment_date", {
          ascending: false,
        }),

      supabase
        .from("treatment_record_items")
        .select(
          "treatment_record_id, treatment_id, session_number, body_parts"
        ),

      supabase
        .from("treatments")
        .select("id, name")
        .eq("user_id", user.id)
        .order("name"),

      supabase
        .from("treatment_clinics")
        .select("id, name")
        .eq("user_id", user.id)
        .order("name"),

      supabase
        .from("treatment_notes")
        .select("id, treatment_record_id, note, note_date")
        .order("note_date", {
          ascending: false,
        }),
    ])

    if (!recordResult.error) {
      setRecords(recordResult.data ?? [])
    }

    if (!itemResult.error) {
      setItems(itemResult.data ?? [])
    }

    if (!treatmentResult.error) {
      setTreatments(treatmentResult.data ?? [])
    }

    if (!clinicResult.error) {
      setClinics(clinicResult.data ?? [])
    }

    if (!noteResult.error) {
      setNotes(noteResult.data ?? [])
    }

    setLoading(false)
  }

  const treatmentDisplays = useMemo(() => {
    const result: TreatmentDisplay[] = []

    for (const record of records) {
      const recordItems = items.filter(
        (item) => item.treatment_record_id === record.id
      )

      const clinic = clinics.find(
        (item) => item.id === record.clinic_id
      )

      for (const item of recordItems) {
        const treatment = treatments.find(
          (value) => value.id === item.treatment_id
        )

        if (!treatment) continue

        result.push({
          recordId: record.id,
          treatmentId: item.treatment_id,
          treatmentName: treatment.name,
          treatmentDate: record.treatment_date,
          clinicName: clinic?.name ?? null,
          sessionNumber: item.session_number,
          bodyParts: item.body_parts ?? [],
        })
      }
    }

    return result.sort((a, b) =>
      b.treatmentDate.localeCompare(a.treatmentDate)
    )
  }, [records, items, treatments, clinics])

  const groupedTreatments = useMemo(() => {
    const groups = new Map<string, TreatmentDisplay[]>()

    for (const item of treatmentDisplays) {
      const current = groups.get(item.treatmentId) ?? []

      current.push(item)
      groups.set(item.treatmentId, current)
    }

    return Array.from(groups.entries())
      .map(([treatmentId, treatmentRecords]) => ({
        treatmentId,
        treatmentName: treatmentRecords[0]?.treatmentName ?? "",
        records: [...treatmentRecords].sort((a, b) =>
          b.treatmentDate.localeCompare(a.treatmentDate)
        ),
      }))
      .sort((a, b) =>
        a.treatmentName.localeCompare(b.treatmentName, "ja")
      )
  }, [treatmentDisplays])

  function formatDate(date: string) {
    const [year, month, day] = date.split("-")
    return `${year}/${month}/${day}`
  }

  function openMemo(recordId: string) {
    setMemoTarget(recordId)
    setMemoText("")
    setMemoDate(new Date().toISOString().slice(0, 10))
  }

  function closeMemo() {
    setMemoTarget(null)
    setMemoText("")
    setMemoDate("")
  }

  async function saveMemo() {
    if (!memoTarget) return

    if (!memoText.trim()) {
      alert("メモを入力してください。")
      return
    }

    if (!memoDate) {
      alert("日付を入力してください。")
      return
    }

    setSavingMemo(true)

    const { data, error } = await supabase
      .from("treatment_notes")
      .insert({
        treatment_record_id: memoTarget,
        note: memoText.trim(),
        note_date: memoDate,
      })
      .select("id, treatment_record_id, note, note_date")
      .single()

    if (error) {
      alert(`メモの保存に失敗しました。\n${error.message}`)
      setSavingMemo(false)
      return
    }

    setNotes((current) => [data, ...current])

    closeMemo()
    setSavingMemo(false)
  }

  function getMemoCount(recordId: string) {
    return notes.filter(
      (note) => note.treatment_record_id === recordId
    ).length
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F7FAFA] pb-24">
        <div className="fixed left-0 right-0 top-0 z-40 bg-[#F7FAFA]">
          <div className="mx-auto max-w-xl px-4">
            <header className="border-b border-[#DFE9EC] pb-2 pt-[calc(env(safe-area-inset-top)+4px)]">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <Link href="/treatment/settings" className="shrink-0 text-xs font-medium text-[#647F89]">カテゴリ設定</Link>
                  <Link href="/treatment/new" className="shrink-0 rounded-full bg-[#A8C6D1] px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#8FB5C2]">＋追加</Link>
                </div>
                <Link href="/cosmetics" className="shrink-0 rounded-full border border-[#D6E6EA] bg-white px-3 py-1.5 text-xs font-semibold text-[#647F89]">アイテム</Link>
              </div>
            </header>
          </div>
        </div>

        <div className="mx-auto max-w-xl px-4 pt-[calc(env(safe-area-inset-top)+52px)]">
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#F7FAFA] pb-24">
      <div className="fixed left-0 right-0 top-0 z-40 bg-[#F7FAFA]">
        <div className="mx-auto max-w-xl px-4">
          <header className="border-b border-[#DFE9EC] pb-2 pt-[calc(env(safe-area-inset-top)+4px)]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <Link href="/treatment/settings" className="shrink-0 text-xs font-medium text-[#647F89]">カテゴリ設定</Link>
                <Link href="/treatment/new" className="shrink-0 rounded-full bg-[#A8C6D1] px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#8FB5C2]">＋追加</Link>
              </div>
              <Link href="/cosmetics" className="shrink-0 rounded-full border border-[#D6E6EA] bg-white px-3 py-1.5 text-xs font-semibold text-[#647F89]">アイテム</Link>
            </div>
          </header>
        </div>
      </div>

      <div className="mx-auto max-w-xl px-4 pt-[calc(env(safe-area-inset-top)+52px)]">
        <div className="mb-5 grid grid-cols-2 rounded-xl bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setViewMode("recent")}
            className={`rounded-lg py-2.5 text-sm font-semibold transition ${
              viewMode === "recent"
                ? "bg-[#A8C6D1] text-white"
                : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            新しい順
          </button>

          <button
            type="button"
            onClick={() => setViewMode("treatment")}
            className={`rounded-lg py-2.5 text-sm font-semibold transition ${
              viewMode === "treatment"
                ? "bg-[#A8C6D1] text-white"
                : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            施術ごと
          </button>
        </div>

        {treatmentDisplays.length === 0 && (
          <section className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-gray-500">
              まだ施術記録がありません。
            </p>

            <Link
              href="/treatment/new"
              className="mt-4 inline-block rounded-xl bg-[#A8C6D1] px-5 py-2.5 text-sm font-bold text-white"
            >
              最初の施術を登録
            </Link>
          </section>
        )}

        {viewMode === "recent" &&
          treatmentDisplays.length > 0 && (
            <div className="space-y-3">
              {treatmentDisplays.map((item, index) => (
                <TreatmentCard
                  key={`${item.recordId}-${item.treatmentId}-${index}`}
                  item={item}
                  formatDate={formatDate}
                  memoCount={getMemoCount(item.recordId)}
                  onMemo={() => openMemo(item.recordId)}
                />
              ))}
            </div>
          )}

        {viewMode === "treatment" &&
          groupedTreatments.length > 0 && (
            <div className="space-y-5">
              {groupedTreatments.map((group) => (
                <section
                  key={group.treatmentId}
                  className="rounded-2xl bg-white p-4 shadow-sm"
                >
                  <h2 className="mb-3 text-lg font-bold text-gray-800">
                    {group.treatmentName}
                  </h2>

                  <div className="space-y-2">
                    {group.records.map((item, index) => (
                      <Link
                        key={`${item.recordId}-${index}`}
                        href={`/treatment/${item.recordId}`}
                        className="block rounded-xl border border-gray-100 bg-gray-50 p-3 transition hover:bg-[#F7FAFA]"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-gray-800">
                              {item.sessionNumber != null
                                ? `${item.sessionNumber}回目`
                                : "回数未登録"}
                            </p>

                            {item.clinicName && (
                              <p className="mt-1 text-sm text-gray-600">
                                {item.clinicName}
                              </p>
                            )}

                            {item.bodyParts.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {item.bodyParts.map((part) => (
                                  <span
                                    key={part}
                                    className="rounded-full bg-[#F7FAFA] px-2.5 py-1 text-xs text-[#647F89]"
                                  >
                                    {part}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          <span className="shrink-0 text-sm font-semibold text-gray-500">
                            {formatDate(item.treatmentDate)}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}

        {memoTarget && (
          <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30 p-4">
            <div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-xl">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-800">
                  経過メモ
                </h2>

                <button
                  type="button"
                  onClick={closeMemo}
                  className="text-2xl leading-none text-gray-400"
                >
                  ×
                </button>
              </div>

              <label className="mt-4 block text-xs font-semibold text-gray-500">
                日付
              </label>

              <input
                type="date"
                value={memoDate}
                onChange={(e) => setMemoDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700 outline-none focus:border-[#A8C6D1]"
              />

              <label className="mt-4 block text-xs font-semibold text-gray-500">
                メモ
              </label>

              <textarea
                value={memoText}
                onChange={(e) => setMemoText(e.target.value)}
                rows={5}
                autoFocus
                placeholder="施術後の経過や変化をメモ"
                className="mt-1 w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm leading-relaxed text-gray-700 outline-none focus:border-[#A8C6D1]"
              />

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={closeMemo}
                  className="flex-1 rounded-xl border border-gray-200 bg-white py-3 text-sm font-semibold text-gray-500"
                >
                  キャンセル
                </button>

                <button
                  type="button"
                  onClick={saveMemo}
                  disabled={savingMemo}
                  className="flex-1 rounded-xl bg-[#A8C6D1] py-3 text-sm font-bold text-white disabled:opacity-50"
                >
                  {savingMemo ? "保存中..." : "保存"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </main>
  )
}

function TreatmentCard({
  item,
  formatDate,
  memoCount,
  onMemo,
}: {
  item: TreatmentDisplay
  formatDate: (date: string) => string
  memoCount: number
  onMemo: () => void
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <Link
        href={`/treatment/${item.recordId}`}
        className="block"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-800">
              {item.treatmentName}
            </h2>

            <p className="mt-2 text-sm font-semibold text-gray-500">
              {formatDate(item.treatmentDate)}
            </p>
          </div>

          {item.sessionNumber != null && (
            <span className="shrink-0 rounded-full bg-[#F7FAFA] px-3 py-1 text-sm font-bold text-[#647F89]">
              {item.sessionNumber}回目
            </span>
          )}
        </div>

        {item.clinicName && (
          <p className="mt-3 text-sm text-gray-700">
            {item.clinicName}
          </p>
        )}

        {item.bodyParts.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {item.bodyParts.map((part) => (
              <span
                key={part}
                className="rounded-full bg-[#F7FAFA] px-2.5 py-1 text-xs text-[#647F89]"
              >
                {part}
              </span>
            ))}
          </div>
        )}
      </Link>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onMemo}
          className="flex-1 rounded-xl border border-gray-200 bg-white py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
        >
          メモ
          {memoCount > 0 && (
            <span className="ml-1 text-xs text-gray-400">
              ({memoCount})
            </span>
          )}
        </button>

        <Link
          href={`/treatment/${item.recordId}`}
          className="flex-1 rounded-xl bg-[#F7FAFA] py-2.5 text-center text-sm font-semibold text-[#647F89] transition hover:bg-[#E4EFF1]"
        >
          詳細
        </Link>
      </div>
    </div>
  )
}