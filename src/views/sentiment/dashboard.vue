<template>
  <div class="sentiment-page">
    <div class="page-section">

      <div class="top-bar">
        <div class="search-box">
          <input v-model="dashboardSearch" type="text" placeholder="搜索关键词、事件、帖子..." />
          <span class="search-icon">🔍</span>
        </div>
        <button class="btn btn-outline" @click="refreshData">🔄 刷新数据</button>
        <button class="btn btn-primary" @click="exportReport">📥 导出日报</button>
      </div>
      <div class="stats-grid">
        <div class="stat-card" @click="router.push({ path: '/sentiment-db/social' })">
          <div class="stat-icon icon-bg-blue">💬</div>
          <div class="stat-value">{{ postTotal }}</div>
          <div class="stat-label">社交媒体帖子总数</div>
          <div class="stat-change up" v-if="postTotal > 0">▲ 已加载</div>
        </div>
        <div class="stat-card" @click="router.push({ path: '/sentiment-db/news' })">
          <div class="stat-icon icon-bg-green">📰</div>
          <div class="stat-value">{{ newsTotal }}</div>
          <div class="stat-label">新闻资讯文章数</div>
          <div class="stat-change up" v-if="newsTotal > 0">▲ 已加载</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon icon-bg-orange">🔥</div>
          <div class="stat-value">{{ allKeywords.length }}</div>
          <div class="stat-label">活跃触发关键词</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon icon-bg-purple">🏢</div>
          <div class="stat-value">{{ allSources.length }}</div>
          <div class="stat-label">数据来源数</div>
        </div>
      </div>
      <div class="dashboard-grid">
        <div class="card">
          <div class="card-header">
            <span class="card-title"><span class="dot dot-red"></span>实时热点话题</span>
            <span class="count-indicator">最近24小时</span>
          </div>
          <div class="table-wrapper">
            <table>
              <thead><tr><th>话题</th><th>来源</th><th>热度指数</th><th>趋势</th></tr></thead>
              <tbody>
                <tr v-for="(topic, index) in hotTopics" :key="index">
                  <td><strong>{{ index + 1 }}. {{ topic.topic }}</strong></td>
                  <td><span :class="['source-badge', topic.source.includes('社媒') ? 'source-social' : 'source-press']">{{ topic.source }}</span></td>
                  <td><strong>{{ topic.heat }}</strong>/100</td>
                  <td>{{ topic.trend }}</td>
                </tr>
                <tr v-if="hotTopics.length === 0"><td colspan="4" style="text-align:center;color:#aaa;padding:30px;">暂无热点话题数据</td></tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">🏷️ 热门标签云</span></div>
          <div class="tag-cloud">
            <span v-for="(tag, index) in tagCloudData" :key="tag.keyword" :class="['tag-cloud-item', tag.sizeClass, tagColorClass(index)]" :title="`提及${tag.count}次`" @click="showToast('🔍 追踪: ' + tag.keyword)">
              {{ tag.keyword }}<small>({{ tag.count }})</small>
            </span>
            <div v-if="tagCloudData.length === 0" style="color:#aaa;font-size:12px;padding:12px;">暂无标签数据</div>
          </div>
        </div>
      </div>
    </div>
    <div v-if="toastVisible" class="toast">{{ toastMessage }}</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { listPost } from '@/api/sentiment/post'
import { listNews } from '@/api/sentiment/news'
import { parseKeywords, formatNumber } from './utils'

const router = useRouter()
const postTotal = ref(0)
const newsTotal = ref(0)
const dashboardSearch = ref('')
const postList = ref([])
const newsList = ref([])
const toastVisible = ref(false)
const toastMessage = ref('')
let toastTimeout = null

function showToast(msg) {
  toastMessage.value = msg; toastVisible.value = true
  if (toastTimeout) clearTimeout(toastTimeout)
  toastTimeout = setTimeout(() => { toastVisible.value = false }, 2200)
}

const allKeywords = computed(() => {
  const s = new Set()
  postList.value.forEach(p => parseKeywords(p.triggerKeyword).forEach(k => s.add(k)))
  newsList.value.forEach(a => parseKeywords(a.keywords).forEach(k => s.add(k)))
  return Array.from(s)
})
const allPlatforms = ref([])
async function loadPlatforms() {
  try {
    const res = await request({ url: '/system/sentiment/platform/list', method: 'get' })
    allPlatforms.value = res.data || []
  } catch (e) { console.error('加载平台列表失败:', e) }
}
const allSources = computed(() => allPlatforms.value.map(p => p.platform_name))
const hotTopics = computed(() => {
  const kc = {}
  postList.value.forEach(p => parseKeywords(p.triggerKeyword).forEach(k => { kc[k] = (kc[k] || 0) + 1 }))
  newsList.value.forEach(a => parseKeywords(a.keywords).forEach(k => { kc[k] = (kc[k] || 0) + 1 }))
  const sorted = Object.entries(kc).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const ks = {}
  postList.value.forEach(p => parseKeywords(p.triggerKeyword).forEach(k => { if (!ks[k]) ks[k] = new Set(); ks[k].add(p.siteName || '社交媒体') }))
  newsList.value.forEach(a => parseKeywords(a.keywords).forEach(k => { if (!ks[k]) ks[k] = new Set(); ks[k].add(a.source || '新闻') }))
  return sorted.map(([keyword, count], i) => ({ topic: keyword, source: Array.from(ks[keyword] || []).join('+'), heat: Math.max(95 - i * 8, 60), trend: i < 2 ? '🔥 持续上升' : i < 4 ? '📈 上升中' : '🆕 新热点' }))
})
const tagCloudData = computed(() => {
  const kc = {}
  postList.value.forEach(p => parseKeywords(p.triggerKeyword).forEach(k => { kc[k] = (kc[k] || 0) + 1 }))
  newsList.value.forEach(a => parseKeywords(a.keywords).forEach(k => { kc[k] = (kc[k] || 0) + 1 }))
  return Object.entries(kc).sort((a, b) => b[1] - a[1]).map(([keyword, count]) => ({ keyword, count, sizeClass: count >= 5 ? 'size-l' : count >= 3 ? 'size-m' : 'size-s' }))
})
function tagColorClass(i) { return ['tag-c1','tag-c2','tag-c3','tag-c4','tag-c5'][i % 5] }

function refreshData() { showToast('🔄 数据已刷新'); loadData() }
function exportReport() {
  let r = '舆情监控日报\n生成时间：' + new Date().toLocaleString() + '\n' + '='.repeat(50) + '\n\n'
  r += '【社交媒体帖子统计】共 ' + postTotal.value + ' 条\n'
  r += '【报刊文章统计】共 ' + newsTotal.value + ' 条\n\n热点关键词：\n'
  allKeywords.value.forEach(k => { r += '  - ' + k + '\n' })
  const blob = new Blob([r], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = '舆情日报_' + new Date().toISOString().slice(0,10) + '.txt'; a.click()
  URL.revokeObjectURL(url); showToast('✅ 日报已导出！')
}

async function loadData() {
  try {
    const [pr, nr] = await Promise.all([listPost({ pageNum: 1, pageSize: 100 }), listNews({ pageNum: 1, pageSize: 100 })])
    postList.value = pr.rows || []; postTotal.value = pr.total || 0
    newsList.value = nr.rows || []; newsTotal.value = nr.total || 0
  } catch (e) { console.error('加载仪表盘数据失败:', e) }
}
onMounted(() => { loadPlatforms(); loadData() })
</script>

<style>
@import './common.css';
</style>
