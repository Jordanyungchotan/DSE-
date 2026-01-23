/**
 * 学习社区"量子纠缠" API 封装
 * 
 * ⚠️ 2026-01: 使用统一 API 配置，禁止硬编码域名
 */

import { apiFetch } from '../config/api'

async function fetchApi(endpoint: string, options?: RequestInit) {
  const response = await apiFetch(endpoint, options)
  return response.json()
}

// ==================== 用户搜索 ====================

export interface SearchUser {
  id: string
  name: string
  email: string
  avatar: string | null
  created_at: string
}

/**
 * 搜索用户（用于添加好友）
 */
export async function searchUsers(query: string, excludeUserId?: string) {
  const params = new URLSearchParams({ q: query })
  if (excludeUserId) {
    params.append('exclude', excludeUserId)
  }
  return fetchApi(`/api/users/search?${params}`)
}

/**
 * 批量获取用户信息（用于显示头像）
 */
export async function getUsersBatch(userIds: string[]): Promise<{
  success: boolean
  data: Array<{ id: string; name: string; avatar: string | null }>
}> {
  if (userIds.length === 0) {
    return { success: true, data: [] }
  }
  return fetchApi('/api/users/batch', {
    method: 'POST',
    body: JSON.stringify({ user_ids: userIds }),
  })
}

// ==================== 好友系统 ====================

export interface Friend {
  id: number
  requester_id: string
  receiver_id: string
  requester_name?: string
  receiver_name?: string
  friend_id: string
  friend_name?: string
  friend_avatar?: string | null
  status: 'pending' | 'accepted' | 'rejected'
  created_at: string
  updated_at: string
}

export interface FriendRequest {
  id: number
  requester_id: string
  receiver_id: string
  requester_name?: string
  receiver_name?: string
  status: 'pending'
  created_at: string
}

/**
 * 发送好友请求
 */
export async function sendFriendRequest(
  requesterId: string, 
  receiverId: string,
  requesterName?: string,
  receiverName?: string
) {
  return fetchApi('/api/friends/request', {
    method: 'POST',
    body: JSON.stringify({ 
      requester_id: requesterId, 
      receiver_id: receiverId,
      requester_name: requesterName,
      receiver_name: receiverName
    }),
  })
}

/**
 * 处理好友请求
 */
export async function respondFriendRequest(
  receiverId: string,
  requesterId: string,
  status: 'accepted' | 'rejected'
) {
  return fetchApi('/api/friends/respond', {
    method: 'PATCH',
    body: JSON.stringify({ receiver_id: receiverId, requester_id: requesterId, status }),
  })
}

/**
 * 获取好友列表
 */
export async function getFriendList(userId: string): Promise<{ success: boolean; data: Friend[] }> {
  return fetchApi(`/api/friends?user_id=${userId}`)
}

/**
 * 获取待处理的好友请求
 */
export async function getFriendRequests(userId: string): Promise<{
  success: boolean
  data: { received: FriendRequest[]; sent: FriendRequest[] }
}> {
  return fetchApi(`/api/friends/requests?user_id=${userId}`)
}

/**
 * 删除好友
 */
export async function deleteFriend(userId: string, friendId: string) {
  return fetchApi(`/api/friends/${friendId}?user_id=${userId}`, {
    method: 'DELETE',
  })
}

// ==================== 帖子系统 ====================

export interface Post {
  id: number
  user_id: string
  user_name: string | null
  user_avatar: string | null
  title: string
  content: string
  category: string
  view_count: number
  like_count: number
  comment_count: number
  is_pinned: number
  is_deleted: number
  created_at: string
  updated_at: string
  isLiked?: boolean
}

