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

      <!-- 当前选中/最新简报完整内容 -->
      <div class="card" v-if="activeSummary" style="margin-bottom:16px;">
        <div class="card-header">
          <span class="card-title">🤖 {{ activeSummary.title }}</span>
          <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
            <span class="risk-badge" :class="'risk-' + activeSummary.riskLevel">风险: {{ formatRisk(activeSummary.riskLevel) }}</span>
            <span style="font-size:12px;color:#999;">{{ formatTime(activeSummary.createTime) }} · {{ activeSummary.newsCount }}新闻 + {{ activeSummary.socialCount }}社交 · {{ activeSummary.generateTime }}s生成 · {{ activeSummary.modelName }}</span>
          </div>
        </div>
        <div class="summary-content" v-html="renderMarkdown(activeSummary.content)"></div>
      </div>

      <div v-else class="card" style="margin-bottom:16px;text-align:center;padding:40px;color:#aaa;">
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
              <tr v-for="s in summaryList" :key="s.id" @click="activeSummary = s" :class="{ 'row-expanded': activeSummary && activeSummary.id === s.id }" style="cursor:pointer;">
                <td style="white-space:nowrap;">{{ formatTime(s.createTime) }}</td>
                <td><strong>{{ s.title }}</strong></td>
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
    // 默认选中第一条（如果尚未选中）
    if (summaryList.value.length > 0 && !activeSummary.value) {
      activeSummary.value = summaryList.value[0]
    }
  } catch (e) {
    ElMessage.error('加载简报列表失败')
  }
}

async function loadLatest() {
  try {
    const res = await request({ url: '/system/sentiment/aiSummary/latest', method: 'get' })
    if (res.data) activeSummary.value = res.data
  } catch (e) {
    // latest 接口失败不提示，列表会兜底
  }
}

function refresh() {
  activeSummary.value = null
  pageNum.value = 1
  loadLatest()
  loadSummaries()
}

function formatRisk(level) {
  return { '低': '低风险', '中': '中风险', '高': '高风险' }[level] || level
}

function formatTime(dt) {
  if (!dt) return ''
  return new Date(dt).toLocaleString('zh-CN')
}

function renderMarkdown(text) {
  if (!text) return ''
  return text
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
    .replace(/\n/g, '<br>')
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
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
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

.summary-content {
  line-height: 1.8;
  font-size: 14px;
}

.summary-content h1,
.summary-content h2,
.summary-content h3 {
  margin-top: 12px;
  margin-bottom: 8px;
}

.summary-content ul {
  padding-left: 20px;
}

.summary-content li {
  margin: 4px 0;
}
</style>
