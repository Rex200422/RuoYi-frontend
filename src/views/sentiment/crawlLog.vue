     1|<template>
     2|  <div class="sentiment-page">
     3|    <div class="page-section">
     4|      <div class="top-bar">
     5|        <div class="search-box"><input v-model="crawlLogSearch" type="text" placeholder="搜索站点名称、关键词..." /><span class="search-icon">🔍</span></div>
     6|        <div class="filter-pills">
     7|          <span class="filter-pill" :class="{ active: crawlLogSelectedSites.size === 0 }" @click="handleCrawlLogFilter('all')">全部站点</span>
     8|          <span v-for="site in crawlLogSiteFilters" :key="site" class="filter-pill" :class="{ active: crawlLogSelectedSites.has(site) }" @click="handleCrawlLogFilter(site)">{{ site }}</span>
     9|        </div>
    10|        <button class="btn btn-outline btn-sm" @click="loadCrawlLogs">🔄 刷新</button>
    11|      </div>
    12|      <div class="card">
    13|        <div class="card-header"><span class="card-title"><span class="dot dot-green"></span>爬取任务日志</span><span class="count-indicator">共 {{ crawlLogTotal }} 条{{ crawlLogSelectedSites.size > 0 ? ' (已筛选)' : '' }}</span></div>
    14|        <div class="table-wrapper">
    15|          <table v-if="filteredCrawlLogs.length > 0">
    16|            <thead><tr><th>站点名称</th><th>关键词</th><th>状态</th><th>开始时间</th><th>结束时间</th><th>抓取数</th><th>保存数</th><th>错误信息</th></tr></thead>
    17|            <tbody>
    18|              <tr v-for="log in filteredCrawlLogs" :key="log.id">
    19|                <td><span class="site-badge">{{ log.siteName }}</span></td>
    20|                <td><span v-for="kw in parseKeywords(log.keyword)" :key="kw" class="keyword-tag">{{ kw }}</span></td>
    21|                <td><span :class="['status-badge', 'status-' + log.status]">{{ formatCrawlStatus(log.status) }}</span></td>
    22|                <td style="font-size:12px;white-space:nowrap;">{{ log.startTime || '—' }}</td>
    23|                <td style="font-size:12px;white-space:nowrap;">{{ log.endTime || '—' }}</td>
    24|                <td><strong>{{ log.itemsFound || 0 }}</strong></td>
    25|                <td><strong>{{ log.itemsSaved || 0 }}</strong></td>
    26|                <td>
    27|                  <el-tooltip v-if="log.errorMsg" :content="log.errorMsg" placement="top" :show-after="300"><span class="error-hint">⚠️ 查看详情</span></el-tooltip>
    28|                  <span v-else style="color:#aaa;font-size:12px;">—</span>
    29|                </td>
    30|              </tr>
    31|            </tbody>
    32|          </table>
    33|          <div v-else class="empty-state"><div class="icon">📋</div><p>暂无爬取日志</p></div>
    34|        </div>
    35|        <div class="pagination-wrapper">
    36|          <el-pagination v-model:current-page="crawlLogQuery.pageNum" v-model:page-size="crawlLogQuery.pageSize" :page-sizes="[10, 20, 50, 100]" :total="crawlLogTotal" layout="total, sizes, prev, pager, next, jumper" @size-change="loadCrawlLogs" @current-change="loadCrawlLogs" />
    37|        </div>
    38|      </div>
    39|    </div>
    40|  </div>
    41|</template>
    42|<script setup>
    43|import { ref, reactive, computed, onMounted } from 'vue'
    44|import { ElMessage } from 'element-plus'
    45|import { listCrawlLog } from '@/api/sentiment/crawl'
    46|import { parseKeywords, formatCrawlStatus } from './utils'
    47|const crawlLogs = ref([]); const crawlLogTotal = ref(0); const crawlLogsLoading = ref(false)
    48|const crawlLogSearch = ref(''); const crawlLogQuery = reactive({ pageNum: 1, pageSize: 20 })
    49|const crawlLogSelectedSites = ref(new Set()); const crawlLogSiteFilters = ref([])
    50|const filteredCrawlLogs = computed(() => {
    51|  let list = crawlLogs.value
    52|  if (crawlLogSelectedSites.value.size > 0) list = list.filter(l => crawlLogSelectedSites.value.has(l.siteName))
    53|  if (crawlLogSearch.value) { const s = crawlLogSearch.value.toLowerCase(); list = list.filter(l => (l.siteName && l.siteName.toLowerCase().includes(s)) || (l.keyword && l.keyword.toLowerCase().includes(s))) }
    54|  return list
    55|})
    56|function handleCrawlLogFilter(f) { if (f === 'all') { crawlLogSelectedSites.value = new Set() } else { const s = new Set(crawlLogSelectedSites.value); s.has(f) ? s.delete(f) : s.add(f); crawlLogSelectedSites.value = s } }
    57|async function loadCrawlLogs() {
    58|  crawlLogsLoading.value = true
    59|  try {
    60|    const p = { pageNum: crawlLogQuery.pageNum, pageSize: crawlLogQuery.pageSize }; if (crawlLogSearch.value) p.siteName = crawlLogSearch.value
    61|    const res = await listCrawlLog(p); crawlLogs.value = res.rows || []; crawlLogTotal.value = res.total || 0
    62|    const ss = new Set(); crawlLogs.value.forEach(l => { if (l.siteName) ss.add(l.siteName) }); crawlLogSiteFilters.value = Array.from(ss)
    63|  } catch (e) { ElMessage.error('加载爬取日志失败') } finally { crawlLogsLoading.value = false }
    64|}
    65|onMounted(() => { loadCrawlLogs() })
    66|</script>
    67|

<style>
@import './common.css';
</style>
