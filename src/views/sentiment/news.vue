<template>
  <div class="sentiment-page">
    <div class="page-section">
      <!-- 平台筛选 - 独立行 -->
      <div class="filter-bar">
        <span class="filter-bar-label">来源：</span>
        <div class="filter-pills">
          <span class="filter-pill" :class="{ active: newsSelectedSources.size === 0 }" @click="handleNewsFilter('all')">全部来源</span>
          <span v-for="p in allPlatforms" :key="p.platform_name" class="filter-pill" :class="{ active: newsSelectedSources.has(p.platform_name) }" @click="handleNewsFilter(p.platform_name)">{{ p.icon }} {{ p.display_name || p.platform_name }}</span>
        </div>
      </div>
      <!-- 搜索行 -->
      <div class="top-bar">
        <div class="search-box"><input v-model="newsSearch" type="text" placeholder="搜索文章标题、关键词、内容..." /><span class="search-icon">🔍</span></div>
        <button class="btn btn-outline btn-sm" @click="exportPressCSV">📤 导出CSV</button>
      </div>
      <div class="card">
        <div class="card-header">
          <span class="card-title"><span class="dot dot-green"></span>新闻资讯文章列表</span>
          <span class="count-indicator">共 {{ newsTotal }} 条{{ newsSelectedSources.size > 0 ? ' (已筛选)' : '' }}</span>
        </div>
        <div class="table-wrapper">
          <table v-if="filteredNewsList.length > 0">
            <thead><tr><th>封面</th><th>来源</th><th>标题</th><th>日期</th><th>关键词</th><th>操作</th></tr></thead>
            <tbody>
              <tr v-for="article in filteredNewsList" :key="article.id" class="post-row" @click="viewNewsDetail(article)">
                <td>
                  <div v-if="article.coverImage" class="news-cover-thumb" @click.stop>
                    <img :src="getCoverUrl(article.coverImage)" :alt="article.title" @error="e => e.target.style.display='none'" />
                  </div>
                  <span v-else class="no-cover-icon">📰</span>
                </td>
                <td><span class="source-badge source-press">{{ article.source }}</span></td>
                <td><span class="post-title-link" :title="article.title">{{ article.title }}</span></td>
                <td style="font-size:12px;white-space:nowrap;">{{ article.publishDate }}</td>
                <td><span v-for="kw in parseKeywords(article.keywords)" :key="kw" class="keyword-tag">{{ kw }}</span></td>
                <td><button class="btn btn-outline btn-sm" @click.stop="viewNewsDetail(article)">详情</button></td>
              </tr>
            </tbody>
          </table>
          <div v-else class="empty-state"><div class="icon">📭</div><p>没有匹配的文章</p></div>
        </div>
        <div class="pagination-wrapper">
          <el-pagination v-model:current-page="newsQuery.pageNum" v-model:page-size="newsQuery.pageSize" :page-sizes="[10, 20, 50, 100]" :total="newsTotal" layout="total, sizes, prev, pager, next, jumper" @size-change="loadNews" @current-change="loadNews" />
        </div>
      </div>
    </div>
    <div class="modal-overlay" v-if="showModal" @click.self="closeModal">
      <div class="modal" @click.stop>
        <button class="modal-close" @click="closeModal">✕</button>
        <div v-if="currentNews">
          <div v-if="currentNews.coverImage" class="modal-cover-image">
            <img :src="getCoverUrl(currentNews.coverImage)" :alt="currentNews.title" @error="e => e.target.parentElement.style.display='none'" />
          </div>
          <h2>📰 {{ currentNews.title }}</h2>
          <div class="meta-row"><span>📅 {{ currentNews.publishDate }}</span><span>🏢 {{ currentNews.source }}</span></div>
          <div style="margin:10px 0;"><span v-for="kw in parseKeywords(currentNews.keywords)" :key="kw" class="keyword-tag">{{ kw }}</span></div>
          <div class="modal-content-block"><div class="content-text" v-html="formatContent(currentNews.content)"></div></div>
          <p style="font-size:11px;color:#999;margin-top:10px;" v-if="currentNews.url">原文链接：<a :href="currentNews.url" target="_blank" style="color: var(--primary);">{{ currentNews.url }}</a></p>
        </div>
      </div>
    </div>
    <div v-if="toastVisible" class="toast">{{ toastMessage }}</div>
  </div>
