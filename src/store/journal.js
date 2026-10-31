/**
 * 全局状态（不引 Pinia）：
 * 1. 记录与设置持久化到 localStorage —— 刷新、关掉浏览器都还在；
 * 2. 跨页面共享 draft，保证「拍照 → 编辑 → 保存 → 首页/周报」数据一致；
 * 3. 没有后端也能「可落地」，本地存储是这类记录产品的底线。
 */
import { reactive, watch } from 'vue'
import { seedEntries, recognised, blankDraft } from '../data/mock'
import { CARTOON_STYLES } from '../utils/cartoonify'

const JOURNAL_KEY = 'sushine:journal:v1'
const SETTINGS_KEY = 'sushine:settings:v1'

const DEFAULT_SETTINGS = {
  remind: true,
  lunch: '12:30',
  dinner: '18:30',
  /** 无压力模式：全站弱化热量数字，只看照片和记录 */
  hideKcal: false,
  /** 贴纸风格：photo / flat / ink / poster，见 utils/cartoonify.js */
  cartoonStyle: 'photo'
}

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    // 隐私模式 / 存储被禁用时退化为纯内存，不影响使用
    return fallback
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* 配额满或被禁用：静默失败，页面照常跑 */
  }
}

const storedEntries = read(JOURNAL_KEY, null)

export const journal = reactive({
  // null = 从没存过 → 用种子数据；[] = 用户清空过 → 尊重用户
  entries: storedEntries ?? seedEntries.map((e) => ({ ...e })),
  draft: { ...recognised, nutrition: recognised.nutrition.map((n) => ({ ...n })) },
  lastSaved: null
})

export const settings = reactive({ ...DEFAULT_SETTINGS, ...read(SETTINGS_KEY, {}) })

// 老版本存过 flat / ink / poster，这些画法已经删了，加载时回落到默认
if (!CARTOON_STYLES.some((s) => s.id === settings.cartoonStyle)) {
  settings.cartoonStyle = DEFAULT_SETTINGS.cartoonStyle
}

watch(() => journal.entries, (value) => write(JOURNAL_KEY, value), { deep: true })
watch(settings, (value) => write(SETTINGS_KEY, value), { deep: true })

export function resetDraft() {
  journal.draft = { ...recognised, nutrition: recognised.nutrition.map((n) => ({ ...n })) }
  journal.draft.cartoonized = false
}

/** 手动记一餐：清空草稿，走同一套编辑流程 */
export function startManualDraft() {
  journal.draft = blankDraft()
  return journal.draft
}

/** 保存草稿到手账：同名记录原位覆盖，避免出现重复卡片 */
export function saveDraft() {
  const d = journal.draft
  const item = {
    id: Date.now(),
    name: d.name || '未命名的一餐',
    emoji: d.emoji || '🍽',
    time: d.time,
    note: d.note || '刚刚记下的一餐',
    tag: d.tag || '今天',
    meal: d.meal,
    kcal: Number(d.kcal) || 0,
    weight: d.weight,
    img: d.img,
    cartoonized: true,
    nutrition: (d.nutrition || []).map((n) => ({ ...n }))
  }
  const idx = journal.entries.findIndex((e) => e.name === item.name)
  if (idx > -1) {
    journal.entries.splice(idx, 1, { ...journal.entries[idx], ...item, id: journal.entries[idx].id })
  } else {
    journal.entries.unshift(item)
  }
  journal.lastSaved = item
  return item
}

export function removeEntry(id) {
  const idx = journal.entries.findIndex((e) => e.id === id)
  if (idx > -1) journal.entries.splice(idx, 1)
  return idx > -1
}

export function totalKcal() {
  return journal.entries.reduce((sum, e) => sum + (Number(e.kcal) || 0), 0)
}

/** 导出用：把当前记录拼成可读文本 */
export function toExportText() {
  const lines = [`Sushine 手账导出 · ${new Date().toLocaleString('zh-CN')}`, '']
  journal.entries.forEach((e, i) => {
    lines.push(
      `${i + 1}. ${e.name}　${e.meal || ''}　${e.time}　${e.kcal} kcal`,
      `   备注：${e.note || '—'}`
    )
  })
  return lines.join('\n')
}
