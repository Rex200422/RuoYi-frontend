     1|<template>
     2|  <div class="sentiment-page">
     3|    <div class="page-section">
     4|      <div class="top-bar">
     5|        <div class="search-box"><input v-model="newsSearch" type="text" placeholder="搜索报刊文章标题、关键词、内容..." /><span class="search-icon">🔍</span></div>
     6|        <div class="filter-pills">
     7|          <span class="filter-pill" :class="{ active: newsSelectedSources.size === 0 }" @click="handleNewsFilter('all')">全部来源</span>
     8|          <span v-for="src in newsSourceFilters" :key="src" class="filter-pill" :class="{ active: newsSelectedSources.has(src) }" @click="handleNewsFilter(src)">{{ src }}</span>
     9|        </div>
    10|        <button class="btn btn-outline btn-sm" @click="exportPressCSV">📤 导出CSV</button>
    11|      </div>
    12|      <div class="card">
    13|        <div class="card-header">
    14|          <span class="card-title"><span class="dot dot-green"></span>新闻资讯文章列表</span>
    15|          <span class="count-indicator">共 {{ filteredNewsTotal }} 条{{ newsSelectedSources.size > 0 ? ' (已筛选)' : '' }}</span>
    16|        </div>
    17|        <div class="table-wrapper">
    18|          <table v-if="filteredNewsList.length > 0">
    19|            <thead><tr><th>来源</th><th>标题</th><th>日期</th><th>关键词</th><th>操作</th></tr></thead>
    20|            <tbody>
    21|              <tr v-for="article in filteredNewsList" :key="article.id" class="post-row" @click="viewNewsDetail(article)">
    22|                <td><span class="source-badge source-press">{{ article.source }}</span></td>
    23|                <td><span class="post-title-link" :title="article.title">{{ article.title }}</span></td>
    24|                <td style="font-size:12px;white-space:nowrap;">{{ article.publishDate }}</td>
    25|                <td><span v-for="kw in parseKeywords(article.keywords)" :key="kw" class="keyword-tag">{{ kw }}</span></td>
    26|                <td><button class="btn btn-outline btn-sm" @click.stop="viewNewsDetail(article)">详情</button></td>
    27|              </tr>
    28|            </tbody>
    29|          </table>
    30|          <div v-else class="empty-state"><div class="icon">📭</div><p>没有匹配的文章</p></div>
    31|        </div>
    32|        <div class="pagination-wrapper">
    33|          <el-pagination v-model:current-page="newsQuery.pageNum" v-model:page-size="newsQuery.pageSize" :page-sizes="[10, 20, 50, 100]" :total="newsTotal" layout="total, sizes, prev, pager, next, jumper" @size-change="loadNews" @current-change="loadNews" />
    34|        </div>
    35|      </div>
    36|    </div>
    37|    <div class="modal-overlay" v-if="showModal" @click.self="closeModal">
    38|      <div class="modal" @click.stop>
    39|        <button class="modal-close" @click="closeModal">✕</button>
    40|        <div v-if="currentNews">
    41|          <h2>📰 {{ currentNews.title }}</h2>
    42|          <div class="meta-row"><span>📅 {{ currentNews.publishDate }}</span><span>🏢 {{ currentNews.source }}</span></div>
    43|          <div style="margin:10px 0;"><span v-for="kw in parseKeywords(currentNews.keywords)" :key="kw" class="keyword-tag">{{ kw }}</span></div>
    44|          <div class="modal-content-block"><div class="content-text" v-html="formatContent(currentNews.content)"></div></div>
    45|          <p style="font-size:11px;color:#999;margin-top:10px;" v-if="currentNews.url">原文链接：<a :href="currentNews.url" target="_blank" style="color: var(--primary);">{{ currentNews.url }}</a></p>
    46|        </div>
    47|      </div>
    48|    </div>
    49|    <div v-if="toastVisible" class="toast">{{ toastMessage }}</div>
    50|  </div>
    51|</template>
    52|<script setup>
    53|import { ref, reactive, computed, onMounted } from 'vue'
    54|import { ElMessage } from 'element-plus'
    55|import { listNews } from '@/api/sentiment/news'
    56|import { parseKeywords, formatContent } from './utils'
    57|const newsList = ref([]); const newsTotal = ref(0); const newsLoading = ref(false)
    58|const newsSearch = ref(''); const newsSelectedSources = ref(new Set())
    59|const newsQuery = reactive({ pageNum: 1, pageSize: 20, searchValue: '' }); const newsSourceFilters = ref([])
    60|const showModal = ref(false); const currentNews = ref(null)
    61|const toastVisible = ref(false); const toastMessage = ref(''); let toastTimeout = null
    62|const filteredNewsList = computed(() => newsSelectedSources.value.size === 0 ? newsList.value : newsList.value.filter(a => newsSelectedSources.value.has(a.source)))
    63|const filteredNewsTotal = computed(() => filteredNewsList.value.length)
    64|function showToast(msg) { toastMessage.value = msg; toastVisible.value = true; if (toastTimeout) clearTimeout(toastTimeout); toastTimeout = setTimeout(() => { toastVisible.value = false }, 2200) }
    65|function handleNewsFilter(f) { if (f === 'all') { newsSelectedSources.value = new Set() } else { const s = new Set(newsSelectedSources.value); s.has(f) ? s.delete(f) : s.add(f); newsSelectedSources.value = s } }
    66|async function loadNews() {
    67|  newsLoading.value = true
    68|  try { const p = { pageNum: newsQuery.pageNum, pageSize: newsQuery.pageSize }; if (newsSearch.value) p.searchValue = newsSearch.value
    69|    const res = await listNews(p); newsList.value = res.rows || []; newsTotal.value = res.total || 0
    70|    const ss = new Set(); newsList.value.forEach(a => { if (a.source) ss.add(a.source) }); newsSourceFilters.value = Array.from(ss)
    71|  } catch (e) { ElMessage.error('加载报刊数据失败') } finally { newsLoading.value = false }
    72|}
    73|function viewNewsDetail(a) { currentNews.value = a; showModal.value = true; document.body.style.overflow = 'hidden' }
    74|function closeModal() { showModal.value = false; document.body.style.overflow = '' }
    75|function exportPressCSV() {
    76|  let csv = '标题,URL,日期,关键词,内容,来源\n'
    77|  newsList.value.forEach(a => { csv += `"${a.title||''}","${a.url||''}","${a.publishDate||''}","${a.keywords||''}","${(a.content||'').replace(/"/g,'""')}","${a.source||''}"\n` })
    78|  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }); const url = URL.createObjectURL(blob)
    79|  const a = document.createElement('a'); a.href = url; a.download = '报刊文章_' + new Date().toISOString().slice(0,10) + '.csv'; a.click()
    80|  URL.revokeObjectURL(url); showToast('✅ 报刊数据已导出CSV！')
    81|}
    82|onMounted(() => { loadNews() })
    83|</script>
    84|

<style>
@import './common.css';
</style>
