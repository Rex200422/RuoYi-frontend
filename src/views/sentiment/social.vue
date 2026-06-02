     1|<template>
     2|  <div class="sentiment-page">
     3|    <div class="page-section">
     4|      <div class="top-bar">
     5|        <div class="search-box">
     6|          <input v-model="postSearch" type="text" placeholder="搜索帖子标题、正文、作者..." />
     7|          <span class="search-icon">🔍</span>
     8|        </div>
     9|        <div class="filter-pills">
    10|          <span class="filter-pill" :class="{ active: postFilterActive === 'all' }" @click="postFilterActive = 'all'">全部</span>
    11|          <span v-for="site in siteFilters" :key="site" class="filter-pill" :class="{ active: postFilterActive === site }" @click="postFilterActive = site">{{ site }}</span>
    12|        </div>
    13|        <button class="btn btn-outline btn-sm" @click="expandAllComments">📋 {{ allExpanded ? '折叠全部评论' : '展开全部评论' }}</button>
    14|      </div>
    15|      <div class="card">
    16|        <div class="card-header">
    17|          <span class="card-title"><span class="dot dot-blue"></span>社交媒体帖子列表</span>
    18|          <span class="count-indicator">共 {{ filteredPostTotal }} 条</span>
    19|        </div>
    20|        <div class="table-wrapper">
    21|          <table v-if="filteredPostList.length > 0">
    22|            <thead><tr><th>网站</th><th>关键词</th><th>标题</th><th>作者</th><th>发布时间</th><th>点赞</th><th>评论数</th><th>操作</th></tr></thead>
    23|            <tbody>
    24|              <template v-for="post in filteredPostList" :key="post.uuid">
    25|                <tr class="post-row" :class="{ 'row-expanded': expandedPosts.has(post.postId) }" @click="toggleCommentExpansion(post.postId)">
    26|                  <td><span class="site-badge">{{ post.siteName }}</span></td>
    27|                  <td><span v-for="kw in parseKeywords(post.triggerKeyword)" :key="kw" class="keyword-tag" style="font-size:11px;">{{ kw }}</span></td>
    28|                  <td><span class="post-title-link" :title="post.title">{{ post.title }}</span></td>
    29|                  <td>{{ post.author }}</td>
    30|                  <td style="font-size:12px;white-space:nowrap;">{{ post.publishTime }}</td>
    31|                  <td><strong>{{ formatNumber(post.likeCount) }}</strong></td>
    32|                  <td>
    33|                    <span :style="{ color: (post.commentCount || 0) > 3 ? '#e74c3c' : '#666', fontWeight: '600' }">{{ post.commentCount || 0 }}</span>
    34|                    {{ expandedPosts.has(post.postId) ? '▲' : '▼' }}
    35|                  </td>
    36|                  <td><button class="btn btn-outline btn-sm" @click.stop="viewPostDetail(post)">详情</button></td>
    37|                </tr>
    38|                <tr v-if="expandedPosts.has(post.postId)" class="comment-row expanded">
    39|                  <td colspan="8">
    40|                    <div class="comment-inner">
    41|                      <strong style="font-size:13px;">💬 评论 ({{ getPostComments(post.postId).length }}条)</strong>
    42|                      <div v-if="commentLoadingMap[post.postId]" style="padding:12px;color:#aaa;font-size:12px;">加载中...</div>
    43|                      <div v-for="comment in getPostComments(post.postId)" :key="comment.commentId || comment.id" class="comment-item">
    44|                        <strong>{{ comment.commenter }}</strong>: {{ comment.commentContent }}
    45|                        <div class="comment-meta">👍 {{ comment.likeCount || 0 }} · {{ comment.commentTime }}</div>
    46|                      </div>
    47|                      <p v-if="!commentLoadingMap[post.postId] && getPostComments(post.postId).length === 0" style="color:#aaa;font-size:12px;">暂无评论</p>
    48|                    </div>
    49|                  </td>
    50|                </tr>
    51|              </template>
    52|            </tbody>
    53|          </table>
    54|          <div v-else class="empty-state"><div class="icon">🔍</div><p>没有匹配的帖子</p></div>
    55|        </div>
    56|        <div class="pagination-wrapper">
    57|          <el-pagination v-model:current-page="postQuery.pageNum" v-model:page-size="postQuery.pageSize" :page-sizes="[10, 20, 50, 100]" :total="postTotal" layout="total, sizes, prev, pager, next, jumper" @size-change="loadPosts" @current-change="loadPosts" />
    58|        </div>
    59|      </div>
    60|    </div>
    61|    <!-- Post Detail Modal -->
    62|    <div class="modal-overlay" v-if="showModal" @click.self="closeModal">
    63|      <div class="modal" @click.stop>
    64|        <button class="modal-close" @click="closeModal">✕</button>
    65|        <div v-if="currentPost">
    66|          <h2>📝 {{ currentPost.title }}</h2>
    67|          <div class="meta-row">
    68|            <span>👤 {{ currentPost.author }}</span><span>🕐 {{ currentPost.publishTime }}</span>
    69|            <span>📍 {{ currentPost.siteName }} · {{ currentPost.sourceBoard }}</span>
    70|            <span>👍 {{ formatNumber(currentPost.likeCount) }}</span><span>💬 {{ postDetailComments.length }}条评论</span>
    71|          </div>
    72|          <div style="margin:12px 0;"><span v-for="kw in parseKeywords(currentPost.triggerKeyword)" :key="kw" class="keyword-tag">{{ kw }}</span></div>
    73|          <div v-if="postImagesLoading" style="margin:12px 0;color:#aaa;font-size:12px;">加载图片中...</div>
    74|          <div v-if="postImages.length > 0" class="post-images-grid">
    75|            <div v-for="(img, idx) in postImages" :key="idx" class="post-image-item"><img :src="getImageUrl(img)" :alt="'图片 ' + (idx + 1)" @click="window.open(getImageUrl(img), '_blank')" /></div>
    76|          </div>
    77|          <div class="modal-content-block"><div class="content-text" v-html="formatContent(currentPost.content)"></div></div>
    78|          <p style="font-size:11px;color:#999;" v-if="currentPost.originalUrl">原帖链接：<a :href="currentPost.originalUrl" target="_blank" style="color: var(--primary);">{{ currentPost.originalUrl }}</a></p>
    79|          <hr style="margin:16px 0;" />
    80|          <h4>💬 评论 ({{ postDetailComments.length }}条)</h4>
    81|          <div v-if="postDetailComments.length === 0" style="color:#aaa;">暂无评论</div>
    82|          <div v-else class="comments-list">
    83|            <div v-for="comment in postDetailComments" :key="comment.commentId || comment.id" class="comment-item">
    84|              <strong>{{ comment.commenter }}</strong>: {{ comment.commentContent }}
    85|              <div class="comment-meta">👍 {{ comment.likeCount || 0 }} · {{ comment.commentTime }}</div>
    86|            </div>
    87|          </div>
    88|        </div>
    89|      </div>
    90|    </div>
    91|    <div v-if="toastVisible" class="toast">{{ toastMessage }}</div>
    92|  </div>
    93|</template>
    94|
    95|<script setup>
    96|import { ref, reactive, computed, onMounted } from 'vue'
    97|import { ElMessage } from 'element-plus'
    98|import { listPost } from '@/api/sentiment/post'
    99|import { listCommentByPost } from '@/api/sentiment/comment'
   100|import { listImagesByPost } from '@/api/sentiment/image'
   101|import { parseKeywords, formatNumber, formatContent, getImageUrl } from './utils'
   102|
   103|const postList = ref([])
   104|const postTotal = ref(0)
   105|const postLoading = ref(false)
   106|const postSearch = ref('')
   107|const postFilterActive = ref('all')
   108|const postQuery = reactive({ pageNum: 1, pageSize: 20, searchValue: '' })
   109|const siteFilters = ref([])
   110|const expandedPosts = ref(new Set())
   111|const commentsMap = ref({})
   112|const commentLoadingMap = ref({})
   113|const showModal = ref(false)
   114|const currentPost = ref(null)
   115|const postDetailComments = ref([])
   116|const postImages = ref([])
   117|const postImagesLoading = ref(false)
   118|const toastVisible = ref(false)
   119|const toastMessage = ref('')
   120|let toastTimeout = null
   121|
   122|const filteredPostList = computed(() => {
   123|  let list = postList.value
   124|  if (postFilterActive.value !== 'all') list = list.filter(p => p.siteName === postFilterActive.value)
   125|  return list
   126|})
   127|const filteredPostTotal = computed(() => filteredPostList.value.length)
   128|const allExpanded = computed(() => filteredPostList.value.length > 0 && filteredPostList.value.every(p => expandedPosts.value.has(p.postId)))
   129|
   130|function showToast(msg) { toastMessage.value = msg; toastVisible.value = true; if (toastTimeout) clearTimeout(toastTimeout); toastTimeout = setTimeout(() => { toastVisible.value = false }, 2200) }
   131|async function loadPosts() {
   132|  postLoading.value = true
   133|  try {
   134|    const params = { pageNum: postQuery.pageNum, pageSize: postQuery.pageSize }
   135|    if (postSearch.value) params.searchValue = postSearch.value
   136|    const res = await listPost(params); postList.value = res.rows || []; postTotal.value = res.total || 0
   137|    const siteSet = new Set(); postList.value.forEach(p => { if (p.siteName) siteSet.add(p.siteName) }); siteFilters.value = Array.from(siteSet)
   138|  } catch (e) { console.error('加载帖子失败:', e); ElMessage.error('加载社交媒体数据失败') }
   139|  finally { postLoading.value = false }
   140|}
   141|async function loadComments(postId) {
   142|  if (commentsMap.value[postId] || commentLoadingMap.value[postId]) return
   143|  commentLoadingMap.value[postId] = true
   144|  try { const res = await listCommentByPost(postId); commentsMap.value[postId] = res.data || [] }
   145|  catch (e) { commentsMap.value[postId] = [] }
   146|  finally { commentLoadingMap.value[postId] = false }
   147|}
   148|function toggleCommentExpansion(postId) {
   149|  if (expandedPosts.value.has(postId)) { expandedPosts.value.delete(postId); expandedPosts.value = new Set(expandedPosts.value) }
   150|  else { expandedPosts.value.add(postId); expandedPosts.value = new Set(expandedPosts.value); loadComments(postId) }
   151|}
   152|function getPostComments(postId) { return commentsMap.value[postId] || [] }
   153|function expandAllComments() {
   154|  const ids = filteredPostList.value.map(p => p.postId)
   155|  if (ids.every(id => expandedPosts.value.has(id))) { expandedPosts.value = new Set(); showToast('已折叠全部评论') }
   156|  else { expandedPosts.value = new Set(ids); ids.forEach(id => loadComments(id)); showToast('已展开全部评论') }
   157|}
   158|async function viewPostDetail(row) {
   159|  currentPost.value = row; showModal.value = true; postImages.value = []; postImagesLoading.value = true
   160|  document.body.style.overflow = 'hidden'
   161|  await loadComments(row.postId); postDetailComments.value = commentsMap.value[row.postId] || []
   162|  try { const res = await listImagesByPost(row.postId); postImages.value = res.data || [] }
   163|  catch (e) { postImages.value = [] }
   164|  finally { postImagesLoading.value = false }
   165|}
   166|function closeModal() { showModal.value = false; document.body.style.overflow = '' }
   167|
   168|onMounted(() => { loadPosts() })
   169|</script>
   170|

<style>
@import './common.css';
</style>
