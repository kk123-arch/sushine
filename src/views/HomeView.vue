<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import SSticker from '../components/SSticker.vue'
import SEmpty from '../components/SEmpty.vue'
import SSheet from '../components/SSheet.vue'
import SToast from '../components/SToast.vue'
import { journal, removeEntry, settings } from '../store/journal'
import { auth } from '../store/auth'
import { body, latest, weekChange, series, progress, streakDays, medals, checkedToday, checkIn } from '../store/body'
import { todayBurn } from '../store/activity'
import { today, weekDays } from '../data/mock'

const router = useRouter()
const todayIndex = weekDays.findIndex((d) => d.active)
const activeDay = ref(todayIndex)
const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

/** 头像直接取登录用户昵称首字母 */
const avatar = computed(() => (auth.user?.name || 'S').trim()[0].toUpperCase())

/* ---------- 体重卡 ---------- */
const spark = computed(() => {
  const points = series(21)
  if (points.length < 2) return ''
  const values = points.map((p) => p.kg)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  return points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * 66
      const y = 24 - ((p.kg - min) / span) * 24
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
})

const weekDeltaText = computed(() => {
  if (weekChange.value === null) return '还没有一周前的数据'
  if (weekChange.value === 0) return '和上周持平'
  const sign = weekChange.value > 0 ? '+' : ''
  return `较上周 ${sign}${weekChange.value} kg`
})

const isToday = computed(() => activeDay.value === todayIndex)

const headerDate = computed(() =>
  isToday.value
    ? today.label
    : `10月${weekDays[activeDay.value].date}日 · ${dayNames[activeDay.value]} · 晴 20°`
)

/** 只有「今天」有真实记录，其他日期显示空状态（数据写死的限制，UI 上明确告知） */
const list = computed(() => (isToday.value ? journal.entries : []))
const emptyTitle = computed(() => (isToday.value ? '今天还没记录' : '这一天还没有记录'))
const emptyDesc = computed(() =>
  isToday.value ? '拍下第一餐，从这一刻开始' : '拍一张，把这一天补上'
)

const menuEntry = ref(null)
const toast = ref('')
let toastTimer = null

function showToast(text) {
  toast.value = text
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = ''), 1600)
}

function openEntry(entry) {
  Object.assign(journal.draft, {
    name: entry.name,
    emoji: entry.emoji,
    confidence: 92,
    meal: entry.meal,
    time: entry.time,
    note: entry.note,
    tag: entry.tag,
    kcal: entry.kcal,
    weight: entry.weight || '约 500 g',
    img: entry.img,
    cartoonized: true,
    nutrition: (entry.nutrition || journal.draft.nutrition).map((n) => ({ ...n }))
  })
  router.push('/sticker-info')
}

function editEntry() {
  const entry = menuEntry.value
  if (!entry) return
  openEntry(entry)
  menuEntry.value = null
  router.push('/edit')
}

function deleteEntry() {
  const entry = menuEntry.value
  if (!entry) return
  removeEntry(entry.id)
  menuEntry.value = null
  showToast('已删除这条记录')
}

/* ---------- 每日打卡 ---------- */
function onCheckIn() {
  if (checkedToday.value) {
    showToast(`今天已经打过卡了 · 连续 ${streakDays.value} 天`)
    return
  }
  checkIn()
  // 读 computed 要在写入之后，才能拿到 +1 后的天数
  showToast(`打卡成功 · 连续 ${streakDays.value} 天 🎉`)
}
</script>

