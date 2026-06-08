<template>
  <div class="sentiment-page">
    <div class="page-section">
      <!-- 筛选栏 -->
      <div class="card" style="margin-bottom:16px;">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
          <div class="filter-pills">
            <span class="filter-pill" :class="{ active: riskFilter === '' }" @click="riskFilter = ''">全部</span>
            <span class="filter-pill" :class="{ active: riskFilter === '低' }" @click="riskFilter = '低'">🟢 低风险</span>
            <span class="filter-pill" :class="{ active: riskFilter === '中' }" @click="riskFilter = '中'">🟡 中风险</span>
            <span class="filter-pill" :class="{ active: riskFilter === '高' }" @click="riskFilter = '高'">🔴 高风险</span>
          </div>
          <div style="display:flex;gap:8px;">
            <button class="btn btn-outline btn-sm" @click="refresh">🔄 刷新</button>
            <button class="btn btn-primary btn-sm" @click="generateNow" :disabled="generating">
              {{ generating ? '⏳ 生成中...' : '🤖 立即生成' }}
            </button>
          </div>
        </div>
      </div>

      <!-- 当前简报 (V5 结构化 JSON) -->
      <template v-if="activeSummary && activeSummary.summaryType !== 'skipped'">
        <!-- 标题 & 元信息 -->
        <div class="card" style="margin-bottom:16px;">
          <div class="card-header">
            <span class="card-title">🤖 {{ jsonData.title || activeSummary.title }}</span>
            <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
              <span class="risk-badge" :class="'risk-' + activeSummary.riskLevel">{{ formatRisk(activeSummary.riskLevel) }}</span>
              <span style="font-size:12px;color:#999;">{{ formatTime(activeSummary.createTime) }} · {{ activeSummary.newsCount }}新闻 + {{ activeSummary.socialCount }}社交 · {{ activeSummary.generateTime }}s生成 · {{ activeSummary.modelName }}</span>
            </div>
          </div>
          <!-- 核心摘要 -->
          <div class="summary-text" v-if="jsonData.summary">
            <p>{{ jsonData.summary }}</p>
          </div>
          <div class="summary-content" v-else v-html="renderMarkdown(activeSummary.content)"></div>
        </div>

        <!-- 图表区域 -->
        <div class="charts-row" v-if="hasChartData">
          <!-- 分类饼图 -->
          <div class="card chart-card" v-if="jsonData.categories && jsonData.categories.length > 0">
            <div class="card-header">
              <span class="card-title">📊 分类分布</span>
            </div>
            <div ref="pieChart" style="width:100%;height:320px;"></div>
          </div>

          <!-- 趋势折线图 -->
          <div class="card chart-card" v-if="jsonData.trends && jsonData.trends.category_trends && Object.keys(jsonData.trends.category_trends).length > 0">
            <div class="card-header">
              <span class="card-title">📈 热度趋势</span>
            </div>
            <div ref="lineChart" style="width:100%;height:320px;"></div>
          </div>
        </div>

        <!-- 风险趋势 -->
        <div class="card" style="margin-bottom:16px;" v-if="jsonData.trends && jsonData.trends.risk_trend && jsonData.trends.risk_trend.length > 0">
          <div class="card-header">
            <span class="card-title">⚠️ 风险趋势</span>
          </div>
          <div ref="riskChart" style="width:100%;height:200px;"></div>
        </div>

        <!-- 关键词 & 统计 -->
        <div class="charts-row" v-if="jsonData.stats">
          <!-- 关键词 TOP -->
          <div class="card chart-card" v-if="jsonData.stats.keywords && jsonData.stats.keywords.length > 0">
            <div class="card-header">
              <span class="card-title">🔥 热门关键词</span>
            </div>
            <div ref="barChart" style="width:100%;height:320px;"></div>
          </div>

          <!-- 统计卡片 -->
          <div class="card chart-card">
            <div class="card-header">
              <span class="card-title">📋 数据概览</span>
            </div>
            <div class="stats-grid" style="margin-bottom:0;">
              <div class="stat-card">
                <div class="stat-icon icon-bg-blue">📰</div>
                <div class="stat-value">{{ jsonData.stats.total_news || 0 }}</div>
                <div class="stat-label">新闻文章</div>
              </div>
              <div class="stat-card">
                <div class="stat-icon icon-bg-orange">💬</div>
                <div class="stat-value">{{ jsonData.stats.total_posts || 0 }}</div>
                <div class="stat-label">社交帖子</div>
              </div>
              <div class="stat-card">
                <div class="stat-icon icon-bg-red">🏷️</div>
                <div class="stat-value">{{ (jsonData.stats.keywords || []).length }}</div>
                <div class="stat-label">关键词数</div>
              </div>
              <div class="stat-card">
                <div class="stat-icon icon-bg-green">📊</div>
                <div class="stat-value">{{ (jsonData.categories || []).length }}</div>
                <div class="stat-label">分类数</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 分类详情 -->
        <div class="card" style="margin-bottom:16px;" v-if="jsonData.categories && jsonData.categories.length > 0">
          <div class="card-header">
            <span class="card-title">📂 分类详情</span>
          </div>
          <div class="category-list">
            <div class="category-item" v-for="cat in jsonData.categories" :key="cat.name">
              <div class="category-header">
                <span class="category-name">{{ getCategoryEmoji(cat.name) }} {{ cat.name }}</span>
                <span class="category-count">{{ cat.count }}条</span>
                <span class="category-trend" :class="'trend-' + cat.trend">{{ cat.trend }}</span>
              </div>
              <div class="category-events" v-if="cat.events && cat.events.length > 0">
                <div class="event-item" v-for="(evt, idx) in cat.events" :key="idx">• {{ evt }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 关注建议 -->
        <div class="card" style="margin-bottom:16px;" v-if="jsonData.suggestions && jsonData.suggestions.length > 0">
          <div class="card-header">
            <span class="card-title">💡 关注建议</span>
          </div>
          <div class="suggestion-list">
            <div class="suggestion-item" v-for="(s, idx) in jsonData.suggestions" :key="idx">
              <span class="suggestion-num">{{ idx + 1 }}</span>
              <span>{{ s }}</span>
            </div>
          </div>
        </div>
      </template>

      <!-- 跳过状态提示 -->
      <div v-if="activeSummary && activeSummary.summaryType === 'skipped'" class="card" style="text-align:center;padding:30px;color:#888;">
        ⏭️ {{ activeSummary.title }}
        <p style="margin-top:8px;font-size:12px;">{{ formatTime(activeSummary.createTime) }}</p>
      </div>

      <div v-if="!activeSummary" class="card" style="margin-bottom:16px;text-align:center;padding:40px;color:#aaa;">
        暂无简报数据，等待自动生成...
      </div>

      <!-- 历史简报列表 -->
      <div class="card">
        <div class="card-header">
          <span class="card-title"><span class="dot dot-green"></span>历史简报</span>
          <span class="count-indicator">共 {{ total }} 条</span>
        </div>
        <div class="table-wrapper">
          <table v-if="summaryList.length > 0">
            <thead>
              <tr>
                <th>时间</th>
                <th>标题</th>
                <th>风险</th>
                <th>数据量</th>
                <th>模型</th>
                <th>耗时</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in summaryList" :key="s.id"
                  @click="selectSummary(s)"
                  :class="{ 'row-expanded': activeSummary && activeSummary.id === s.id, 'row-skipped': s.summaryType === 'skipped' }"
                  style="cursor:pointer;">
                <td style="white-space:nowrap;">{{ formatTime(s.createTime) }}</td>
                <td>
                  <span v-if="s.summaryType === 'skipped'" style="color:#aaa;font-style:italic;">⏭️ 跳过</span>
                  <strong v-else>{{ getDisplayTitle(s) }}</strong>
                </td>
                <td><span class="risk-badge" :class="'risk-' + s.riskLevel">{{ formatRisk(s.riskLevel) }}</span></td>
                <td>{{ s.newsCount }}新闻 + {{ s.socialCount }}社交</td>
                <td style="font-size:12px;">{{ s.modelName }}</td>
                <td>{{ s.generateTime }}s</td>
              </tr>
            </tbody>
          </table>
          <div v-else style="text-align:center;padding:30px;color:#aaa;">暂无数据</div>
        </div>
        <div class="pagination-wrapper">
          <el-pagination
            v-model:current-page="pageNum"
            v-model:page-size="pageSize"
            :page-sizes="[10, 20, 50]"
            :total="total"
            layout="total, sizes, prev, pager, next"
            @size-change="loadSummaries"
            @current-change="loadSummaries"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick, computed } from 'vue'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'
