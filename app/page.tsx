"use client";

import { useEffect, useMemo, useState } from "react";

type Expense = { id: string; category: string; amount: string; detail: string };
type GraphCategory = "気分" | "体調" | "過ごし方" | "支出";
type DailyRecord = {
  mood: string;
  activity: string;
  condition: string;
  expenses: Expense[];
  memo: string;
  updatedAt?: string;
};
type TreasureComment = { id: string; text: string; createdAt: string };
type Treasure = { id: string; date: string; url: string; title: string; note: string; comments?: TreasureComment[]; thumbnail?: string; siteName?: string; category?: string; createdAt: string };

const DEFAULT_CATEGORIES = ["食費", "日用品", "美容", "交通費", "趣味", "交際費", "その他"];
const MOODS = ["最高", "良い", "普通", "微妙", "つらい"];
const CONDITION_OPTIONS = ["◎", "〇", "△", "×"];
const ACTIVITIES = ["労働", "外出", "イベント", "まったり"];
const CAT_IMAGES = ["/mood/best.png", "/mood/good.png", "/mood/normal.png", "/mood/subtle.png", "/mood/hard.png"];
const RECORDS_KEY = "daily-treasure-records-v1";
const TREASURES_KEY = "daily-treasure-items-v1";
const CATEGORIES_KEY = "daily-treasure-categories";
const CATEGORY_COLORS_KEY = "daily-treasure-expense-category-colors-v1";
const COLOR_PALETTE = ["#E85D5D", "#E89AB5", "#E7C85B", "#80B88A", "#A78BD4", "#8EAAB3", "#E9A16F", "#8B8B8B", "#F29B75", "#6E9FD1"];
const DEFAULT_EXPENSE_COLORS: Record<string, string> = { "食費": "#E85D5D", "日用品": "#E89AB5", "美容": "#E7C85B", "交通費": "#80B88A", "趣味": "#A78BD4", "交際費": "#8EAAB3", "その他": "#E9A16F" };
const TREASURE_CATEGORIES_KEY = "daily-treasure-treasure-categories-v1";
const CATEGORY_RULES_KEY = "daily-treasure-category-rules-v1";
const DEFAULT_TREASURE_CATEGORIES = ["動画", "漫画", "Webページ", "商品", "食べ物", "旅行", "写真", "メモ", "その他"];
const DEFAULT_CATEGORY_RULES: Record<string, string> = {
  "動画": "youtube.com, youtu.be, nicovideo.jp, tiktok.com",
  "漫画": "cmoa.jp, comico.jp, booklive.jp, ebookjapan.yahoo.co.jp, manga.line.me",
  "Webページ": "",
  "商品": "amazon.co.jp, rakuten.co.jp, shopping.yahoo.co.jp",
  "食べ物": "tabelog.com, cookpad.com, delishkitchen.tv",
  "旅行": "jalan.net, ikyu.com, jtb.co.jp, travel.rakuten.co.jp",
  "写真": "",
  "メモ": "",
  "その他": "",
};

function todayString() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
let localIdCounter = 0;
function makeId() {
  localIdCounter += 1;
  return `item-${localIdCounter}`;
}
function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
function formatDate(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return `${y}年${m}月${d}日`;
}
function getMonthLabel(year: number, month: number) {
  return `${year}年${month + 1}月`;
}

function detectTreasureCategory(value: string, categories: string[], rules: Record<string, string>) {
  try {
    const parsed = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    for (const category of categories) {
      const domains = (rules[category] || "").split(/[，,\n]/).map((part) => part.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "")).filter(Boolean);
      if (domains.some((domain) => host === domain || host.endsWith(`.${domain}`))) return category;
    }
  } catch {}
  return categories.includes("その他") ? "その他" : (categories[0] || "その他");
}

