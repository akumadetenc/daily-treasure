"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import BottomNav from "../../../components/BottomNav"

type Treatment = {
  id: string
  name: string
}

type Clinic = {
  id: string
  name: string
}

type BodyPart = {
  id: string
  name: string
}

export default function EditTreatmentPage() {
  const supabase = createClient()
  const params = useParams()
  const router = useRouter()

  const recordId = params.id as string

  const [treatments, setTreatments] = useState<Treatment[]>([])
  const [clinics, setClinics] = useState<Clinic[]>([])
  const [bodyPartOptions, setBodyPartOptions] = useState<BodyPart[]>([])

  const [treatmentId, setTreatmentId] = useState("")
  const [clinicId, setClinicId] = useState("")
  const [treatmentDate, setTreatmentDate] = useState("")
  const [sessionNumber, setSessionNumber] = useState("")
  const [bodyParts, setBodyParts] = useState<string[]>([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [showTreatmentForm, setShowTreatmentForm] =
    useState(false)
  const [showClinicForm, setShowClinicForm] =
    useState(false)
  const [showBodyPartForm, setShowBodyPartForm] =
    useState(false)

  const [newTreatmentName, setNewTreatmentName] =
    useState("")
  const [newClinicName, setNewClinicName] =
    useState("")
  const [newBodyPartName, setNewBodyPartName] =
    useState("")

  const [addingTreatment, setAddingTreatment] =
    useState(false)
  const [addingClinic, setAddingClinic] =
    useState(false)
  const [addingBodyPart, setAddingBodyPart] =
    useState(false)

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

    const [
      recordResult,
      itemResult,
      treatmentResult,
      clinicResult,
      bodyPartResult,
    ] = await Promise.all([
      supabase
        .from("treatment_records")
        .select("id, treatment_date, clinic_id")
        .eq("id", recordId)
        .eq("user_id", user.id)
        .single(),

      supabase
        .from("treatment_record_items")
        .select("treatment_id, session_number, body_parts")
        .eq("treatment_record_id", recordId)
        .single(),

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
        .from("treatment_body_parts")
        .select("id, name")
        .eq("user_id", user.id)
        .order("name"),
    ])

    if (recordResult.error || !recordResult.data) {
      alert("施術記録を読み込めませんでした。")
      router.push("/treatment")
      return
    }

    if (itemResult.error || !itemResult.data) {
      alert("施術内容を読み込めませんでした。")
      router.push("/treatment")
      return
    }

    setTreatments(treatmentResult.data ?? [])
    setClinics(clinicResult.data ?? [])
    setBodyPartOptions(bodyPartResult.data ?? [])

    setTreatmentId(itemResult.data.treatment_id)
    setClinicId(recordResult.data.clinic_id ?? "")
    setTreatmentDate(recordResult.data.treatment_date)

    setSessionNumber(
      itemResult.data.session_number != null
        ? String(itemResult.data.session_number)
        : ""
    )

    setBodyParts(
      Array.isArray(itemResult.data.body_parts)
        ? itemResult.data.body_parts
        : []
    )

    setLoading(false)
  }

  function toggleBodyPart(part: string) {
    setBodyParts((current) => {
      if (current.includes(part)) {
        return current.filter((item) => item !== part)
      }

      return [...current, part]
    })
  }

  async function addTreatment() {
    const name = newTreatmentName.trim()

    if (!name) {
      alert("施術名を入力してください。")
      return
    }

    setAddingTreatment(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setAddingTreatment(false)
      return
    }

    const { data, error } = await supabase
      .from("treatments")
      .insert({
        user_id: user.id,
        name,
      })
      .select("id, name")
      .single()

    if (error) {
      console.error(error)

      alert(
        `施術の追加に失敗しました。\n${error.message}`
      )

      setAddingTreatment(false)
      return
    }

    setTreatments((current) =>
      [...current, data].sort((a, b) =>
        a.name.localeCompare(b.name, "ja")
      )
    )

    setTreatmentId(data.id)
    setNewTreatmentName("")
    setShowTreatmentForm(false)
    setAddingTreatment(false)
  }

  async function deleteTreatment(treatment: Treatment) {
    const confirmed = window.confirm(
      `「${treatment.name}」を削除しますか？`
    )

    if (!confirmed) {
      return
    }

    const { error } = await supabase
      .from("treatments")
      .delete()
      .eq("id", treatment.id)

    if (error) {
      console.error(error)

      alert(
        `施術を削除できませんでした。\n${error.message}`
      )
      return
    }

    setTreatments((current) =>
      current.filter((item) => item.id !== treatment.id)
    )

    if (treatmentId === treatment.id) {
      setTreatmentId("")
    }
  }

  async function addClinic() {
    const name = newClinicName.trim()

    if (!name) {
      alert("クリニック名を入力してください。")
      return
    }

    setAddingClinic(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setAddingClinic(false)
      return
    }

    const { data, error } = await supabase
      .from("treatment_clinics")
      .insert({
        user_id: user.id,
        name,
      })
      .select("id, name")
      .single()

    if (error) {
      console.error(error)

      alert(
        `クリニックの追加に失敗しました。\n${error.message}`
      )

      setAddingClinic(false)
      return
    }

    setClinics((current) =>
      [...current, data].sort((a, b) =>
        a.name.localeCompare(b.name, "ja")
      )
    )

    setClinicId(data.id)
    setNewClinicName("")
    setShowClinicForm(false)
    setAddingClinic(false)
  }

  async function deleteClinic(clinic: Clinic) {
    const confirmed = window.confirm(
      `「${clinic.name}」を削除しますか？`
    )

    if (!confirmed) {
      return
    }

    const { error } = await supabase
      .from("treatment_clinics")
      .delete()
      .eq("id", clinic.id)

    if (error) {
      console.error(error)

      alert(
        `クリニックを削除できませんでした。\n${error.message}`
      )
      return
    }

    setClinics((current) =>
      current.filter((item) => item.id !== clinic.id)
    )

    if (clinicId === clinic.id) {
      setClinicId("")
    }
  }

  async function addBodyPart() {
    const name = newBodyPartName.trim()

    if (!name) {
      alert("部位名を入力してください。")
      return
    }

    setAddingBodyPart(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setAddingBodyPart(false)
      return
    }

    const existing = bodyPartOptions.find(
      (part) => part.name === name
    )

    if (existing) {
      setBodyParts((current) =>
        current.includes(existing.name)
          ? current
          : [...current, existing.name]
      )

      setNewBodyPartName("")
      setShowBodyPartForm(false)
      setAddingBodyPart(false)
      return
    }

    const { data, error } = await supabase
      .from("treatment_body_parts")
      .insert({
        user_id: user.id,
        name,
      })
      .select("id, name")
      .single()

    if (error) {
      console.error(error)

      alert(
        `部位の追加に失敗しました。\n${error.message}`
      )

      setAddingBodyPart(false)
      return
    }

    setBodyPartOptions((current) =>
      [...current, data].sort((a, b) =>
        a.name.localeCompare(b.name, "ja")
      )
    )

    setBodyParts((current) => [...current, data.name])
    setNewBodyPartName("")
    setShowBodyPartForm(false)
    setAddingBodyPart(false)
  }

  async function deleteBodyPart(part: BodyPart) {
    const confirmed = window.confirm(
      `「${part.name}」を削除しますか？`
    )

    if (!confirmed) {
      return
    }

    const { error } = await supabase
      .from("treatment_body_parts")
      .delete()
      .eq("id", part.id)

    if (error) {
      console.error(error)

      alert(
        `部位を削除できませんでした。\n${error.message}`
      )
      return
    }

    setBodyPartOptions((current) =>
      current.filter((item) => item.id !== part.id)
    )

    setBodyParts((current) =>
      current.filter((item) => item !== part.name)
    )
  }

  async function save() {
    if (!treatmentId) {
      alert("施術を選択してください。")
      return
    }

    if (!treatmentDate) {
      alert("施術日を入力してください。")
      return
    }

    if (bodyParts.length === 0) {
      alert("部位を1つ以上選択してください。")
      return
    }

    const number = Number(sessionNumber)

    if (
      !sessionNumber.trim() ||
      !Number.isInteger(number) ||
      number < 1
    ) {
      alert("回数は1以上の整数を入力してください。")
      return
    }

    setSaving(true)

    const { error: recordError } = await supabase
      .from("treatment_records")
      .update({
        treatment_date: treatmentDate,
        clinic_id: clinicId || null,
      })
      .eq("id", recordId)

    if (recordError) {
      alert(
        `施術記録の更新に失敗しました。\n${recordError.message}`
      )
      setSaving(false)
      return
    }

    const { error: deleteItemError } = await supabase
      .from("treatment_record_items")
      .delete()
      .eq("treatment_record_id", recordId)

    if (deleteItemError) {
      alert(
        `施術内容の更新に失敗しました。\n${deleteItemError.message}`
      )
      setSaving(false)
      return
    }

    const { error: insertItemError } = await supabase
      .from("treatment_record_items")
      .insert({
        treatment_record_id: recordId,
        treatment_id: treatmentId,
        session_number: number,
        body_parts: bodyParts,
      })

    if (insertItemError) {
      alert(
        `施術内容の保存に失敗しました。\n${insertItemError.message}`
      )
      setSaving(false)
      return
    }

    router.push(`/treatment/${recordId}`)
    router.refresh()
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F7FAFA] pb-24">
        <div className="fixed left-0 right-0 top-0 z-40 bg-[#F7FAFA]">
          <div className="mx-auto max-w-xl px-4">
            <header className="border-b border-[#DFE9EC] pb-1 pt-[calc(env(safe-area-inset-top)+4px)]">
              <h1 className="text-2xl font-bold text-gray-800">
                施術を編集
              </h1>
            </header>
          </div>
        </div>

        <div className="mx-auto max-w-xl px-4 pt-[calc(env(safe-area-inset-top)+40px)]">
          <p className="text-gray-600">
            読み込み中...
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#F7FAFA] pb-24">
      <div className="fixed left-0 right-0 top-0 z-40 bg-[#F7FAFA]">
        <div className="mx-auto max-w-xl px-4">
          <header className="border-b border-[#DFE9EC] pb-1 pt-[calc(env(safe-area-inset-top)+4px)]">
            <h1 className="text-2xl font-bold text-gray-800">
              施術を編集
            </h1>
          </header>
        </div>
      </div>

      <div className="mx-auto max-w-xl px-4 pt-[calc(env(safe-area-inset-top)+40px)]">
        <div className="space-y-5 rounded-2xl bg-white p-5 shadow-sm">
          {/* 施術 */}
          <div>
            <label className="block text-sm font-bold text-gray-700">
              施術
            </label>

            {treatments.length > 0 ? (
              <div className="mt-3 space-y-2">
                {treatments.map((treatment) => {
                  const selected =
                    treatmentId === treatment.id

                  return (
                    <div
                      key={treatment.id}
                      className="flex gap-2"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setTreatmentId(treatment.id)
                        }
                        className={`min-h-12 min-w-0 flex-1 rounded-xl border px-4 py-3 text-left text-sm font-semibold transition active:scale-[0.98] ${
                          selected
                            ? "border-[#A8C6D1] bg-[#A8C6D1] text-white"
                            : "border-gray-200 bg-white text-gray-600"
                        }`}
                      >
                        {treatment.name}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          deleteTreatment(treatment)
                        }
                        className="shrink-0 rounded-xl border border-gray-200 px-3 text-sm text-gray-500 transition active:scale-95 hover:bg-gray-50"
                      >
                        削除
                      </button>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="mt-3 text-sm text-gray-500">
                まだ施術がありません。
              </p>
            )}

            <button
              type="button"
              onClick={() =>
                setShowTreatmentForm(
                  (current) => !current
                )
              }
              className="mt-3 text-sm font-semibold text-[#647F89]"
            >
              ＋施術を追加
            </button>

            {showTreatmentForm && (
              <div className="mt-3 rounded-xl bg-[#F7FAFA] p-3">
                <input
                  type="text"
                  value={newTreatmentName}
                  onChange={(e) =>
                    setNewTreatmentName(e.target.value)
                  }
                  placeholder="施術名"
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:border-[#A8C6D1]"
                />

                <button
                  type="button"
                  onClick={addTreatment}
                  disabled={addingTreatment}
                  className="mt-2 w-full rounded-lg bg-[#A8C6D1] py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {addingTreatment
                    ? "追加中..."
                    : "追加する"}
                </button>
              </div>
            )}
          </div>

          {/* クリニック */}
          <div>
            <label className="block text-sm font-bold text-gray-700">
              クリニック
            </label>

            {clinics.length > 0 ? (
              <div className="mt-3 space-y-2">
                <button
                  type="button"
                  onClick={() => setClinicId("")}
                  className={`w-full rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
                    clinicId === ""
                      ? "border-[#A8C6D1] bg-[#A8C6D1] text-white"
                      : "border-gray-200 bg-white text-gray-600"
                  }`}
                >
                  なし
                </button>

                {clinics.map((clinic) => {
                  const selected =
                    clinicId === clinic.id

                  return (
                    <div
                      key={clinic.id}
                      className="flex gap-2"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setClinicId(clinic.id)
                        }
                        className={`min-h-12 min-w-0 flex-1 rounded-xl border px-4 py-3 text-left text-sm font-semibold transition active:scale-[0.98] ${
                          selected
                            ? "border-[#A8C6D1] bg-[#A8C6D1] text-white"
                            : "border-gray-200 bg-white text-gray-600"
                        }`}
                      >
                        {clinic.name}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          deleteClinic(clinic)
                        }
                        className="shrink-0 rounded-xl border border-gray-200 px-3 text-sm text-gray-500 transition active:scale-95 hover:bg-gray-50"
                      >
                        削除
                      </button>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="mt-3 text-sm text-gray-500">
                まだクリニックがありません。
              </p>
            )}

            <button
              type="button"
              onClick={() =>
                setShowClinicForm(
                  (current) => !current
                )
              }
              className="mt-3 text-sm font-semibold text-[#647F89]"
            >
              ＋クリニックを追加
            </button>

            {showClinicForm && (
              <div className="mt-3 rounded-xl bg-[#F7FAFA] p-3">
                <input
                  type="text"
                  value={newClinicName}
                  onChange={(e) =>
                    setNewClinicName(e.target.value)
                  }
                  placeholder="クリニック名"
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:border-[#A8C6D1]"
                />

                <button
                  type="button"
                  onClick={addClinic}
                  disabled={addingClinic}
                  className="mt-2 w-full rounded-lg bg-[#A8C6D1] py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {addingClinic
                    ? "追加中..."
                    : "追加する"}
                </button>
              </div>
            )}
          </div>

          {/* 部位 */}
          <div>
            <label className="block text-sm font-bold text-gray-700">
              部位
            </label>

            {bodyPartOptions.length > 0 ? (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {bodyPartOptions.map((part) => {
                  const selected = bodyParts.includes(
                    part.name
                  )

                  return (
                    <div
                      key={part.id}
                      className="flex min-w-0 gap-1"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          toggleBodyPart(part.name)
                        }
                        className={`min-h-12 min-w-0 flex-1 rounded-xl border px-3 py-3 text-left text-sm font-semibold transition active:scale-[0.98] ${
                          selected
                            ? "border-[#A8C6D1] bg-[#A8C6D1] text-white"
                            : "border-gray-200 bg-white text-gray-600"
                        }`}
                      >
                        {part.name}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          deleteBodyPart(part)
                        }
                        className="shrink-0 rounded-xl border border-gray-200 px-2 text-xs text-gray-500 transition active:scale-95 hover:bg-gray-50"
                      >
                        削除
                      </button>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="mt-3 text-sm text-gray-500">
                まだ部位がありません。
              </p>
            )}

            <button
              type="button"
              onClick={() =>
                setShowBodyPartForm(
                  (current) => !current
                )
              }
              className="mt-3 text-sm font-semibold text-[#647F89]"
            >
              ＋部位を追加
            </button>

            {showBodyPartForm && (
              <div className="mt-3 rounded-xl bg-[#F7FAFA] p-3">
                <input
                  type="text"
                  value={newBodyPartName}
                  onChange={(e) =>
                    setNewBodyPartName(e.target.value)
                  }
                  placeholder="部位名"
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:border-[#A8C6D1]"
                />

                <button
                  type="button"
                  onClick={addBodyPart}
                  disabled={addingBodyPart}
                  className="mt-2 w-full rounded-lg bg-[#A8C6D1] py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {addingBodyPart
                    ? "追加中..."
                    : "追加する"}
                </button>
              </div>
            )}
          </div>

          {/* 施術日 */}
          <div>
            <label className="block text-sm font-bold text-gray-700">
              施術日
            </label>

            <input
              type="date"
              value={treatmentDate}
              onChange={(e) =>
                setTreatmentDate(e.target.value)
              }
              className="mt-2 block w-full max-w-full min-w-0 rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700 outline-none focus:border-[#A8C6D1]"
            />
          </div>

          {/* 回数 */}
          <div>
            <label className="block text-sm font-bold text-gray-700">
              回数
            </label>

            <input
              type="number"
              min="1"
              step="1"
              value={sessionNumber}
              onChange={(e) =>
                setSessionNumber(e.target.value)
              }
              className="mt-2 w-28 rounded-xl border border-gray-200 bg-white px-3 py-3 text-center text-lg font-bold text-gray-700 outline-none focus:border-[#A8C6D1]"
            />
          </div>

          {/* 保存 */}
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="w-full rounded-xl bg-[#A8C6D1] py-3.5 text-sm font-bold text-white transition hover:bg-[#8FB5C2] disabled:opacity-50"
          >
            {saving ? "保存中..." : "保存"}
          </button>

          <button
            type="button"
            onClick={() =>
              router.push(`/treatment/${recordId}`)
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