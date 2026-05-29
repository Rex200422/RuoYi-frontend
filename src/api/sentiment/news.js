import request from '@/utils/request'

export function listNews(query) {
  return request({
    url: '/system/sentiment/news/list',
    method: 'get',
    params: query
  })
}

export function getNews(id) {
  return request({
    url: '/system/sentiment/news/' + id,
    method: 'get'
  })
}
