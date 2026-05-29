import request from '@/utils/request'

export function listImagesByPost(postId) {
  return request({
    url: '/system/sentiment/image/list',
    method: 'get',
    params: { postId }
  })
}
