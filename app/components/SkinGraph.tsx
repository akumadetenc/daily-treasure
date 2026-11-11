"use client"
import { useEffect, useMemo, useState } from "react"

type Status="○"|"△"|"×"
type Row={record_date:string;overallScore:number;acne:Status;comedones:Status;roughness:Status;dryness:Status;redness:Status}
const KEY="takarabako-skin-daily-v1"

type Props={month: Date}

export default function SkinGraph({month}: Props){
 const [rows,setRows]=useState<Row[]>([])
 useEffect(()=>{try{const all=JSON.parse(localStorage.getItem(KEY)||"{}")||{};setRows(Object.entries(all).map(([record_date,v]:any)=>({...v,record_date})).sort((a,b)=>a.record_date.localeCompare(b.record_date)))}catch{setRows([])}},[])
 const monthRows=useMemo(()=>rows.filter(r=>{const d=new Date(r.record_date+"T12:00:00");return d.getFullYear()===month.getFullYear()&&d.getMonth()===month.getMonth()}),[rows,month])
 const avg=monthRows.length?(monthRows.reduce((s,r)=>s+Number(r.overallScore||0),0)/monthRows.length).toFixed(1):"-"
 const counts=(key:keyof Row)=>{const c={"○":0,"△":0,"×":0};monthRows.forEach(r=>{const v=r[key] as Status;if(v)c[v]++});return c}
 return <section className="rounded-2xl border border-[#DDEBF0] bg-[#F8FCFD] p-4 shadow-sm">
   <div className="grid grid-cols-2 gap-2">
     {([["average","平均総合点"],["acne","ニキビ"],["comedones","毛穴"],["roughness","ざらつき"],["dryness","乾燥"],["redness","赤み"]] as [string,string][]).map(([k,label])=>{
       if(k==="average") return <div key={label} className="flex h-[108px] flex-col items-center justify-center rounded-xl bg-white p-3 text-center">
         <p className="text-sm font-bold text-[#65777D]">{label}</p>
         <p className="mt-2 text-3xl font-bold text-[#5D727A]">{avg}</p>
       </div>
       const c=counts(k as keyof Row)
       return <div key={label} className="flex h-[108px] flex-col items-center justify-center rounded-xl bg-white p-3 text-center">
         <p className="text-sm font-bold text-[#65777D]">{label}</p>
         <div className="mt-3 flex justify-between text-xs text-[#71858D]"><span>○ {c["○"]}</span><span>△ {c["△"]}</span><span>× {c["×"]}</span></div>
       </div>
     })}
   </div>
 </section>
}
