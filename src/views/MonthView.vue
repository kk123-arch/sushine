<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import SSticker from '../components/SSticker.vue'
import SModal from '../components/SModal.vue'
import SEmpty from '../components/SEmpty.vue'
import { month } from '../data/mock'

const router = useRouter()
const modalOpen = ref(false)
const offset = ref(0)

/** 支持无限向前 / 向后翻月，超出本月的数据一律视为空 */
const view = computed(() => {
  const m = month.monthIndex + offset.value
  const monthIndex = (((m - 1) % 12) + 12) % 12
  const year = month.year + Math.floor((m - 1) / 12)
  return { year, monthIndex: monthIndex + 1, isCurrent: offset.value === 0 }
})

const daysInMonth = computed(() => new Date(view.value.year, view.value.monthIndex, 0).getDate())
const firstWeekday = computed(
  () => (new Date(view.value.year, view.value.monthIndex - 1, 1).getDay() + 6) % 7
)

const recordedSet = computed(() => new Set(view.value.isCurrent ? month.recorded : []))
const images = computed(() => (view.value.isCurrent ? month.images : {}))
const stats = computed(() =>
  view.value.isCurrent
    ? month.stats
    : [
        { value: '0', label: '记录天数' },
        { value: '0', label: '手账卡片' },
        { value: '0', label: '本月 kcal' }
      ]
)

/** 生成日历格子：周一起始 */
const cells = computed(() => {
  const list = []
  for (let i = 0; i < firstWeekday.value; i++) list.push({ key: `lead-${i}`, type: 'empty' })
  for (let d = 1; d <= daysInMonth.value; d++) {
    const img = images.value[d]
    let type = 'plain'
    if (img) type = 'img'
    else if (recordedSet.value.has(d)) type = 'rec'
    list.push({ key: `d-${d}`, type, day: d, img })
  }
  while (list.length % 7 !== 0) list.push({ key: `tail-${list.length}`, type: 'empty' })
  return list
})

function onDay(cell) {
  if (cell.type === 'empty') return
  if (cell.type === 'plain') {
    modalOpen.value = true
    return
  }
  router.push('/report')
}
</script>

<template>
  <div class="page month">
    <header class="mhead">
      <h2>{{ view.monthIndex }} 月<i>{{ view.isCurrent ? '月度记录' : view.year + ' 年' }}</i></h2>
      <span class="sw">
        <button aria-label="上个月" @click="offset--">‹</button>
        <button aria-label="下个月" @click="offset++">›</button>
      </span>
    </header>

    <div class="mstat">
      <div v-for="s in stats" :key="s.label">
        <b>{{ s.value }}</b><span>{{ s.label }}</span>
      </div>
    </div>

    <div class="calgrid">
      <div v-for="w in ['一', '二', '三', '四', '五', '六', '日']" :key="w" class="wd">{{ w }}</div>

      <button
        v-for="cell in cells"
        :key="cell.key"
        class="day"
        :class="[cell.type, { today: view.isCurrent && cell.day === month.today }]"
        :disabled="cell.type === 'empty'"
        @click="onDay(cell)"
      >
        <template v-if="cell.type === 'img'">
          <img :src="cell.img.img" alt="" />
          <span>{{ cell.img.kcal }}</span>
        </template>
        <b v-else-if="cell.day">{{ cell.day }}</b>
      </button>
    </div>

    <section v-if="view.isCurrent" class="mtip">
      <p class="tt">每周热量 / kcal</p>
      <div class="bars">
        <div v-for="(b, i) in month.weekly" :key="b.label">
          <i :style="{ height: b.h + '%' }" :class="{ hot: i === 2, warm: i === 3 }"></i>
          <span>{{ b.label }}</span>
        </div>
      </div>
    </section>

    <section v-if="view.isCurrent" class="mfoot">
      <p class="t">这个月最常吃</p>
      <div class="mrow">
        <div v-for="it in month.top" :key="it.name" class="it">
          <SSticker :src="it.img" :alt="it.name" size="40px" border="2.5px" />
          <b>{{ it.name }}</b>
          <span>{{ it.times }}</span>
        </div>
      </div>
    </section>

    <SEmpty
      v-else
      icon="🗓"
      :title="`${view.monthIndex} 月还没有记录`"
      desc="点任意一天，把那一天补上"
    />

    <SModal
      :open="modalOpen"
      title="这一天还没有记录"
      text="要现在拍一张，把今天补上吗？"
      @cancel="modalOpen = false"
      @confirm="modalOpen = false; router.push('/camera')"
    />
  </div>
</template>

<style scoped>
.month {
  padding-bottom: 96px;
}

.mhead {
  display: flex;
  align-items: flex-end;
}

.mhead h2 {
  margin: 0;
  font-size: 26px;
  font-weight: 780;
}