</template>
<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { listNews } from '@/api/sentiment/news'
import { parseKeywords, formatContent } from './utils'
import request from '@/utils/request'

const newsList = ref([]); const newsTotal = ref(0); const newsLoading = ref(false)
const newsSearch = ref(''); const newsSelectedSources = ref(new Set())
const newsQuery = reactive({ pageNum: 1, pageSize: 20, searchValue: '' })
const allPlatforms = ref([])
const showModal = ref(false); const currentNews = ref(null)
const toastVisible = ref(false); const toastMessage = ref(''); let toastTimeout = null

function getCoverUrl(img) {
  if (!img) return ''
  if (img.includes('sentiment/images/')) {
    const filename = img.split('/').pop()
    return '/system/sentiment/image/file/' + filename
  }
  return img
}

const filteredNewsList = computed(() => newsSelectedSources.value.size === 0 ? newsList.value : newsList.value.filter(a => newsSelectedSources.value.has(a.source)))
function showToast(msg) { toastMessage.value = msg; toastVisible.value = true; if (toastTimeout) clearTimeout(toastTimeout); toastTimeout = setTimeout(() => { toastVisible.value = false }, 2200) }
function handleNewsFilter(f) { if (f === 'all') { newsSelectedSources.value = new Set() } else { const s = new Set(newsSelectedSources.value); s.has(f) ? s.delete(f) : s.add(f); newsSelectedSources.value = s } }

async function loadPlatforms() {
  try {
    const res = await request({ url: '/system/sentiment/platform/listByCategory', method: 'get', params: { category: 'news' } })
    allPlatforms.value = res.data || []
  } catch (e) { console.error('加载平台列表失败:', e) }
}

async function loadNews() {
  newsLoading.value = true
  try { const p = { pageNum: newsQuery.pageNum, pageSize: newsQuery.pageSize }; if (newsSearch.value) p.searchValue = newsSearch.value
    const res = await listNews(p); newsList.value = res.rows || []; newsTotal.value = res.total || 0
  } catch (e) { ElMessage.error('加载报刊数据失败') } finally { newsLoading.value = false }
}
function viewNewsDetail(a) { currentNews.value = a; showModal.value = true; document.body.style.overflow = 'hidden' }
function closeModal() { showModal.value = false; document.body.style.overflow = '' }
function exportPressCSV() {
  let csv = '标题,URL,日期,关键词,内容,来源\n'
  newsList.value.forEach(a => { csv += `"${a.title||''}","${a.url||''}","${a.publishDate||''}","${a.keywords||''}","${(a.content||'').replace(/"/g,'""')}","${a.source||''}"\n` })
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }); const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = '报刊文章_' + new Date().toISOString().slice(0,10) + '.csv'; a.click()
  URL.revokeObjectURL(url); showToast('✅ 报刊数据已导出CSV！')
}
onMounted(() => { loadPlatforms(); loadNews() })
</script>

<style>
@import './common.css';

/* 筛选栏独立行 */
.filter-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding: 10px 16px;
  background: #fff;
  border-radius: 10px;
  box-shadow: var(--shadow);
  flex-wrap: wrap;
}
.filter-bar-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  white-space: nowrap;
}

/* News cover image thumbnail */
.news-cover-thumb {
  width: 56px;
  height: 40px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid #e8ecf1;
  flex-shrink: 0;
}
.news-cover-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.no-cover-icon {
  font-size: 20px;
  opacity: 0.4;
}
/* Modal cover image */
.modal-cover-image {
  margin-bottom: 16px;
  border-radius: 10px;
  overflow: hidden;
  max-height: 300px;
}
.modal-cover-image img {
  width: 100%;
  max-height: 300px;
  object-fit: cover;
  display: block;
  border-radius: 10px;
}
</style>