<template>
  <div class="page home">
    <header class="hd">
      <div>
        <p class="hd-date">{{ headerDate }}</p>
        <h1 class="hd-title">{{ today.title }}</h1>
      </div>
      <div class="hd-right">
        <button class="wk-btn" @click="router.push('/report?scope=week')">📊 周报</button>
        <button class="ava" aria-label="我的" @click="router.push('/profile')">{{ avatar }}</button>
      </div>
    </header>

    <div class="week">
      <button
        v-for="(d, i) in weekDays"
        :key="d.date"
        class="week-day"
        :class="{ on: i === activeDay }"
        @click="activeDay = i"
      >
        <span class="wd-l">{{ d.label }}</span>
        <b class="wd-d">{{ d.date }}</b>
        <i aria-hidden="true"></i>
      </button>
    </div>

    <button class="wcard" @click="router.push('/body')">
      <span class="w-left">
        <span class="w-label">体重</span>
        <b class="w-num">{{ latest ? latest.kg : '—' }}<i>kg</i></b>
        <span class="w-delta" :class="{ down: weekChange < 0, up: weekChange > 0 }">{{ weekDeltaText }}</span>
      </span>
      <span class="w-right">
        <svg v-if="spark" class="w-spark" viewBox="0 0 66 24" preserveAspectRatio="none" aria-hidden="true">
          <polyline
            :points="spark"
            fill="none"
            stroke="var(--or)"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <span class="w-goal">目标 {{ body.profile.goalWeight }}kg · {{ progress }}%</span>
      </span>
    </button>

    <!-- 每日打卡：连续天数 + 今日消耗 -->
    <section class="daily">
      <div class="dl-row">
        <span class="dl-ic">🔥</span>
        <span class="dl-txt">连续 <b>{{ streakDays }}</b> 天<em class="dl-medal">🏅 {{ medals }} 枚</em></span>
        <button class="dl-btn" :class="{ on: checkedToday }" @click="onCheckIn">
          {{ checkedToday ? '✓ 今天已打卡' : '今天打卡' }}
        </button>
      </div>
      <button class="dl-row dl-row--link" @click="router.push('/activity')">
        <span class="dl-ic">🏃</span>
        <span class="dl-txt">今日消耗 <b>{{ todayBurn }}</b> kcal</span>
        <span class="dl-more">运动记录 ›</span>
      </button>
    </section>

    <div class="feed">
      <article
        v-for="entry in list"
        :key="entry.id"
        class="meal-card"
        @click="openEntry(entry)"
      >
        <div class="meal-photo">
          <SSticker :src="entry.img" :alt="entry.name" size="130px" />
          <span class="meal-time">{{ entry.time }}</span>
          <button class="card-more" aria-label="更多操作" @click.stop="menuEntry = entry">⋯</button>
        </div>
        <h3 class="meal-name">
          {{ entry.name }}<em>{{ entry.emoji }}</em>
        </h3>
        <p class="meal-note">{{ entry.note }}</p>
        <div class="meal-foot">
          <span class="meal-tag">{{ entry.tag }}</span>
          <span class="meal-kcal">{{ settings.hideKcal ? '已记录' : entry.kcal + ' kcal' }}</span>
        </div>
      </article>

      <SEmpty
        v-if="!list.length"
        :title="emptyTitle"
        :desc="emptyDesc"
      >
        <button class="empty-btn" @click="router.push('/camera')">去拍一张</button>
      </SEmpty>
    </div>

    <SSheet :open="!!menuEntry" title="这条记录" @close="menuEntry = null">
      <button class="opt" @click="editEntry">✏️ 编辑信息</button>
      <button class="opt" @click="deleteEntry">🗑 删除这条记录</button>
    </SSheet>

    <SToast :show="!!toast" :text="toast" />
  </div>
</template>

<style scoped>
.hd {
  display: flex;
  align-items: flex-start;
}

.hd-date {
  margin: 0;
  font-size: 10.5px;
  letter-spacing: 0.02em;
  color: var(--ink-3);
}

.hd-title {
  margin: 7px 0 0;
  font-size: 24px;
  font-weight: 800;
  letter-spacing: -0.01em;
}

.ava {
  margin-left: auto;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 16px;
  font-weight: 700;
  color: #c0703d;
  background: #fbe7d6;
  box-shadow: 0 6px 14px rgba(150, 115, 80, 0.1);
}

