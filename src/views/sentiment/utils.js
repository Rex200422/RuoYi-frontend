/**
 * Shared utility functions for the sentiment analysis module.
 */

export function parseKeywords(keywordStr) {
  if (!keywordStr) return []
  return keywordStr.split(',').map(k => k.trim()).filter(Boolean)
}

export function formatNumber(num) {
  if (!num) return '0'
  return Number(num).toLocaleString()
}

export function formatContent(text) {
  if (!text) return ''
  // Already has HTML tags, return as-is
  if (/<[a-z][\s\S]*>/i.test(text)) return text
  // Plain text: wrap each non-empty line in <p> tags
  return text.split('\n').filter(l => l.trim()).map(l => '<p>' + l + '</p>').join('')
}

export function formatInterval(minutes) {
  if (!minutes) return '—'
  if (minutes >= 1440) return (minutes / 1440) + '天'
  if (minutes >= 60) return (minutes / 60) + '小时'
  return minutes + '分钟'
}

export function formatCrawlStatus(status) {
  const map = { success: '成功', failed: '失败', running: '运行中' }
  return map[status] || status || '未知'
}

export function getImageUrl(img) {
  if (img && img.localPath) {
    const f = img.localPath.split('/').pop()
    return '/system/sentiment/image/file/' + f
  }
  if (img && img.local_path) {
    const f = img.local_path.split('/').pop()
    return '/system/sentiment/image/file/' + f
  }
  if (img && img.imageUrl) return img.imageUrl
  if (img && img.url) return img.url
  if (typeof img === 'string') return img
  return ''
}
