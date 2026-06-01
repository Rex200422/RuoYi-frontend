import request from '@/utils/request'

// ==================== Crawl Configuration ====================

/** 查询爬取配置列表 */
export function listCrawlConfig(query) {
  return request({ url: '/system/sentiment/crawlConfig/list', method: 'get', params: query })
}

/** 查询爬取配置详情 */
export function getCrawlConfig(id) {
  return request({ url: '/system/sentiment/crawlConfig/' + id, method: 'get' })
}

/** 新增爬取配置 */
export function addCrawlConfig(data) {
  return request({ url: '/system/sentiment/crawlConfig', method: 'post', data: data })
}

/** 修改爬取配置 */
export function updateCrawlConfig(data) {
  return request({ url: '/system/sentiment/crawlConfig', method: 'put', data: data })
}

/** 删除爬取配置 */
export function delCrawlConfig(ids) {
  return request({ url: '/system/sentiment/crawlConfig/' + ids, method: 'delete' })
}

/** 触发单个爬取任务 */
export function triggerCrawl(id) {
  return request({ url: '/system/sentiment/crawlConfig/trigger/' + id, method: 'post' })
}

/** 触发所有启用的爬取任务 */
export function triggerAllCrawl() {
  return request({ url: '/system/sentiment/crawlConfig/triggerAll', method: 'post' })
}

// ==================== Crawl Logs ====================

/** 查询爬取日志列表 */
export function listCrawlLog(query) {
  return request({ url: '/system/sentiment/crawlLog/list', method: 'get', params: query })
}

/** 查询爬取日志统计 */
export function getCrawlLogStats() {
  return request({ url: '/system/sentiment/crawlLog/stats', method: 'get' })
}
