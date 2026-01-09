/**
 * 通知和私信系统 API 封装
 */

const RAG_API_BASE = import.meta.env.VITE_RAG_API_URL || 'https://dse-rag-questions.jordanyungchotan.workers.dev'

async function ragFetch(endpoint: string, options?: RequestInit) {
  const response = await fetch(`${RAG_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })
  return response.json()
}

// ==================== 通知 ====================

export interface Notification {
  id: number
  user_id: string
  type: string
  title: string
  content: string | null
  related_id: number | null
  related_type: string | null
  is_read: number
  created_at: string
}

/**
 * 获取通知列表
 */
export async function getNotifications(userId: string): Promise<{
  success: boolean
  data: {
    notifications: Notification[]
    unreadCount: number
  }
}> {
  return ragFetch(`/api/notifications?user_id=${userId}`)
}

/**
 * 标记通知为已读
 */
export async function markNotificationRead(userId: string, notificationId?: number, all?: boolean) {
  return ragFetch('/api/notifications/read', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, notification_id: notificationId, all }),
  })
}

// ==================== 私信 ====================

export interface Message {
  id: number
  sender_id: string
  receiver_id: string
  content: string
  is_read: number
  created_at: string
}

export interface Conversation {
  other_user_id: string
  other_user_name?: string
  other_user_avatar?: string | null
  last_message: Message | null
  unread_count: number
}

/**
 * 获取会话列表
 */
export async function getConversations(userId: string): Promise<{
  success: boolean
  data: Conversation[]
}> {
  return ragFetch(`/api/messages/conversations?user_id=${userId}`)
}

/**
 * 获取与某用户的消息记录
 */
export async function getMessages(userId: string, otherUserId: string): Promise<{
  success: boolean
  data: Message[]
}> {
  return ragFetch(`/api/messages/${otherUserId}?user_id=${userId}`)
}

/**
 * 发送私信
 */
export async function sendMessage(senderId: string, receiverId: string, content: string, senderName?: string) {
  return ragFetch('/api/messages', {
    method: 'POST',
    body: JSON.stringify({ 
      sender_id: senderId, 
      receiver_id: receiverId, 
      content,
      sender_name: senderName
    }),
  })
}

/**
 * 获取未读消息总数
 */
export async function getUnreadCount(userId: string): Promise<{
  success: boolean
  data: {
    notifications: number
    messages: number
    total: number
  }
}> {
  return ragFetch(`/api/messages/unread/count?user_id=${userId}`)
}
