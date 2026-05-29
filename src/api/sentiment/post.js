import request from '@/utils/request'

export function listPost(query) {
  return request({
    url: '/system/sentiment/post/list',
    method: 'get',
    params: query
  })
}

export function getPost(uuid) {
  return request({
    url: '/system/sentiment/post/' + uuid,
    method: 'get'
  })
}