export interface PostListResponse {
  success: boolean
  data: {
    posts: Post[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }
}

export type PostCategory = 
  | 'all'
  | 'general'
  | 'study_method'
  | 'review_experience'
  | 'practice_share'
  | 'help'

export const POST_CATEGORIES: { value: PostCategory; label: string; labelEn: string }[] = [
  { value: 'all', label: '全部', labelEn: 'All' },
  { value: 'general', label: '综合讨论', labelEn: 'General' },
  { value: 'study_method', label: '学习方法', labelEn: 'Study Method' },
  { value: 'review_experience', label: '复习经验', labelEn: 'Review Experience' },
  { value: 'practice_share', label: '刷题分享', labelEn: 'Practice Share' },
  { value: 'help', label: '求助提问', labelEn: 'Help' },
]

/**
 * 获取帖子列表
 */
export async function getPosts(
  category?: PostCategory,
  page = 1,
  limit = 20
): Promise<PostListResponse> {
  const params = new URLSearchParams()
  if (category && category !== 'all') params.set('category', category)
  params.set('page', String(page))
  params.set('limit', String(limit))
  return fetchApi(`/api/posts?${params}`)
}

/**
 * 获取帖子详情
 */
export async function getPostDetail(
  postId: number | string,
  userId?: string
): Promise<{ success: boolean; data: Post }> {
  const params = userId ? `?user_id=${userId}` : ''
  return fetchApi(`/api/posts/${postId}${params}`)
}

/**
 * 创建帖子
 */
export async function createPost(data: {
  user_id: string
  user_name?: string
  user_avatar?: string
  title: string
  content: string
  category?: PostCategory
}) {
  return fetchApi('/api/posts', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * 编辑帖子
 */
export async function updatePost(
  postId: number | string,
  data: {
    user_id: string
    title?: string
    content?: string
    category?: string
  }
) {
  return fetchApi(`/api/posts/${postId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

/**
 * 删除帖子
 */
export async function deletePost(postId: number | string, userId: string) {
  return fetchApi(`/api/posts/${postId}?user_id=${userId}`, {
    method: 'DELETE',
  })
}

/**
 * 点赞/取消点赞帖子
 */
export async function togglePostLike(postId: number | string, userId: string) {
  return fetchApi(`/api/posts/${postId}/like`, {
    method: 'POST',
    body: JSON.stringify({ user_id: userId }),
  })
}

// ==================== 评论系统 ====================

export interface Comment {
  id: number
  post_id: number
  user_id: string
  user_name: string | null
  user_avatar: string | null
  content: string
  parent_id: number | null
  like_count: number
  is_deleted: number
  created_at: string
}

/**
 * 获取帖子评论
 */
export async function getComments(
  postId: number | string,
  page = 1,
  limit = 50
): Promise<{ success: boolean; data: Comment[] }> {
  return fetchApi(`/api/posts/${postId}/comments?page=${page}&limit=${limit}`)
}

/**
 * 发表评论
 */
export async function createComment(
  postId: number | string,
  data: {
    user_id: string
    user_name?: string
    user_avatar?: string
    content: string
    parent_id?: number
  }
) {
  return fetchApi(`/api/posts/${postId}/comments`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * 删除评论
 */
export async function deleteComment(commentId: number | string, userId: string) {
  return fetchApi(`/api/comments/${commentId}?user_id=${userId}`, {
    method: 'DELETE',
  })
}

// ==================== 管理员 API ====================

/**
 * 管理员删除帖子
 */
export async function adminDeletePost(postId: number | string, adminKey: string) {
  return fetchApi(`/api/admin/community/posts/${postId}?admin_id=${adminKey}`, {
    method: 'DELETE',
  })
}

/**
 * 管理员删除评论
 */
export async function adminDeleteComment(commentId: number | string, adminKey: string) {
  return fetchApi(`/api/admin/community/comments/${commentId}?admin_id=${adminKey}`, {
    method: 'DELETE',
  })
}

/**
 * 管理员置顶帖子
 */
export async function adminPinPost(postId: number | string, adminKey: string) {
  return fetchApi(`/api/admin/community/posts/${postId}/pin`, {
    method: 'POST',
    headers: { 'X-Admin-Key': adminKey },
  })
}

/**
 * 获取社区统计
 */
export async function getCommunityStats(): Promise<{
  success: boolean
  data: {
    totalPosts: number
    totalComments: number
    todayPosts: number
    todayComments: number
  }
}> {
  return fetchApi('/api/admin/community/stats')
}
