<template>
  <div class="sentiment-page">
    <div class="page-section">
      <div class="top-bar">
        <div class="search-box"><input v-model="crawlConfigSearch" type="text" placeholder="搜索站点名称、关键词..." /><span class="search-icon">🔍</span></div>
        <button class="btn btn-outline btn-sm" @click="loadCrawlConfigs">🔄 刷新</button>
        <button class="btn btn-outline btn-sm" @click="handleTriggerAll" :disabled="crawlConfigsLoading">⚡ 触发全部</button>
        <button class="btn btn-primary btn-sm" @click="openConfigForm()">➕ 新增配置</button>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title"><span class="dot dot-blue"></span>爬取任务配置</span><span class="count-indicator">共 {{ crawlConfigTotal }} 条</span></div>
        <div class="table-wrapper">
          <table v-if="filteredCrawlConfigs.length > 0">
            <thead><tr><th>站点名称</th><th>关键词</th><th>爬取间隔</th><th>最大结果数</th><th>上次爬取时间</th><th>状态</th><th>操作</th></tr></thead>
            <tbody>
              <tr v-for="config in filteredCrawlConfigs" :key="config.id">
                <td><span class="site-badge">{{ config.siteName }}</span></td>
                <td><span v-for="kw in parseKeywords(config.keyword)" :key="kw" class="keyword-tag">{{ kw }}</span></td>
                <td style="white-space:nowrap;">{{ formatInterval(config.intervalMinutes) }}</td>
                <td>{{ config.maxResults }}</td>
                <td style="font-size:12px;white-space:nowrap;">{{ config.lastCrawlTime || '—' }}</td>
                <td><el-switch v-model="config.enabled" :active-value="1" :inactive-value="0" @change="handleToggleEnabled(config)" size="small" /></td>
                <td><div class="action-btns">
                  <button class="btn btn-outline btn-sm" @click="openConfigForm(config)">编辑</button>
                  <button class="btn btn-outline btn-sm" @click="handleTriggerSingle(config)" :disabled="config._triggering">触发</button>
                  <button class="btn btn-outline btn-sm" style="color:var(--danger);border-color:var(--danger);" @click="handleDeleteConfig(config)">删除</button>
                </div></td>
              </tr>
            </tbody>
          </table>
          <div v-else class="empty-state"><div class="icon">⚙️</div><p>暂无爬取配置</p></div>
        </div>
        <div class="pagination-wrapper">
          <el-pagination v-model:current-page="crawlConfigQuery.pageNum" v-model:page-size="crawlConfigQuery.pageSize" :page-sizes="[10, 20, 50]" :total="crawlConfigTotal" layout="total, sizes, prev, pager, next, jumper" @size-change="loadCrawlConfigs" @current-change="loadCrawlConfigs" />
        </div>
      </div>
    </div>
    <div class="modal-overlay" v-if="showConfigForm" @click.self="closeConfigForm">
      <div class="modal" style="max-width:500px;" @click.stop>
        <button class="modal-close" @click="closeConfigForm">✕</button>
        <h2>⚙️ {{ configForm.id ? '编辑配置' : '新增配置' }}</h2>
        <div style="margin-top:16px;">
          <div class="form-group"><label class="form-label">站点名称</label><input v-model="configForm.siteName" class="form-input" placeholder="例如：微博、知乎、贴吧" /></div>
          <div class="form-group"><label class="form-label">关键词</label><input v-model="configForm.keyword" class="form-input" placeholder="多个关键词用逗号分隔" /></div>
          <div class="form-group"><label class="form-label">爬取间隔（分钟）</label><input v-model.number="configForm.intervalMinutes" type="number" class="form-input" min="1" /></div>
          <div class="form-group"><label class="form-label">最大结果数</label><input v-model.number="configForm.maxResults" type="number" class="form-input" min="1" /></div>
          <div class="form-group" style="display:flex;align-items:center;gap:12px;"><label class="form-label" style="margin:0;">启用状态</label><el-switch v-model="configForm.enabled" :active-value="1" :inactive-value="0" /></div>
        </div>
        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:24px;">
          <button class="btn btn-outline" @click="closeConfigForm">取消</button>
          <button class="btn btn-primary" @click="submitConfigForm" :disabled="configFormSubmitting">{{ configFormSubmitting ? '提交中...' : '确认提交' }}</button>
        </div>
      </div>
    </div>
    <div v-if="toastVisible" class="toast">{{ toastMessage }}</div>
  </div>
