<template>
  <div class="sentiment-page">
    <div class="page-section">
      <!-- 平台筛选 - 独立行 -->
      <div class="filter-bar">
        <span class="filter-bar-label">平台：</span>
        <div class="filter-pills">
          <span class="filter-pill" :class="{ active: postFilterActive === 'all' }" @click="handlePostFilter('all')">全部</span>
          <span v-for="p in allPlatforms" :key="p.platform_name" class="filter-pill" :class="{ active: postFilterActive === p.platform_name }" @click="handlePostFilter(p.platform_name)">{{ p.icon }} {{ p.display_name || p.platform_name }}</span>
        </div>
      </div>
      <!-- 搜索行 -->
      <div class="top-bar">
        <div class="search-box">
          <input v-model="postSearch" type="text" placeholder="搜索帖子标题、正文、作者..." />
          <span class="search-icon">🔍</span>
        </div>
        <button class="btn btn-outline btn-sm" @click="expandAllComments">📋 {{ allExpanded ? '折叠全部评论' : '展开全部评论' }}</button>
      </div>
      <div class="card">
        <div class="card-header">
          <span class="card-title"><span class="dot dot-blue"></span>社交媒体帖子列表</span>
          <span class="count-indicator">共 {{ postTotal }} 条</span>
        </div>
        <div class="table-wrapper">
          <table v-if="postList.length > 0">
            <thead><tr><th>网站</th><th>关键词</th><th>标题</th><th>作者</th><th>发布时间</th><th>点赞</th><th>评论数</th><th>操作</th></tr></thead>
            <tbody>
              <template v-for="post in postList" :key="post.uuid">
                <tr class="post-row" :class="{ 'row-expanded': expandedPosts.has(post.postId) }" @click="toggleCommentExpansion(post.postId)">
                  <td><span class="site-badge">{{ post.siteName }}</span></td>
                  <td><span v-for="kw in parseKeywords(post.triggerKeyword)" :key="kw" class="keyword-tag" style="font-size:11px;">{{ kw }}</span></td>
                  <td><span class="post-title-link" :title="post.title">{{ post.title }}</span></td>
                  <td>{{ post.author }}</td>
                  <td style="font-size:12px;white-space:nowrap;">{{ post.publishTime }}</td>
                  <td><strong>{{ formatNumber(post.likeCount) }}</strong></td>
                  <td>
                    <span :style="{ color: (post.commentCount || 0) > 3 ? '#e74c3c' : '#666', fontWeight: '600' }">{{ post.commentCount || 0 }}</span>
                    {{ expandedPosts.has(post.postId) ? '▲' : '▼' }}
                  </td>
                  <td><button class="btn btn-outline btn-sm" @click.stop="viewPostDetail(post)">详情</button></td>
                </tr>
                <tr v-if="expandedPosts.has(post.postId)" class="comment-row expanded">
                  <td colspan="8">
                    <div class="comment-inner">
                      <strong style="font-size:13px;">💬 评论 ({{ getPostComments(post.postId).length }}条)</strong>
                      <div v-if="commentLoadingMap[post.postId]" style="padding:12px;color:#aaa;font-size:12px;">加载中...</div>
                      <div v-for="comment in getPostComments(post.postId)" :key="comment.commentId || comment.id" class="comment-item">
                        <strong>{{ comment.commenter }}</strong>: {{ comment.commentContent }}
                        <div class="comment-meta">👍 {{ comment.likeCount || 0 }} · {{ comment.commentTime }}</div>
                      </div>
                      <p v-if="!commentLoadingMap[post.postId] && getPostComments(post.postId).length === 0" style="color:#aaa;font-size:12px;">暂无评论</p>
                    </div>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
          <div v-else class="empty-state"><div class="icon">🔍</div><p>暂无帖子数据</p></div>
        </div>
        <div class="pagination-wrapper">
          <el-pagination v-model:current-page="postQuery.pageNum" v-model:page-size="postQuery.pageSize" :page-sizes="[10, 20, 50, 100]" :total="postTotal" layout="total, sizes, prev, pager, next, jumper" @size-change="loadPosts" @current-change="loadPosts" />
        </div>
      </div>
    </div>
    <!-- Post Detail Modal -->
    <div class="modal-overlay" v-if="showModal" @click.self="closeModal">
      <div class="modal" @click.stop>
        <button class="modal-close" @click="closeModal">✕</button>
        <div v-if="currentPost">
          <h2>📝 {{ currentPost.title }}</h2>
          <div class="meta-row">
            <span>👤 {{ currentPost.author }}</span><span>🕐 {{ currentPost.publishTime }}</span>
            <span>📍 {{ currentPost.siteName }} · {{ currentPost.sourceBoard }}</span>
            <span>👍 {{ formatNumber(currentPost.likeCount) }}</span><span>💬 {{ postDetailComments.length }}条评论</span>
          </div>
          <div style="margin:12px 0;"><span v-for="kw in parseKeywords(currentPost.triggerKeyword)" :key="kw" class="keyword-tag">{{ kw }}</span></div>
          <div v-if="postImagesLoading" style="margin:12px 0;color:#aaa;font-size:12px;">加载图片中...</div>
          <div v-if="postImages.length > 0" class="post-images-grid">
            <div v-for="(img, idx) in postImages" :key="idx" class="post-image-item"><img :src="getImageUrl(img)" :alt="'图片 ' + (idx + 1)" @click="window.open(getImageUrl(img), '_blank')" /></div>
          </div>
          <div class="modal-content-block"><div class="content-text" v-html="formatContent(currentPost.content)"></div></div>
          <p style="font-size:11px;color:#999;" v-if="currentPost.originalUrl">原帖链接：<a :href="currentPost.originalUrl" target="_blank" style="color: var(--primary);">{{ currentPost.originalUrl }}</a></p>
          <hr style="margin:16px 0;" />
          <h4>💬 评论 ({{ postDetailComments.length }}条)</h4>
          <div v-if="postDetailComments.length === 0" style="color:#aaa;">暂无评论</div>
          <div v-else class="comments-list">
            <div v-for="comment in postDetailComments" :key="comment.commentId || comment.id" class="comment-item">
              <strong>{{ comment.commenter }}</strong>: {{ comment.commentContent }}
              <div class="comment-meta">👍 {{ comment.likeCount || 0 }} · {{ comment.commentTime }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-if="toastVisible" class="toast">{{ toastMessage }}</div>
  </div>
</template>
<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { listPost } from '@/api/sentiment/post'
import { listCommentByPost } from '@/api/sentiment/comment'
import { listImagesByPost } from '@/api/sentiment/image'
import { parseKeywords, formatNumber, formatContent, getImageUrl } from './utils'
import request from '@/utils/request'

const postList = ref([])
const postTotal = ref(0)
const postLoading = ref(false)
const postSearch = ref('')
const postFilterActive = ref('all')
const postQuery = reactive({ pageNum: 1, pageSize: 20, searchValue: '' })
const allPlatforms = ref([])
const expandedPosts = ref(new Set())
const commentsMap = ref({})
const commentLoadingMap = ref({})
const showModal = ref(false)
const currentPost = ref(null)
const postDetailComments = ref([])
const postImages = ref([])
const postImagesLoading = ref(false)
const toastVisible = ref(false)
const toastMessage = ref('')
let toastTimeout = null

function handlePostFilter(siteName) {
  postFilterActive.value = siteName
  postQuery.pageNum = 1
  loadPosts()
}
const allExpanded = computed(() => postList.value.length > 0 && postList.value.every(p => expandedPosts.value.has(p.postId)))

function showToast(msg) { toastMessage.value = msg; toastVisible.value = true; if (toastTimeout) clearTimeout(toastTimeout); toastTimeout = setTimeout(() => { toastVisible.value = false }, 2200) }

async function loadPlatforms() {
  try {
    const res = await request({ url: '/system/sentiment/platform/listByCategory', method: 'get', params: { category: 'social' } })
    allPlatforms.value = res.data || []
  } catch (e) { console.error('加载平台列表失败:', e) }
}

async function loadPosts() {
  postLoading.value = true
  try {
    const params = { pageNum: postQuery.pageNum, pageSize: postQuery.pageSize }
    if (postSearch.value) params.searchValue = postSearch.value
    if (postFilterActive.value !== 'all') params.siteName = postFilterActive.value
    const res = await listPost(params); postList.value = res.rows || []; postTotal.value = res.total || 0
  } catch (e) { console.error('加载帖子失败:', e); ElMessage.error('加载社交媒体数据失败') }
  finally { postLoading.value = false }
}
async function loadComments(postId) {
  if (commentsMap.value[postId] || commentLoadingMap.value[postId]) return
  commentLoadingMap.value[postId] = true
  try { const res = await listCommentByPost(postId); commentsMap.value[postId] = res.data || [] }
  catch (e) { commentsMap.value[postId] = [] }
  finally { commentLoadingMap.value[postId] = false }
}
function toggleCommentExpansion(postId) {
  if (expandedPosts.value.has(postId)) { expandedPosts.value.delete(postId); expandedPosts.value = new Set(expandedPosts.value) }
  else { expandedPosts.value.add(postId); expandedPosts.value = new Set(expandedPosts.value); loadComments(postId) }
}
function getPostComments(postId) { return commentsMap.value[postId] || [] }
function expandAllComments() {
  const ids = postList.value.map(p => p.postId)
  if (ids.every(id => expandedPosts.value.has(id))) { expandedPosts.value = new Set(); showToast('已折叠全部评论') }
  else { expandedPosts.value = new Set(ids); ids.forEach(id => loadComments(id)); showToast('已展开全部评论') }
}
async function viewPostDetail(row) {
  currentPost.value = row; showModal.value = true; postImages.value = []; postImagesLoading.value = true
  document.body.style.overflow = 'hidden'
  await loadComments(row.postId); postDetailComments.value = commentsMap.value[row.postId] || []
  try { const res = await listImagesByPost(row.postId); postImages.value = res.data || [] }
  catch (e) { postImages.value = [] }
  finally { postImagesLoading.value = false }
}
function closeModal() { showModal.value = false; document.body.style.overflow = '' }

onMounted(() => { loadPlatforms(); loadPosts() })
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
</style>