.mhead h2 i {
  margin-left: 8px;
  font-style: normal;
  font-size: 12px;
  font-weight: 400;
  color: var(--ink-3);
}

.mhead .sw {
  margin-left: auto;
  display: flex;
  gap: 6px;
}

.mhead .sw button {
  width: 28px;
  height: 28px;
  border-radius: 9px;
  display: grid;
  place-items: center;
  font-size: 12px;
  color: var(--ink-2);
  background: #fff;
  box-shadow: 0 6px 14px rgba(150, 115, 80, 0.1);
}

.mhead .sw button:active {
  background: var(--paper-2);
}

.mstat {
  display: flex;
  margin-top: 16px;
  padding: 13px 6px;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 10px 24px rgba(150, 115, 80, 0.09);
}

.mstat div {
  flex: 1;
  text-align: center;
  border-right: 1px dashed #efe6da;
}

.mstat div:last-child {
  border-right: none;
}

.mstat b {
  display: block;
  font-size: 15px;
  font-weight: 700;
  color: #4a3e34;
}

.mstat span {
  font-size: 9px;
  color: var(--ink-3);
}

.calgrid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 9px 6px;
  margin-top: 18px;
}

.wd {
  text-align: center;
  margin-bottom: 2px;
  font-size: 9px;
  color: #c0b2a0;
}

.day {
  position: relative;
  aspect-ratio: 1;
  border-radius: 50%;
  display: grid;
  place-items: center;
  overflow: hidden;
  border: 1.5px solid transparent;
  font-size: 10.5px;
  color: var(--ink-3);
}

.day.empty {
  border: none;
  cursor: default;
}

.day.rec {
  background: #fff;
  border-color: #efe6da;
  color: #6b5b4c;
  font-weight: 600;
  box-shadow: 0 4px 10px rgba(150, 115, 80, 0.08);
}

.day.plain {
  cursor: pointer;
}

.day.plain:active {
  background: var(--paper-2);
}

.day.img {
  border-color: #fff;
  box-shadow: 0 6px 14px rgba(150, 115, 80, 0.18);
}

.day.img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.day.img span {
  position: absolute;
  inset: auto 0 -1px 0;
  padding: 1px 0;
  text-align: center;
  font-size: 8px;
  color: #fff;
  background: rgba(30, 20, 14, 0.42);
}

.day.today {
  box-shadow: 0 0 0 2px var(--or), 0 6px 14px rgba(185, 107, 69, 0.24);
}

.day b {
  position: relative;
  z-index: 2;
}

.mtip {
  margin-top: 24px;
}

.mtip .tt {
  margin: 0 0 10px;
  font-size: 10.5px;
  letter-spacing: 0.04em;
  color: var(--ink-3);
}

.bars {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  height: 124px;
  padding: 14px 12px 10px;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 10px 24px rgba(150, 115, 80, 0.08);
}

.bars div {
  flex: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  gap: 6px;
}

.bars i {
  width: 100%;
  max-width: 20px;
  border-radius: 7px 7px 3px 3px;
  background: #f3d9c7;
}

.bars i.hot {
  background: var(--or);
}

.bars i.warm {
  background: #e9c6ae;
}

.bars span {
  font-size: 8px;
  color: #c0b2a0;
}

.mfoot {
  margin-top: 22px;
}

.mfoot .t {
  margin: 0 0 9px;
  font-size: 10.5px;
  letter-spacing: 0.04em;
  color: var(--ink-3);
}

.mrow {
  display: flex;
  gap: 9px;
}

.mrow .it {
  flex: 1;
  padding: 9px 6px;
  border-radius: 16px;
  text-align: center;
  background: #fff;
  box-shadow: 0 8px 18px rgba(150, 115, 80, 0.08);
}

.mrow .it :deep(.sticker) {
  margin: 0 auto 6px;
}

.mrow .it b {
  display: block;
  font-size: 9.5px;
  font-weight: 600;
  color: #6b5b4c;
}

.mrow .it span {
  font-size: 8.5px;
  color: var(--ink-3);
}

/* ============ 大屏（≥900px）：左侧日历 + 右侧数据 ============ */
@media (min-width: 900px) {
  .month {
    display: grid;
    grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
    column-gap: 30px;
    align-items: start;
    padding-bottom: 56px;
  }

  .mhead,
  .mstat {
    grid-column: 1 / -1;
  }

  .mhead h2 {
    font-size: 30px;
  }

  .calgrid {
    grid-column: 1;
    grid-row: 3 / span 2;
    gap: 12px 10px;
  }

  .day {
    font-size: 12px;
  }

  .mtip {
    grid-column: 2;
    grid-row: 3;
    margin-top: 18px;
  }

  .mfoot {
    grid-column: 2;
    grid-row: 4;
    margin-top: 18px;
  }

  .bars {
    height: 150px;
  }
}
</style>
