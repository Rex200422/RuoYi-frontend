     1|<template>
     2|  <div class="sentiment-page">
     3|    <div class="page-section">
     4|      <div class="top-bar">
     5|        <div class="search-box">
     6|          <input v-model="dashboardSearch" type="text" placeholder="搜索关键词、事件、帖子..." />
     7|          <span class="search-icon">🔍</span>
     8|        </div>
     9|        <button class="btn btn-outline" @click="refreshData">🔄 刷新数据</button>
    10|        <button class="btn btn-primary" @click="exportReport">📥 导出日报</button>
    11|      </div>
    12|      <div class="stats-grid">
    13|        <div class="stat-card" @click="router.push({ path: '/sentiment-db/social' })">
    14|          <div class="stat-icon icon-bg-blue">💬</div>
    15|          <div class="stat-value">{{ postTotal }}</div>
    16|          <div class="stat-label">社交媒体帖子总数</div>
    17|          <div class="stat-change up" v-if="postTotal > 0">▲ 已加载</div>
    18|        </div>
    19|        <div class="stat-card" @click="router.push({ path: '/sentiment-db/news' })">
    20|          <div class="stat-icon icon-bg-green">📰</div>
    21|          <div class="stat-value">{{ newsTotal }}</div>
    22|          <div class="stat-label">新闻资讯文章数</div>
    23|          <div class="stat-change up" v-if="newsTotal > 0">▲ 已加载</div>
    24|        </div>
    25|        <div class="stat-card">
    26|          <div class="stat-icon icon-bg-orange">🔥</div>
    27|          <div class="stat-value">{{ allKeywords.length }}</div>
    28|          <div class="stat-label">活跃触发关键词</div>
    29|        </div>
    30|        <div class="stat-card">
    31|          <div class="stat-icon icon-bg-purple">🏢</div>
    32|          <div class="stat-value">{{ allSources.length }}</div>
    33|          <div class="stat-label">数据来源数</div>
    34|        </div>
    35|      </div>
    36|      <div class="dashboard-grid">
    37|        <div class="card">
    38|          <div class="card-header">
    39|            <span class="card-title"><span class="dot dot-red"></span>实时热点话题</span>
    40|            <span class="count-indicator">最近24小时</span>
    41|          </div>
    42|          <div class="table-wrapper">
    43|            <table>
    44|              <thead><tr><th>话题</th><th>来源</th><th>热度指数</th><th>趋势</th></tr></thead>
    45|              <tbody>
    46|                <tr v-for="(topic, index) in hotTopics" :key="index">
    47|                  <td><strong>{{ index + 1 }}. {{ topic.topic }}</strong></td>
    48|                  <td><span :class="['source-badge', topic.source.includes('社媒') ? 'source-social' : 'source-press']">{{ topic.source }}</span></td>
    49|                  <td><strong>{{ topic.heat }}</strong>/100</td>
    50|                  <td>{{ topic.trend }}</td>
    51|                </tr>
    52|                <tr v-if="hotTopics.length === 0"><td colspan="4" style="text-align:center;color:#aaa;padding:30px;">暂无热点话题数据</td></tr>
    53|              </tbody>
    54|            </table>
    55|          </div>
    56|        </div>
    57|        <div class="card">
    58|          <div class="card-header"><span class="card-title">🏷️ 热门标签云</span></div>
    59|          <div class="tag-cloud">
    60|            <span v-for="(tag, index) in tagCloudData" :key="tag.keyword" :class="['tag-cloud-item', tag.sizeClass, tagColorClass(index)]" :title="`提及${tag.count}次`" @click="showToast('🔍 追踪: ' + tag.keyword)">
    61|              {{ tag.keyword }}<small>({{ tag.count }})</small>
    62|            </span>
    63|            <div v-if="tagCloudData.length === 0" style="color:#aaa;font-size:12px;padding:12px;">暂无标签数据</div>
    64|          </div>
    65|        </div>
    66|      </div>
    67|    </div>
    68|    <div v-if="toastVisible" class="toast">{{ toastMessage }}</div>
    69|  </div>
    70|</template>
    71|
    72|<script setup>
    73|import { ref, computed, onMounted } from 'vue'
    74|import { useRouter } from 'vue-router'
    75|import { listPost } from '@/api/sentiment/post'
    76|import { listNews } from '@/api/sentiment/news'
    77|import { parseKeywords, formatNumber } from './utils'
    78|
    79|const router = useRouter()
    80|const postTotal = ref(0)
    81|const newsTotal = ref(0)
    82|const dashboardSearch = ref('')
    83|const postList = ref([])
    84|const newsList = ref([])
    85|const toastVisible = ref(false)
    86|const toastMessage = ref('')
    87|let toastTimeout = null
    88|
    89|function showToast(msg) {
    90|  toastMessage.value = msg; toastVisible.value = true
    91|  if (toastTimeout) clearTimeout(toastTimeout)
    92|  toastTimeout = setTimeout(() => { toastVisible.value = false }, 2200)
    93|}
    94|
    95|const allKeywords = computed(() => {
    96|  const s = new Set()
    97|  postList.value.forEach(p => parseKeywords(p.triggerKeyword).forEach(k => s.add(k)))
    98|  newsList.value.forEach(a => parseKeywords(a.keywords).forEach(k => s.add(k)))
    99|  return Array.from(s)
   100|})
   101|const allSources = computed(() => {
   102|  const s = new Set()
   103|  postList.value.forEach(p => { if (p.siteName) s.add(p.siteName) })
   104|  newsList.value.forEach(a => { if (a.source) s.add(a.source) })
   105|  return Array.from(s)
   106|})
   107|const hotTopics = computed(() => {
   108|  const kc = {}
   109|  postList.value.forEach(p => parseKeywords(p.triggerKeyword).forEach(k => { kc[k] = (kc[k] || 0) + 1 }))
   110|  newsList.value.forEach(a => parseKeywords(a.keywords).forEach(k => { kc[k] = (kc[k] || 0) + 1 }))
   111|  const sorted = Object.entries(kc).sort((a, b) => b[1] - a[1]).slice(0, 5)
   112|  const ks = {}
   113|  postList.value.forEach(p => parseKeywords(p.triggerKeyword).forEach(k => { if (!ks[k]) ks[k] = new Set(); ks[k].add(p.siteName || '社交媒体') }))
   114|  newsList.value.forEach(a => parseKeywords(a.keywords).forEach(k => { if (!ks[k]) ks[k] = new Set(); ks[k].add(a.source || '新闻') }))
   115|  return sorted.map(([keyword, count], i) => ({ topic: keyword, source: Array.from(ks[keyword] || []).join('+'), heat: Math.max(95 - i * 8, 60), trend: i < 2 ? '🔥 持续上升' : i < 4 ? '📈 上升中' : '🆕 新热点' }))
   116|})
   117|const tagCloudData = computed(() => {
   118|  const kc = {}
   119|  postList.value.forEach(p => parseKeywords(p.triggerKeyword).forEach(k => { kc[k] = (kc[k] || 0) + 1 }))
   120|  newsList.value.forEach(a => parseKeywords(a.keywords).forEach(k => { kc[k] = (kc[k] || 0) + 1 }))
   121|  return Object.entries(kc).sort((a, b) => b[1] - a[1]).map(([keyword, count]) => ({ keyword, count, sizeClass: count >= 5 ? 'size-l' : count >= 3 ? 'size-m' : 'size-s' }))
   122|})
   123|function tagColorClass(i) { return ['tag-c1','tag-c2','tag-c3','tag-c4','tag-c5'][i % 5] }
   124|
   125|function refreshData() { showToast('🔄 数据已刷新'); loadData() }
   126|function exportReport() {
   127|  let r = '舆情监控日报\n生成时间：' + new Date().toLocaleString() + '\n' + '='.repeat(50) + '\n\n'
   128|  r += '【社交媒体帖子统计】共 ' + postTotal.value + ' 条\n'
   129|  r += '【报刊文章统计】共 ' + newsTotal.value + ' 条\n\n热点关键词：\n'
   130|  allKeywords.value.forEach(k => { r += '  - ' + k + '\n' })
   131|  const blob = new Blob([r], { type: 'text/plain;charset=utf-8' })
   132|  const url = URL.createObjectURL(blob)
   133|  const a = document.createElement('a'); a.href = url; a.download = '舆情日报_' + new Date().toISOString().slice(0,10) + '.txt'; a.click()
   134|  URL.revokeObjectURL(url); showToast('✅ 日报已导出！')
   135|}
   136|
   137|async function loadData() {
   138|  try {
   139|    const [pr, nr] = await Promise.all([listPost({ pageNum: 1, pageSize: 100 }), listNews({ pageNum: 1, pageSize: 100 })])
   140|    postList.value = pr.rows || []; postTotal.value = pr.total || 0
   141|    newsList.value = nr.rows || []; newsTotal.value = nr.total || 0
   142|  } catch (e) { console.error('加载仪表盘数据失败:', e) }
   143|}
   144|onMounted(() => { loadData() })
   145|</script>
   146|

<style>
@import './common.css';
</style>