</template>
<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { listCrawlConfig, addCrawlConfig, updateCrawlConfig, delCrawlConfig, triggerCrawl, triggerAllCrawl } from '@/api/sentiment/crawl'
import { parseKeywords, formatInterval } from './utils'
const crawlConfigs = ref([]); const crawlConfigTotal = ref(0); const crawlConfigsLoading = ref(false)
const crawlConfigSearch = ref(''); const crawlConfigQuery = reactive({ pageNum: 1, pageSize: 20 })
const showConfigForm = ref(false); const configFormSubmitting = ref(false)
const configForm = reactive({ id: null, siteName: '', keyword: '', intervalMinutes: 60, maxResults: 100, enabled: 1 })
const toastVisible = ref(false); const toastMessage = ref(''); let toastTimeout = null
const filteredCrawlConfigs = computed(() => {
  if (!crawlConfigSearch.value) return crawlConfigs.value
  const s = crawlConfigSearch.value.toLowerCase()
  return crawlConfigs.value.filter(c => (c.siteName && c.siteName.toLowerCase().includes(s)) || (c.keyword && c.keyword.toLowerCase().includes(s)))
})
function showToast(msg) { toastMessage.value = msg; toastVisible.value = true; if (toastTimeout) clearTimeout(toastTimeout); toastTimeout = setTimeout(() => { toastVisible.value = false }, 2200) }
async function loadCrawlConfigs() {
  crawlConfigsLoading.value = true
  try { const res = await listCrawlConfig({ pageNum: crawlConfigQuery.pageNum, pageSize: crawlConfigQuery.pageSize }); crawlConfigs.value = (res.rows || []).map(c => ({ ...c, _triggering: false })); crawlConfigTotal.value = res.total || 0 }
  catch (e) { ElMessage.error('加载爬取配置失败') } finally { crawlConfigsLoading.value = false }
}
function openConfigForm(config) {
  if (config) Object.assign(configForm, { id: config.id, siteName: config.siteName, keyword: config.keyword, intervalMinutes: config.intervalMinutes, maxResults: config.maxResults, enabled: config.enabled })
  else Object.assign(configForm, { id: null, siteName: '', keyword: '', intervalMinutes: 60, maxResults: 100, enabled: 1 })
  showConfigForm.value = true; document.body.style.overflow = 'hidden'
}
function closeConfigForm() { showConfigForm.value = false; document.body.style.overflow = '' }
async function submitConfigForm() {
  if (!configForm.siteName || !configForm.keyword) { ElMessage.warning('请填写站点名称和关键词'); return }
  configFormSubmitting.value = true
  try {
    const data = { siteName: configForm.siteName, keyword: configForm.keyword, intervalMinutes: configForm.intervalMinutes, maxResults: configForm.maxResults, enabled: configForm.enabled }
    if (configForm.id) { data.id = configForm.id; await updateCrawlConfig(data); showToast('✅ 配置已更新') }
    else { await addCrawlConfig(data); showToast('✅ 配置已新增') }
    closeConfigForm(); loadCrawlConfigs()
  } catch (e) { ElMessage.error('保存配置失败') } finally { configFormSubmitting.value = false }
}
async function handleDeleteConfig(config) {
  if (!confirm('确定要删除该爬取配置？')) return
  try { await delCrawlConfig(config.id); showToast('✅ 配置已删除'); loadCrawlConfigs() }
  catch (e) { ElMessage.error('删除配置失败') }
}
async function handleToggleEnabled(config) {
  try { await updateCrawlConfig({ id: config.id, siteName: config.siteName, keyword: config.keyword, intervalMinutes: config.intervalMinutes, maxResults: config.maxResults, enabled: config.enabled }); showToast(config.enabled ? '✅ 已启用' : '⏸️ 已禁用') }
  catch (e) { config.enabled = config.enabled === 1 ? 0 : 1; ElMessage.error('更新状态失败') }
}
async function handleTriggerSingle(config) {
  config._triggering = true
  try { await triggerCrawl(config.id); showToast('⚡ 爬取任务已触发') }
  catch (e) { ElMessage.error('触发爬取失败') } finally { config._triggering = false }
}
async function handleTriggerAll() { try { await triggerAllCrawl(); showToast('⚡ 全部爬取任务已触发') } catch (e) { ElMessage.error('触发全部失败') } }
onMounted(() => { loadCrawlConfigs() })
</script>


<style>
@import './common.css';
</style>
