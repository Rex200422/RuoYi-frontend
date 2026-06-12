<template>
  <div class="sentiment-page">
    <div class="page-section">
      <div class="top-bar">
        <div class="search-box"><input v-model="crawlLogSearch" type="text" placeholder="搜索站点名称、关键词..." /><span class="search-icon">🔍</span></div>
        <div class="filter-pills">
          <span class="filter-pill" :class="{ active: crawlLogSelectedSites.size === 0 }" @click="handleCrawlLogFilter('all')">全部站点</span>
          <span v-for="site in crawlLogSiteFilters" :key="site" class="filter-pill" :class="{ active: crawlLogSelectedSites.has(site) }" @click="handleCrawlLogFilter(site)">{{ site }}</span>
        </div>
        <button class="btn btn-outline btn-sm" @click="loadCrawlLogs">🔄 刷新</button>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title"><span class="dot dot-green"></span>爬取任务日志</span><span class="count-indicator">共 {{ crawlLogTotal }} 条{{ crawlLogSelectedSites.size > 0 ? ' (已筛选)' : '' }}</span></div>
        <div class="table-wrapper">
          <table v-if="filteredCrawlLogs.length > 0">
            <thead><tr><th>站点名称</th><th>关键词</th><th>状态</th><th>开始时间</th><th>结束时间</th><th>抓取数</th><th>新增数</th><th>更新数</th><th>错误信息</th><th>操作</th></tr></thead>
            <tbody>
              <tr v-for="log in filteredCrawlLogs" :key="log.id">
                <td><span class="site-badge">{{ log.siteName }}</span></td>
                <td><span v-for="kw in parseKeywords(log.keyword)" :key="kw" class="keyword-tag">{{ kw }}</span></td>
                <td><span :class="['status-badge', 'status-' + log.status]">{{ formatCrawlStatus(log.status) }}</span></td>
                <td style="font-size:12px;white-space:nowrap;">{{ log.startTime || '—' }}</td>
                <td style="font-size:12px;white-space:nowrap;">{{ log.endTime || '—' }}</td>
                <td><strong>{{ log.itemsFound || 0 }}</strong></td>
                <td><strong>{{ log.itemsNew || 0 }}</strong></td>
                <td><strong>{{ log.itemsUpdated || 0 }}</strong></td>
                <td>
                  <el-tooltip v-if="log.errorMsg" :content="log.errorMsg" placement="top" :show-after="300"><span class="error-hint">⚠️ 查看详情</span></el-tooltip>
                  <span v-else style="color:#aaa;font-size:12px;">—</span>
                </td>
                <td>
                  <button class="btn btn-outline btn-sm" style="font-size:11px;margin-right:4px;" @click="previewLog(log)">📋 预览</button>
                  <button class="btn btn-outline btn-sm" style="font-size:11px;" @click="downloadLog(log)">⬇️ 下载</button>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-else class="empty-state"><div class="icon">📋</div><p>暂无爬取日志</p></div>
        </div>
        <div class="pagination-wrapper">
          <el-pagination v-model:current-page="crawlLogQuery.pageNum" v-model:page-size="crawlLogQuery.pageSize" :page-sizes="[10, 20, 50, 100]" :total="crawlLogTotal" layout="total, sizes, prev, pager, next, jumper" @size-change="loadCrawlLogs" @current-change="loadCrawlLogs" />
        </div>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'
import { listCrawlLog } from '@/api/sentiment/crawl'
import { parseKeywords, formatCrawlStatus } from './utils'
const crawlLogs = ref([]); const crawlLogTotal = ref(0); const crawlLogsLoading = ref(false)
const crawlLogSearch = ref(''); const crawlLogQuery = reactive({ pageNum: 1, pageSize: 20 })
const crawlLogSelectedSites = ref(new Set()); const crawlLogSiteFilters = ref([])
const filteredCrawlLogs = computed(() => {
  let list = crawlLogs.value
  if (crawlLogSelectedSites.value.size > 0) list = list.filter(l => crawlLogSelectedSites.value.has(l.siteName))
  if (crawlLogSearch.value) { const s = crawlLogSearch.value.toLowerCase(); list = list.filter(l => (l.siteName && l.siteName.toLowerCase().includes(s)) || (l.keyword && l.keyword.toLowerCase().includes(s))) }
  return list
})
function handleCrawlLogFilter(f) { if (f === 'all') { crawlLogSelectedSites.value = new Set() } else { const s = new Set(crawlLogSelectedSites.value); s.has(f) ? s.delete(f) : s.add(f); crawlLogSelectedSites.value = s } }

function previewLog(log) {
  request({ url: `/system/sentiment/crawlLog/log/${log.id}/preview?lines=500`, method: 'get' })
    .then(res => {
      if (res.code === 200 && res.data) {
        const content = res.data.content || '日志内容为空'
        const w = window.open('', '_blank', 'width=900,height=700,scrollbars=yes')
        w.document.write('<pre style="font-size:12px;font-family:monospace;white-space:pre-wrap;">' + content.replace(/</g, '&lt;') + '</pre>')
        w.document.close()
      } else {
        ElMessage.warning(res.msg || '无法预览日志')
      }
    })
    .catch(() => ElMessage.error('预览日志失败'))
}

function downloadLog(log) {
  request({ url: `/system/sentiment/crawlLog/log/${log.id}`, method: 'get', responseType: 'blob' })
    .then(res => {
      const blob = new Blob([res], { type: 'text/plain' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `${log.siteName}_${log.id}.log`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      ElMessage.success('日志下载完成')
    })
    .catch(() => ElMessage.error('下载日志失败'))
}

async function loadCrawlLogs() {
  crawlLogsLoading.value = true
  try {
    const p = { pageNum: crawlLogQuery.pageNum, pageSize: crawlLogQuery.pageSize }; if (crawlLogSearch.value) p.siteName = crawlLogSearch.value
    const res = await listCrawlLog(p); crawlLogs.value = res.rows || []; crawlLogTotal.value = res.total || 0
    const ss = new Set(); crawlLogs.value.forEach(l => { if (l.siteName) ss.add(l.siteName) }); crawlLogSiteFilters.value = Array.from(ss)
  } catch (e) { ElMessage.error('加载爬取日志失败') } finally { crawlLogsLoading.value = false }
}
onMounted(() => { loadCrawlLogs() })
</script>


<style>
@import './common.css';
</style>
