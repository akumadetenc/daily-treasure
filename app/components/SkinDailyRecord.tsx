"use client"

type Status = "○" | "△" | "×"
export type SkinState = {
  acne: Status
  comedones: Status
  roughness: Status
  dryness: Status
  redness: Status
  overallScore: number
}

const fields: [keyof SkinState, string][] = [
  ["acne", "ニキビ"],
  ["comedones", "毛穴"],
  ["roughness", "ざらつき"],
  ["dryness", "乾燥"],
  ["redness", "赤み"],
]

export const initialSkinState: SkinState = {
  acne: "○",
  comedones: "○",
  roughness: "○",
  dryness: "○",
  redness: "○",
  overallScore: 3,
}

export default function SkinDailyRecord({
  state,
  onChange,
}: {
  state: SkinState
  onChange: (next: SkinState) => void
}) {
  return (
    <section className="rounded-2xl border border-[#DDEBF0] bg-[#F8FCFD] p-4 shadow-sm">
      <h2 className="mb-4 text-base font-bold text-[#5D727A]">肌記録</h2>

      <div className="space-y-3">
        {fields.map(([key, label]) => (
          <div key={key} className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-[#65777D]">{label}</span>
            <div className="grid grid-cols-3 gap-1.5">
              {(["○", "△", "×"] as Status[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => onChange({ ...state, [key]: value })}
                  className={`h-9 w-11 rounded-lg border text-sm font-bold ${
                    state[key] === value
                      ? "border-[#A8C6D1] bg-[#DDEFF4] text-[#5D727A]"
                      : "border-[#DCE7EA] bg-white text-[#9AA8AD]"
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <p className="mb-2 text-sm font-semibold text-[#65777D]">総合点</p>
        <div className="grid grid-cols-5 gap-2">
          {[5, 4, 3, 2, 1].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => onChange({ ...state, overallScore: value })}
              className={`rounded-lg border py-2 text-sm font-bold ${
                state.overallScore === value
                  ? "border-[#A8C6D1] bg-[#DDEFF4] text-[#5D727A]"
                  : "border-[#DCE7EA] bg-white text-[#9AA8AD]"
              }`}
            >
              {value}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
