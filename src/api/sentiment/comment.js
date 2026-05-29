import request from '@/utils/request'

export function listCommentByPost(postId) {
  return request({
    url: '/system/sentiment/comment/post',
    method: 'get',
    params: { postId: postId }
  })
}
