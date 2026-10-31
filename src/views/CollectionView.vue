<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import SSticker from '../components/SSticker.vue'
import SEmpty from '../components/SEmpty.vue'
import SChip from '../components/SChip.vue'
import { journal } from '../store/journal'
import { month } from '../data/mock'

const router = useRouter()

const filters = [
  { key: 'all', label: '全部' },
  { key: 'today', label: '今日手账' },
  { key: 'month', label: '月度月历' }
]
const filter = ref('all')

/** 手账卡片 + 月度贴纸日历，合成一个「贴纸收藏面板」 */
const stickers = computed(() => {
  const fromEntries = journal.entries.map((e) => ({
    key: `e-${e.id}`,
    group: 'today',
    src: e.img,
    name: e.name,
    meta: `${e.time} · ${e.kcal} kcal`,
    entry: e
  }))
  const fromMonth = Object.entries(month.images).map(([day, v]) => ({
    key: `m-${day}`,
    group: 'month',
    src: v.img,
    name: `${month.monthIndex} 月 ${day} 日`,
    meta: `${v.kcal} kcal`,
    entry: null,
    kcal: v.kcal
  }))
  return [...fromEntries, ...fromMonth]
})

const list = computed(() =>
  filter.value === 'all' ? stickers.value : stickers.value.filter((s) => s.group === filter.value)
)

/** 点击贴纸：把那一餐的数据带进「贴纸信息」页 */
function openSticker(s) {
  if (s.entry) {
    const e = s.entry
    Object.assign(journal.draft, {
      name: e.name,
      emoji: e.emoji,
      time: e.time,
      meal: e.meal,
      note: e.note,
      tag: e.tag,
      kcal: e.kcal,
      weight: e.weight || '约 500 g',
      img: e.img,
      cartoonized: true,
      nutrition: (e.nutrition || journal.draft.nutrition).map((n) => ({ ...n }))
    })
  } else {
    Object.assign(journal.draft, {
      name: '未命名的一餐',
      time: '12:00',
      meal: '午餐',
      kcal: s.kcal,
      img: s.src
    })
  }
  router.push('/sticker-info')
}
</script>

<template>
  <div class="page collection">
    <header class="chead">
      <button class="bak" aria-label="返回" @click="router.back()">‹</button>
      <b>贴纸收藏</b>
      <span class="count">{{ stickers.length }}</span>
    </header>

    <p class="csub">每一餐都是一张贴纸，攒着攒着就成册了。</p>

    <div class="filters">
      <button
        v-for="f in filters"
        :key="f.key"
        type="button"
        @click="filter = f.key"
      >
        <SChip :active="filter === f.key">{{ f.label }}</SChip>
      </button>
    </div>

    <div v-if="list.length" class="wall">
      <button
        v-for="(s, i) in list"
        :key="s.key"
        class="wall-item"
        :style="{ transform: `rotate(${i % 3 === 0 ? -2 : i % 3 === 1 ? 1.5 : 0}deg)` }"
        @click="openSticker(s)"
      >
        <SSticker :src="s.src" :alt="s.name" size="84px" border="4px" />
        <b>{{ s.name }}</b>
        <span>{{ s.meta }}</span>
      </button>
    </div>

    <SEmpty v-else title="还没有贴纸" desc="拍下第一餐，贴纸会自动收进来">
      <button class="go-btn" @click="router.push('/camera')">去拍一张</button>
    </SEmpty>
  </div>
</template>

<style scoped>
.collection {
  padding-bottom: 60px;
}

.chead {
  display: flex;
  align-items: center;
}

.bak {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 15px;
  color: #6b5b4c;
  background: #fff;
  box-shadow: 0 6px 14px rgba(150, 115, 80, 0.1);
}

.chead b {
  margin-left: 10px;
  font-size: 15px;
  font-weight: 700;
}

.count {
  margin-left: auto;
  padding: 3px 10px;
  border-radius: var(--r-pill);
  background: var(--or-xs);
  border: 1px solid var(--or-s);
  font-size: 10.5px;
  color: var(--or-d);
}

.csub {
  margin: 14px 0 0;
  font-size: 10.5px;
  line-height: 1.7;
  color: var(--ink-3);
}

.filters {
  display: flex;
  gap: 7px;
  margin: 14px 0 18px;
}

.filters button {
  line-height: 0;
}

.wall {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px 8px;
}

.wall-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 6px 10px;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 8px 18px rgba(150, 115, 80, 0.09);
  transition: transform 160ms var(--ease);
}

.wall-item:active {
  transform: scale(0.96) !important;
}

.wall-item b {
  font-size: 10px;
  font-weight: 600;
  color: #4a3e34;
}

.wall-item span {
  font-size: 8.5px;
  color: var(--ink-3);
}

.go-btn {
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

/* ============ 大屏（≥900px） ============ */
@media (min-width: 900px) {
  .chead b {
    font-size: 17px;
  }

  .wall {
    grid-template-columns: repeat(auto-fill, minmax(148px, 1fr));
    gap: 18px 14px;
  }

  .wall-item {
    padding: 16px 8px 14px;
  }

  .wall-item:hover {
    box-shadow: 0 14px 28px rgba(150, 115, 80, 0.16);
  }

  .wall-item b {
    font-size: 11px;
  }
}
</style>
