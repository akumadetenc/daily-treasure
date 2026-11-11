"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import BottomNav from "../../components/BottomNav"

type TreatmentRecord = {
  id: string
  treatment_date: string
  clinic_id: string | null
}

type TreatmentItem = {
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
  note: string
  note_date: string
}

export default function TreatmentDetailPage() {
  const supabase = createClient()
  const params = useParams()
  const router = useRouter()

  const recordId = params.id as string

  const [record, setRecord] = useState<TreatmentRecord | null>(
    null
  )
  const [item, setItem] = useState<TreatmentItem | null>(null)
  const [treatment, setTreatment] = useState<Treatment | null>(
    null
  )
  const [clinic, setClinic] = useState<Clinic | null>(null)
  const [notes, setNotes] = useState<TreatmentNote[]>([])

  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  const [memoText, setMemoText] = useState("")
  const [memoDate, setMemoDate] = useState("")
  const [showMemoForm, setShowMemoForm] = useState(false)
  const [savingMemo, setSavingMemo] = useState(false)

  useEffect(() => {
    loadData()
  }, [recordId])

  async function loadData() {
    setLoading(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.push("/login")
      return
    }

    const { data: recordData, error: recordError } =
      await supabase
        .from("treatment_records")
        .select("id, treatment_date, clinic_id")
        .eq("id", recordId)
        .eq("user_id", user.id)
        .single()

    if (recordError || !recordData) {
      alert("施術記録が見つかりません。")
      router.push("/treatment")
      return
    }

    const { data: itemData, error: itemError } =
      await supabase
        .from("treatment_record_items")
        .select("treatment_id, session_number, body_parts")
        .eq("treatment_record_id", recordId)
        .single()

    if (itemError || !itemData) {
      alert("施術内容が見つかりません。")
      router.push("/treatment")
      return
    }

    const [
      treatmentResult,
      clinicResult,
      notesResult,
    ] = await Promise.all([
      supabase
        .from("treatments")
        .select("id, name")
        .eq("id", itemData.treatment_id)
        .single(),

      recordData.clinic_id
        ? supabase
            .from("treatment_clinics")
            .select("id, name")
            .eq("id", recordData.clinic_id)
            .single()
        : Promise.resolve({
            data: null,
            error: null,
          }),

      supabase
        .from("treatment_notes")
        .select("id, note, note_date")
        .eq("treatment_record_id", recordId)
        .order("note_date", {
          ascending: false,
        }),
    ])

    setRecord(recordData)
    setItem(itemData)
    setTreatment(treatmentResult.data ?? null)
    setClinic(clinicResult.data ?? null)
    setNotes(notesResult.data ?? [])

    setLoading(false)
  }

  function formatDate(date: string) {
    const [year, month, day] = date.split("-")
    return `${year}/${month}/${day}`
  }

  function openMemoForm() {
    setMemoDate(new Date().toISOString().slice(0, 10))
    setMemoText("")
    setShowMemoForm(true)
  }

  function closeMemoForm() {
    setShowMemoForm(false)
    setMemoText("")
    setMemoDate("")
  }

  async function saveMemo() {
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
        treatment_record_id: recordId,
        note: memoText.trim(),
        note_date: memoDate,
      })
      .select("id, note, note_date")
      .single()

    if (error) {
      alert(`メモの保存に失敗しました。\n${error.message}`)
      setSavingMemo(false)
      return
    }

    setNotes((current) => [data, ...current])

    closeMemoForm()
    setSavingMemo(false)
  }

  async function deleteTreatment() {
    if (deleting) return

    const confirmed = window.confirm(
      "この施術記録を削除しますか？\n\n施術内容と経過メモもすべて削除されます。\nこの操作は元に戻せません。"
    )

    if (!confirmed) return

    setDeleting(true)

    // 経過メモを削除
    const { error: notesError } = await supabase
      .from("treatment_notes")
      .delete()
      .eq("treatment_record_id", recordId)

    if (notesError) {
      alert(
        `経過メモの削除に失敗しました。\n${notesError.message}`
      )
      setDeleting(false)
      return
    }

    // 施術項目を削除
    const { error: itemError } = await supabase
      .from("treatment_record_items")
      .delete()
      .eq("treatment_record_id", recordId)

    if (itemError) {
      alert(
        `施術内容の削除に失敗しました。\n${itemError.message}`
      )
      setDeleting(false)
      return
    }

    // 施術記録本体を削除
    const { error: recordError } = await supabase
      .from("treatment_records")
      .delete()
      .eq("id", recordId)

    if (recordError) {
      alert(
        `施術記録の削除に失敗しました。\n${recordError.message}`
      )
      setDeleting(false)
      return
    }

    router.push("/treatment")
    router.refresh()
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F7FAFA] pb-24">
        <div className="fixed left-0 right-0 top-0 z-40 bg-[#F7FAFA]">
          <div className="mx-auto max-w-xl px-4">
            <header className="border-b border-[#DFE9EC] pb-1 pt-[calc(env(safe-area-inset-top)+4px)]">
              <h1 className="text-2xl font-bold text-gray-800">
                施術詳細
              </h1>
            </header>
          </div>
        </div>

        <div className="mx-auto max-w-xl px-4 pt-[calc(env(safe-area-inset-top)+40px)]">
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </main>
    )
  }

  if (!record || !item || !treatment) {
    return null
  }

  return (
    <main className="min-h-screen bg-[#F7FAFA] pb-24">
      <div className="fixed left-0 right-0 top-0 z-40 bg-[#F7FAFA]">
        <div className="mx-auto max-w-xl px-4">
          <header className="flex items-center justify-between border-b border-[#DFE9EC] pb-1 pt-[calc(env(safe-area-inset-top)+4px)]">
            <h1 className="text-2xl font-bold text-gray-800">
              施術詳細
            </h1>

            <Link
              href={`/treatment/${recordId}/edit`}
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-[#647F89] shadow-sm"
            >
              編集
            </Link>
          </header>
        </div>
      </div>

      <div className="mx-auto max-w-xl px-4 pt-[calc(env(safe-area-inset-top)+52px)]">
        {/* 基本情報 */}
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-gray-800">
            {treatment.name}
          </h2>

          {item.session_number != null && (
            <div className="mt-3">
              <span className="inline-block rounded-full bg-[#F7FAFA] px-3 py-1.5 text-sm font-bold text-[#647F89]">
                {item.session_number}回目
              </span>
            </div>
          )}

          <div className="mt-5 space-y-4">
            <div>
              <p className="text-xs font-semibold text-gray-400">
                施術日
              </p>
              <p className="mt-1 text-sm text-gray-800">
                {formatDate(record.treatment_date)}
              </p>
            </div>

            {clinic && (
              <div>
                <p className="text-xs font-semibold text-gray-400">
                  クリニック
                </p>
                <p className="mt-1 text-sm text-gray-800">
                  {clinic.name}
                </p>
              </div>
            )}

            {item.body_parts &&
              item.body_parts.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400">
                    部位
                  </p>

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {item.body_parts.map((part) => (
                      <span
                        key={part}
                        className="rounded-full bg-[#F7FAFA] px-3 py-1.5 text-xs font-semibold text-[#647F89]"
                      >
                        {part}
                      </span>
                    ))}
                  </div>
                </div>
              )}
          </div>
        </section>

        {/* 経過メモ */}
        <section className="mt-5 rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-800">
              経過メモ
            </h2>

            <button
              type="button"
              onClick={openMemoForm}
              className="rounded-xl bg-[#A8C6D1] px-3 py-2 text-sm font-bold text-white"
            >
              ＋メモ
            </button>
          </div>

          {notes.length === 0 ? (
            <p className="mt-5 text-sm text-gray-400">
              まだ経過メモはありません。
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="rounded-xl bg-gray-50 p-4"
                >
                  <p className="text-xs font-semibold text-gray-400">
                    {formatDate(note.note_date)}
                  </p>

                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                    {note.note}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* メモ入力 */}
        {showMemoForm && (
          <section className="mt-5 rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-gray-800">
              経過メモを追加
            </h2>

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
                onClick={closeMemoForm}
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
          </section>
        )}

        {/* 削除 */}
        <section className="mt-8">
          <button
            type="button"
            onClick={deleteTreatment}
            disabled={deleting}
            className="w-full rounded-xl border border-red-200 bg-white py-3.5 text-sm font-semibold text-red-500 transition hover:bg-red-50 disabled:opacity-50"
          >
            {deleting ? "削除中..." : "この施術を削除"}
          </button>
        </section>
      </div>

      <BottomNav />
    </main>
  )
}