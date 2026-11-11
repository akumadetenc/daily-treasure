"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/utils/supabase/client"
import BottomNav from "../../components/BottomNav"

type SettingItem = {
  id: string
  name: string
  sort_order: number | null
}

type SettingType = "treatment" | "clinic" | "bodyPart"

export default function TreatmentSettingsPage() {
  const supabase = createClient()

  const [treatments, setTreatments] = useState<SettingItem[]>([])
  const [clinics, setClinics] = useState<SettingItem[]>([])
  const [bodyParts, setBodyParts] = useState<SettingItem[]>([])

  const [treatmentName, setTreatmentName] = useState("")
  const [clinicName, setClinicName] = useState("")
  const [bodyPartName, setBodyPartName] = useState("")

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<SettingType | null>(null)

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
      treatmentResult,
      clinicResult,
      bodyPartResult,
    ] = await Promise.all([
      supabase
        .from("treatments")
        .select("id, name, sort_order")
        .eq("user_id", user.id)
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("name"),

      supabase
        .from("treatment_clinics")
        .select("id, name, sort_order")
        .eq("user_id", user.id)
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("name"),

      supabase
        .from("treatment_body_parts")
        .select("id, name, sort_order")
        .eq("user_id", user.id)
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("name"),
    ])

    if (!treatmentResult.error) {
      setTreatments(treatmentResult.data ?? [])
    }

    if (!clinicResult.error) {
      setClinics(clinicResult.data ?? [])
    }

    if (!bodyPartResult.error) {
      setBodyParts(bodyPartResult.data ?? [])
    }

    setLoading(false)
  }

  async function addItem(type: SettingType) {
    const name =
      type === "treatment"
        ? treatmentName.trim()
        : type === "clinic"
          ? clinicName.trim()
          : bodyPartName.trim()

    if (!name) return

    setSaving(type)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setSaving(null)
      return
    }

    const currentItems =
      type === "treatment"
        ? treatments
        : type === "clinic"
          ? clinics
          : bodyParts

    const table =
      type === "treatment"
        ? "treatments"
        : type === "clinic"
          ? "treatment_clinics"
          : "treatment_body_parts"

    const maxSortOrder = currentItems.reduce(
      (max, item) => Math.max(max, item.sort_order ?? 0),
      -1
    )

    const { data, error } = await supabase
      .from(table)
      .insert({
        user_id: user.id,
        name,
        sort_order: maxSortOrder + 1,
      })
      .select("id, name, sort_order")
      .single()

    if (error) {
      alert(`追加に失敗しました。\n${error.message}`)
      setSaving(null)
      return
    }

    if (type === "treatment") {
      setTreatments((current) => [...current, data])
      setTreatmentName("")
    } else if (type === "clinic") {
      setClinics((current) => [...current, data])
      setClinicName("")
    } else {
      setBodyParts((current) => [...current, data])
      setBodyPartName("")
    }

    setSaving(null)
  }

  async function deleteItem(type: SettingType, id: string) {
    const table =
      type === "treatment"
        ? "treatments"
        : type === "clinic"
          ? "treatment_clinics"
          : "treatment_body_parts"

    const confirmed = window.confirm("削除しますか？")

    if (!confirmed) return

    const { error } = await supabase
      .from(table)
      .delete()
      .eq("id", id)

    if (error) {
      alert(`削除に失敗しました。\n${error.message}`)
      return
    }

    if (type === "treatment") {
      setTreatments((current) =>
        current.filter((item) => item.id !== id)
      )
    } else if (type === "clinic") {
      setClinics((current) =>
        current.filter((item) => item.id !== id)
      )
    } else {
      setBodyParts((current) =>
        current.filter((item) => item.id !== id)
      )
    }
  }

  async function moveItem(
    type: SettingType,
    index: number,
    direction: -1 | 1
  ) {
    const currentItems =
      type === "treatment"
        ? treatments
        : type === "clinic"
          ? clinics
          : bodyParts

    const targetIndex = index + direction

    if (
      targetIndex < 0 ||
      targetIndex >= currentItems.length
    ) {
      return
    }

    const reordered = [...currentItems]

    const [movedItem] = reordered.splice(index, 1)
    reordered.splice(targetIndex, 0, movedItem)

    const updatedItems = reordered.map((item, itemIndex) => ({
      ...item,
      sort_order: itemIndex,
    }))

    if (type === "treatment") {
      setTreatments(updatedItems)
    } else if (type === "clinic") {
      setClinics(updatedItems)
    } else {
      setBodyParts(updatedItems)
    }

    const table =
      type === "treatment"
        ? "treatments"
        : type === "clinic"
          ? "treatment_clinics"
          : "treatment_body_parts"

    const updates = updatedItems.map((item) =>
      supabase
        .from(table)
        .update({
          sort_order: item.sort_order,
        })
        .eq("id", item.id)
    )

    const results = await Promise.all(updates)

    const failed = results.find((result) => result.error)

    if (failed?.error) {
      alert(`並び替えの保存に失敗しました。\n${failed.error.message}`)
      await loadData()
    }
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>,
    type: SettingType
  ) {
    if (event.key !== "Enter") return

    event.preventDefault()
    addItem(type)
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F7FAFA] pb-24">
        <div className="fixed left-0 right-0 top-0 z-40 bg-[#F7FAFA]">
          <div className="mx-auto max-w-xl px-4">
            <header className="flex items-center justify-between border-b border-[#DFE9EC] pb-1 pt-[calc(env(safe-area-inset-top)+4px)]">
              <h1 className="text-2xl font-bold text-gray-800">
                施術設定
              </h1>

              <Link
                href="/treatment"
                className="rounded-xl border border-[#D6E6EA] bg-white px-3 py-2 text-sm font-semibold text-[#647F89]"
              >
                戻る
              </Link>
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
          <header className="flex items-center justify-between border-b border-[#DFE9EC] pb-1 pt-[calc(env(safe-area-inset-top)+4px)]">
            <h1 className="text-2xl font-bold text-gray-800">
              施術設定
            </h1>

            <Link
              href="/treatment"
              className="rounded-xl border border-[#D6E6EA] bg-white px-3 py-2 text-sm font-semibold text-[#647F89]"
            >
              戻る
            </Link>
          </header>
        </div>
      </div>

      <div className="mx-auto max-w-xl space-y-5 px-4 pt-[calc(env(safe-area-inset-top)+52px)]">
        <SettingSection
          title="施術"
          value={treatmentName}
          onChange={setTreatmentName}
          onKeyDown={(event) =>
            handleKeyDown(event, "treatment")
          }
          onAdd={() => addItem("treatment")}
          adding={saving === "treatment"}
          items={treatments}
          onMove={(index, direction) =>
            moveItem("treatment", index, direction)
          }
          onDelete={(id) =>
            deleteItem("treatment", id)
          }
        />

        <SettingSection
          title="クリニック"
          value={clinicName}
          onChange={setClinicName}
          onKeyDown={(event) =>
            handleKeyDown(event, "clinic")
          }
          onAdd={() => addItem("clinic")}
          adding={saving === "clinic"}
          items={clinics}
          onMove={(index, direction) =>
            moveItem("clinic", index, direction)
          }
          onDelete={(id) =>
            deleteItem("clinic", id)
          }
        />

        <SettingSection
          title="部位"
          value={bodyPartName}
          onChange={setBodyPartName}
          onKeyDown={(event) =>
            handleKeyDown(event, "bodyPart")
          }
          onAdd={() => addItem("bodyPart")}
          adding={saving === "bodyPart"}
          items={bodyParts}
          onMove={(index, direction) =>
            moveItem("bodyPart", index, direction)
          }
          onDelete={(id) =>
            deleteItem("bodyPart", id)
          }
        />
      </div>

      <BottomNav />
    </main>
  )
}

