"use client"

const USER_ID = "local-user"
const STORAGE_PREFIX = "takarabako-sukisukin-db-v1"

type Row = Record<string, any>
type Filter = { kind: string; column: string; value: any }

function key(table: string) { return `${STORAGE_PREFIX}:${table}` }
function read(table: string): Row[] {
  if (typeof window === "undefined") return []
  try { const raw = localStorage.getItem(key(table)); const data = raw ? JSON.parse(raw) : []; return Array.isArray(data) ? data : [] } catch { return [] }
}
function write(table: string, rows: Row[]) { if (typeof window !== "undefined") localStorage.setItem(key(table), JSON.stringify(rows)) }
function id() { return `${Date.now()}-${Math.random().toString(36).slice(2,9)}` }
function ensureSeeds(){
  if(typeof window === "undefined") return
  const seeds: Record<string, Row[]> = {
    skincare_categories:["化粧水","美容液","乳液","クリーム","洗顔","クレンジング","日焼け止め"].map((name,i)=>({id:`cat-${i+1}`,name,sort_order:i,user_id:USER_ID})),
    skincare_brands:[],
    ingredients:[].map((name,i)=>({id:`ing-${i+1}`,name,sort_order:i,user_id:USER_ID})),
    skincare_effects:["保湿","美白","毛穴","ニキビ","エイジングケア","鎮静"].map((name,i)=>({id:`eff-${i+1}`,name,sort_order:i,user_id:USER_ID})),
    treatment_body_parts:["顔","額","頬","鼻","顎","首","その他"].map((name,i)=>({id:`body-${i+1}`,name,sort_order:i,user_id:USER_ID})),
    treatment_clinics:[],
    treatments:[].map((name,i)=>({id:`treat-${i+1}`,name,sort_order:i,user_id:USER_ID})),
  }
  for(const [table,rows] of Object.entries(seeds)){if(localStorage.getItem(key(table))===null) write(table,rows)}
}

function project(row: Row, selection: string) {
  if (!selection || selection === "*") return { ...row }
  const fields = selection.split(",").map(s => s.trim()).filter(Boolean)
  const out: Row = {}
  for (const field of fields) if (Object.prototype.hasOwnProperty.call(row, field)) out[field] = row[field]
  return out
}

