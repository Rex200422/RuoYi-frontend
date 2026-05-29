<template>
  <div class="sentiment-container">
    <!-- ========== Tab Navigation ========== -->
    <div class="tab-nav">
      <button
        class="tab-nav-item"
        :class="{ active: activeTab === 'dashboard' }"
        @click="switchTab('dashboard')"
      >
        📊 <span>监控仪表盘</span>
      </button>
      <button
        class="tab-nav-item"
        :class="{ active: activeTab === 'social' }"
        @click="switchTab('social')"
      >
        💬 <span>社交媒体监测</span>
        <span v-if="postTotal > 0" class="nav-badge">{{ postTotal }}</span>
      </button>
      <button
        class="tab-nav-item"
        :class="{ active: activeTab === 'news' }"
        @click="switchTab('news')"
      >
        📰 <span>新闻资讯库</span>
        <span v-if="newsTotal > 0" class="nav-badge" style="background:#27ae60;">{{ newsTotal }}</span>
      </button>
      <button
        class="tab-nav-item"
        :class="{ active: activeTab === 'crawlConfig' }"
        @click="switchTab('crawlConfig')"
      >
        ⚙️ <span>爬取配置</span>
      </button>
      <button
        class="tab-nav-item"
        :class="{ active: activeTab === 'crawlLog' }"
        @click="switchTab('crawlLog')"
      >
        📋 <span>爬取日志</span>
      </button>
    </div>

    <!-- ========== 仪表盘 ========== -->
    <div v-show="activeTab === 'dashboard'" class="page-section">
      <!-- Top Bar -->
      <div class="top-bar">
        <div class="search-box">
          <input
            v-model="dashboardSearch"
            type="text"
            placeholder="搜索关键词、事件、帖子..."
          />
          <span class="search-icon">🔍</span>
        </div>
        <button class="btn btn-outline" @click="refreshData">🔄 刷新数据</button>
        <button class="btn btn-primary" @click="exportReport">📥 导出日报</button>
      </div>

      <!-- Stats Cards -->
      <div class="stats-grid">
        <div class="stat-card" @click="activeTab = 'social'">
          <div class="stat-icon icon-bg-blue">💬</div>
          <div class="stat-value">{{ postTotal }}</div>
          <div class="stat-label">社交媒体帖子总数</div>
          <div class="stat-change up" v-if="postTotal > 0">▲ 已加载</div>
        </div>
        <div class="stat-card" @click="activeTab = 'news'">
          <div class="stat-icon icon-bg-green">📰</div>
          <div class="stat-value">{{ newsTotal }}</div>
          <div class="stat-label">新闻资讯文章数</div>
          <div class="stat-change up" v-if="newsTotal > 0">▲ 已加载</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon icon-bg-orange">🔥</div>
          <div class="stat-value">{{ allKeywords.length }}</div>
          <div class="stat-label">活跃触发关键词</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon icon-bg-purple">🏢</div>
          <div class="stat-value">{{ allSources.length }}</div>
          <div class="stat-label">数据来源数</div>
        </div>
      </div>

      <!-- Hot Topics + Tag Cloud -->
      <div class="dashboard-grid">
        <div class="card">
          <div class="card-header">
            <span class="card-title"><span class="dot dot-red"></span>实时热点话题</span>
            <span class="count-indicator">最近24小时</span>
          </div>
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>话题</th>
                  <th>来源</th>
                  <th>热度指数</th>
                  <th>趋势</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(topic, index) in hotTopics" :key="index">
                  <td><strong>{{ index + 1 }}. {{ topic.topic }}</strong></td>
                  <td>
                    <span :class="['source-badge', topic.source.includes('社媒') ? 'source-social' : 'source-press']">
                      {{ topic.source }}
                    </span>
                  </td>
                  <td><strong>{{ topic.heat }}</strong>/100</td>
                  <td>{{ topic.trend }}</td>
                </tr>
                <tr v-if="hotTopics.length === 0">
                  <td colspan="4" style="text-align:center;color:#aaa;padding:30px;">暂无热点话题数据</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="card">
          <div class="card-header">
            <span class="card-title">🏷️ 热门标签云</span>
          </div>
          <div class="tag-cloud">
            <span
              v-for="(tag, index) in tagCloudData"
              :key="tag.keyword"
              :class="['tag-cloud-item', tag.sizeClass, tagColorClass(index)]"
              :title="`提及${tag.count}次`"
              @click="handleKeywordClick(tag.keyword)"
            >
              {{ tag.keyword }}<small>({{ tag.count }})</small>
            </span>
            <div v-if="tagCloudData.length === 0" style="color:#aaa;font-size:12px;padding:12px;">暂无标签数据</div>
          </div>
        </div>
      </div>
    </div>

    <!-- ========== 社交媒体监测 ========== -->
    <div v-show="activeTab === 'social'" class="page-section">
      <div class="top-bar">
        <div class="search-box">
          <input
            v-model="postSearch"
            type="text"
            placeholder="搜索帖子标题、正文、作者..."
          />
          <span class="search-icon">🔍</span>
        </div>
        <div class="filter-pills">
          <span
            class="filter-pill"
            :class="{ active: postFilterActive === 'all' }"
            @click="handleSocialFilter('all')"
          >全部</span>
          <span
            v-for="site in siteFilters"
            :key="site"
            class="filter-pill"
            :class="{ active: postFilterActive === site }"
            @click="handleSocialFilter(site)"
          >{{ site }}</span>
        </div>
        <button class="btn btn-outline btn-sm" @click="expandAllComments">
          📋 {{ allExpanded ? '折叠全部评论' : '展开全部评论' }}
        </button>
      </div>

      <div class="card">
        <div class="card-header">
          <span class="card-title"><span class="dot dot-blue"></span>社交媒体帖子列表</span>
          <span class="count-indicator" id="socialCount">共 {{ filteredPostTotal }} 条</span>
        </div>
        <div class="table-wrapper">
          <table v-if="filteredPostList.length > 0">
            <thead>
              <tr>
                <th>网站</th>
                <th>关键词</th>
                <th>标题</th>
                <th>作者</th>
                <th>发布时间</th>
                <th>点赞</th>
                <th>评论数</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="post in filteredPostList" :key="post.uuid">
                <tr
                  class="post-row"
                  :class="{ 'row-expanded': expandedPosts.has(post.postId) }"
                  @click="toggleCommentExpansion(post.postId)"
                >
                  <td>
                    <span class="site-badge">{{ post.siteName }}</span>
                  </td>
                  <td>
                    <span v-for="kw in parseKeywords(post.triggerKeyword)" :key="kw" class="keyword-tag" style="font-size:11px;">{{ kw }}</span>
                  </td>
                  <td>
                    <span class="post-title-link" :title="post.title">{{ post.title }}</span>
                  </td>
                  <td>{{ post.author }}</td>
                  <td style="font-size:12px;white-space:nowrap;">{{ post.publishTime }}</td>
                  <td><strong>{{ formatNumber(post.likeCount) }}</strong></td>
                  <td>
                    <span :style="{ color: (post.commentCount || 0) > 3 ? '#e74c3c' : '#666', fontWeight: '600' }">
                      {{ post.commentCount || 0 }}
                    </span>
                    {{ expandedPosts.has(post.postId) ? '▲' : '▼' }}
                  </td>
                  <td>
                    <button class="btn btn-outline btn-sm" @click.stop="viewPostDetail(post)">详情</button>
                  </td>
                </tr>
                <!-- Inline expanded comments row -->
                <tr v-if="expandedPosts.has(post.postId)" class="comment-row expanded">
                  <td colspan="8">
                    <div class="comment-inner">
                      <strong style="font-size:13px;">💬 评论 ({{ getPostComments(post.postId).length }}条)</strong>
                      <div v-if="commentLoadingMap[post.postId]" style="padding:12px;color:#aaa;font-size:12px;">加载中...</div>
                      <div
                        v-for="comment in getPostComments(post.postId)"
                        :key="comment.commentId || comment.id"
                        class="comment-item"
                      >
                        <strong>{{ comment.commenter }}</strong>: {{ comment.commentContent }}
                        <div class="comment-meta">
                          👍 {{ comment.likeCount || 0 }} · {{ comment.commentTime }}
                        </div>
                      </div>
                      <p v-if="!commentLoadingMap[post.postId] && getPostComments(post.postId).length === 0" style="color:#aaa;font-size:12px;">
                        暂无评论
                      </p>
                    </div>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
          <div v-else class="empty-state">
            <div class="icon">🔍</div>
            <p>没有匹配的帖子</p>
          </div>
        </div>

        <!-- Pagination -->
        <div class="pagination-wrapper">
          <el-pagination
            v-model:current-page="postQuery.pageNum"
            v-model:page-size="postQuery.pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="postTotal"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="loadPosts"
            @current-change="loadPosts"
          />
        </div>
      </div>
    </div>

    <!-- ========== 新闻资讯库 ========== -->
    <div v-show="activeTab === 'news'" class="page-section">
      <div class="top-bar">
        <div class="search-box">
          <input
            v-model="newsSearch"
            type="text"
            placeholder="搜索报刊文章标题、关键词、内容..."
          />
          <span class="search-icon">🔍</span>
        </div>
        <div class="filter-pills">
          <span
            class="filter-pill"
            :class="{ active: newsSelectedSources.size === 0 }"
            @click="handleNewsFilter('all')"
          >全部来源</span>
          <span
            v-for="src in newsSourceFilters"
            :key="src"
            class="filter-pill"
            :class="{ active: newsSelectedSources.has(src) }"
            @click="handleNewsFilter(src)"
          >{{ src }}</span>
        </div>
        <button class="btn btn-outline btn-sm" @click="exportPressCSV">📤 导出CSV</button>
      </div>

      <div class="card">
        <div class="card-header">
          <span class="card-title"><span class="dot dot-green"></span>新闻资讯文章列表</span>
          <span class="count-indicator" id="pressCount">共 {{ filteredNewsTotal }} 条{{ newsSelectedSources.size > 0 ? ' (已筛选)' : '' }}</span>
        </div>
        <div class="table-wrapper">
          <table v-if="filteredNewsList.length > 0">
            <thead>
              <tr>
                <th>来源</th>
                <th>标题</th>
                <th>日期</th>
                <th>关键词</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="article in filteredNewsList"
                :key="article.id"
                class="post-row"
                @click="viewNewsDetail(article)"
              >
                <td>
                  <span class="source-badge source-press">{{ article.source }}</span>
                </td>
                <td>
                  <span class="post-title-link" :title="article.title">{{ article.title }}</span>
                </td>
                <td style="font-size:12px;white-space:nowrap;">{{ article.publishDate }}</td>
                <td>
                  <span
                    v-for="kw in parseKeywords(article.keywords)"
                    :key="kw"
                    class="keyword-tag"
                    @click.stop="handleKeywordClick(kw)"
                  >{{ kw }}</span>
                </td>
                <td>
                  <button class="btn btn-outline btn-sm" @click.stop="viewNewsDetail(article)">详情</button>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-else class="empty-state">
            <div class="icon">📭</div>
            <p>没有匹配的文章</p>
          </div>
        </div>

        <!-- Pagination -->
        <div class="pagination-wrapper">
          <el-pagination
            v-model:current-page="newsQuery.pageNum"
            v-model:page-size="newsQuery.pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="newsTotal"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="loadNews"
            @current-change="loadNews"
          />
        </div>
      </div>
    </div>

    <!-- ========== 爬取配置 ========== -->
    <div v-show="activeTab === 'crawlConfig'" class="page-section">
      <div class="top-bar">
        <div class="search-box">
          <input
            v-model="crawlConfigSearch"
            type="text"
            placeholder="搜索站点名称、关键词..."
          />
          <span class="search-icon">🔍</span>
        </div>
        <button class="btn btn-outline btn-sm" @click="loadCrawlConfigs">🔄 刷新</button>
        <button class="btn btn-outline btn-sm" @click="handleTriggerAll" :disabled="crawlConfigsLoading">⚡ 触发全部</button>
        <button class="btn btn-primary btn-sm" @click="openConfigForm()">➕ 新增配置</button>
      </div>

      <div class="card">
        <div class="card-header">
          <span class="card-title"><span class="dot dot-blue"></span>爬取任务配置</span>
          <span class="count-indicator">共 {{ crawlConfigTotal }} 条</span>
        </div>
        <div class="table-wrapper">
          <table v-if="filteredCrawlConfigs.length > 0">
            <thead>
              <tr>
                <th>站点名称</th>
                <th>关键词</th>
                <th>爬取间隔</th>
                <th>最大结果数</th>
                <th>上次爬取时间</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="config in filteredCrawlConfigs" :key="config.id">
                <td>
                  <span class="site-badge">{{ config.siteName }}</span>
                </td>
                <td>
                  <span
                    v-for="kw in parseKeywords(config.keyword)"
                    :key="kw"
                    class="keyword-tag"
                  >{{ kw }}</span>
                </td>
                <td style="white-space:nowrap;">{{ formatInterval(config.intervalMinutes) }}</td>
                <td>{{ config.maxResults }}</td>
                <td style="font-size:12px;white-space:nowrap;">{{ config.lastCrawlTime || '—' }}</td>
                <td>
                  <el-switch
                    v-model="config.enabled"
                    :active-value="1"
                    :inactive-value="0"
                    @change="handleToggleEnabled(config)"
                    size="small"
                  />
                </td>
                <td>
                  <div class="action-btns">
                    <button class="btn btn-outline btn-sm" @click="openConfigForm(config)">编辑</button>
                    <button class="btn btn-outline btn-sm" @click="handleTriggerSingle(config)" :disabled="config._triggering">触发</button>
                    <button class="btn btn-outline btn-sm" style="color:var(--danger);border-color:var(--danger);" @click="handleDeleteConfig(config)">删除</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-else class="empty-state">
            <div class="icon">⚙️</div>
            <p>暂无爬取配置</p>
          </div>
        </div>

        <!-- Pagination -->
        <div class="pagination-wrapper">
          <el-pagination
            v-model:current-page="crawlConfigQuery.pageNum"
            v-model:page-size="crawlConfigQuery.pageSize"
            :page-sizes="[10, 20, 50]"
            :total="crawlConfigTotal"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="loadCrawlConfigs"
            @current-change="loadCrawlConfigs"
          />
        </div>
      </div>
    </div>

    <!-- ========== 爬取日志 ========== -->
    <div v-show="activeTab === 'crawlLog'" class="page-section">
      <div class="top-bar">
        <div class="search-box">
          <input
            v-model="crawlLogSearch"
            type="text"
            placeholder="搜索站点名称、关键词..."
          />
          <span class="search-icon">🔍</span>
        </div>
        <div class="filter-pills">
          <span
            class="filter-pill"
            :class="{ active: crawlLogSelectedSites.size === 0 }"
            @click="handleCrawlLogFilter('all')"
          >全部站点</span>
          <span
            v-for="site in crawlLogSiteFilters"
            :key="site"
            class="filter-pill"
            :class="{ active: crawlLogSelectedSites.has(site) }"
            @click="handleCrawlLogFilter(site)"
          >{{ site }}</span>
        </div>
        <button class="btn btn-outline btn-sm" @click="loadCrawlLogs">🔄 刷新</button>
      </div>

      <div class="card">
        <div class="card-header">
          <span class="card-title"><span class="dot dot-green"></span>爬取任务日志</span>
          <span class="count-indicator">共 {{ crawlLogTotal }} 条{{ crawlLogSelectedSites.size > 0 ? ' (已筛选)' : '' }}</span>
        </div>
        <div class="table-wrapper">
          <table v-if="filteredCrawlLogs.length > 0">
            <thead>
              <tr>
                <th>站点名称</th>
                <th>关键词</th>
                <th>状态</th>
                <th>开始时间</th>
                <th>结束时间</th>
                <th>抓取数</th>
                <th>保存数</th>
                <th>错误信息</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="log in filteredCrawlLogs" :key="log.id">
                <td>
                  <span class="site-badge">{{ log.siteName }}</span>
                </td>
                <td>
                  <span
                    v-for="kw in parseKeywords(log.keyword)"
                    :key="kw"
                    class="keyword-tag"
                  >{{ kw }}</span>
                </td>
                <td>
                  <span :class="['status-badge', 'status-' + log.status]">{{ formatCrawlStatus(log.status) }}</span>
                </td>
                <td style="font-size:12px;white-space:nowrap;">{{ log.startTime || '—' }}</td>
                <td style="font-size:12px;white-space:nowrap;">{{ log.endTime || '—' }}</td>
                <td><strong>{{ log.itemsFound || 0 }}</strong></td>
                <td><strong>{{ log.itemsSaved || 0 }}</strong></td>
                <td>
                  <el-tooltip
                    v-if="log.errorMsg"
                    :content="log.errorMsg"
                    placement="top"
                    :show-after="300"
                  >
                    <span class="error-hint">⚠️ 查看详情</span>
                  </el-tooltip>
                  <span v-else style="color:#aaa;font-size:12px;">—</span>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-else class="empty-state">
            <div class="icon">📋</div>
            <p>暂无爬取日志</p>
          </div>
        </div>

        <!-- Pagination -->
        <div class="pagination-wrapper">
          <el-pagination
            v-model:current-page="crawlLogQuery.pageNum"
            v-model:page-size="crawlLogQuery.pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="crawlLogTotal"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="loadCrawlLogs"
            @current-change="loadCrawlLogs"
          />
        </div>
      </div>
    </div>

    <!-- ========== 详情弹窗 ========== -->
    <div class="modal-overlay" v-if="showModal" @click.self="closeModal">
      <div class="modal" @click.stop>
        <button class="modal-close" @click="closeModal">✕</button>
        <!-- Post Detail -->
        <div v-if="modalType === 'post' && currentPost">
          <h2>📝 {{ currentPost.title }}</h2>
          <div class="meta-row">
            <span>👤 {{ currentPost.author }}</span>
            <span>🕐 {{ currentPost.publishTime }}</span>
            <span>📍 {{ currentPost.siteName }} · {{ currentPost.sourceBoard }}</span>
            <span>👍 {{ formatNumber(currentPost.likeCount) }}</span>
            <span>💬 {{ postDetailComments.length }}条评论</span>
          </div>
          <div style="margin:12px 0;">
            <span
              v-for="kw in parseKeywords(currentPost.triggerKeyword)"
              :key="kw"
              class="keyword-tag"
            >{{ kw }}</span>
          </div>
          <div v-if="postImagesLoading" style="margin:12px 0;color:#aaa;font-size:12px;">加载图片中...</div>
          <div v-if="postImages.length > 0" class="post-images-grid">
            <div v-for="(img, idx) in postImages" :key="idx" class="post-image-item">
              <img :src="getImageUrl(img)" :alt="'图片 ' + (idx + 1)" @click="openImagePreview(getImageUrl(img))" />
            </div>
          </div>
          <div class="modal-content-block">
            <div class="content-text" v-html="formatContent(currentPost.content)"></div>
          </div>
          <p style="font-size:11px;color:#999;" v-if="currentPost.originalUrl">
            原帖链接：<a :href="currentPost.originalUrl" target="_blank" style="color: var(--primary);">{{ currentPost.originalUrl }}</a>
          </p>
          <hr style="margin:16px 0;" />
          <h4>💬 评论 ({{ postDetailComments.length }}条)</h4>
          <div v-if="postDetailComments.length === 0" style="color:#aaa;">暂无评论</div>
          <div v-else class="comments-list">
            <div
              v-for="comment in postDetailComments"
              :key="comment.commentId || comment.id"
              class="comment-item"
            >
              <strong>{{ comment.commenter }}</strong>: {{ comment.commentContent }}
              <div class="comment-meta">
                👍 {{ comment.likeCount || 0 }} · {{ comment.commentTime }}
              </div>
            </div>
          </div>
        </div>
        <!-- News Detail -->
        <div v-if="modalType === 'news' && currentNews">
          <h2>📰 {{ currentNews.title }}</h2>
          <div class="meta-row">
            <span>📅 {{ currentNews.publishDate }}</span>
            <span>🏢 {{ currentNews.source }}</span>
          </div>
          <div style="margin:10px 0;">
            <span
              v-for="kw in parseKeywords(currentNews.keywords)"
              :key="kw"
              class="keyword-tag"
            >{{ kw }}</span>
          </div>
          <div class="modal-content-block">
            <div class="content-text" v-html="formatContent(currentNews.content)"></div>
          </div>
          <p style="font-size:11px;color:#999;margin-top:10px;" v-if="currentNews.url">
            原文链接：<a :href="currentNews.url" target="_blank" style="color: var(--primary);">{{ currentNews.url }}</a>
          </p>
        </div>
      </div>
    </div>

    <!-- Toast -->
    <div v-if="toastVisible" class="toast">{{ toastMessage }}</div>

    <!-- ========== 爬取配置表单弹窗 ========== -->
    <div class="modal-overlay" v-if="showConfigForm" @click.self="closeConfigForm">
      <div class="modal" style="max-width:500px;" @click.stop>
        <button class="modal-close" @click="closeConfigForm">✕</button>
        <h2>⚙️ {{ configForm.id ? '编辑配置' : '新增配置' }}</h2>
        <div style="margin-top:16px;">
          <div class="form-group">
            <label class="form-label">站点名称</label>
            <input v-model="configForm.siteName" class="form-input" placeholder="例如：微博、知乎、贴吧" />
          </div>
          <div class="form-group">
            <label class="form-label">关键词</label>
            <input v-model="configForm.keyword" class="form-input" placeholder="多个关键词用逗号分隔" />
          </div>
          <div class="form-group">
            <label class="form-label">爬取间隔（分钟）</label>
            <input v-model.number="configForm.intervalMinutes" type="number" class="form-input" placeholder="例如：60" min="1" />
          </div>
          <div class="form-group">
            <label class="form-label">最大结果数</label>
            <input v-model.number="configForm.maxResults" type="number" class="form-input" placeholder="例如：100" min="1" />
          </div>
          <div class="form-group" style="display:flex;align-items:center;gap:12px;">
            <label class="form-label" style="margin:0;">启用状态</label>
            <el-switch
              v-model="configForm.enabled"
              :active-value="1"
              :inactive-value="0"
            />
          </div>
        </div>
        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:24px;">
          <button class="btn btn-outline" @click="closeConfigForm">取消</button>
          <button class="btn btn-primary" @click="submitConfigForm" :disabled="configFormSubmitting">
            {{ configFormSubmitting ? '提交中...' : '确认提交' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { listPost } from '@/api/sentiment/post'
import { listCommentByPost } from '@/api/sentiment/comment'
import { listNews } from '@/api/sentiment/news'
import { listImagesByPost } from '@/api/sentiment/image'
import {
  listCrawlConfig, getCrawlConfig, addCrawlConfig, updateCrawlConfig,
  delCrawlConfig, triggerCrawl, triggerAllCrawl,
  listCrawlLog, getCrawlLogStats
} from '@/api/sentiment/crawl'

defineOptions({ name: 'SentimentAnalysis' })

// ==================== Active Tab ====================
const activeTab = ref('dashboard')

function switchTab(tab) {
  activeTab.value = tab
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// ==================== Post (Social Media) State ====================
const postList = ref([])
const postTotal = ref(0)
const postLoading = ref(false)
const postSearch = ref('')
const postFilterActive = ref('all')
const postQuery = reactive({ pageNum: 1, pageSize: 20, searchValue: '' })
const siteFilters = ref([])

// ==================== Comments State ====================
const expandedPosts = ref(new Set())
const commentsMap = ref({})
const commentLoadingMap = ref({})

// ==================== News State ====================
const newsList = ref([])
const newsTotal = ref(0)
const newsLoading = ref(false)
const newsSearch = ref('')
const newsSourceFilter = ref('all') // kept for compat, but we use newsSelectedSources below
const newsSelectedSources = ref(new Set())
const newsQuery = reactive({ pageNum: 1, pageSize: 20, searchValue: '' })
const newsSourceFilters = ref([])

// ==================== Detail Modal ====================
const showModal = ref(false)
const modalType = ref('')
const currentPost = ref(null)
const postDetailComments = ref([])
const currentNews = ref(null)
const postImages = ref([])
const postImagesLoading = ref(false)

// ==================== Dashboard Search ====================
const dashboardSearch = ref('')

// ==================== Toast ====================
const toastVisible = ref(false)
const toastMessage = ref('')
let toastTimeout = null

// ==================== Computed ====================
const filteredPostList = computed(() => {
  let list = postList.value
  if (postFilterActive.value !== 'all') {
    list = list.filter(p => p.siteName === postFilterActive.value)
  }
  return list
})

const filteredPostTotal = computed(() => {
  return filteredPostList.value.length
})

const filteredNewsList = computed(() => {
  if (newsSelectedSources.value.size === 0) return newsList.value
  return newsList.value.filter(a => newsSelectedSources.value.has(a.source))
})

const filteredNewsTotal = computed(() => {
  return filteredNewsList.value.length
})

const allKeywords = computed(() => {
  const kwSet = new Set()
  postList.value.forEach(p => {
    parseKeywords(p.triggerKeyword).forEach(k => kwSet.add(k))
  })
  newsList.value.forEach(a => {
    parseKeywords(a.keywords).forEach(k => kwSet.add(k))
  })
  return Array.from(kwSet)
})

const allSources = computed(() => {
  const sourceSet = new Set()
  postList.value.forEach(p => {
    if (p.siteName) sourceSet.add(p.siteName)
  })
  newsList.value.forEach(a => {
    if (a.source) sourceSet.add(a.source)
  })
  return Array.from(sourceSet)
})

const allExpanded = computed(() => {
  return filteredPostList.value.length > 0 &&
    filteredPostList.value.every(p => expandedPosts.value.has(p.postId))
})

const hotTopics = computed(() => {
  const kwCount = {}
  postList.value.forEach(p => {
    parseKeywords(p.triggerKeyword).forEach(k => {
      kwCount[k] = (kwCount[k] || 0) + 1
    })
  })
  newsList.value.forEach(a => {
    parseKeywords(a.keywords).forEach(k => {
      kwCount[k] = (kwCount[k] || 0) + 1
    })
  })

  const sorted = Object.entries(kwCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  // 为每个关键词追踪来源
  const kwSources = {}
  postList.value.forEach(p => {
    parseKeywords(p.triggerKeyword).forEach(k => {
      if (!kwSources[k]) kwSources[k] = new Set()
      kwSources[k].add(p.siteName || '社交媒体')
    })
  })
  newsList.value.forEach(a => {
    parseKeywords(a.keywords).forEach(k => {
      if (!kwSources[k]) kwSources[k] = new Set()
      kwSources[k].add(a.source || '新闻')
    })
  })

  return sorted.map(([keyword, count], i) => ({
    topic: keyword,
    source: Array.from(kwSources[keyword] || []).join('+'),
    heat: Math.max(95 - i * 8, 60),
    trend: i < 2 ? '🔥 持续上升' : i < 4 ? '📈 上升中' : '🆕 新热点'
  }))
})

const tagCloudData = computed(() => {
  const kwCount = {}
  postList.value.forEach(p => {
    parseKeywords(p.triggerKeyword).forEach(k => {
      kwCount[k] = (kwCount[k] || 0) + 1
    })
  })
  newsList.value.forEach(a => {
    parseKeywords(a.keywords).forEach(k => {
      kwCount[k] = (kwCount[k] || 0) + 1
    })
  })

  return Object.entries(kwCount)
    .sort((a, b) => b[1] - a[1])
    .map(([keyword, count]) => ({
      keyword,
      count,
      sizeClass: count >= 5 ? 'size-l' : count >= 3 ? 'size-m' : 'size-s'
    }))
})

// ==================== Methods ====================
function parseKeywords(keywordStr) {
  if (!keywordStr) return []
  return keywordStr.split(',').map(k => k.trim()).filter(Boolean)
}

function formatNumber(num) {
  if (!num) return '0'
  return Number(num).toLocaleString()
}

function tagColorClass(index) {
  const colors = ['tag-c1', 'tag-c2', 'tag-c3', 'tag-c4', 'tag-c5']
  return colors[index % colors.length]
}

function showToast(msg) {
  toastMessage.value = msg
  toastVisible.value = true
  if (toastTimeout) clearTimeout(toastTimeout)
  toastTimeout = setTimeout(() => { toastVisible.value = false }, 2200)
}

// ==================== Data Loading ====================
async function loadPosts() {
  postLoading.value = true
  try {
    const params = {
      pageNum: postQuery.pageNum,
      pageSize: postQuery.pageSize
    }
    if (postSearch.value) params.searchValue = postSearch.value
    const res = await listPost(params)
    postList.value = res.rows || []
    postTotal.value = res.total || 0
    // Derive site filters from loaded data
    updateSiteFilters()
  } catch (e) {
    console.error('加载帖子失败:', e)
    ElMessage.error('加载社交媒体数据失败')
  } finally {
    postLoading.value = false
  }
}

function updateSiteFilters() {
  const siteSet = new Set()
  postList.value.forEach(p => {
    if (p.siteName) siteSet.add(p.siteName)
  })
  siteFilters.value = Array.from(siteSet)
}

async function loadComments(postId) {
  if (commentsMap.value[postId] || commentLoadingMap.value[postId]) return
  commentLoadingMap.value[postId] = true
  try {
    const res = await listCommentByPost(postId)
    commentsMap.value[postId] = res.data || []
  } catch (e) {
    console.error('加载评论失败:', e)
    commentsMap.value[postId] = []
  } finally {
    commentLoadingMap.value[postId] = false
  }
}

async function loadNews() {
  newsLoading.value = true
  try {
    const params = {
      pageNum: newsQuery.pageNum,
      pageSize: newsQuery.pageSize
    }
    if (newsSearch.value) params.searchValue = newsSearch.value
    // Source filtering is now done client-side via newsSelectedSources
    const res = await listNews(params)
    newsList.value = res.rows || []
    newsTotal.value = res.total || 0
    // Derive news source filters from loaded data
    updateNewsSourceFilters()
  } catch (e) {
    console.error('加载报刊失败:', e)
    ElMessage.error('加载报刊数据失败')
  } finally {
    newsLoading.value = false
  }
}

function updateNewsSourceFilters() {
  const sourceSet = new Set()
  newsList.value.forEach(a => {
    if (a.source) sourceSet.add(a.source)
  })
  newsSourceFilters.value = Array.from(sourceSet)
}

// ==================== Interaction Handlers ====================
function handleSocialFilter(filter) {
  postFilterActive.value = filter
}

function handleNewsFilter(filter) {
  if (filter === 'all') {
    newsSelectedSources.value = new Set()
  } else {
    const newSet = new Set(newsSelectedSources.value)
    if (newSet.has(filter)) {
      newSet.delete(filter)
    } else {
      newSet.add(filter)
    }
    newsSelectedSources.value = newSet
  }
}

function toggleCommentExpansion(postId) {
  if (expandedPosts.value.has(postId)) {
    expandedPosts.value.delete(postId)
    expandedPosts.value = new Set(expandedPosts.value)
  } else {
    expandedPosts.value.add(postId)
    expandedPosts.value = new Set(expandedPosts.value)
    loadComments(postId)
  }
}

function getPostComments(postId) {
  return commentsMap.value[postId] || []
}

function expandAllComments() {
  const allIds = filteredPostList.value.map(p => p.postId)
  const allCurrentlyExpanded = allIds.every(id => expandedPosts.value.has(id))

  if (allCurrentlyExpanded) {
    expandedPosts.value = new Set()
    showToast('已折叠全部评论')
  } else {
    const newSet = new Set(allIds)
    expandedPosts.value = newSet
    allIds.forEach(id => loadComments(id))
    showToast('已展开全部评论')
  }
}

function handleKeywordClick(keyword) {
  showToast(`🔍 正在追踪关键词："${keyword}"`)
}

async function viewPostDetail(row) {
  currentPost.value = row
  modalType.value = 'post'
  showModal.value = true
  postImages.value = []
  postImagesLoading.value = true
  document.body.style.overflow = 'hidden'
  await loadComments(row.postId)
  postDetailComments.value = commentsMap.value[row.postId] || []
  // Load images for the post
  loadPostImages(row.postId)
}

function formatContent(text) {
  if (!text) return ''
  // 已经有HTML标签则直接返回
  if (/<[a-z][\s\S]*>/i.test(text)) return text
  // 纯文本：换行转<br>，加段落
  return text.split('\n').filter(l => l.trim()).map(l => '<p>' + l + '</p>').join('')
}

function getImageUrl(img) {
  // 优先使用本地路径
  if (img && img.localPath) {
    const filename = img.localPath.split('/').pop()
    return '/system/sentiment/image/file/' + filename
  }
  if (img && img.local_path) {
    const filename = img.local_path.split('/').pop()
    return '/system/sentiment/image/file/' + filename
  }
  // 回退到原始URL
  if (img && img.imageUrl) return img.imageUrl
  if (img && img.url) return img.url
  if (typeof img === 'string') return img
  return ''
}

async function loadPostImages(postId) {
  try {
    const res = await listImagesByPost(postId)
    postImages.value = res.data || []
  } catch (e) {
    console.error('加载帖子图片失败:', e)
    postImages.value = []
  } finally {
    postImagesLoading.value = false
  }
}

function viewNewsDetail(article) {
  currentNews.value = article
  modalType.value = 'news'
  showModal.value = true
  document.body.style.overflow = 'hidden'
}

function closeModal() {
  showModal.value = false
  document.body.style.overflow = ''
}

function openImagePreview(url) {
  window.open(url, '_blank')
}

function refreshData() {
  showToast('🔄 数据已刷新')
  loadPosts()
  loadNews()
}

function exportReport() {
  let report = '舆情监控日报\n'
  report += '生成时间：' + new Date().toLocaleString() + '\n'
  report += '='.repeat(50) + '\n\n'
  report += '【社交媒体帖子统计】共 ' + postTotal.value + ' 条\n'
  report += '【报刊文章统计】共 ' + newsTotal.value + ' 条\n\n'
  report += '热点关键词：\n'
  allKeywords.value.forEach(k => { report += '  - ' + k + '\n' })
  const blob = new Blob([report], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = '舆情日报_' + new Date().toISOString().slice(0, 10) + '.txt'
  a.click()
  URL.revokeObjectURL(url)
  showToast('✅ 日报已导出！')
}

function exportPressCSV() {
  let csv = '标题,URL,日期,关键词,内容,来源\n'
  newsList.value.forEach(a => {
    csv += `"${a.title || ''}","${a.url || ''}","${a.publishDate || ''}","${a.keywords || ''}","${(a.content || '').replace(/"/g, '""')}","${a.source || ''}"\n`
  })
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = '报刊文章_' + new Date().toISOString().slice(0, 10) + '.csv'
  a.click()
  URL.revokeObjectURL(url)
  showToast('✅ 报刊数据已导出CSV！')
}

// ==================== Crawl Config State ====================
const crawlConfigs = ref([])
const crawlConfigTotal = ref(0)
const crawlConfigsLoading = ref(false)
const crawlConfigSearch = ref('')
const crawlConfigQuery = reactive({ pageNum: 1, pageSize: 20 })

// ==================== Crawl Config Form ====================
const showConfigForm = ref(false)
const configFormSubmitting = ref(false)
const configForm = reactive({
  id: null,
  siteName: '',
  keyword: '',
  intervalMinutes: 60,
  maxResults: 100,
  enabled: 1
})

// ==================== Crawl Logs State ====================
const crawlLogs = ref([])
const crawlLogTotal = ref(0)
const crawlLogsLoading = ref(false)
const crawlLogSearch = ref('')
const crawlLogQuery = reactive({ pageNum: 1, pageSize: 20 })
const crawlLogSelectedSites = ref(new Set())
const crawlLogSiteFilters = ref([])

// ==================== Crawl Computed ====================
const filteredCrawlConfigs = computed(() => {
  if (!crawlConfigSearch.value) return crawlConfigs.value
  const s = crawlConfigSearch.value.toLowerCase()
  return crawlConfigs.value.filter(c =>
    (c.siteName && c.siteName.toLowerCase().includes(s)) ||
    (c.keyword && c.keyword.toLowerCase().includes(s))
  )
})

const filteredCrawlLogs = computed(() => {
  let list = crawlLogs.value
  if (crawlLogSelectedSites.value.size > 0) {
    list = list.filter(l => crawlLogSelectedSites.value.has(l.siteName))
  }
  if (crawlLogSearch.value) {
    const s = crawlLogSearch.value.toLowerCase()
    list = list.filter(l =>
      (l.siteName && l.siteName.toLowerCase().includes(s)) ||
      (l.keyword && l.keyword.toLowerCase().includes(s))
    )
  }
  return list
})

// ==================== Crawl Config Methods ====================
async function loadCrawlConfigs() {
  crawlConfigsLoading.value = true
  try {
    const params = {
      pageNum: crawlConfigQuery.pageNum,
      pageSize: crawlConfigQuery.pageSize
    }
    const res = await listCrawlConfig(params)
    crawlConfigs.value = (res.rows || []).map(c => ({ ...c, _triggering: false }))
    crawlConfigTotal.value = res.total || 0
  } catch (e) {
    console.error('加载爬取配置失败:', e)
    ElMessage.error('加载爬取配置失败')
  } finally {
    crawlConfigsLoading.value = false
  }
}

function formatInterval(minutes) {
  if (!minutes) return '—'
  if (minutes >= 1440) return (minutes / 1440) + '天'
  if (minutes >= 60) return (minutes / 60) + '小时'
  return minutes + '分钟'
}

function openConfigForm(config) {
  if (config) {
    Object.assign(configForm, {
      id: config.id,
      siteName: config.siteName,
      keyword: config.keyword,
      intervalMinutes: config.intervalMinutes,
      maxResults: config.maxResults,
      enabled: config.enabled
    })
  } else {
    Object.assign(configForm, {
      id: null,
      siteName: '',
      keyword: '',
      intervalMinutes: 60,
      maxResults: 100,
      enabled: 1
    })
  }
  showConfigForm.value = true
  document.body.style.overflow = 'hidden'
}

function closeConfigForm() {
  showConfigForm.value = false
  document.body.style.overflow = ''
}

async function submitConfigForm() {
  if (!configForm.siteName || !configForm.keyword) {
    ElMessage.warning('请填写站点名称和关键词')
    return
  }
  configFormSubmitting.value = true
  try {
    const data = {
      siteName: configForm.siteName,
      keyword: configForm.keyword,
      intervalMinutes: configForm.intervalMinutes,
      maxResults: configForm.maxResults,
      enabled: configForm.enabled
    }
    if (configForm.id) {
      data.id = configForm.id
      await updateCrawlConfig(data)
      showToast('✅ 配置已更新')
    } else {
      await addCrawlConfig(data)
      showToast('✅ 配置已新增')
    }
    closeConfigForm()
    loadCrawlConfigs()
  } catch (e) {
    console.error('保存配置失败:', e)
    ElMessage.error('保存配置失败')
  } finally {
    configFormSubmitting.value = false
  }
}

async function handleDeleteConfig(config) {
  if (!confirm('确定要删除该爬取配置？')) return
  try {
    await delCrawlConfig(config.id)
    showToast('✅ 配置已删除')
    loadCrawlConfigs()
  } catch (e) {
    console.error('删除配置失败:', e)
    ElMessage.error('删除配置失败')
  }
}

async function handleToggleEnabled(config) {
  try {
    await updateCrawlConfig({
      id: config.id,
      siteName: config.siteName,
      keyword: config.keyword,
      intervalMinutes: config.intervalMinutes,
      maxResults: config.maxResults,
      enabled: config.enabled
    })
    showToast(config.enabled ? '✅ 已启用' : '⏸️ 已禁用')
  } catch (e) {
    console.error('更新状态失败:', e)
    // Revert on error
    config.enabled = config.enabled === 1 ? 0 : 1
    ElMessage.error('更新状态失败')
  }
}

async function handleTriggerSingle(config) {
  config._triggering = true
  try {
    await triggerCrawl(config.id)
    showToast('⚡ 爬取任务已触发')
  } catch (e) {
    console.error('触发爬取失败:', e)
    ElMessage.error('触发爬取失败')
  } finally {
    config._triggering = false
  }
}

async function handleTriggerAll() {
  try {
    await triggerAllCrawl()
    showToast('⚡ 全部爬取任务已触发')
  } catch (e) {
    console.error('触发全部失败:', e)
    ElMessage.error('触发全部失败')
  }
}

// ==================== Crawl Logs Methods ====================
async function loadCrawlLogs() {
  crawlLogsLoading.value = true
  try {
    const params = {
      pageNum: crawlLogQuery.pageNum,
      pageSize: crawlLogQuery.pageSize
    }
    if (crawlLogSearch.value) params.siteName = crawlLogSearch.value
    const res = await listCrawlLog(params)
    crawlLogs.value = res.rows || []
    crawlLogTotal.value = res.total || 0
    updateCrawlLogSiteFilters()
  } catch (e) {
    console.error('加载爬取日志失败:', e)
    ElMessage.error('加载爬取日志失败')
  } finally {
    crawlLogsLoading.value = false
  }
}

function updateCrawlLogSiteFilters() {
  const siteSet = new Set()
  crawlLogs.value.forEach(l => {
    if (l.siteName) siteSet.add(l.siteName)
  })
  crawlLogSiteFilters.value = Array.from(siteSet)
}

function handleCrawlLogFilter(filter) {
  if (filter === 'all') {
    crawlLogSelectedSites.value = new Set()
  } else {
    const newSet = new Set(crawlLogSelectedSites.value)
    if (newSet.has(filter)) {
      newSet.delete(filter)
    } else {
      newSet.add(filter)
    }
    crawlLogSelectedSites.value = newSet
  }
}

function formatCrawlStatus(status) {
  const map = {
    'success': '成功',
    'failed': '失败',
    'running': '运行中'
  }
  return map[status] || status || '未知'
}

// ==================== Initialization ====================
onMounted(() => {
  loadPosts()
  loadNews()
  loadCrawlConfigs()
  loadCrawlLogs()
})
</script>

<style scoped>
/* ========== CSS Variables ========== */
.sentiment-container {
  --primary: #4f6ef7;
  --primary-light: #eef1fe;
  --danger: #e74c3c;
  --warning: #f39c12;
  --success: #27ae60;
  --text: #2c3e50;
  --text-secondary: #6b7b8d;
  --border: #e8ecf1;
  --shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.10);
  --radius: 12px;
  --radius-sm: 8px;
  --transition: 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  color: var(--text);
}

/* ========== Tab Navigation ========== */
.tab-nav {
  display: flex;
  gap: 4px;
  margin-bottom: 24px;
  background: #fff;
  padding: 6px;
  border-radius: var(--radius);
  box-shadow: var(--shadow);
}

.tab-nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: var(--transition);
  font-size: 14px;
  font-weight: 500;
  color: #6b7b8d;
  background: none;
  border: none;
  flex: 1;
  justify-content: center;
}

.tab-nav-item:hover {
  background: #f5f6fa;
  color: var(--text);
}

.tab-nav-item.active {
  background: rgba(79, 110, 247, 0.1);
  color: var(--primary);
  font-weight: 600;
  box-shadow: inset 0 -3px 0 var(--primary);
}

.nav-badge {
  margin-left: 4px;
  background: var(--danger);
  color: #fff;
  font-size: 10px;
  padding: 2px 7px;
  border-radius: 10px;
  font-weight: 600;
}

/* ========== Page Section ========== */
.page-section {
  animation: fadeSlideIn 0.4s ease;
}

@keyframes fadeSlideIn {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ========== Top Bar & Search ========== */
.top-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.search-box {
  flex: 1;
  min-width: 280px;
  position: relative;
}

.search-box input {
  width: 100%;
  padding: 11px 44px 11px 16px;
  border: 2px solid var(--border);
  border-radius: 28px;
  font-size: 14px;
  background: #fff;
  transition: var(--transition);
  outline: none;
  color: var(--text);
}

.search-box input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 4px rgba(79, 110, 247, 0.08);
}

.search-box .search-icon {
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 18px;
  cursor: pointer;
  color: #999;
  transition: var(--transition);
}

.search-box .search-icon:hover {
  color: var(--primary);
}

/* ========== Buttons ========== */
.btn {
  padding: 9px 18px;
  border-radius: 22px;
  border: none;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: var(--transition);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.btn-primary {
  background: var(--primary);
  color: #fff;
}

.btn-primary:hover {
  background: #3d5ce5;
  box-shadow: 0 4px 16px rgba(79, 110, 247, 0.3);
}

.btn-outline {
  background: #fff;
  border: 1.5px solid var(--border);
  color: var(--text);
}

.btn-outline:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.btn-sm {
  padding: 5px 12px;
  font-size: 11px;
  border-radius: 14px;
}

/* ========== Filter Pills ========== */
.filter-pills {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.filter-pill {
  padding: 7px 16px;
  border-radius: 20px;
  border: 1.5px solid var(--border);
  background: #fff;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: var(--transition);
  white-space: nowrap;
  color: var(--text-secondary);
}

.filter-pill:hover {
  border-color: var(--primary);
  color: var(--primary);
  background: var(--primary-light);
}

.filter-pill.active {
  background: var(--primary);
  color: #fff;
  border-color: var(--primary);
}

/* ========== Stats Cards (Dashboard) ========== */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: #fff;
  border-radius: var(--radius);
  padding: 18px 20px;
  box-shadow: var(--shadow);
  transition: var(--transition);
  cursor: pointer;
  border: 2px solid transparent;
  position: relative;
  overflow: hidden;
}

.stat-card:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
  border-color: #e8ecf1;
}

.stat-card .stat-icon {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  margin-bottom: 10px;
}

.stat-card .stat-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.5px;
}

.stat-card .stat-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
  font-weight: 500;
}

.stat-card .stat-change {
  font-size: 11px;
  margin-top: 4px;
  font-weight: 600;
}

.stat-change.up {
  color: var(--danger);
}

.stat-change.down {
  color: var(--success);
}

/* ========== Icon Backgrounds ========== */
.icon-bg-blue { background: #eef1fe; color: #4f6ef7; }
.icon-bg-orange { background: #fff4e8; color: #f39c12; }
.icon-bg-red { background: #fde8e8; color: #e74c3c; }
.icon-bg-green { background: #e6f9f0; color: #27ae60; }
.icon-bg-purple { background: #f3efff; color: #7c5cfc; }

/* ========== Card Container ========== */
.card {
  background: #fff;
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 20px;
  margin-bottom: 20px;
  transition: var(--transition);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 10px;
}

.card-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 8px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.dot-red { background: #e74c3c; }
.dot-orange { background: #f39c12; }
.dot-blue { background: #4f6ef7; }
.dot-green { background: #27ae60; }

.count-indicator {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 400;
}

/* ========== Dashboard Grid ========== */
.dashboard-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
}

@media (max-width: 768px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}

/* ========== Table Styles ========== */
.table-wrapper {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

table th {
  background: #f8f9fb;
  padding: 11px 14px;
  text-align: left;
  font-weight: 600;
  color: var(--text-secondary);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
  border-bottom: 2px solid var(--border);
}

table td {
  padding: 11px 14px;
  border-bottom: 1px solid var(--border);
  vertical-align: top;
}

table tbody tr,
.post-row {
  transition: var(--transition);
  cursor: pointer;
}

.post-row:hover {
  background: #fafbfd;
}

.post-row.row-expanded {
  background: #fafbfd;
}

/* ========== Source Badges ========== */
.source-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
}

.source-social { background: #eef1fe; color: #4f6ef7; }
.source-press { background: #e6f9f0; color: #27ae60; }

.site-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  background: #eef1fe;
  color: #4f6ef7;
}

/* ========== Post Title Link ========== */
.post-title-link {
  color: var(--primary);
  font-weight: 600;
  cursor: pointer;
  transition: var(--transition);
  text-decoration: none;
}

.post-title-link:hover {
  text-decoration: underline;
  color: #3d5ce5;
}

/* ========== Keyword Tags ========== */
.keyword-tag {
  display: inline-block;
  background: #fff4e8;
  color: #d4780a;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  margin: 2px 3px;
  cursor: pointer;
  transition: var(--transition);
  border: 1px solid transparent;
}

.keyword-tag:hover {
  border-color: #f39c12;
  background: #fff8f0;
}

.keyword-tag.hot {
  background: #fde8e8;
  color: #c0392b;
}

/* ========== Comment Rows (Inline Expand) ========== */
.comment-row {
  display: none;
  background: #fafbfd;
}

.comment-row.expanded {
  display: table-row;
}

.comment-inner {
  padding: 12px 20px;
  border-top: 2px dashed #e8ecf1;
}

.comment-item {
  padding: 10px 14px;
  margin: 6px 0;
  background: #fff;
  border-radius: var(--radius-sm);
  border-left: 3px solid #e8ecf1;
  transition: var(--transition);
}

.comment-item:hover {
  border-left-color: var(--primary);
}

.comment-meta {
  font-size: 11px;
  color: var(--text-secondary);
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  margin-top: 4px;
}

/* ========== Tag Cloud ========== */
.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 0;
}

.tag-cloud-item {
  padding: 6px 14px;
  border-radius: 18px;
  cursor: pointer;
  transition: var(--transition);
  font-weight: 500;
  border: 1.5px solid transparent;
  font-size: 13px;
}

.tag-cloud-item.size-s { font-size: 11px; padding: 4px 10px; }
.tag-cloud-item.size-m { font-size: 14px; padding: 7px 16px; }
.tag-cloud-item.size-l { font-size: 17px; padding: 9px 20px; font-weight: 700; }

.tag-cloud-item:hover {
  transform: scale(1.06);
  box-shadow: var(--shadow);
}

.tag-c1 { background: #eef1fe; color: #4f6ef7; }
.tag-c2 { background: #fff4e8; color: #d4780a; }
.tag-c3 { background: #fde8e8; color: #c0392b; }
.tag-c4 { background: #e6f9f0; color: #1e7a4a; }
.tag-c5 { background: #f3efff; color: #6c3bd4; }

/* ========== Modal ========== */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal {
  background: #fff;
  border-radius: var(--radius);
  padding: 28px;
  max-width: 700px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: var(--shadow-lg);
  position: relative;
}

.modal-close {
  position: absolute;
  top: 14px;
  right: 18px;
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #999;
  transition: var(--transition);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-close:hover {
  background: #f5f5f5;
  color: #333;
}

.modal h2 {
  font-size: 18px;
  margin-bottom: 12px;
}

.modal .meta-row {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 14px;
}

.modal-content-block {
  background: #f8f9fb;
  padding: 20px;
  border-radius: 8px;
  line-height: 1.8;
  margin: 12px 0;
}
.content-text {
  background: #f8f9fb;
  padding: 20px;
  border-radius: 8px;
  line-height: 1.8;
  color: #303133;
  font-size: 14px;
}
.content-text p {
  margin: 8px 0;
  text-indent: 0;
}
.content-text h2, .content-text h3, .content-text h4 {
  color: #1a1d28;
  margin: 16px 0 8px;
  line-height: 1.4;
}
.content-text h2 {
  font-size: 18px;
  border-bottom: 2px solid #e8ecf1;
  padding-bottom: 8px;
}
.content-text h3 {
  font-size: 16px;
}
.content-text strong {
  color: #1a1d28;
}
.content-text em {
  color: #6b7b8d;
  font-style: italic;
}
.content-text a {
  color: var(--primary);
  text-decoration: none;
}
.content-text a:hover {
  text-decoration: underline;
}
.content-text ul, .content-text ol {
  margin: 8px 0;
  padding-left: 24px;
}
.content-text li {
  margin: 4px 0;
}
.content-text blockquote {
  border-left: 3px solid var(--primary);
  padding: 8px 16px;
  margin: 12px 0;
  background: #f0f3ff;
  border-radius: 0 8px 8px 0;
}

.comments-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}

/* ========== Post Images Grid ========== */
.post-images-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 10px;
  margin: 12px 0;
}

.post-image-item {
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--border);
  cursor: pointer;
  transition: var(--transition);
}

.post-image-item:hover {
  box-shadow: var(--shadow);
  transform: translateY(-2px);
}

.post-image-item img {
  width: 100%;
  height: 150px;
  object-fit: cover;
  display: block;
}

/* ========== Toast ========== */
.toast {
  position: fixed;
  bottom: 30px;
  right: 30px;
  background: #1a1d28;
  color: #fff;
  padding: 12px 20px;
  border-radius: 24px;
  font-size: 13px;
  z-index: 300;
  animation: slideUp 0.35s ease;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  font-weight: 500;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ========== Pagination ========== */
.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

/* ========== Empty State ========== */
.empty-state {
  text-align: center;
  padding: 40px;
  color: #aaa;
}

.empty-state .icon {
  font-size: 48px;
  margin-bottom: 12px;
}

/* ========== Text Truncate ========== */
.text-truncate {
  max-width: 260px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: inline-block;
}

/* ========== Responsive ========== */
@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .stat-card {
    padding: 12px 14px;
  }

  .stat-card .stat-value {
    font-size: 22px;
  }

  table {
    font-size: 11px;
  }

  table th,
  table td {
    padding: 8px 6px;
  }
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr 1fr;
    gap: 6px;
  }

  .top-bar {
    flex-direction: column;
  }

  .filter-pills {
    gap: 4px;
  }

  .filter-pill {
    padding: 5px 10px;
    font-size: 11px;
  }
}

/* ========== Scrollbar ========== */
.sentiment-container ::-webkit-scrollbar {
  width: 5px;
  height: 5px;
}

.sentiment-container ::-webkit-scrollbar-track {
  background: transparent;
}

.sentiment-container ::-webkit-scrollbar-thumb {
  background: #d0d5dd;
  border-radius: 10px;
}

.sentiment-container ::-webkit-scrollbar-thumb:hover {
  background: #b0b5bd;
}

/* ========== Status Badges ========== */
.status-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}

.status-success {
  background: #e6f9f0;
  color: #27ae60;
}

.status-failed {
  background: #fde8e8;
  color: #e74c3c;
}

.status-running {
  background: #eef1fe;
  color: #4f6ef7;
}

/* ========== Error Hint ========== */
.error-hint {
  color: #e74c3c;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
}

.error-hint:hover {
  text-decoration: underline;
}

/* ========== Form Styles ========== */
.form-group {
  margin-bottom: 16px;
}

.form-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 6px;
}

.form-input {
  width: 100%;
  padding: 10px 14px;
  border: 2px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 14px;
  background: #fff;
  transition: var(--transition);
  outline: none;
  color: var(--text);
  box-sizing: border-box;
}

.form-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 4px rgba(79, 110, 247, 0.08);
}

/* ========== Action Buttons Row ========== */
.action-btns {
  display: flex;
  gap: 6px;
  flex-wrap: nowrap;
}

/* ========== Switch Override ========== */
.el-switch {
  --el-switch-on-color: var(--primary);
}
</style>