export default function Home() {
  const [today, setToday] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [view, setView] = useState<"calendar" | "daily" | "treasures" | "treasure-list" | "settings" | "graphs">("calendar");
  const [monthDate, setMonthDate] = useState<Date | null>(null);
  const [records, setRecords] = useState<Record<string, DailyRecord>>({});
  const [treasures, setTreasures] = useState<Treasure[]>([]);
  const [treasureCategories, setTreasureCategories] = useState<string[]>(DEFAULT_TREASURE_CATEGORIES);
  const [categoryRules, setCategoryRules] = useState<Record<string, string>>(DEFAULT_CATEGORY_RULES);
  const [treasureCategory, setTreasureCategory] = useState("その他");
  const [treasureDate, setTreasureDate] = useState("");
  const [listCategory, setListCategory] = useState("すべて");
  const [treasureSearch, setTreasureSearch] = useState("");
  const [newTreasureCategory, setNewTreasureCategory] = useState("");
  const [mood, setMood] = useState("");
  const [activity, setActivity] = useState("");
  const [condition, setCondition] = useState("");
  const [expenses, setExpenses] = useState<Expense[]>([{ id: makeId(), category: "食費", amount: "", detail: "" }]);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [categoryColors, setCategoryColors] = useState<Record<string, string>>(DEFAULT_EXPENSE_COLORS);
  const [memo, setMemo] = useState("");
  const [categoryEditorOpen, setCategoryEditorOpen] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const [treasureUrl, setTreasureUrl] = useState("");
  const [treasureTitle, setTreasureTitle] = useState("");
  const [treasureNote, setTreasureNote] = useState("");
  const [treasureThumbnail, setTreasureThumbnail] = useState("");
  const [treasureSiteName, setTreasureSiteName] = useState("");
  const [editingTreasureId, setEditingTreasureId] = useState<string | null>(null);
  const [memoEditingId, setMemoEditingId] = useState<string | null>(null);
  const [memoDraft, setMemoDraft] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewMessage, setPreviewMessage] = useState("");
  const [graphCategory, setGraphCategory] = useState<GraphCategory>("気分");
  const [expandedExpenseCategory, setExpandedExpenseCategory] = useState<string | null>(null);

  const graphMonth = monthDate ?? new Date(2026, 0, 1);
  const monthRecordEntries = Object.entries(records).filter(([date]) => {
    const [year, month] = date.split("-").map(Number);
    return year === graphMonth.getFullYear() && month === graphMonth.getMonth() + 1;
  });
  const graphColors = graphCategory === "気分"
    ? ["#E85D5D", "#E89AB5", "#E7C85B", "#80B88A", "#A78BD4"]
    : graphCategory === "体調"
      ? ["#E85D5D", "#E7C85B", "#80B88A", "#A78BD4"]
      : graphCategory === "過ごし方"
        ? ["#A78BD4", "#E7C85B", "#E89AB5", "#80B88A"]
        : COLOR_PALETTE;
  function colorForStat(label: string, index: number) {
    if (graphCategory === "支出") return categoryColors[label] || COLOR_PALETTE[index % COLOR_PALETTE.length];
    if (graphCategory === "気分") {
      const moodColors: Record<string, string> = { "最高": "#E85D5D", "良い": "#E89AB5", "普通": "#E7C85B", "微妙": "#80B88A", "つらい": "#A78BD4" };
      return moodColors[label] || COLOR_PALETTE[index % COLOR_PALETTE.length];
    }
    if (graphCategory === "体調") {
      const conditionColors: Record<string, string> = { "◎": "#E85D5D", "〇": "#E7C85B", "△": "#80B88A", "×": "#A78BD4" };
      return conditionColors[label] || COLOR_PALETTE[index % COLOR_PALETTE.length];
    }
    if (graphCategory === "過ごし方") {
      const activityColors: Record<string, string> = { "労働": "#A78BD4", "外出": "#E7C85B", "イベント": "#E89AB5", "まったり": "#80B88A" };
      return activityColors[label] || COLOR_PALETTE[index % COLOR_PALETTE.length];
    }
    return graphColors[index % graphColors.length];
  }
  function countValues(values: string[]) {
    const counts: Record<string, number> = {};
    values.filter(Boolean).forEach((value) => { counts[value] = (counts[value] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }
  const moodStats = countValues(monthRecordEntries.map(([, record]) => record.mood));
  const conditionStats = countValues(monthRecordEntries.map(([, record]) => record.condition));
  const activityStats = countValues(monthRecordEntries.map(([, record]) => record.activity));
  const expenseTotals: Record<string, number> = {};
  monthRecordEntries.forEach(([, record]) => (record.expenses || []).forEach((expense) => {
    const amount = Number(String(expense.amount || "").replace(/,/g, ""));
    if (Number.isFinite(amount) && amount > 0) expenseTotals[expense.category || "その他"] = (expenseTotals[expense.category || "その他"] || 0) + amount;
  }));
  const expenseStats = Object.entries(expenseTotals).sort((a, b) => b[1] - a[1]);
  function renderPie(stats: [string, number][]) {
    const total = stats.reduce((sum, item) => sum + item[1], 0);
    let current = 0;
    const segments = stats.map((item, index) => {
      const start = current;
      current += total ? item[1] / total * 100 : 0;
      return `${colorForStat(item[0], index)} ${start}% ${current}%`;
    });
    let labelStart = 0;
    const labels = stats.map(([label, value], index) => {
      const portion = total ? value / total : 0;
      const angle = (labelStart + portion / 2) * Math.PI * 2 - Math.PI / 2;
      labelStart += portion;
      return { label, value, x: 50 + Math.cos(angle) * 29, y: 50 + Math.sin(angle) * 29, color: colorForStat(label, index), portion };
    }).filter((item) => item.portion >= 0.07);
    return (
      <div className="flex flex-col items-center">
        <div className="relative h-48 w-48 shrink-0 rounded-full" style={{ background: total ? `conic-gradient(${segments.join(", ")})` : "#F1EBE5" }} aria-label="円グラフ">
          {labels.map((item) => <span key={item.label} className="absolute -translate-x-1/2 -translate-y-1/2 px-0 py-0 text-xs font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]" style={{ left: `${item.x}%`, top: `${item.y}%` }}>{item.value}</span>)}
        </div>
        {!stats.length && <p className="mt-3 text-sm text-[#999999]">データなし</p>}
      </div>
    );
  }
  function renderStatsList(stats: [string, number][], money = false) {
    return stats.length ? <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1.5">{stats.map(([label, value], index) => <div key={label} className="flex items-center gap-1 text-xs text-[#55585A]"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: colorForStat(label, index) }} /><span>{label}</span><strong className="font-semibold">{money ? `${value.toLocaleString()}円` : `${value}件`}</strong></div>)}</div> : <p className="mt-2 text-center text-xs text-[#999999]">データなし</p>;
  }

  useEffect(() => {
    const currentDay = todayString();
    setToday(currentDay);
    setSelectedDate(currentDay);
    const now = new Date();
    setMonthDate(new Date(now.getFullYear(), now.getMonth(), 1));
  }, []);

  useEffect(() => {
    if (!today) return;
    try {
      const storedRecords = localStorage.getItem(RECORDS_KEY);
      const parsedRecords = storedRecords ? JSON.parse(storedRecords) : {};
      if (parsedRecords && typeof parsedRecords === "object") {
        setRecords(parsedRecords);
      } else {
        const oldRecord = localStorage.getItem(`daily-treasure-record-${today}`);
        if (oldRecord) setRecords({ [today]: JSON.parse(oldRecord) });
      }
      const storedTreasures = localStorage.getItem(TREASURES_KEY);
      if (storedTreasures) {
        const parsed = JSON.parse(storedTreasures);
        if (Array.isArray(parsed)) setTreasures(parsed);
      }
      const storedTreasureCategories = localStorage.getItem(TREASURE_CATEGORIES_KEY);
      if (storedTreasureCategories) {
        const parsed = JSON.parse(storedTreasureCategories);
        if (Array.isArray(parsed) && parsed.every((item) => typeof item === "string") && parsed.length) setTreasureCategories(parsed);
      }
      const storedRules = localStorage.getItem(CATEGORY_RULES_KEY);
      if (storedRules) {
        const parsed = JSON.parse(storedRules);
        if (parsed && typeof parsed === "object") setCategoryRules({ ...DEFAULT_CATEGORY_RULES, ...parsed });
      }
      const storedCategories = localStorage.getItem(CATEGORIES_KEY);
      if (storedCategories) {
        const parsed = JSON.parse(storedCategories);
        if (Array.isArray(parsed) && parsed.every((item) => typeof item === "string")) setCategories(parsed);
      }
      const storedCategoryColors = localStorage.getItem(CATEGORY_COLORS_KEY);
      if (storedCategoryColors) {
        const parsedColors = JSON.parse(storedCategoryColors);
        if (parsedColors && typeof parsedColors === "object" && !Array.isArray(parsedColors)) setCategoryColors({ ...DEFAULT_EXPENSE_COLORS, ...parsedColors });
      }
    } catch {
      // 保存データを読み込めない場合も画面は利用できます。
    }
  }, [today]);

  // 以前に保存したURLでタイトル・サムネイルが空の宝物も、表示時に補完する。
  useEffect(() => {
    if (!today || treasures.length === 0) return;
    const needsPreview = treasures.filter((item) => {
      if (!item.url) return false;
      const missingThumbnail = !item.thumbnail;
      const looksLikeFallbackTitle = !item.title || item.title === item.url.replace(/^https?:\/\//i, "").split("/")[0];
      return missingThumbnail || looksLikeFallbackTitle;
    });
    if (needsPreview.length === 0) return;
    let cancelled = false;
    async function enrichSavedTreasures() {
      const updates = new Map<string, Partial<Treasure>>();
      await Promise.all(needsPreview.map(async (item) => {
        try {
          const response = await fetch("/api/link-preview", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: item.url }),
          });
          if (!response.ok) return;
          const result = await response.json();
          const update: Partial<Treasure> = {};
          if (typeof result.thumbnail === "string" && result.thumbnail && !item.thumbnail) update.thumbnail = result.thumbnail;
          if (typeof result.title === "string" && result.title && (!item.title || item.title === item.url.replace(/^https?:\/\//i, "").split("/")[0])) update.title = result.title;
          if (typeof result.siteName === "string" && result.siteName && !item.siteName) update.siteName = result.siteName;
          if (Object.keys(update).length) updates.set(item.id, update);
        } catch {
          // URL先から情報を取得できない場合は、保存済みの内容を維持する。
        }
      }));
      if (cancelled || updates.size === 0) return;
      setTreasures((current) => {
        const next = current.map((item) => updates.has(item.id) ? { ...item, ...updates.get(item.id) } : item);
        localStorage.setItem(TREASURES_KEY, JSON.stringify(next));
        return next;
      });
    }
    void enrichSavedTreasures();
    return () => { cancelled = true; };
  }, [today, treasures]);

  useEffect(() => {
    const raw = treasureUrl.trim();
    if (!raw) {
      setTreasureThumbnail("");
      setTreasureSiteName("");
      setPreviewMessage("");
      return;
    }
    setTreasureCategory(detectTreasureCategory(raw, treasureCategories, categoryRules));
    let parsed: URL;
    try {
      parsed = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    } catch {
      setPreviewMessage("");
      return;
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return;

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setPreviewLoading(true);
      setPreviewMessage("");
      try {
        const response = await fetch("/api/link-preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: parsed.toString() }),
        });
        const result = await response.json();
        if (cancelled) return;
        if (response.ok) {
          if (result.title && !treasureTitle.trim()) setTreasureTitle(result.title);
          setTreasureThumbnail(typeof result.thumbnail === "string" ? result.thumbnail : "");
          setTreasureSiteName(typeof result.siteName === "string" ? result.siteName : "");
          setPreviewMessage(result.title || result.thumbnail ? "ページ情報を取得しました" : "ページ情報を取得できませんでした。タイトルは手入力できます。");
        } else {
          setPreviewMessage("ページ情報を取得できませんでした。URLはそのまま保存できます。");
        }
      } catch {
        if (!cancelled) setPreviewMessage("ページ情報を取得できませんでした。URLはそのまま保存できます。");
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    }, 700);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [treasureUrl, treasureCategories, categoryRules]);

  useEffect(() => {
    if (!selectedDate) return;
    const record = records[selectedDate];
    setMood(record?.mood ?? "");
    setActivity(record?.activity ?? "");
    setCondition(record?.condition ?? "");
    setExpenses(record?.expenses?.length ? record.expenses : [{ id: makeId(), category: categories[0] ?? "その他", amount: "", detail: "" }]);
    setMemo(record?.memo ?? "");
    setSavedMessage("");
  }, [selectedDate, records, categories]);

  const totalExpense = useMemo(
    () => expenses.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0),
    [expenses],
  );

  const monthYear = monthDate?.getFullYear() ?? 2000;
  const month = monthDate?.getMonth() ?? 0;
  const firstWeekday = new Date(monthYear, month, 1).getDay();
  const daysInMonth = new Date(monthYear, month + 1, 0).getDate();
  const calendarCells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (calendarCells.length % 7 !== 0) calendarCells.push(null);

  function changeMonth(delta: number) {
    setMonthDate(new Date(monthYear, month + delta, 1));
  }
  function saveDailyRecord() {
    const next = { ...records, [selectedDate]: { mood, activity, condition, expenses, memo, updatedAt: new Date().toISOString() } };
    setRecords(next);
    localStorage.setItem(RECORDS_KEY, JSON.stringify(next));
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
    setSavedMessage("保存しました");
    window.setTimeout(() => setSavedMessage(""), 2400);
  }
  function addExpense() {
    setExpenses((current) => [...current, { id: makeId(), category: categories[0] ?? "その他", amount: "", detail: "" }]);
  }
  function updateExpense(id: string, key: keyof Expense, value: string) {
    setExpenses((current) => current.map((expense) => expense.id === id ? { ...expense, [key]: value } : expense));
  }
  function removeExpense(id: string) {
    setExpenses((current) => current.length <= 1 ? current : current.filter((expense) => expense.id !== id));
  }
  function addCategory() {
    const value = newCategory.trim();
    if (!value || categories.includes(value)) return;
    const next = [...categories, value];
    setCategories(next);
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(next));
    const nextColors = { ...categoryColors, [value]: COLOR_PALETTE[next.length % COLOR_PALETTE.length] };
    setCategoryColors(nextColors);
    localStorage.setItem(CATEGORY_COLORS_KEY, JSON.stringify(nextColors));
    setNewCategory("");
  }
  function deleteCategory(category: string) {
    if (categories.length <= 1) return;
    const next = categories.filter((item) => item !== category);
    setCategories(next);
    setExpenses((current) => current.map((expense) => expense.category === category ? { ...expense, category: next[0] } : expense));
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(next));
    const nextColors = { ...categoryColors };
    delete nextColors[category];
    setCategoryColors(nextColors);
    localStorage.setItem(CATEGORY_COLORS_KEY, JSON.stringify(nextColors));
  }
  function updateCategoryColor(category: string, color: string) {
    const next = { ...categoryColors, [category]: color };
    setCategoryColors(next);
    localStorage.setItem(CATEGORY_COLORS_KEY, JSON.stringify(next));
  }
  function saveTreasure() {
    const url = treasureUrl.trim();
    const safeUrl = url ? (/^https?:\/\//i.test(url) ? url : `https://${url}`) : "";
    if (!safeUrl && !treasureTitle.trim() && !treasureNote.trim()) return;
    const editingItem = editingTreasureId ? treasures.find((item) => item.id === editingTreasureId) : undefined;
    const item: Treasure = {
      id: editingItem?.id || makeId(),
      date: editingTreasureId ? (treasureDate || editingItem?.date || today) : today,
      url: safeUrl,
      title: treasureTitle.trim() || (safeUrl ? safeUrl.replace(/^https?:\/\//, "").split("/")[0] : "タイトルなし"),
      note: treasureNote.trim(),
      thumbnail: treasureThumbnail,
      siteName: treasureSiteName,
      category: treasureCategory || "その他",
      createdAt: editingItem?.createdAt || new Date().toISOString(),
    };
    const next = editingTreasureId
      ? treasures.map((current) => current.id === editingTreasureId ? item : current)
      : [item, ...treasures];
    setTreasures(next);
    localStorage.setItem(TREASURES_KEY, JSON.stringify(next));
    setTreasureUrl("");
    setTreasureDate("");
    setTreasureTitle("");
    setTreasureNote("");
    setTreasureThumbnail("");
    setTreasureSiteName("");
    setEditingTreasureId(null);
    setTreasureCategory(treasureCategories.includes("その他") ? "その他" : (treasureCategories[0] || "その他"));
    setPreviewMessage("");
    setSavedMessage(editingTreasureId ? "宝物を更新しました" : "宝物を保存しました");
    window.setTimeout(() => setSavedMessage(""), 2400);
  }
  function editTreasure(item: Treasure) {
    setSelectedDate(item.date);
    setTreasureDate(item.date);
    setTreasureUrl(item.url || "");
    setTreasureTitle(item.title || "");
    setTreasureNote(item.note || "");
    setTreasureThumbnail(item.thumbnail || "");
    setTreasureSiteName(item.siteName || "");
    setTreasureCategory(item.category || "その他");
    setEditingTreasureId(item.id);
    setPreviewMessage("");
    setView("treasures");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function addTreasureComment(id: string) {
    const text = memoDraft.trim();
    if (!text) return;
    const comment: TreasureComment = { id: makeId(), text, createdAt: new Date().toISOString() };
    const next = treasures.map((item) => item.id === id ? { ...item, comments: [...(item.comments || []), comment] } : item);
    setTreasures(next);
    localStorage.setItem(TREASURES_KEY, JSON.stringify(next));
    setMemoDraft("");
    setMemoEditingId(id);
  }
  function formatCommentTime(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  }
  function BubbleIcon() {
    return <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H6l-3 2v-5.5A7.5 7.5 0 1 1 20 11.5Z"/><path d="M8 11h.01M12 11h.01M16 11h.01" strokeWidth="2.5"/></svg>;
  }
  function addTreasureCategory() {
    const value = newTreasureCategory.trim();
    if (!value || treasureCategories.includes(value)) return;
    const next = [...treasureCategories, value];
    setTreasureCategories(next);
    localStorage.setItem(TREASURE_CATEGORIES_KEY, JSON.stringify(next));
    setCategoryRules((current) => ({ ...current, [value]: current[value] || "" }));
    setNewTreasureCategory("");
  }
  function deleteTreasureCategory(category: string) {
    if (treasureCategories.length <= 1) return;
    const next = treasureCategories.filter((item) => item !== category);
    setTreasureCategories(next);
    localStorage.setItem(TREASURE_CATEGORIES_KEY, JSON.stringify(next));
    setCategoryRules((current) => { const updated = { ...current }; delete updated[category]; localStorage.setItem(CATEGORY_RULES_KEY, JSON.stringify(updated)); return updated; });
    setTreasures((current) => { const updated = current.map((item) => item.category === category ? { ...item, category: "その他" } : item); localStorage.setItem(TREASURES_KEY, JSON.stringify(updated)); return updated; });
    if (treasureCategory === category) setTreasureCategory(next.includes("その他") ? "その他" : next[0]);
    if (listCategory === category) setListCategory("すべて");
  }
  function updateCategoryRule(category: string, value: string) {
    setCategoryRules((current) => {
      const next = { ...current, [category]: value };
      localStorage.setItem(CATEGORY_RULES_KEY, JSON.stringify(next));
      return next;
    });
  }
  function deleteTreasure(id: string) {
    const next = treasures.filter((item) => item.id !== id);
    setTreasures(next);
    localStorage.setItem(TREASURES_KEY, JSON.stringify(next));
  }
  function selectDay(day: number) {
    const nextDate = dateKey(monthYear, month, day);
    setSelectedDate(nextDate);
    setView("calendar");
  }

  const inputClass = "w-full min-w-0 rounded-xl border border-[#F0DED0] bg-white px-3 py-3 text-base text-[#55585A] outline-none transition placeholder:text-[#A8A8A8] focus:border-[#E9A16F] focus:ring-2 focus:ring-[#FBE9DB]";
  const sectionClass = "rounded-2xl border border-[#EEE7E1] bg-white p-4 shadow-sm shadow-[#E8E0D8]/30 sm:p-5";
  const sectionTitleClass = "mb-4 flex items-center justify-between gap-3 text-base font-semibold text-[#55585A]";
  const selectedTreasures = treasures.filter((item) => item.date === selectedDate);
  const selectedDayExpenseTotal = (records[selectedDate]?.expenses || []).reduce((sum, expense) => {
    const amount = Number(String(expense.amount || "").replace(/,/g, ""));
    return sum + (Number.isFinite(amount) && amount > 0 ? amount : 0);
  }, 0);
  const hasDailyRecord = (date: string) => {
    const record = records[date];
    return !!record && (!!record.mood || !!record.activity || !!record.condition || !!record.memo?.trim() || record.expenses?.some((e) => !!e.amount || !!e.detail.trim()));
  };

  return (
    <main className="fixed inset-0 z-0 h-[100dvh] overflow-hidden overscroll-none bg-[#FFFAF6] text-[#55585A]">
      {today && selectedDate && (view === "calendar" || view === "daily" || view === "treasures" || view === "graphs") && (
        <header className={`fixed inset-x-0 top-0 z-50 isolate border-b border-[#EEE7E1] bg-[#FFFAF6] pt-[env(safe-area-inset-top)] shadow-none opacity-100 [backdrop-filter:none] [-webkit-backdrop-filter:none] ${view === "graphs" ? "min-h-[calc(58px+env(safe-area-inset-top))]" : ""}`}>
          <div className="mx-auto max-w-2xl px-3 pb-2 pt-2 sm:px-6">
            {view === "calendar" ? (
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0"><p className="text-[11px] text-[#929292]">選択した日</p><p className="truncate text-sm font-semibold text-[#55585A]">{formatDate(selectedDate)}</p></div>
                <div className="flex shrink-0 gap-2">
                  <button onClick={() => setView("daily")} className="rounded-lg bg-[#E9A16F] px-3 py-2 text-xs font-semibold text-white">日常記録</button>
                  <button onClick={() => setView("treasures")} className="rounded-lg border border-[#D5E2E6] bg-[#EAF1F3] px-3 py-2 text-xs font-semibold text-[#64838D]">宝物を追加</button>
                </div>
              </div>
            ) : view === "graphs" ? (
              <div className="flex items-center justify-between py-1">
                <span className="text-base font-semibold text-[#55585A]">グラフ</span>
                <span className="text-xs text-[#929292]">{getMonthLabel(graphMonth.getFullYear(), graphMonth.getMonth())}</span>
              </div>
            ) : (
              <div className="py-1"><span className="text-sm font-semibold text-[#777B7E]">{formatDate(selectedDate)}</span></div>
            )}
          </div>
        </header>
      )}
      <div
        className={`absolute inset-x-0 bottom-0 overflow-y-auto overscroll-y-none px-3 pb-24 [-webkit-overflow-scrolling:touch] sm:px-6 sm:pb-24 ${view === "calendar" || view === "daily" || view === "treasures" || view === "graphs" ? "pt-2" : "pt-[max(env(safe-area-inset-top),8px)] sm:pt-8"}`}
        style={{ top: today && selectedDate && (view === "calendar" || view === "daily" || view === "treasures" || view === "graphs") ? "calc(max(env(safe-area-inset-top), 8px) + 58px)" : "0px" }}
      >
      <div className="mx-auto max-w-2xl">
        {!today || !selectedDate || !monthDate ? (
          <div className="rounded-2xl border border-[#EEE7E1] bg-white px-4 py-10 text-center text-sm text-[#929292]">読み込み中…</div>
        ) : view === "calendar" && (
          <div className="space-y-3">
            <section className={sectionClass}>
              <div className="mb-4 flex items-center justify-between">
                <button aria-label="前の月" onClick={() => changeMonth(-1)} className="flex h-10 w-10 items-center justify-center rounded-full border border-[#EEE7E1] bg-[#FFFAF6] text-xl text-[#E18D55]">‹</button>
                <h2 className="text-lg font-semibold text-[#55585A]">{getMonthLabel(monthYear, month)}</h2>
                <button aria-label="次の月" onClick={() => changeMonth(1)} className="flex h-10 w-10 items-center justify-center rounded-full border border-[#EEE7E1] bg-[#FFFAF6] text-xl text-[#E18D55]">›</button>
              </div>
              <div className="grid grid-cols-7 gap-y-2 text-center">
                {["日", "月", "火", "水", "木", "金", "土"].map((day, i) => (
                  <div key={day} className={`pb-2 text-xs font-medium ${i === 0 ? "text-[#D88D78]" : i === 6 ? "text-[#819FA9]" : "text-[#999999]"}`}>{day}</div>
                ))}
                {calendarCells.map((day, i) => {
                  if (!day) return <div key={`blank-${i}`} className="h-12 sm:h-14" />;
                  const date = dateKey(monthYear, month, day);
                  const daily = hasDailyRecord(date);
                  const treasure = treasures.some((item) => item.date === date);
                  const isSelected = selectedDate === date;
                  const isToday = today === date;
                  return (
                    <button key={date} onClick={() => selectDay(day)} className={`relative mx-auto flex h-12 w-full max-w-12 flex-col items-center justify-center rounded-2xl text-sm transition sm:h-14 sm:max-w-14 ${isSelected ? "bg-[#E9A16F] font-semibold text-white" : isToday ? "border border-[#E9A16F] bg-[#FFF6EF] text-[#D9874F]" : "text-[#62666A] hover:bg-[#FFF2E8]"}`}>
                      <span>{day}</span>
                      <span className="mt-0 flex h-4 items-center justify-center gap-1 text-[11px] leading-none">
                        {records[date]?.condition && <img src={({"◎":"/icons/condition-calendar-best.svg","〇":"/icons/condition-calendar-good.svg","△":"/icons/condition-calendar-mid.svg","×":"/icons/condition-calendar-bad.svg"} as Record<string,string>)[records[date].condition]} alt={records[date].condition} className="h-3 w-3 object-contain" />}
                        {daily && !(records[date]?.expenses || []).some((expense) => Number(String(expense.amount || "").replace(/,/g, "")) > 0) && <span className={isSelected ? "text-white" : "text-[#E9A16F]"}>✦</span>}
                        {treasure && <span className={isSelected ? "text-[#DCE8EC]" : "text-[#8EAAB3]"}>✦</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className={sectionClass}>
              <h3 className={sectionTitleClass}><span>日常記録</span>{hasDailyRecord(selectedDate) && <button onClick={() => setView("daily")} className="rounded-lg bg-[#FFF0E4] px-3 py-1.5 text-xs font-medium text-[#D9874F]">記録編集</button>}</h3>
              {hasDailyRecord(selectedDate) ? (
                <div className="space-y-3 text-sm">
                  {(records[selectedDate]?.mood || records[selectedDate]?.activity || records[selectedDate]?.condition) && <div className="flex items-center gap-4">
                    {records[selectedDate]?.mood && <div className="flex min-w-0 flex-1 flex-col items-center gap-1"><img src={CAT_IMAGES[MOODS.indexOf(records[selectedDate].mood)] || CAT_IMAGES[2]} alt={records[selectedDate].mood} className="h-9 w-9 object-contain" /><span className="text-xs text-[#999999]">気分</span></div>}
                    {records[selectedDate]?.activity && <div className="flex min-w-0 flex-1 flex-col items-center gap-1"><img src={({"労働":"/icons/work.svg","外出":"/icons/outing.svg","イベント":"/icons/event.svg","まったり":"/icons/relax.svg"} as Record<string,string>)[records[selectedDate].activity]} alt={records[selectedDate].activity} className="h-8 w-8 object-contain" /><span className="text-xs text-[#999999]">過ごし方</span></div>}
                    {records[selectedDate]?.condition && <div className="flex min-w-0 flex-1 flex-col items-center gap-1"><img src={({"◎":"/icons/condition-best.svg","〇":"/icons/condition-good.svg","△":"/icons/condition-mid.svg","×":"/icons/condition-bad.svg"} as Record<string,string>)[records[selectedDate].condition]} alt={records[selectedDate].condition} className="h-8 w-8 object-contain" /><span className="text-xs text-[#999999]">体調</span></div>}
                  </div>}
                  {!!records[selectedDate]?.expenses?.some((e) => e.amount || e.detail) && <div className="rounded-xl border border-[#F3D4BE] bg-[#FFF5EC] p-3"><p className="mb-2 flex items-center gap-2 text-sm text-[#D9874F]"><span>支出</span><span className="font-semibold">{selectedDayExpenseTotal.toLocaleString("ja-JP")}円</span></p><div className="space-y-1">{records[selectedDate].expenses.filter((e) => e.amount || e.detail).map((e) => <p key={e.id} className="py-0.5 text-sm text-[#C4BCB6]">{e.category}　{e.amount ? `${Number(e.amount).toLocaleString("ja-JP")}円` : ""}　<span className="text-[#D8D2CD]">{e.detail}</span></p>)}</div></div>}
                  {records[selectedDate]?.memo && <p className="whitespace-pre-wrap leading-6">{records[selectedDate].memo}</p>}
                </div>
              ) : <p className="text-sm text-[#999999]">この日の記録はまだありません。</p>}
            </section>

            <section className={sectionClass}>
              <h3 className={sectionTitleClass}><span>宝物</span><span className="text-xs font-normal text-[#999999]">{selectedTreasures.length}件</span></h3>
              {selectedTreasures.length ? (
                <div className="space-y-3">
                  {selectedTreasures.map((item) => <article key={item.id} className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white">
                    <div className="flex items-start gap-3 p-3">
                      <div className="min-w-0 flex-1">
                        <p className="mb-1 text-xs text-[#92999C]">{item.category || "その他"}{item.siteName ? ` · ${item.siteName}` : ""}</p>
                        {item.url ? <a href={item.url} target="_blank" rel="noreferrer" className="break-words text-sm font-semibold text-[#374151] no-underline">{item.title}</a> : <p className="break-words text-sm font-semibold text-[#374151]">{item.title}</p>}
                        
                      </div>
                      {item.thumbnail && <a href={item.url || undefined} target={item.url ? "_blank" : undefined} rel="noreferrer" className="h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-white"><img src={item.thumbnail} alt="" loading="lazy" className="h-full w-full object-contain" onError={(event) => { event.currentTarget.style.display = "none"; }} /></a>}
                    </div>
                    {item.note && <p className="px-3 pb-2 whitespace-pre-wrap text-sm leading-5 text-[#62666A]">{item.note}</p>}
                    <div className="px-3 pb-2 text-right"><button onClick={() => deleteTreasure(item.id)} className="text-xs text-[#999999] hover:text-rose-500">削除</button></div>
                  </article>)}
                  <button onClick={() => setView("treasures")} className="w-full rounded-xl border border-dashed border-[#C6D9DF] py-2.5 text-sm font-medium text-[#64838D]">＋ 宝物を追加</button>
                </div>
              ) : <div className="space-y-3"><p className="text-sm text-[#999999]">この日に登録した宝物はありません。</p><button onClick={() => setView("treasures")} className="w-full rounded-xl border border-dashed border-[#C6D9DF] py-3 text-sm font-medium text-[#64838D]">＋ 動画・URLを登録</button></div>}
            </section>
          </div>
        )}

        {today && selectedDate && view === "daily" && (
          <div className="space-y-3">
            <section className={sectionClass}>
              <label htmlFor="daily-record-date" className="mb-2 block text-sm font-semibold text-[#55585A]">記録する日付</label>
              <input id="daily-record-date" aria-label="記録する日付" type="date" value={selectedDate} max={today} onChange={(event) => { if (event.target.value) setSelectedDate(event.target.value); }} className={`${inputClass} box-border max-w-full appearance-none`} style={{ width: "100%" }} />
            </section>
            <section className={sectionClass}>
              <h2 className={sectionTitleClass}>気分</h2>
              <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                {MOODS.map((option, index) => <button key={option} type="button" onClick={() => setMood(mood === option ? "" : option)} aria-pressed={mood === option} className={`flex min-w-0 flex-col items-center justify-center rounded-xl border p-1.5 transition sm:p-2 ${mood === option ? "border-[#E9A16F] bg-[#FBE9DB] ring-2 ring-[#F4D2B8]" : "border-[#EEE7E1] bg-[#FFFCF9] hover:bg-[#FFF3EA]"}`}><img src={CAT_IMAGES[index]} alt={option} className="h-12 w-12 object-contain sm:h-14 sm:w-14" /></button>)}
              </div>
            </section>
            <section className={sectionClass}>
              <h2 className={sectionTitleClass}>過ごし方</h2>
              <div className="grid grid-cols-4 gap-2">
                {ACTIVITIES.map((option) => {
                  const activityIcons: Record<string, string> = { "労働": "/icons/work.svg", "外出": "/icons/outing.svg", "イベント": "/icons/event.svg", "まったり": "/icons/relax.svg" };
                  return <button key={option} type="button" onClick={() => setActivity(activity === option ? "" : option)} className={`flex flex-col items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm transition ${activity === option ? "border-[#E9A16F] bg-[#FBE9DB] font-semibold text-[#D9874F]" : "border-[#EEE7E1] bg-[#FFFCF9] text-[#62666A] hover:bg-[#FFF3EA]"}`}><img src={activityIcons[option]} alt={option} className="h-9 w-9 object-contain" /></button>;
                })}
              </div>
            </section>
            <section className={sectionClass}>
              <h2 className={sectionTitleClass}>体調</h2>
              <div className="grid grid-cols-4 gap-2">
                {CONDITION_OPTIONS.map((option) => {
                  const conditionIcons: Record<string, string> = { "◎": "/icons/condition-best.svg", "〇": "/icons/condition-good.svg", "△": "/icons/condition-mid.svg", "×": "/icons/condition-bad.svg" };
                  return <button key={option} type="button" aria-label={`体調 ${option}`} onClick={() => setCondition(condition === option ? "" : option)} className={`flex items-center justify-center rounded-xl border p-2 transition ${condition === option ? "border-[#E9A16F] bg-[#FBE9DB] ring-2 ring-[#F4D2B8]" : "border-[#EEE7E1] bg-[#FFFCF9] hover:bg-[#FFF3EA]"}`}><img src={conditionIcons[option]} alt={option} className="h-9 w-9 object-contain" /></button>;
                })}
              </div>
            </section>
            <section className={sectionClass}>
              <div className={sectionTitleClass}><h2>支出</h2><button type="button" onClick={() => setCategoryEditorOpen(true)} className="rounded-full border border-[#F0D7C4] bg-[#FFF8F1] px-3 py-2 text-xs font-medium text-[#D9874F]">カテゴリを編集</button></div>
              <div className="space-y-2">
                {expenses.map((expense, index) => <div key={expense.id} className="rounded-xl bg-[#FFFAF6] p-2.5">
                  <div className="mb-2 flex justify-end">{expenses.length > 1 && <button type="button" onClick={() => removeExpense(expense.id)} className="px-1 text-xs text-[#999999]">削除</button>}</div>
                  <div className="grid grid-cols-[1fr_1fr] gap-2">
                    <select aria-label="支出カテゴリ" value={expense.category} onChange={(event) => updateExpense(expense.id, "category", event.target.value)} className={inputClass}>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select>
                    <input aria-label="金額（円）" inputMode="numeric" type="number" min="0" value={expense.amount} onChange={(event) => updateExpense(expense.id, "amount", event.target.value)} placeholder="金額（円）" className={inputClass} />
                  </div>
                  <input aria-label="支出内容" value={expense.detail} onChange={(event) => updateExpense(expense.id, "detail", event.target.value)} placeholder="内容（任意）" className={`${inputClass} mt-2`} />
                </div>)}
              </div>
              <button type="button" onClick={addExpense} className="mt-3 w-full rounded-xl border border-dashed border-[#E9B995] bg-[#FFFCF9] py-3 text-sm font-medium text-[#D9874F]">＋ 支出を追加</button>
              <div className="mt-3 flex items-center justify-between rounded-xl bg-[#FBE9DB] px-4 py-3"><span className="text-sm font-medium text-[#777B7E]">合計</span><span className="text-xl font-bold tabular-nums text-[#D9874F]">{totalExpense.toLocaleString("ja-JP")}<span className="ml-1 text-sm font-medium">円</span></span></div>
            </section>
            <section className={sectionClass}>
              <h2 className={sectionTitleClass}>今日のメモ</h2>
              <textarea value={memo} onChange={(event) => setMemo(event.target.value)} rows={5} placeholder="今日あったこと、思ったことなど…" className={`${inputClass} resize-y leading-6`} />
            </section>
            <button type="button" onClick={saveDailyRecord} className="w-full rounded-2xl bg-[#E9A16F] px-5 py-4 text-base font-semibold text-white shadow-lg shadow-[#F2D4BE]/70 transition hover:bg-[#DF925D]">日常記録を保存</button>
            {savedMessage && <p role="status" className="rounded-xl bg-white px-3 py-2 text-center text-sm text-[#D9874F] shadow-sm">{savedMessage}</p>}
          </div>
        )}

        {today && selectedDate && view === "treasures" && (
          <div className="space-y-3">
            <section className={sectionClass}>
              <div className="space-y-3">
                {editingTreasureId && <label className="block text-sm text-[#777B7E]">作成日<input type="date" value={treasureDate || selectedDate} onChange={(event) => setTreasureDate(event.target.value)} className={`${inputClass} mt-1`} /></label>}
                <input type="url" inputMode="url" value={treasureUrl} onChange={(event) => { setTreasureUrl(event.target.value); setTreasureTitle(""); setTreasureThumbnail(""); setTreasureSiteName(""); }} placeholder="動画・WebページのURL" className={inputClass} />
                <select value={treasureCategory} onChange={(event) => setTreasureCategory(event.target.value)} className={`${inputClass} !bg-[#FFF1E5]`} aria-label="宝物カテゴリ">{treasureCategories.map((category) => <option key={category} value={category}>{category}</option>)}</select>
                {previewLoading && <p className="text-xs text-[#64838D]">ページ情報を確認中…</p>}
                {!previewLoading && previewMessage && <p className="text-xs text-[#64838D]">{previewMessage}</p>}
                {treasureThumbnail && (
                  <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white">
                    <img src={treasureThumbnail} alt="" className={treasureCategory === "漫画" ? "mx-auto aspect-[3/4] max-h-[360px] w-auto max-w-full object-contain" : "aspect-video w-full object-cover"} onError={(event) => { event.currentTarget.style.display = "none"; }} />
                  </div>
                )}
                <input value={treasureTitle} onChange={(event) => setTreasureTitle(event.target.value)} placeholder="タイトル（自動取得・編集可）" className={inputClass} />
                <textarea value={treasureNote} onChange={(event) => setTreasureNote(event.target.value)} rows={3} placeholder="ひとことメモ（任意）" className={`${inputClass} resize-y`} />
                <button onClick={saveTreasure} disabled={!treasureUrl.trim() && !treasureTitle.trim() && !treasureNote.trim()} className="w-full rounded-xl border border-[#E9A16F] bg-[#E9A16F] px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-[#DF925D] disabled:cursor-not-allowed disabled:opacity-40">{editingTreasureId ? "変更を保存" : "宝物を保存"}</button>{editingTreasureId && <button type="button" onClick={() => { setEditingTreasureId(null); setTreasureUrl(""); setTreasureTitle(""); setTreasureNote(""); setTreasureThumbnail(""); setTreasureSiteName(""); setPreviewMessage(""); }} className="w-full rounded-xl border border-[#EEE7E1] py-3 text-sm text-[#777B7E]">編集をキャンセル</button>}
              </div>
            </section>
            <section className={sectionClass}>
              <h2 className={sectionTitleClass}><span>この日の宝物</span><span className="text-xs font-normal text-[#999999]">{selectedTreasures.length}件</span></h2>
              {selectedTreasures.length ? <div className="space-y-3">{selectedTreasures.map((item) => <article key={item.id} className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white">{item.thumbnail && <a href={item.url || undefined} target="_blank" rel="noreferrer" className="block bg-white"><img src={item.thumbnail} alt="" loading="lazy" className={item.category === "漫画" ? "mx-auto aspect-[3/4] max-h-[360px] w-auto max-w-full object-contain" : "aspect-video w-full object-cover"} onError={(event) => { event.currentTarget.style.display = "none"; }} /></a>}<div className="p-3"><p className="mb-1 text-xs text-[#92999C]">{item.category || "その他"}</p>{item.url ? <a href={item.url} target="_blank" rel="noreferrer" className="break-words text-sm font-semibold text-[#374151] no-underline">{item.title}</a> : <p className="break-words text-sm font-semibold text-[#374151]">{item.title}</p>}{item.note && <p className="mt-2 whitespace-pre-wrap text-sm leading-5">{item.note}</p>}{memoEditingId === item.id && (item.comments || []).length > 0 && <div className="mt-3 space-y-2">{(item.comments || []).map((comment) => <div key={comment.id} className="rounded-lg bg-white/90 px-3 py-2"><p className="whitespace-pre-wrap break-words text-sm leading-5 text-[#55585A]">{comment.text}</p><p className="mt-1 text-right text-[11px] text-[#9A9FA2]">{formatCommentTime(comment.createdAt)}</p></div>)}</div>}{memoEditingId === item.id && <div className="mt-3 flex items-end gap-2"><textarea value={memoDraft} onChange={(event) => setMemoDraft(event.target.value)} rows={2} placeholder="見ている途中の一言メモ" className={`${inputClass} min-w-0 flex-1 resize-y`} /><button onClick={() => addTreasureComment(item.id)} disabled={!memoDraft.trim()} className="shrink-0 rounded-xl bg-[#E9A16F] px-4 py-3 text-sm font-semibold text-white disabled:opacity-40">追加</button></div>}<div className="mt-3 flex items-center justify-between"><button onClick={() => { setMemoEditingId(memoEditingId === item.id ? null : item.id); setMemoDraft(""); }} className="inline-flex items-center gap-1 text-xs text-[#64838D]"><BubbleIcon />{(item.comments || []).length ? ` ${(item.comments || []).length}` : ""}</button><div className="flex gap-3"><button onClick={() => editTreasure(item)} className="text-xs text-[#D9874F]">編集</button><button onClick={() => deleteTreasure(item.id)} className="text-xs text-[#999999] hover:text-rose-500">削除</button></div></div></div></article>)}</div> : <p className="text-sm text-[#999999]">まだ宝物はありません。</p>}
            </section>
          </div>
        )}
      </div>

        {today && selectedDate && view === "treasure-list" && (
          <div className="space-y-3">
            <section className="sticky top-0 z-40 rounded-2xl border border-[#EEE7E1] bg-[#FFFAF6] p-3 shadow-[0_2px_4px_rgba(80,60,40,0.04)]">
                <div className="mb-3 flex items-center justify-between gap-2"><button onClick={() => setView("settings")} className="text-xs text-[#D9874F]">カテゴリ設定</button><span className="text-xs text-[#999999]">{treasures.filter((item) => listCategory === "すべて" || (item.category || "その他") === listCategory).length}件</span></div>
                <input type="search" value={treasureSearch} onChange={(event) => setTreasureSearch(event.target.value)} placeholder="タイトル・URL・メモを検索" className={`${inputClass} mb-3`} />
                <div className="flex gap-2 overflow-x-auto pb-1">{["すべて", ...treasureCategories].map((category) => <button key={category} onClick={() => setListCategory(category)} className={`shrink-0 rounded-full border px-3 py-2 text-xs font-medium ${listCategory === category ? "border-[#8EAAB3] bg-[#DCE8EC] text-[#64838D]" : "border-[#EEE7E1] bg-white text-[#888D90]"}`}>{category}</button>)}</div>
            </section>
            <section className="space-y-3 rounded-2xl border border-[#EEE7E1] bg-white p-3 shadow-sm shadow-[#E8E0D8]/30">
              {treasures.filter((item) => (listCategory === "すべて" || (item.category || "その他") === listCategory) && (!treasureSearch.trim() || [item.title, item.url, item.note, item.siteName, item.category, ...(item.comments || []).map((comment) => comment.text)].some((value) => (value || "").toLowerCase().includes(treasureSearch.trim().toLowerCase())))).length ? (
                <div className="space-y-3">
                  {treasures.filter((item) => (listCategory === "すべて" || (item.category || "その他") === listCategory) && (!treasureSearch.trim() || [item.title, item.url, item.note, item.siteName, item.category, ...(item.comments || []).map((comment) => comment.text)].some((value) => (value || "").toLowerCase().includes(treasureSearch.trim().toLowerCase())))).slice().sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)).map((item) => (
                    <article key={item.id} className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white">
                      {item.thumbnail && <a href={item.url || undefined} target="_blank" rel="noreferrer" className="block bg-white"><img src={item.thumbnail} alt="" loading="lazy" className={item.category === "漫画" ? "mx-auto aspect-[3/4] max-h-[360px] w-auto max-w-full object-contain" : "aspect-video w-full object-cover"} onError={(event) => { event.currentTarget.style.display = "none"; }} /></a>}
                      <div className="p-3">
                        <p className="mb-1 text-xs text-[#92999C]">{formatDate(item.date)} · {item.category || "その他"}{item.siteName ? ` · ${item.siteName}` : ""}</p>
                        {item.url ? <a href={item.url} target="_blank" rel="noreferrer" className="break-words text-sm font-semibold text-[#374151] no-underline">{item.title}</a> : <p className="break-words text-sm font-semibold text-[#374151]">{item.title}</p>}
                        
                        {item.note && <p className="mt-2 whitespace-pre-wrap text-sm leading-5 text-[#62666A]">{item.note}</p>}
                        {memoEditingId === item.id && (item.comments || []).length > 0 && <div className="mt-3 space-y-2">{(item.comments || []).map((comment) => <div key={comment.id} className="rounded-lg bg-white/90 px-3 py-2"><p className="whitespace-pre-wrap break-words text-sm leading-5 text-[#55585A]">{comment.text}</p><p className="mt-1 text-right text-[11px] text-[#9A9FA2]">{formatCommentTime(comment.createdAt)}</p></div>)}</div>}{memoEditingId === item.id && <div className="mt-3 flex items-end gap-2"><textarea value={memoDraft} onChange={(event) => setMemoDraft(event.target.value)} rows={2} placeholder="見ている途中の一言メモ" className={`${inputClass} min-w-0 flex-1 resize-y`} /><button onClick={() => addTreasureComment(item.id)} disabled={!memoDraft.trim()} className="shrink-0 rounded-xl bg-[#E9A16F] px-4 py-3 text-sm font-semibold text-white disabled:opacity-40">追加</button></div>}
                        <div className="mt-3 flex items-center justify-end">
                          <div className="flex gap-3"><button onClick={() => { setMemoEditingId(memoEditingId === item.id ? null : item.id); setMemoDraft(""); }} className="inline-flex items-center gap-1 text-xs text-[#64838D]"><BubbleIcon />{(item.comments || []).length ? ` ${(item.comments || []).length}` : ""}</button><button onClick={() => editTreasure(item)} className="text-xs text-[#D9874F]">編集</button><button onClick={() => deleteTreasure(item.id)} className="text-xs text-[#999999] hover:text-rose-500">削除</button></div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : <p className="text-sm text-[#999999]">まだ宝物はありません。</p>}
              <button onClick={() => setView("treasures")} className="mt-1 w-full rounded-xl border border-dashed border-[#C6D9DF] py-3 text-sm font-medium text-[#64838D]">＋ 宝物を追加</button>
            </section>
          </div>
        )}

        {today && view === "graphs" && (
          <div className="space-y-3">
            <section className={sectionClass}>
              <div className="mb-4 flex items-center justify-between gap-2">
                <button type="button" aria-label="前の月" onClick={() => setMonthDate(new Date(graphMonth.getFullYear(), graphMonth.getMonth() - 1, 1))} className="rounded-xl border border-[#EEE7E1] px-3 py-2 text-[#777B7E]">‹</button>
                <h2 className="text-base font-semibold text-[#55585A]">{getMonthLabel(graphMonth.getFullYear(), graphMonth.getMonth())}</h2>
                <button type="button" aria-label="次の月" onClick={() => setMonthDate(new Date(graphMonth.getFullYear(), graphMonth.getMonth() + 1, 1))} className="rounded-xl border border-[#EEE7E1] px-3 py-2 text-[#777B7E]">›</button>
              </div>
              <p className="mb-3 text-xs text-[#929292]">日常記録 {monthRecordEntries.length}日分</p>
              <div className="grid grid-cols-2 gap-1 rounded-xl bg-[#F5F0EB] p-1">
                <button onClick={() => setGraphCategory("気分")} className={`rounded-lg px-2 py-2 text-sm ${graphCategory !== "支出" ? "bg-white font-semibold text-[#D9874F] shadow-sm" : "text-[#777B7E]"}`}>日常の記録</button>
                <button onClick={() => setGraphCategory("支出")} className={`rounded-lg px-2 py-2 text-sm ${graphCategory === "支出" ? "bg-white font-semibold text-[#D9874F] shadow-sm" : "text-[#777B7E]"}`}>支出</button>
              </div>
            </section>
            <section className={sectionClass}>
              <h2 className={`${sectionTitleClass} mb-4`}>{graphCategory}</h2>
              {graphCategory !== "支出" && <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[{ title: "気分", stats: moodStats }, { title: "過ごし方", stats: activityStats }, { title: "体調", stats: conditionStats }].map(({ title, stats }) => <div key={title} className="rounded-xl bg-[#FFFCF9] p-3"><h3 className="mb-2 text-center text-sm font-semibold text-[#55585A]">{title}</h3><div className="scale-[0.78] origin-top"><div className="-mb-10">{renderPie(stats)}</div></div>{renderStatsList(stats)}</div>)}
              </div>}
              {graphCategory === "支出" && <>
                <div className="mb-4 flex items-center justify-between rounded-xl bg-[#FFF3EA] px-4 py-3">
                  <span className="text-sm font-semibold text-[#55585A]">合計</span>
                  <strong className="text-xl text-[#D9874F]">{expenseStats.reduce((sum, item) => sum + item[1], 0).toLocaleString()}円</strong>
                </div>
                {renderPie(expenseStats)}
                <div className="mt-5 border-t border-[#EEE7E1] pt-4">
                  {expenseStats.length ? <div className="space-y-3">{expenseStats.map(([label, value], index) => {
                    const details = monthRecordEntries.flatMap(([date, record]) => (record.expenses || []).filter((expense) => expense.category === label && Number(String(expense.amount || "").replace(/,/g, "")) > 0).map((expense) => ({ date, amount: Number(String(expense.amount || "").replace(/,/g, "")), detail: expense.detail })));
                    const expanded = expandedExpenseCategory === label;
                    return <div key={label} className="overflow-hidden rounded-xl bg-[#FFFCF9]"><button type="button" onClick={() => setExpandedExpenseCategory(expanded ? null : label)} className="w-full px-3 py-3 text-left"><div className="mb-2 flex items-center justify-between gap-3 text-sm"><span className="flex items-center gap-2"><span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: categoryColors[label] || COLOR_PALETTE[index % COLOR_PALETTE.length] }} />{label}<span className="text-xs text-[#929292]">{expanded ? "−" : "+"}</span></span><strong className="shrink-0 text-[#55585A]">{value.toLocaleString()}円</strong></div></button>{expanded && <div className="space-y-2 border-t border-[#EEE7E1] px-3 py-3">{details.map((detail, detailIndex) => <div key={`${detail.date}-${detailIndex}`} className="flex items-start justify-between gap-3 text-xs"><div><p className="text-[#929292]">{formatDate(detail.date)}</p>{detail.detail && <p className="mt-1 whitespace-pre-wrap text-[#55585A]">{detail.detail}</p>}</div><span className="shrink-0 font-semibold text-[#55585A]">{detail.amount.toLocaleString()}円</span></div>)}</div>}</div>;
                  })}</div> : <p className="text-sm text-[#999999]">データなし</p>}
                </div>
              </>}
            </section>
          </div>
        )}

        {today && view === "settings" && (
          <div className="space-y-3">
            <section className={sectionClass}>
              <div className="mb-4 flex items-center justify-between"><h2 className="text-base font-semibold text-[#55585A]">宝物カテゴリ設定</h2><button onClick={() => setView("treasure-list")} className="text-sm text-[#D9874F]">戻る</button></div>
              <p className="mb-4 text-sm leading-6 text-[#929292]">URLのドメインを登録すると、そのサイトの宝物を自動でカテゴリ分けします。複数ある場合はカンマで区切ります。</p>
              <div className="mb-4 flex gap-2"><input value={newTreasureCategory} onChange={(event) => setNewTreasureCategory(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addTreasureCategory(); } }} placeholder="新しいカテゴリ" className={inputClass} /><button type="button" onClick={addTreasureCategory} className="shrink-0 rounded-xl bg-[#E9A16F] px-4 text-sm font-semibold text-white">追加</button></div>
              <div className="space-y-4">{treasureCategories.map((category) => <div key={category} className="rounded-xl border border-[#EEE7E1] bg-[#FFFCF9] p-3"><div className="mb-2 flex items-center justify-between"><span className="text-sm font-semibold">{category}</span><button onClick={() => deleteTreasureCategory(category)} disabled={treasureCategories.length <= 1} className="text-xs text-[#999999] disabled:opacity-30">削除</button></div><textarea value={categoryRules[category] || ""} onChange={(event) => updateCategoryRule(category, event.target.value)} rows={2} placeholder="例：youtube.com, youtu.be" className={`${inputClass} resize-y text-sm`} /></div>)}</div>
              <button onClick={() => { localStorage.setItem(TREASURE_CATEGORIES_KEY, JSON.stringify(treasureCategories)); localStorage.setItem(CATEGORY_RULES_KEY, JSON.stringify(categoryRules)); setView("treasure-list"); }} className="mt-5 w-full rounded-xl bg-[#E9A16F] py-3 text-sm font-semibold text-white">設定を保存</button>
            </section>
          </div>
        )}
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-[#E8E8E8] bg-white px-2 pb-[max(env(safe-area-inset-bottom),6px)] pt-1.5">
        <div className="mx-auto grid max-w-2xl grid-cols-5 gap-1">
          <button aria-label="グラフ" title="グラフ" onClick={() => setView("graphs")} className={`flex min-w-0 items-center justify-center rounded-xl p-2.5 transition ${view === "graphs" ? "bg-transparent" : "bg-transparent"}`}><img src="/icons/graph.svg" alt="" className={`h-6 w-6 object-contain ${view === "graphs" ? "opacity-100" : "opacity-40"}`} /></button>
          <button aria-label="カレンダー" title="カレンダー" onClick={() => setView("calendar")} className={`flex min-w-0 items-center justify-center rounded-xl p-2.5 transition ${view === "calendar" ? "bg-transparent" : "bg-transparent"}`}><img src="/icons/calendar.svg" alt="" className={`h-6 w-6 object-contain ${view === "calendar" ? "opacity-100" : "opacity-40"}`} /></button>
          <button aria-label="日常記録" title="日常記録" onClick={() => setView("daily")} className={`flex min-w-0 items-center justify-center rounded-xl p-2.5 transition ${view === "daily" ? "bg-transparent" : "bg-transparent"}`}><img src="/icons/daily-add.svg" alt="" className={`h-6 w-6 object-contain ${view === "daily" ? "opacity-100" : "opacity-40"}`} /></button>
          <button aria-label="宝物記録" title="宝物記録" onClick={() => setView("treasures")} className={`flex min-w-0 items-center justify-center rounded-xl p-2.5 transition ${view === "treasures" ? "bg-transparent" : "bg-transparent"}`}><img src="/icons/treasure-add.svg" alt="" className={`h-6 w-6 object-contain ${view === "treasures" ? "opacity-100" : "opacity-40"}`} /></button>
          <button aria-label="宝物一覧" title="宝物一覧" onClick={() => setView("treasure-list")} className={`flex min-w-0 items-center justify-center rounded-xl p-2.5 transition ${view === "treasure-list" ? "bg-transparent" : "bg-transparent"}`}><img src="/icons/treasure-list.svg" alt="" className={`h-6 w-6 object-contain ${view === "treasure-list" ? "opacity-100" : "opacity-40"}`} /></button>
        </div>
      </nav>

      {categoryEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#55585A]/30 p-3 sm:items-center" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCategoryEditorOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="category-dialog-title" className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl sm:p-6">
            <div className="mb-4 flex items-center justify-between"><h2 id="category-dialog-title" className="text-lg font-bold text-[#55585A]">支出カテゴリの編集</h2><button type="button" aria-label="閉じる" onClick={() => setCategoryEditorOpen(false)} className="rounded-full px-3 py-1 text-xl text-[#999999] hover:bg-[#FFF3EA]">×</button></div>
            <p className="mb-4 text-sm leading-6 text-[#929292]">よく使うカテゴリを追加・削除できます。</p>
            <div className="mb-4 flex gap-2"><input value={newCategory} onChange={(event) => setNewCategory(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addCategory(); } }} placeholder="新しいカテゴリ名" className={inputClass} /><button type="button" onClick={addCategory} className="shrink-0 rounded-xl bg-[#E9A16F] px-4 text-sm font-semibold text-white hover:bg-[#DF925D]">追加</button></div>
            <ul className="max-h-64 space-y-2 overflow-y-auto">{categories.map((category) => <li key={category} className="flex items-center gap-2 rounded-xl border border-[#EEE7E1] bg-[#FFFAF6] px-3 py-2.5"><span className="h-4 w-4 shrink-0 rounded-full border border-black/10" style={{ backgroundColor: categoryColors[category] || COLOR_PALETTE[categories.indexOf(category) % COLOR_PALETTE.length] }} /><span className="min-w-0 flex-1 text-sm">{category}</span><label className="relative flex h-8 w-9 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-[#EEE7E1] bg-white" title={`${category}の色を設定`}><span className="text-xs">色</span><input aria-label={`${category}の色`} type="color" value={categoryColors[category] || COLOR_PALETTE[categories.indexOf(category) % COLOR_PALETTE.length]} onChange={(event) => updateCategoryColor(category, event.target.value)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" /></label><button type="button" disabled={categories.length <= 1} onClick={() => deleteCategory(category)} className="rounded-lg px-2 py-1 text-xs text-[#999999] hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30">削除</button></li>)}</ul>
            <button type="button" onClick={() => setCategoryEditorOpen(false)} className="mt-5 w-full rounded-xl bg-[#FBE9DB] py-3 text-sm font-semibold text-[#D9874F] hover:bg-[#F7DECA]">完了</button>
          </section>
        </div>
      )}
    </main>
  );
}
