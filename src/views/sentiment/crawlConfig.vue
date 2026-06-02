     1|<template>
     2|  <div class="sentiment-page">
     3|    <div class="page-section">
     4|      <div class="top-bar">
     5|        <div class="search-box"><input v-model="crawlConfigSearch" type="text" placeholder="搜索站点名称、关键词..." /><span class="search-icon">🔍</span></div>
     6|        <button class="btn btn-outline btn-sm" @click="loadCrawlConfigs">🔄 刷新</button>
     7|        <button class="btn btn-outline btn-sm" @click="handleTriggerAll" :disabled="crawlConfigsLoading">⚡ 触发全部</button>
     8|        <button class="btn btn-primary btn-sm" @click="openConfigForm()">➕ 新增配置</button>
     9|      </div>
    10|      <div class="card">
    11|        <div class="card-header"><span class="card-title"><span class="dot dot-blue"></span>爬取任务配置</span><span class="count-indicator">共 {{ crawlConfigTotal }} 条</span></div>
    12|        <div class="table-wrapper">
    13|          <table v-if="filteredCrawlConfigs.length > 0">
    14|            <thead><tr><th>站点名称</th><th>关键词</th><th>爬取间隔</th><th>最大结果数</th><th>上次爬取时间</th><th>状态</th><th>操作</th></tr></thead>
    15|            <tbody>
    16|              <tr v-for="config in filteredCrawlConfigs" :key="config.id">
    17|                <td><span class="site-badge">{{ config.siteName }}</span></td>
    18|                <td><span v-for="kw in parseKeywords(config.keyword)" :key="kw" class="keyword-tag">{{ kw }}</span></td>
    19|                <td style="white-space:nowrap;">{{ formatInterval(config.intervalMinutes) }}</td>
    20|                <td>{{ config.maxResults }}</td>
    21|                <td style="font-size:12px;white-space:nowrap;">{{ config.lastCrawlTime || '—' }}</td>
    22|                <td><el-switch v-model="config.enabled" :active-value="1" :inactive-value="0" @change="handleToggleEnabled(config)" size="small" /></td>
    23|                <td><div class="action-btns">
    24|                  <button class="btn btn-outline btn-sm" @click="openConfigForm(config)">编辑</button>
    25|                  <button class="btn btn-outline btn-sm" @click="handleTriggerSingle(config)" :disabled="config._triggering">触发</button>
    26|                  <button class="btn btn-outline btn-sm" style="color:var(--danger);border-color:var(--danger);" @click="handleDeleteConfig(config)">删除</button>
    27|                </div></td>
    28|              </tr>
    29|            </tbody>
    30|          </table>
    31|          <div v-else class="empty-state"><div class="icon">⚙️</div><p>暂无爬取配置</p></div>
    32|        </div>
    33|        <div class="pagination-wrapper">
    34|          <el-pagination v-model:current-page="crawlConfigQuery.pageNum" v-model:page-size="crawlConfigQuery.pageSize" :page-sizes="[10, 20, 50]" :total="crawlConfigTotal" layout="total, sizes, prev, pager, next, jumper" @size-change="loadCrawlConfigs" @current-change="loadCrawlConfigs" />
    35|        </div>
    36|      </div>
    37|    </div>
    38|    <div class="modal-overlay" v-if="showConfigForm" @click.self="closeConfigForm">
    39|      <div class="modal" style="max-width:500px;" @click.stop>
    40|        <button class="modal-close" @click="closeConfigForm">✕</button>
    41|        <h2>⚙️ {{ configForm.id ? '编辑配置' : '新增配置' }}</h2>
    42|        <div style="margin-top:16px;">
    43|          <div class="form-group"><label class="form-label">站点名称</label><input v-model="configForm.siteName" class="form-input" placeholder="例如：微博、知乎、贴吧" /></div>
    44|          <div class="form-group"><label class="form-label">关键词</label><input v-model="configForm.keyword" class="form-input" placeholder="多个关键词用逗号分隔" /></div>
    45|          <div class="form-group"><label class="form-label">爬取间隔（分钟）</label><input v-model.number="configForm.intervalMinutes" type="number" class="form-input" min="1" /></div>
    46|          <div class="form-group"><label class="form-label">最大结果数</label><input v-model.number="configForm.maxResults" type="number" class="form-input" min="1" /></div>
    47|          <div class="form-group" style="display:flex;align-items:center;gap:12px;"><label class="form-label" style="margin:0;">启用状态</label><el-switch v-model="configForm.enabled" :active-value="1" :inactive-value="0" /></div>
    48|        </div>
    49|        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:24px;">
    50|          <button class="btn btn-outline" @click="closeConfigForm">取消</button>
    51|          <button class="btn btn-primary" @click="submitConfigForm" :disabled="configFormSubmitting">{{ configFormSubmitting ? '提交中...' : '确认提交' }}</button>
    52|        </div>
    53|      </div>
    54|    </div>
    55|    <div v-if="toastVisible" class="toast">{{ toastMessage }}</div>
    56|  </div>
    57|</template>
    58|<script setup>
    59|import { ref, reactive, computed, onMounted } from 'vue'
    60|import { ElMessage } from 'element-plus'
    61|import { listCrawlConfig, addCrawlConfig, updateCrawlConfig, delCrawlConfig, triggerCrawl, triggerAllCrawl } from '@/api/sentiment/crawl'
    62|import { parseKeywords, formatInterval } from './utils'
    63|const crawlConfigs = ref([]); const crawlConfigTotal = ref(0); const crawlConfigsLoading = ref(false)
    64|const crawlConfigSearch = ref(''); const crawlConfigQuery = reactive({ pageNum: 1, pageSize: 20 })
    65|const showConfigForm = ref(false); const configFormSubmitting = ref(false)
    66|const configForm = reactive({ id: null, siteName: '', keyword: '', intervalMinutes: 60, maxResults: 100, enabled: 1 })
    67|const toastVisible = ref(false); const toastMessage = ref(''); let toastTimeout = null
    68|const filteredCrawlConfigs = computed(() => {
    69|  if (!crawlConfigSearch.value) return crawlConfigs.value
    70|  const s = crawlConfigSearch.value.toLowerCase()
    71|  return crawlConfigs.value.filter(c => (c.siteName && c.siteName.toLowerCase().includes(s)) || (c.keyword && c.keyword.toLowerCase().includes(s)))
    72|})
    73|function showToast(msg) { toastMessage.value = msg; toastVisible.value = true; if (toastTimeout) clearTimeout(toastTimeout); toastTimeout = setTimeout(() => { toastVisible.value = false }, 2200) }
    74|async function loadCrawlConfigs() {
    75|  crawlConfigsLoading.value = true
    76|  try { const res = await listCrawlConfig({ pageNum: crawlConfigQuery.pageNum, pageSize: crawlConfigQuery.pageSize }); crawlConfigs.value = (res.rows || []).map(c => ({ ...c, _triggering: false })); crawlConfigTotal.value = res.total || 0 }
    77|  catch (e) { ElMessage.error('加载爬取配置失败') } finally { crawlConfigsLoading.value = false }
    78|}
    79|function openConfigForm(config) {
    80|  if (config) Object.assign(configForm, { id: config.id, siteName: config.siteName, keyword: config.keyword, intervalMinutes: config.intervalMinutes, maxResults: config.maxResults, enabled: config.enabled })
    81|  else Object.assign(configForm, { id: null, siteName: '', keyword: '', intervalMinutes: 60, maxResults: 100, enabled: 1 })
    82|  showConfigForm.value = true; document.body.style.overflow = 'hidden'
    83|}
    84|function closeConfigForm() { showConfigForm.value = false; document.body.style.overflow = '' }
    85|async function submitConfigForm() {
    86|  if (!configForm.siteName || !configForm.keyword) { ElMessage.warning('请填写站点名称和关键词'); return }
    87|  configFormSubmitting.value = true
    88|  try {
    89|    const data = { siteName: configForm.siteName, keyword: configForm.keyword, intervalMinutes: configForm.intervalMinutes, maxResults: configForm.maxResults, enabled: configForm.enabled }
    90|    if (configForm.id) { data.id = configForm.id; await updateCrawlConfig(data); showToast('✅ 配置已更新') }
    91|    else { await addCrawlConfig(data); showToast('✅ 配置已新增') }
    92|    closeConfigForm(); loadCrawlConfigs()
    93|  } catch (e) { ElMessage.error('保存配置失败') } finally { configFormSubmitting.value = false }
    94|}
    95|async function handleDeleteConfig(config) {
    96|  if (!confirm('确定要删除该爬取配置？')) return
    97|  try { await delCrawlConfig(config.id); showToast('✅ 配置已删除'); loadCrawlConfigs() }
    98|  catch (e) { ElMessage.error('删除配置失败') }
    99|}
   100|async function handleToggleEnabled(config) {
   101|  try { await updateCrawlConfig({ id: config.id, siteName: config.siteName, keyword: config.keyword, intervalMinutes: config.intervalMinutes, maxResults: config.maxResults, enabled: config.enabled }); showToast(config.enabled ? '✅ 已启用' : '⏸️ 已禁用') }
   102|  catch (e) { config.enabled = config.enabled === 1 ? 0 : 1; ElMessage.error('更新状态失败') }
   103|}
   104|async function handleTriggerSingle(config) {
   105|  config._triggering = true
   106|  try { await triggerCrawl(config.id); showToast('⚡ 爬取任务已触发') }
   107|  catch (e) { ElMessage.error('触发爬取失败') } finally { config._triggering = false }
   108|}
   109|async function handleTriggerAll() { try { await triggerAllCrawl(); showToast('⚡ 全部爬取任务已触发') } catch (e) { ElMessage.error('触发全部失败') } }
   110|onMounted(() => { loadCrawlConfigs() })
   111|</script>
   112|

<style>
@import './common.css';
</style>
