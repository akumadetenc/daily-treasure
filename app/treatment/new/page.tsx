"use client"

import BottomNav from "../../components/BottomNav"
import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"

type Treatment = {
  id: string
  name: string
  sort_order: number
}

type Clinic = {
  id: string
  name: string
  sort_order: number
}

type BodyPart = {
  id: string
  name: string
  sort_order: number
}

export default function TreatmentNewPage() {
  const supabase = createClient()
  const router = useRouter()

  const [treatments, setTreatments] = useState<Treatment[]>([])
  const [clinics, setClinics] = useState<Clinic[]>([])
  const [bodyPartsOptions, setBodyPartsOptions] =
    useState<BodyPart[]>([])

  const [treatmentId, setTreatmentId] = useState("")
  const [clinicId, setClinicId] = useState("")
  const [selectedBodyParts, setSelectedBodyParts] =
    useState<string[]>([])

  const [newTreatment, setNewTreatment] = useState("")
  const [newClinic, setNewClinic] = useState("")
  const [newBodyPart, setNewBodyPart] = useState("")

  const [treatmentDate, setTreatmentDate] = useState("")
  const [sessionNumber, setSessionNumber] = useState("")
  const [memo, setMemo] = useState("")

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
      router.push("/login")
      return
    }

    const today = new Date()

    setTreatmentDate(
      [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, "0"),
        String(today.getDate()).padStart(2, "0"),
      ].join("-")
    )

    const [
      treatmentResult,
      clinicResult,
      bodyPartResult,
    ] = await Promise.all([
      supabase
        .from("treatments")
        .select("id, name, sort_order")
        .eq("user_id", user.id)
        .order("sort_order", {
          ascending: true,
        })
        .order("name", {
          ascending: true,
        }),

      supabase
        .from("treatment_clinics")
        .select("id, name, sort_order")
        .eq("user_id", user.id)
        .order("sort_order", {
          ascending: true,
        })
        .order("name", {
          ascending: true,
        }),

      supabase
        .from("treatment_body_parts")
        .select("id, name, sort_order")
        .eq("user_id", user.id)
        .order("sort_order", {
          ascending: true,
        })
        .order("name", {
          ascending: true,
        }),
    ])

    if (treatmentResult.error) {
      console.error(treatmentResult.error)
      setMessage("施術の読み込みに失敗しました。")
    } else {
      setTreatments(
        (treatmentResult.data ?? []) as Treatment[]
      )
    }

    if (clinicResult.error) {
      console.error(clinicResult.error)
      setMessage("クリニックの読み込みに失敗しました。")
    } else {
      setClinics(
        (clinicResult.data ?? []) as Clinic[]
      )
    }

    if (bodyPartResult.error) {
      console.error(bodyPartResult.error)
      setMessage("部位の読み込みに失敗しました。")
    } else {
      setBodyPartsOptions(
        (bodyPartResult.data ?? []) as BodyPart[]
      )
    }

    setLoading(false)
  }

  async function addTreatment() {
    const treatmentName = newTreatment.trim()

    if (!treatmentName) {
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMessage("ログインしてください。")
      return
    }

    const existing = treatments.find(
      (treatment) =>
        treatment.name.toLowerCase() ===
        treatmentName.toLowerCase()
    )

    if (existing) {
      setTreatmentId(existing.id)
      setNewTreatment("")
      setMessage("")
      return
    }

    const maxSortOrder =
      treatments.length > 0
        ? Math.max(
            ...treatments.map(
              (treatment) => treatment.sort_order
            )
          )
        : -1

    const { data, error } = await supabase
      .from("treatments")
      .insert({
        user_id: user.id,
        name: treatmentName,
        sort_order: maxSortOrder + 1,
      })
      .select("id, name, sort_order")
      .single()

    if (error) {
      console.error(error)

      if (error.code === "23505") {
        setMessage("同じ施術がすでにあります。")
      } else {
        setMessage("施術を追加できませんでした。")
      }

      return
    }

    const newItem = data as Treatment

    setTreatments((current) => [
      ...current,
      newItem,
    ])

    setTreatmentId(newItem.id)
    setNewTreatment("")
    setMessage("")
  }

  async function addClinic() {
    const clinicName = newClinic.trim()

    if (!clinicName) {
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMessage("ログインしてください。")
      return
    }

    const existing = clinics.find(
      (clinic) =>
        clinic.name.toLowerCase() ===
        clinicName.toLowerCase()
    )

    if (existing) {
      setClinicId(existing.id)
      setNewClinic("")
      setMessage("")
      return
    }

    const maxSortOrder =
      clinics.length > 0
        ? Math.max(
            ...clinics.map(
              (clinic) => clinic.sort_order
            )
          )
        : -1

    const { data, error } = await supabase
      .from("treatment_clinics")
      .insert({
        user_id: user.id,
        name: clinicName,
        sort_order: maxSortOrder + 1,
      })
      .select("id, name, sort_order")
      .single()

    if (error) {
      console.error(error)

      if (error.code === "23505") {
        setMessage("同じクリニックがすでにあります。")
      } else {
        setMessage(
          "クリニックを追加できませんでした。"
        )
      }

      return
    }

    const newItem = data as Clinic

    setClinics((current) => [
      ...current,
      newItem,
    ])

    setClinicId(newItem.id)
    setNewClinic("")
    setMessage("")
  }

  async function addBodyPart() {
    const bodyPartName = newBodyPart.trim()

    if (!bodyPartName) {
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMessage("ログインしてください。")
      return
    }

    const existing = bodyPartsOptions.find(
      (part) =>
        part.name.toLowerCase() ===
        bodyPartName.toLowerCase()
    )

    if (existing) {
      setSelectedBodyParts((current) =>
        current.includes(existing.name)
          ? current
          : [...current, existing.name]
      )

      setNewBodyPart("")
      setMessage("")
      return
    }

    const maxSortOrder =
      bodyPartsOptions.length > 0
        ? Math.max(
            ...bodyPartsOptions.map(
              (part) => part.sort_order
            )
          )
        : -1

    const { data, error } = await supabase
      .from("treatment_body_parts")
      .insert({
        user_id: user.id,
        name: bodyPartName,
        sort_order: maxSortOrder + 1,
      })
      .select("id, name, sort_order")
      .single()

    if (error) {
      console.error(error)

      if (error.code === "23505") {
        setMessage("同じ部位がすでにあります。")
      } else {
        setMessage("部位を追加できませんでした。")
      }

      return
    }

    const newItem = data as BodyPart

    setBodyPartsOptions((current) => [
      ...current,
      newItem,
    ])

    setSelectedBodyParts((current) => [
      ...current,
      newItem.name,
    ])

    setNewBodyPart("")
    setMessage("")
  }

  function toggleBodyPart(name: string) {
    setSelectedBodyParts((current) =>
      current.includes(name)
        ? current.filter((item) => item !== name)
        : [...current, name]
    )
  }

  async function saveTreatment() {
    setMessage("")

    if (!treatmentId) {
      setMessage("施術を選択してください。")
      return
    }

    if (!clinicId) {
      setMessage("クリニックを選択してください。")
      return
    }

    if (selectedBodyParts.length === 0) {
      setMessage("部位を1つ以上選択してください。")
      return
    }

    if (!treatmentDate) {
      setMessage("施術日を入力してください。")
      return
    }

    const parsedSessionNumber = Number(sessionNumber)

    if (
      !sessionNumber.trim() ||
      !Number.isFinite(parsedSessionNumber) ||
      parsedSessionNumber < 1 ||
      !Number.isInteger(parsedSessionNumber)
    ) {
      setMessage(
        "今回の回数は1以上の数字を入力してください。"
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

    const {
      data: record,
      error: recordError,
    } = await supabase
      .from("treatment_records")
      .insert({
        user_id: user.id,
        treatment_date: treatmentDate,
        clinic_id: clinicId,
      })
      .select("id")
      .single()

    if (recordError || !record) {
      console.error(recordError)

      setMessage(
        "施術記録を保存できませんでした。"
      )
      setSaving(false)
      return
    }

    const { error: itemError } =
      await supabase
        .from("treatment_record_items")
        .insert({
          treatment_record_id: record.id,
          treatment_id: treatmentId,
          session_number: parsedSessionNumber,
          body_parts: selectedBodyParts,
        })

    if (itemError) {
      console.error(itemError)

      await supabase
        .from("treatment_records")
        .delete()
        .eq("id", record.id)

      setMessage(
        "施術内容を保存できなかったため、施術記録も保存しませんでした。"
      )
      setSaving(false)
      return
    }

    if (memo.trim()) {
      const { error: noteError } =
        await supabase
          .from("treatment_notes")
          .insert({
            treatment_record_id: record.id,
            note: memo.trim(),
            note_date: treatmentDate,
          })

      if (noteError) {
        console.error(noteError)

        setMessage(
          "施術は保存されましたが、経過感想の保存に失敗しました。"
        )
        setSaving(false)

        router.push(`/treatment/${record.id}`)
        return
      }
    }

    router.push(`/treatment/${record.id}`)
  }

  if (loading) {
    return (
      <main className="h-[100dvh] overflow-y-auto overscroll-y-auto bg-[#F7FAFA] pb-28 [-webkit-overflow-scrolling:touch]">
        <div className="fixed inset-x-0 top-0 z-40 bg-[#F7FAFA]">
          <div className="mx-auto max-w-xl px-4">
            <header className="border-b border-[#DFE9EC] pb-1 pt-[calc(env(safe-area-inset-top)+4px)]">
              <h1 className="text-2xl font-bold text-gray-800">
                施術登録
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
    <main className="h-[100dvh] overflow-y-auto overscroll-y-auto bg-[#F7FAFA] pb-28 [-webkit-overflow-scrolling:touch]">
      <div className="fixed inset-x-0 top-0 z-40 bg-[#F7FAFA]">
        <div className="mx-auto max-w-xl px-4">
          <header className="border-b border-[#DFE9EC] pb-1 pt-[calc(env(safe-area-inset-top)+4px)]">
            <h1 className="text-2xl font-bold text-gray-800">
              施術登録
            </h1>
          </header>
        </div>
      </div>

      <div className="mx-auto max-w-xl px-4 pt-[calc(env(safe-area-inset-top)+40px)]">
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="space-y-5">
            {/* 施術 */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                施術
              </label>

              <div className="flex gap-2">
                <select
                  value={treatmentId}
                  onChange={(e) =>
                    setTreatmentId(e.target.value)
                  }
                  className="min-w-0 flex-1 appearance-none rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 outline-none focus:border-[#A8C6D1] focus:ring-1 focus:ring-[#A8C6D1]"
                >
                  <option value="">
                    施術を選択
                  </option>

                  {treatments.map((treatment) => (
                    <option
                      key={treatment.id}
                      value={treatment.id}
                    >
                      {treatment.name}
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
                  value={newTreatment}
                  onChange={(e) =>
                    setNewTreatment(e.target.value)
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      addTreatment()
                    }
                  }}
                  placeholder="新しい施術"
                  className="min-w-0 flex-1 rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:border-[#A8C6D1] focus:ring-1 focus:ring-[#A8C6D1]"
                />

                <button
                  type="button"
                  onClick={addTreatment}
                  className="shrink-0 rounded-xl border border-[#A8C6D1] px-4 py-2 text-sm font-medium text-[#647F89] transition active:scale-95 hover:bg-[#F7FAFA]"
                >
                  ＋追加
                </button>
              </div>
            </div>

            {/* クリニック */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                クリニック
              </label>

              <div className="flex gap-2">
                <select
                  value={clinicId}
                  onChange={(e) =>
                    setClinicId(e.target.value)
                  }
                  className="min-w-0 flex-1 appearance-none rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 outline-none focus:border-[#A8C6D1] focus:ring-1 focus:ring-[#A8C6D1]"
                >
                  <option value="">
                    クリニックを選択
                  </option>

                  {clinics.map((clinic) => (
                    <option
                      key={clinic.id}
                      value={clinic.id}
                    >
                      {clinic.name}
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
                  value={newClinic}
                  onChange={(e) =>
                    setNewClinic(e.target.value)
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      addClinic()
                    }
                  }}
                  placeholder="新しいクリニック"
                  className="min-w-0 flex-1 rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:border-[#A8C6D1] focus:ring-1 focus:ring-[#A8C6D1]"
                />

                <button
                  type="button"
                  onClick={addClinic}
                  className="shrink-0 rounded-xl border border-[#A8C6D1] px-4 py-2 text-sm font-medium text-[#647F89] transition active:scale-95 hover:bg-[#F7FAFA]"
                >
                  ＋追加
                </button>
              </div>
            </div>

            {/* 部位 */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                部位
              </label>

              {bodyPartsOptions.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {bodyPartsOptions.map((part) => {
                    const selected =
                      selectedBodyParts.includes(
                        part.name
                      )

                    return (
                      <button
                        key={part.id}
                        type="button"
                        onClick={() =>
                          toggleBodyPart(part.name)
                        }
                        className={`min-h-12 rounded-xl border px-3 py-3 text-left text-sm font-medium transition active:scale-[0.98] ${
                          selected
                            ? "border-[#A8C6D1] bg-[#A8C6D1] text-white"
                            : "border-gray-300 bg-white text-gray-700"
                        }`}
                      >
                        {part.name}
                      </button>
                    )
                  })}
                </div>
              ) : null}

              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={newBodyPart}
                  onChange={(e) =>
                    setNewBodyPart(e.target.value)
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      addBodyPart()
                    }
                  }}
                  placeholder="新しい部位"
                  className="min-w-0 flex-1 rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:border-[#A8C6D1] focus:ring-1 focus:ring-[#A8C6D1]"
                />

                <button
                  type="button"
                  onClick={addBodyPart}
                  className="shrink-0 rounded-xl border border-[#A8C6D1] px-4 py-2 text-sm font-medium text-[#647F89] transition active:scale-95 hover:bg-[#F7FAFA]"
                >
                  ＋追加
                </button>
              </div>
            </div>

            {/* 施術日 */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                施術日
              </label>

              <input
                type="date"
                value={treatmentDate}
                onChange={(e) =>
                  setTreatmentDate(e.target.value)
                }
                className="block w-full max-w-full min-w-0 rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm text-gray-800 outline-none focus:border-[#A8C6D1] focus:ring-1 focus:ring-[#A8C6D1]"
              />
            </div>

            {/* 今回の回数 */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                今回の回数
              </label>

              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={sessionNumber}
                  onChange={(e) =>
                    setSessionNumber(e.target.value)
                  }
                  className="w-28 rounded-xl border border-gray-300 bg-white px-3 py-3 text-center text-lg font-bold text-gray-800 outline-none focus:border-[#A8C6D1] focus:ring-1 focus:ring-[#A8C6D1]"
                />

                <span className="text-sm text-gray-500">
                  回目
                </span>
              </div>
            </div>

            {/* 経過感想 */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                経過感想
              </label>

              <textarea
                value={memo}
                onChange={(e) =>
                  setMemo(e.target.value)
                }
                rows={5}
                placeholder="施術後の経過や感想"
                className="w-full resize-none rounded-xl border border-gray-300 px-3 py-3 text-sm leading-relaxed text-gray-800 placeholder:text-gray-400 outline-none focus:border-[#A8C6D1] focus:ring-1 focus:ring-[#A8C6D1]"
              />
            </div>

            {/* メッセージ */}
            {message && (
              <p className="rounded-xl bg-[#F7FAFA] px-4 py-3 text-center text-sm font-medium text-[#526F7A]">
                {message}
              </p>
            )}

            {/* 登録 */}
            <button
              type="button"
              onClick={saveTreatment}
              disabled={saving}
              className="w-full rounded-2xl bg-[#A8C6D1] py-4 text-base font-bold text-white shadow-sm transition active:scale-[0.99] hover:bg-[#8FB5C2] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "登録中..."
                : "施術を登録"}
            </button>
          </div>
        </section>

        <div className="h-8" />
      </div>

      <BottomNav />
    </main>
  )
}