function SettingSection({
  title,
  value,
  onChange,
  onKeyDown,
  onAdd,
  adding,
  items,
  onMove,
  onDelete,
}: {
  title: string
  value: string
  onChange: (value: string) => void
  onKeyDown: (
    event: React.KeyboardEvent<HTMLInputElement>
  ) => void
  onAdd: () => void
  adding: boolean
  items: SettingItem[]
  onMove: (index: number, direction: -1 | 1) => void
  onDelete: (id: string) => void
}) {
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="text-lg font-bold text-gray-800">
        {title}
      </h2>

      <div className="mt-3 flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={`${title}を追加`}
          className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700 outline-none focus:border-[#A8C6D1]"
        />

        <button
          type="button"
          onClick={onAdd}
          disabled={adding || !value.trim()}
          className="shrink-0 rounded-xl bg-[#A8C6D1] px-4 py-3 text-sm font-bold text-white disabled:opacity-40"
        >
          {adding ? "追加中..." : "追加"}
        </button>
      </div>

      <div className="mt-4 space-y-2">
        {items.length === 0 ? (
          <p className="py-3 text-center text-sm text-gray-400">
            まだ登録されていません
          </p>
        ) : (
          items.map((item, index) => (
            <div
              key={item.id}
              className="flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 p-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-700">
                  {item.name}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => onMove(index, -1)}
                  disabled={index === 0}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-sm text-gray-500 disabled:opacity-25"
                  aria-label="上へ"
                >
                  ↑
                </button>

                <button
                  type="button"
                  onClick={() => onMove(index, 1)}
                  disabled={index === items.length - 1}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-sm text-gray-500 disabled:opacity-25"
                  aria-label="下へ"
                >
                  ↓
                </button>

                <button
                  type="button"
                  onClick={() => onDelete(item.id)}
                  className="flex h-8 items-center justify-center rounded-lg border border-red-100 bg-white px-2.5 text-xs font-semibold text-red-400"
                >
                  削除
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  )
}