import * as echarts from 'echarts'

const summaryList = ref([])
const activeSummary = ref(null)
const total = ref(0)
const pageNum = ref(1)
const pageSize = ref(10)
const riskFilter = ref('')
const generating = ref(false)
let pollTimer = null

// Chart refs
const pieChart = ref(null)
const lineChart = ref(null)
const barChart = ref(null)
const riskChart = ref(null)

// Chart instances
let pieInstance = null
let lineInstance = null
let barInstance = null
let riskInstance = null

// Parsed JSON data
const jsonData = ref({})

const hasChartData = computed(() => {
  return (jsonData.value.categories && jsonData.value.categories.length > 0) ||
         (jsonData.value.trends && jsonData.value.category_trends && Object.keys(jsonData.value.category_trends).length > 0)
})

function parseJsonContent(content) {
  if (!content) return {}
  // Try to parse as JSON
  try {
    const parsed = JSON.parse(content)
    if (parsed && typeof parsed === 'object' && parsed.title) {
      return parsed
    }
  } catch (e) {
    // Not valid JSON, might be old markdown format
  }
  return {}
}

function getDisplayTitle(s) {
  if (s.content) {
    try {
      const parsed = JSON.parse(s.content)
      if (parsed.title) return parsed.title
    } catch (e) {}
  }
  return s.title
}