.hd-right {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

/* 体重卡：一条弧线就能看出这周有没有在掉 */
.wcard {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 14px;
  padding: 12px 15px;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 10px 24px rgba(150, 115, 80, 0.1);
  text-align: left;
}

.wcard:active {
  background: var(--paper-2);
}

.w-left {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.w-label {
  font-size: 9px;
  letter-spacing: 0.12em;
  color: var(--ink-3);
}

.w-num {
  font-size: 21px;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.w-num i {
  margin-left: 2px;
  font-style: normal;
  font-size: 9.5px;
  font-weight: 600;
  color: var(--ink-3);
}

.w-delta {
  font-size: 9px;
  color: var(--ink-3);
}

.w-delta.down {
  color: var(--ok);
}

.w-delta.up {
  color: var(--err);
}

.w-right {
  margin-left: auto;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.w-spark {
  width: 66px;
  height: 24px;
  display: block;
}

.w-goal {
  font-size: 8.5px;
  color: var(--ink-3);
}

/* 每日打卡卡 */
.daily {
  margin-top: 8px;
  border-radius: 16px;
  background: var(--or-xs);
  border: 1.5px dashed var(--line);
  overflow: hidden;
}

.dl-row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  font-size: 10px;
  color: var(--ink-2);
  text-align: left;
}

.dl-row--link {
  border-top: 1.5px dashed var(--line);
  padding: 9px 12px;
}

.dl-ic {
  font-size: 12px;
  line-height: 1;
}

/* 文字可压缩，按钮永远留在可视区（窄屏 / 大字模式都不挤） */
.dl-txt {
  flex: 1 1 auto;
  min-width: 0;
}

.dl-txt b {
  font-size: 12.5px;
  font-weight: 800;
  color: var(--or-d);
}

.dl-medal {
  margin-left: 5px;
  font-style: normal;
  font-size: 9px;
  color: var(--ink-3);
}

.dl-more {
  margin-left: auto;
  font-size: 9px;
  color: var(--ink-3);
  white-space: nowrap;
}

.dl-btn {
  margin-left: auto;
  flex: 0 0 auto;
  padding: 7px 14px;
  border-radius: 999px;
  background: var(--or);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
  box-shadow: 0 2px 0 var(--or-d);
}

.dl-btn:active {
  transform: translateY(1px);
  box-shadow: 0 1px 0 var(--or-d);
}

/* 今天是已打卡：退成描边，一眼能看出“已经点过了” */
.dl-btn.on {
  background: #fff;
  color: var(--or-d);
  border: 1.5px solid var(--or-s);
  box-shadow: none;
  font-weight: 600;
}

/* 周报入口：顶栏上别太抢眼，但一眼能看到 */
.wk-btn {
  padding: 7px 12px;
  border-radius: var(--r-pill);
  background: #fff;
  font-size: 10.5px;
  color: var(--ink-2);
  box-shadow: 0 6px 14px rgba(150, 115, 80, 0.1);
  white-space: nowrap;
}

.wk-btn:active {
  background: var(--paper-2);
}

/* 一周日期条 */
.week {
  display: flex;
  gap: 5px;
  margin-top: 18px;
}

.week-day {
  flex: 1;
  height: 58px;
  border-radius: 15px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  font-size: 10.5px;
  color: var(--ink-2);
  background: #fff;
  box-shadow: 0 6px 14px rgba(150, 115, 80, 0.07);
  transition: background 200ms var(--ease), color 200ms var(--ease);
}

.wd-l {
  font-size: 9.5px;
  line-height: 1;
  letter-spacing: 0.04em;
  opacity: 0.72;
}

.wd-d {
  font-size: 13.5px;
  font-weight: 650;
  line-height: 1.1;
}

.week-day.on .wd-l {
  opacity: 0.92;
}

.week-day i {
  width: 3.5px;
  height: 3.5px;
  border-radius: 50%;
  background: #dcc9b4;
}

.week-day.on {
  background: var(--or);
  color: #fff;
  box-shadow: 0 10px 22px rgba(185, 107, 69, 0.28);
}

.week-day.on i {
  background: rgba(255, 255, 255, 0.78);
}

/* 今日手账流 */
.feed {
  margin-top: 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.meal-card {
  background: #fff;
  border-radius: 24px;
  padding: 11px 11px 14px;
  box-shadow: 0 12px 28px rgba(150, 115, 80, 0.1);
  cursor: pointer;
  transition: transform 160ms var(--ease), box-shadow 160ms var(--ease);
}

.meal-card:active {
  transform: translateY(2px) scale(0.995);
  box-shadow: 0 6px 16px rgba(150, 115, 80, 0.12);
}

.meal-photo {
  position: relative;
  height: 184px;
  border-radius: 18px;
  background: #f8efe2;
  display: grid;
  place-items: center;
  overflow: hidden;
}

.meal-time {
  position: absolute;
  left: 10px;
  bottom: 10px;
  padding: 4px 8px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.94);
  font-size: 9.5px;
  letter-spacing: 0.02em;
  color: var(--ink-2);
}

.meal-name {
  margin: 11px 4px 5px;
  font-size: 15px;
  font-weight: 700;
  display: flex;
  align-items: center;
}

.meal-name em {
  margin-left: auto;
  font-style: normal;
  font-size: 13px;
}

.meal-note {
  margin: 0 4px;
  font-size: 10.8px;
  line-height: 1.7;
  color: var(--ink-3);
}

.meal-foot {
  display: flex;
  align-items: center;
  margin: 10px 4px 0;
}

.meal-tag {
  font-size: 9.5px;
  padding: 3px 8px;
  border-radius: 7px;
  background: var(--or-xs);
  color: var(--or-d);
}

.meal-kcal {
  margin-left: auto;
  font-size: 10px;
  color: var(--ink-3);
}

.empty-btn {
  margin-top: 14px;
  height: 40px;
  padding: 0 20px;
  border-radius: var(--r-14);
  background: var(--or);
  color: #fff8f0;
  font-size: 12.5px;
  font-weight: 650;
  box-shadow: 0 3px 0 var(--or-d);
}

/* 卡片右上角的「更多」 */
.card-more {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 3;
  width: 27px;
  height: 27px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.94);
  color: var(--ink-2);
  font-size: 14px;
  line-height: 1;
  box-shadow: 0 4px 10px rgba(150, 115, 80, 0.14);
}

.card-more:active {
  background: var(--paper-2);
}

.opt {
  width: 100%;
  height: 50px;
  padding: 0 18px;
  border-radius: 16px;
  border: 1.5px solid var(--line);
  background: #fff;
  font-size: 13.5px;
  text-align: left;
}

.opt:active {
  background: var(--paper-2);
}

/* ============ 大屏（≥900px） ============ */
@media (min-width: 900px) {
  .hd-title {
    font-size: 30px;
  }

  .week {
    max-width: 760px;
    gap: 8px;
    margin-top: 22px;
  }

  .week-day {
    height: 68px;
    border-radius: 16px;
    font-size: 12px;
  }

  .wd-l {
    font-size: 11px;
  }

  .wd-d {
    font-size: 16px;
  }

  .feed {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 20px;
    margin-top: 22px;
  }

  .meal-photo {
    height: 210px;
  }

  .meal-card {
    padding: 13px 13px 16px;
    transition: transform 180ms var(--ease), box-shadow 180ms var(--ease);
  }

  .meal-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 18px 36px rgba(150, 115, 80, 0.16);
  }

  .meal-name {
    font-size: 16px;
  }
}
</style>
