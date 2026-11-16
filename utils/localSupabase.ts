"use client"

type Row = Record<string, any>

type Result = { data: any; error: any }

const TABLES = [
  "skincare_products",
  "skincare_categories",
  "skincare_brands",
  "ingredients",
  "skincare_effects",
  "skincare_product_ingredients",
  "skincare_product_effects",
  "skincare_product_usage_periods",
  "daily_records",
  "daily_skincare",
] as const

type TableName = (typeof TABLES)[number]

const KEY_PREFIX = "takarabako-local-"
const SEEDED_KEY = `${KEY_PREFIX}seeded-v1`
const USER_KEY = `${KEY_PREFIX}user-id-v1`

function storageKey(table: string) {
  return `${KEY_PREFIX}${table}-v1`
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}

function makeId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID()
  return `local-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

async function seedTable(table: TableName) {
  const existing = localStorage.getItem(storageKey(table))
  if (existing !== null) return JSON.parse(existing)

  const response = await fetch(`/data/${table}.json`)
  if (!response.ok) throw new Error(`${table} の初期データを読み込めませんでした。`)
  const rows = await response.json()
  localStorage.setItem(storageKey(table), JSON.stringify(rows))
  return rows
}

async function ensureSeeded() {
  if (localStorage.getItem(SEEDED_KEY) === "1") return

  await Promise.all(TABLES.map((table) => seedTable(table)))

  const products = JSON.parse(localStorage.getItem(storageKey("skincare_products")) || "[]")
  if (!localStorage.getItem(USER_KEY) && products[0]?.user_id) {
    localStorage.setItem(USER_KEY, products[0].user_id)
  }

  localStorage.setItem(SEEDED_KEY, "1")
}

function readRows(table: string): Row[] {
  try {
    return JSON.parse(localStorage.getItem(storageKey(table)) || "[]")
  } catch {
    return []
  }
}

function writeRows(table: string, rows: Row[]) {
  localStorage.setItem(storageKey(table), JSON.stringify(rows))
}

function parseSelectedColumns(selectString?: string) {
  if (!selectString || selectString.trim() === "*") return null
  return selectString
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => item.replace(/!inner.*$/, "").trim())
}

function projectRows(rows: Row[], columns: string[] | null) {
  if (!columns) return clone(rows)
  return rows.map((row) => {
    const next: Row = {}
    columns.forEach((column) => {
      if (column in row) next[column] = row[column]
    })
    return next
  })
}

class LocalQuery implements PromiseLike<Result> {
  private table: string
  private action: "select" | "insert" | "update" | "delete" | "upsert" = "select"
  private values: Row[] = []
  private filters: Array<(row: Row) => boolean> = []
  private selected: string | undefined
  private orders: Array<{ column: string; ascending: boolean; nullsFirst?: boolean }> = []
  private limitCount: number | null = null
  private singleMode: "single" | "maybeSingle" | null = null

  constructor(table: string) {
    this.table = table
  }

  select(columns = "*") {
    this.selected = columns
    return this
  }

  eq(column: string, value: any) {
    this.filters.push((row) => row[column] === value)
    return this
  }

  neq(column: string, value: any) {
    this.filters.push((row) => row[column] !== value)
    return this
  }

  is(column: string, value: any) {
    this.filters.push((row) => value === null ? row[column] == null : row[column] === value)
    return this
  }

  gte(column: string, value: any) {
    this.filters.push((row) => row[column] != null && row[column] >= value)
    return this
  }

  lte(column: string, value: any) {
    this.filters.push((row) => row[column] != null && row[column] <= value)
    return this
  }

  in(column: string, values: any[]) {
    this.filters.push((row) => values.includes(row[column]))
    return this
  }

  order(column: string, options: { ascending?: boolean; nullsFirst?: boolean } = {}) {
    this.orders.push({ column, ascending: options.ascending !== false, nullsFirst: options.nullsFirst })
    return this
  }

  limit(count: number) {
    this.limitCount = count
    return this
  }

  single() {
    this.singleMode = "single"
    return this
  }

  maybeSingle() {
    this.singleMode = "maybeSingle"
    return this
  }

  insert(values: Row | Row[]) {
    this.action = "insert"
    this.values = Array.isArray(values) ? values : [values]
    return this
  }

  update(values: Row) {
    this.action = "update"
    this.values = [values]
    return this
  }

  delete() {
    this.action = "delete"
    return this
  }

  upsert(values: Row | Row[]) {
    this.action = "upsert"
    this.values = Array.isArray(values) ? values : [values]
    return this
  }

  then<TResult1 = Result, TResult2 = never>(
    onfulfilled?: ((value: Result) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected)
  }

  private applyFilters(rows: Row[]) {
    return rows.filter((row) => this.filters.every((filter) => filter(row)))
  }

  private applyOrder(rows: Row[]) {
    if (!this.orders.length) return rows
    return [...rows].sort((a, b) => {
      for (const order of this.orders) {
        const av = a[order.column]
        const bv = b[order.column]
        if (av == null && bv == null) continue
        if (av == null) return order.nullsFirst === false ? 1 : -1
        if (bv == null) return order.nullsFirst === false ? -1 : 1
        if (av === bv) continue
        const result = av < bv ? -1 : 1
        return order.ascending ? result : -result
      }
      return 0
    })
  }

  private finalize(rows: Row[]): Result {
    let result = this.applyFilters(rows)
    result = this.applyOrder(result)
    if (this.limitCount != null) result = result.slice(0, this.limitCount)
    const projected = projectRows(result, parseSelectedColumns(this.selected))

    if (this.singleMode === "single") {
      if (projected.length !== 1) {
        return { data: null, error: { message: `Expected exactly one row, got ${projected.length}.` } }
      }
      return { data: projected[0], error: null }
    }

    if (this.singleMode === "maybeSingle") {
      if (projected.length > 1) {
        return { data: null, error: { message: `Expected zero or one row, got ${projected.length}.` } }
      }
      return { data: projected[0] ?? null, error: null }
    }

    return { data: projected, error: null }
  }

  private async execute(): Promise<Result> {
    try {
      await ensureSeeded()
      const rows = readRows(this.table)

      if (this.action === "select") return this.finalize(rows)

      if (this.action === "insert") {
        const inserted = this.values.map((value) => ({ id: value.id ?? makeId(), ...clone(value) }))
        writeRows(this.table, [...rows, ...inserted])
        return this.finalize(inserted)
      }

      if (this.action === "update") {
        let updated: Row[] = []
        const next = rows.map((row) => {
          if (!this.filters.every((filter) => filter(row))) return row
          const changed = { ...row, ...clone(this.values[0]) }
          updated.push(changed)
          return changed
        })
        writeRows(this.table, next)
        return this.finalize(updated)
      }

      if (this.action === "delete") {
        const deleted = rows.filter((row) => this.filters.every((filter) => filter(row)))
        const next = rows.filter((row) => !this.filters.every((filter) => filter(row)))
        writeRows(this.table, next)
        return { data: this.singleMode ? deleted[0] ?? null : deleted, error: null }
      }

      if (this.action === "upsert") {
        const next = [...rows]
        const changed: Row[] = []
        for (const value of this.values) {
          let index = -1
          if (value.id != null) {
            index = next.findIndex((row) => row.id === value.id)
          } else if (this.table === "daily_records") {
            index = next.findIndex((row) => row.user_id === value.user_id && row.record_date === value.record_date)
          }
          if (index >= 0) {
            next[index] = { ...next[index], ...clone(value) }
            changed.push(next[index])
          } else {
            const created = { id: makeId(), ...clone(value) }
            next.push(created)
            changed.push(created)
          }
        }
        writeRows(this.table, next)
        return this.finalize(changed)
      }

      return { data: null, error: { message: "Unsupported operation." } }
    } catch (error: any) {
      return { data: null, error: { message: error?.message ?? String(error) } }
    }
  }
}

export function createClient() {
  return {
    auth: {
      async getUser() {
        await ensureSeeded()
        let id = localStorage.getItem(USER_KEY) ?? "local-user"
        if (!localStorage.getItem(USER_KEY)) {
          const products = readRows("skincare_products")
          id = products[0]?.user_id ?? "local-user"
          localStorage.setItem(USER_KEY, id)
        }
        return { data: { user: { id, email: "local@takarabako" } }, error: null }
      },
      async signOut() {
        return { error: null }
      },
    },
    from(table: string) {
      return new LocalQuery(table)
    },
  }
}