class QueryBuilder implements PromiseLike<any> {
  table: string; operation: "select"|"insert"|"update"|"upsert"|"delete" = "select"; selection = "*"; filters: Filter[] = []; orders: {column:string;ascending:boolean}[]=[]; limitCount:number|null=null; payload:any=null; mutationSelect=false; upsertKeys:string[]=[]
  constructor(table:string){this.table=table}
  select(selection="*", _opts?:any){ this.selection=selection; this.mutationSelect = this.operation !== "select"; return this }
  eq(column:string,value:any){this.filters.push({kind:"eq",column,value});return this}
  neq(column:string,value:any){this.filters.push({kind:"neq",column,value});return this}
  is(column:string,value:any){this.filters.push({kind:"is",column,value});return this}
  in(column:string,value:any[]){this.filters.push({kind:"in",column,value});return this}
  gte(column:string,value:any){this.filters.push({kind:"gte",column,value});return this}
  lte(column:string,value:any){this.filters.push({kind:"lte",column,value});return this}
  ilike(column:string,value:string){this.filters.push({kind:"ilike",column,value});return this}
  order(column:string,opts:any={}){this.orders.push({column,ascending:opts.ascending!==false});return this}
  limit(n:number){this.limitCount=n;return this}
  maybeSingle(){this.limitCount=1;return this.then((r:any)=>({data:r.data?.[0]??null,error:r.error??null}))}
  single(){this.limitCount=1;return this.then((r:any)=>({data:r.data?.[0]??null,error:r.error??(r.data?.length?null:{message:"No rows found"})}))}
  insert(payload:any){this.operation="insert";this.payload=payload;return this}
  update(payload:any){this.operation="update";this.payload=payload;return this}
  delete(){this.operation="delete";return this}
  async execute(){
    let rows=read(this.table)
    const matches=(r:Row)=>this.filters.every(f=>{
      const v=r[f.column]
      if(f.kind==='eq') return v===f.value
      if(f.kind==='neq') return v!==f.value
      if(f.kind==='is') return f.value===null ? v==null : v===f.value
      if(f.kind==='in') return f.value.includes(v)
      if(f.kind==='gte') return String(v??'')>=String(f.value)
      if(f.kind==='lte') return String(v??'')<=String(f.value)
      if(f.kind==='ilike') { const p=String(f.value).toLowerCase().replace(/%/g,''); return String(v??'').toLowerCase().includes(p) }
      return true
    })
    if(this.operation==='select'){
      let out=rows.filter(matches)
      for(let i=this.orders.length-1;i>=0;i--){const o=this.orders[i];out.sort((a,b)=>{const av=a[o.column],bv=b[o.column];if(av==null&&bv==null)return 0;if(av==null)return o.ascending?1:-1;if(bv==null)return o.ascending?-1:1;return av<bv?(o.ascending?-1:1):av>bv?(o.ascending?1:-1):0})}
      if(this.limitCount!=null) out=out.slice(0,this.limitCount)
      return {data:out.map(r=>project(r,this.selection)),error:null}
    }
    if(this.operation==='insert'){
      const list=Array.isArray(this.payload)?this.payload:[this.payload]
      const created=list.map((item:any)=>({id:item.id??id(),created_at:item.created_at??new Date().toISOString(),...item,user_id:item.user_id??USER_ID}))
      rows.push(...created);write(this.table,rows)
      return {data:this.mutationSelect?created.map(r=>project(r,this.selection)):null,error:null}
    }
    if(this.operation==='upsert'){
      const list=Array.isArray(this.payload)?this.payload:[this.payload]
      const created:Row[]=[]
      for(const item of list){
        const existingIndex=rows.findIndex(r=>{
          const keys=this.upsertKeys
          if(keys.length) return keys.every(k=>r[k]===item[k])
          if(item.id!=null) return r.id===item.id
          return r.user_id===item.user_id && r.record_date===item.record_date
        })
        if(existingIndex>=0){
          const next={...rows[existingIndex],...item,updated_at:new Date().toISOString()}
          rows[existingIndex]=next
          created.push(next)
        }else{
          const next={id:item.id??id(),created_at:item.created_at??new Date().toISOString(),...item,user_id:item.user_id??USER_ID}
          rows.push(next)
          created.push(next)
        }
      }
      write(this.table,rows)
      return {data:this.mutationSelect?created.map(r=>project(r,this.selection)):null,error:null}
    }

    if(this.operation==='update'){
      const updated:Row[]=[]
      rows=rows.map(r=>{if(matches(r)){const next={...r,...this.payload,updated_at:new Date().toISOString()};updated.push(next);return next}return r})
      write(this.table,rows);return {data:this.mutationSelect?updated.map(r=>project(r,this.selection)):null,error:null}
    }
    if(this.operation==='delete'){
      const deleted=rows.filter(matches);write(this.table,rows.filter(r=>!matches(r)));return {data:null,error:null,deleted}
    }
  }
  then<TResult1=any,TResult2=never>(onfulfilled?:((value:any)=>TResult1|PromiseLike<TResult1>)|null,onrejected?:((reason:any)=>TResult2|PromiseLike<TResult2>)|null):Promise<TResult1|TResult2>{return this.execute().then(onfulfilled as any,onrejected as any)}
}

const auth={
  async getUser(){return {data:{user:{id:USER_ID,email:"local@takarabako.local"}},error:null}},
  async getSession(){return {data:{session:{user:{id:USER_ID,email:"local@takarabako.local"}}},error:null}},
  onAuthStateChange(callback:(event:string,session:any)=>void){callback("SIGNED_IN",{user:{id:USER_ID,email:"local@takarabako.local"}});return {data:{subscription:{unsubscribe(){}}}}},
  async signOut(){return {error:null}},
  async signInWithPassword(){return {data:{user:{id:USER_ID}},error:null}},
  async resetPasswordForEmail(){return {data:null,error:null}},
  async updateUser(){return {data:{user:{id:USER_ID}},error:null}},
}

export function createClient(){ ensureSeeds(); return {from:(table:string)=>new QueryBuilder(table),auth} as any }
