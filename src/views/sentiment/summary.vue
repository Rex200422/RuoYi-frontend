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
          <button class="btn btn-outline btn-sm" @click="refresh">🔄 刷新</button>
        </div>
      </div>

      <!-- 当前简报完整内容 -->
      <div class="card" v-if="activeSummary && activeSummary.summaryType !== 'skipped'" style="margin-bottom:16px;">
        <div class="card-header">
          <span class="card-title">🤖 {{ activeSummary.title }}</span>
          <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
            <span class="risk-badge" :class="'risk-' + activeSummary.riskLevel">{{ formatRisk(activeSummary.riskLevel) }}</span>
            <span style="font-size:12px;color:#999;">{{ formatTime(activeSummary.createTime) }} · {{ activeSummary.newsCount }}新闻 + {{ activeSummary.socialCount }}社交 · {{ activeSummary.generateTime }}s生成 · {{ activeSummary.modelName }}</span>
          </div>
        </div>
        <div class="summary-content" v-html="renderMarkdown(activeSummary.content)"></div>
      </div>

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
                  @click="activeSummary = s"
                  :class="{ 'row-expanded': activeSummary && activeSummary.id === s.id, 'row-skipped': s.summaryType === 'skipped' }"
                  style="cursor:pointer;">
                <td style="white-space:nowrap;">{{ formatTime(s.createTime) }}</td>
                <td>
                  <span v-if="s.summaryType === 'skipped'" style="color:#aaa;font-style:italic;">⏭️ 跳过</span>
                  <strong v-else>{{ s.title }}</strong>
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
import { ref, watch, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'

const summaryList = ref([])
const activeSummary = ref(null)
const total = ref(0)
const pageNum = ref(1)
const pageSize = ref(10)
const riskFilter = ref('')

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
      activeSummary.value = res.data
    }
  } catch (e) {}
}

function refresh() {
  activeSummary.value = null
  pageNum.value = 1
  loadLatest()
  loadSummaries()
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
  // 先将字面 \n 转为真实换行
  let s = text.replace(/\\n/g, '\n')
  // 压缩连续空行为单个换行
  s = s.replace(/\n{3,}/g, '\n\n')

  let html = s
    // 标题
    .replace(/^### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^## (.+)$/gm, '<h3>$1</h3>')
    // 粗体
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // 无序列表
    .replace(/^- (.+)$/gm, '<li>$1</li>')

  // 合并连续 <li> 到 <ul>
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>')

  // 段落处理：非标题、非列表、非空行 → 包装 <p>
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

  // 再次压缩空行
  return result.join('\n').replace(/\n{3,}/g, '\n\n')
}

watch(riskFilter, () => {
  pageNum.value = 1
  activeSummary.value = null
  loadSummaries()
})

onMounted(() => {
  loadLatest()
  loadSummaries()
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

/* 表格行选中高亮 */
tr.row-expanded {
  background: var(--primary-light, #eef1fe) !important;
}
</style>