function getCategoryEmoji(name) {
  const emojis = {
    '军事': '🎯', '贸易': '📦', '外交': '🤝', '科技': '🔬',
    '人权': '✊', '社会': '🏛️', '经济': '💰', '政治': '🗳️', '其他': '📌'
  }
  return emojis[name] || '📌'
}

async function loadSummaries() {
  try {
    const params = { pageNum: pageNum.value, pageSize: pageSize.value }
    if (riskFilter.value) params.riskLevel = riskFilter.value
    const res = await request({ url: '/system/sentiment/aiSummary/list', method: 'get', params })
    summaryList.value = res.rows || []
    total.value = res.total || 0
  } catch (e) {
    ElMessage.error('加载简报列表失败')
  }
}

async function loadLatest() {
  try {
    const res = await request({ url: '/system/sentiment/aiSummary/latest', method: 'get' })
    if (res.data && !activeSummary.value) {
      selectSummary(res.data)
    }
  } catch (e) {}
}

function selectSummary(s) {
  activeSummary.value = s
  jsonData.value = parseJsonContent(s.content)
  // Render charts after DOM update
  nextTick(() => {
    renderAllCharts()
  })
}

function refresh() {
  activeSummary.value = null
  jsonData.value = {}
  pageNum.value = 1
  loadLatest()
  loadSummaries()
}

async function generateNow() {
  if (generating.value) return
  try {
    const res = await request({ url: '/system/sentiment/aiSummary/generate', method: 'post' })
    if (res.code === 200) {
      ElMessage.success(res.msg || '简报已提交生成，预计1-3分钟')
      generating.value = true
      startPolling()
    } else {
      ElMessage.warning(res.msg || '提交失败')
    }
  } catch (e) {
    ElMessage.error('提交失败')
  }
}

async function checkGenerating() {
  try {
    const res = await request({ url: '/system/sentiment/aiSummary/generating', method: 'get' })
    if (res.data === false && generating.value) {
      generating.value = false
      stopPolling()
      ElMessage.success('简报生成完成')
      refresh()
    }
  } catch (e) {}
}

function startPolling() {
  stopPolling()
  pollTimer = setInterval(checkGenerating, 5000)
}

function stopPolling() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
}

function formatRisk(level) {
  return { '低': '🟢 低风险', '中': '🟡 中风险', '高': '🔴 高风险' }[level] || level
}

function formatTime(dt) {
  if (!dt) return ''
  return new Date(dt).toLocaleString('zh-CN')
}

function renderMarkdown(text) {
  if (!text) return ''
  let s = text.replace(/\\\\n/g, '\n')
  s = s.replace(/\n{3,}/g, '\n\n')
  let html = s
    .replace(/^### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^## (.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>')
  const lines = html.split('\n')
  const result = []
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      result.push('')
    } else if (trimmed.startsWith('<h') || trimmed.startsWith('<ul') || trimmed.startsWith('<li')) {
      result.push(line)
    } else {
      result.push('<p>' + trimmed + '</p>')
    }
  }
  return result.join('\n').replace(/\n{3,}/g, '\n\n')
}

// ==================== ECharts Rendering ====================

const COLORS = ['#4f6ef7', '#f39c12', '#e74c3c', '#27ae60', '#9b59b6', '#1abc9c', '#e67e22', '#34495e', '#95a5a6']

function renderAllCharts() {
  destroyCharts()
  if (!jsonData.value || !activeSummary.value) return

  if (jsonData.value.categories && jsonData.value.categories.length > 0) {
    renderPieChart()
  }
  if (jsonData.value.trends && jsonData.value.trends.category_trends && Object.keys(jsonData.value.trends.category_trends).length > 0) {
    renderLineChart()
  }
  if (jsonData.value.stats && jsonData.value.stats.keywords && jsonData.value.stats.keywords.length > 0) {
    renderBarChart()
  }
  if (jsonData.value.trends && jsonData.value.trends.risk_trend && jsonData.value.trends.risk_trend.length > 0) {
    renderRiskChart()
  }
}

function destroyCharts() {
  if (pieInstance) { pieInstance.dispose(); pieInstance = null }
  if (lineInstance) { lineInstance.dispose(); lineInstance = null }
  if (barInstance) { barInstance.dispose(); barInstance = null }
  if (riskInstance) { riskInstance.dispose(); riskInstance = null }
}

function renderPieChart() {
  if (!pieChart.value) return
  pieInstance = echarts.init(pieChart.value)
  const data = jsonData.value.categories.map(c => ({
    name: c.name,
    value: c.count
  }))
  pieInstance.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { type: 'scroll', bottom: 0, textStyle: { fontSize: 11 } },
    color: COLORS,
    series: [{
      type: 'pie',
      radius: ['35%', '65%'],
      center: ['50%', '45%'],
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
      label: { show: true, formatter: '{b}\n{d}%', fontSize: 11 },
      emphasis: {
        label: { show: true, fontSize: 14, fontWeight: 'bold' }
      },
      data: data
    }]
  })
}

function renderLineChart() {
  if (!lineChart.value) return
  lineInstance = echarts.init(lineChart.value)
  const trends = jsonData.value.trends
  const timeLabels = trends.time_labels || []
  const series = []
  let idx = 0
  for (const [name, values] of Object.entries(trends.category_trends)) {
    series.push({
      name: name,
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      data: values,
      lineStyle: { width: 2 },
      itemStyle: { color: COLORS[idx % COLORS.length] }
    })
    idx++
  }
  lineInstance.setOption({
    tooltip: { trigger: 'axis' },
    legend: { type: 'scroll', bottom: 0, textStyle: { fontSize: 11 } },
    grid: { left: '3%', right: '4%', bottom: '15%', top: '5%', containLabel: true },
    xAxis: {
      type: 'category',
      data: timeLabels,
      axisLabel: { fontSize: 11 }
    },
    yAxis: {
      type: 'value',
      axisLabel: { fontSize: 11 },
      minInterval: 1
    },
    series: series
  })
}

function renderBarChart() {
  if (!barChart.value) return
  barInstance = echarts.init(barChart.value)
  const keywords = jsonData.value.stats.keywords.slice(0, 12)
  barInstance.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '5%', containLabel: true },
    xAxis: {
      type: 'category',
      data: keywords.map(k => k.word),
      axisLabel: { rotate: 30, fontSize: 11 }
    },
    yAxis: {
      type: 'value',
      axisLabel: { fontSize: 11 },
      minInterval: 1
    },
    series: [{
      type: 'bar',
      data: keywords.map((k, i) => ({
        value: k.count,
        itemStyle: { color: COLORS[i % COLORS.length], borderRadius: [4, 4, 0, 0] }
      })),
      barWidth: '60%'
    }]
  })
}

function renderRiskChart() {
  if (!riskChart.value) return
  riskInstance = echarts.init(riskChart.value)
  const riskTrend = jsonData.value.trends.risk_trend
  const riskMap = { '低': 1, '中': 2, '高': 3 }
  const labels = riskTrend.map((_, i) => `简报${i + 1}`)
  riskInstance.setOption({
    tooltip: {
      trigger: 'axis',
      formatter: function(params) {
        const val = params[0].value
        const level = val === 3 ? '高风险' : val === 2 ? '中风险' : '低风险'
        return `${params[0].name}: ${level}`
      }
    },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '10%', containLabel: true },
    xAxis: {
      type: 'category',
      data: labels,
      axisLabel: { fontSize: 11 }
    },
    yAxis: {
      type: 'value',
      min: 0, max: 4,
      axisLabel: {
        fontSize: 11,
        formatter: function(val) {
          return { 1: '低', 2: '中', 3: '高' }[val] || ''
        }
      },
      splitNumber: 3
    },
    series: [{
      type: 'line',
      data: riskTrend.map(r => riskMap[r] || 2),
      smooth: true,
      symbol: 'circle',
      symbolSize: 10,
      lineStyle: { width: 3, color: '#e74c3c' },
      itemStyle: {
        color: function(params) {
          const colors = { 1: '#27ae60', 2: '#f39c12', 3: '#e74c3c' }
          return colors[params.value] || '#999'
        }
      },
      areaStyle: {
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(231,76,60,0.3)' },
            { offset: 1, color: 'rgba(231,76,60,0.02)' }
          ]
        }
      },
      markPoint: {
        data: riskTrend.map((r, i) => ({
          coord: [i, riskMap[r] || 2],
          value: r,
          symbol: 'circle',
          symbolSize: 0,
          label: { show: true, formatter: r, fontSize: 11, offset: [0, -12] }
        }))
      }
    }]
  })
}

// Window resize handler
function handleResize() {
  pieInstance && pieInstance.resize()
  lineInstance && lineInstance.resize()
  barInstance && barInstance.resize()
  riskInstance && riskInstance.resize()
}

watch(riskFilter, () => {
  pageNum.value = 1
  activeSummary.value = null
  jsonData.value = {}
  destroyCharts()
  loadSummaries()
})

onMounted(() => {
  loadLatest()
  loadSummaries()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  destroyCharts()
  window.removeEventListener('resize', handleResize)
  stopPolling()
})
</script>

<style>
@import './common.css';

.risk-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.risk-low,
.risk-低 {
  background: #e8f5e9;
  color: #2e7d32;
}

.risk-medium,
.risk-中 {
  background: #fff3e0;
  color: #e65100;
}

.risk-high,
.risk-高 {
  background: #ffebee;
  color: #c62828;
}

.row-skipped {
  opacity: 0.5;
  background: #f9f9f9;
}
.row-skipped td {
  color: #999;
}

.summary-text {
  font-size: 14px;
  line-height: 1.8;
  color: #444;
  padding: 12px 20px;
  background: #f8f9fb;
  border-radius: 8px;
  border-left: 3px solid var(--primary, #4f6ef7);
}

.summary-text p {
  margin: 0;
}

.summary-content {
  line-height: 1.8;
  font-size: 14px;
  padding: 16px 20px;
}

.summary-content h3 {
  font-size: 16px;
  font-weight: 700;
  margin-top: 18px;
  margin-bottom: 8px;
  color: var(--text, #2c3e50);
  border-bottom: 1px solid var(--border, #e8ecf1);
  padding-bottom: 6px;
}

.summary-content h4 {
  font-size: 14px;
  font-weight: 600;
  margin-top: 12px;
  margin-bottom: 6px;
  color: #34495e;
}

.summary-content p {
  margin: 6px 0;
}

.summary-content strong {
  color: #2c3e50;
}

.summary-content ul {
  padding-left: 22px;
  margin: 6px 0;
}

.summary-content li {
  margin: 4px 0;
  line-height: 1.6;
}

.summary-content li::marker {
  color: var(--primary, #4f6ef7);
}

/* Charts layout */
.charts-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

@media (max-width: 900px) {
  .charts-row {
    grid-template-columns: 1fr;
  }
}

.chart-card {
  min-height: 360px;
}

/* Category list */
.category-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.category-item {
  padding: 12px 16px;
  background: #f8f9fb;
  border-radius: 8px;
  border-left: 3px solid var(--primary, #4f6ef7);
}

.category-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.category-name {
  font-weight: 600;
  font-size: 14px;
  color: var(--text, #2c3e50);
}

.category-count {
  font-size: 12px;
  color: #999;
}

.category-trend {
  font-size: 11px;
  padding: 1px 8px;
  border-radius: 10px;
  font-weight: 600;
}

.trend-上升 { background: #ffebee; color: #c62828; }
.trend-下降 { background: #e8f5e9; color: #2e7d32; }
.trend-持平 { background: #f5f5f5; color: #999; }

.category-events {
  margin-top: 8px;
  font-size: 13px;
  color: #666;
}

.event-item {
  padding: 2px 0;
}

/* Suggestion list */
.suggestion-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.suggestion-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 12px;
  background: #f8f9fb;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.6;
}

.suggestion-num {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  background: var(--primary, #4f6ef7);
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
}

/* Table row selected highlight */
tr.row-expanded {
  background: var(--primary-light, #eef1fe) !important;
}
</style>
