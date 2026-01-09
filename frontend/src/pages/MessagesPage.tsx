/**
 * 通知和私信页面
 */

import React, { useState, useEffect, useRef } from 'react'
import { 
  Card, 
  Tabs, 
  List, 
  Avatar, 
  Button, 
  Input, 
  Badge,
  Typography,
  message,
  Empty,
  Spin,
  Space
} from 'antd'
import { 
  BellOutlined,
  MessageOutlined,
  CheckOutlined,
  SendOutlined,
  ArrowLeftOutlined
} from '@ant-design/icons'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useLanguageStore } from '../stores/languageStore'
import { useAuthStore } from '../stores/authStore'
import { 
  getNotifications,
  markNotificationRead,
  getConversations,
  getMessages,
  sendMessage,
  Notification,
  Conversation,
  Message
} from '../services/messageApi'
import { getUsersBatch } from '../services/communityApi'
import styles from './MessagesPage.module.css'

const { Title, Text } = Typography
const { TextArea } = Input

const MessagesPage: React.FC = () => {
  const { locale } = useLanguageStore()
  const { user, isAuthenticated } = useAuthStore()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isEnglish = locale === 'en'

  // 检查 URL 参数是否有直接打开聊天的请求
  const chatUserId = searchParams.get('chat')
  const chatUserName = searchParams.get('name')

  const [activeTab, setActiveTab] = useState(chatUserId ? 'messages' : (searchParams.get('tab') || 'notifications'))
  const [loading, setLoading] = useState(true)
  
  // 通知相关
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  
  // 私信相关
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<string | null>(chatUserId)
  const [selectedConversationName, setSelectedConversationName] = useState<string | null>(chatUserName ? decodeURIComponent(chatUserName) : null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      navigate('/login')
      return
    }
    
    // 如果有 chatUserId，直接加载消息
    if (chatUserId) {
      setActiveTab('messages')
      setSelectedConversation(chatUserId)
      setSelectedConversationName(chatUserName ? decodeURIComponent(chatUserName) : null)
      loadMessages(chatUserId)
    } else if (activeTab === 'notifications') {
      loadNotifications()
    } else {
      loadConversations()
    }
  }, [activeTab, isAuthenticated, user, chatUserId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadNotifications = async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const result = await getNotifications(user.id)
      if (result.success) {
        setNotifications(result.data.notifications)
        setUnreadNotifications(result.data.unreadCount)
      }
    } catch (error) {
      console.error('加载通知失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadConversations = async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const result = await getConversations(user.id)
      if (result.success) {
        // 获取所有会话用户的头像
        const userIds = result.data.map((c: Conversation) => c.other_user_id)
        if (userIds.length > 0) {
          const usersInfo = await getUsersBatch(userIds)
          if (usersInfo.success) {
            const avatarMap = new Map(usersInfo.data.map(u => [u.id, u.avatar]))
            const conversationsWithAvatars = result.data.map((c: Conversation) => ({
              ...c,
              other_user_avatar: avatarMap.get(c.other_user_id) || null
            }))
            setConversations(conversationsWithAvatars)
          } else {
            setConversations(result.data)
          }
        } else {
          setConversations(result.data)
        }
      }
    } catch (error) {
      console.error('加载会话失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadMessages = async (otherUserId: string) => {
    if (!user?.id) return
    setLoading(true)
    try {
      const result = await getMessages(user.id, otherUserId)
      if (result.success) {
        setMessages(result.data)
      }
    } catch (error) {
      console.error('加载消息失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAllRead = async () => {
    if (!user?.id) return
    try {
      await markNotificationRead(user.id, undefined, true)
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })))
      setUnreadNotifications(0)
      message.success(isEnglish ? 'All marked as read' : '已全部标记为已读')
    } catch (error) {
      message.error(isEnglish ? 'Operation failed' : '操作失败')
    }
  }

  const handleSelectConversation = (otherUserId: string, otherUserName?: string) => {
    setSelectedConversation(otherUserId)
    setSelectedConversationName(otherUserName || otherUserId)
    loadMessages(otherUserId)
  }

  const handleSendMessage = async () => {
    if (!user?.id || !selectedConversation || !newMessage.trim()) return
    
    setSending(true)
    try {
      const result = await sendMessage(user.id, selectedConversation, newMessage.trim(), user.name)
      if (result.success) {
        setNewMessage('')
        loadMessages(selectedConversation)
      } else {
        message.error(result.error || (isEnglish ? 'Failed to send' : '发送失败'))
      }
    } catch (error) {
      message.error(isEnglish ? 'Failed to send' : '发送失败')
    } finally {
      setSending(false)
    }
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    if (diff < 60000) return isEnglish ? 'Just now' : '刚刚'
    if (diff < 3600000) return `${Math.floor(diff / 60000)} ${isEnglish ? 'min ago' : '分钟前'}`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} ${isEnglish ? 'hour ago' : '小时前'}`
    return date.toLocaleDateString()
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'message': return <MessageOutlined style={{ color: '#1890ff' }} />
      case 'like': return <span>👍</span>
      case 'comment': return <span>💬</span>
      case 'friend': return <span>👥</span>
      case 'friend_request': return <span>📬</span>
      default: return <BellOutlined style={{ color: '#faad14' }} />
    }
  }

  // 处理通知点击
  const handleNotificationClick = async (notification: Notification) => {
    // 先标记为已读
    if (!notification.is_read && user?.id) {
      try {
        await markNotificationRead(user.id, notification.id)
        setNotifications(prev => 
          prev.map(n => n.id === notification.id ? { ...n, is_read: 1 } : n)
        )
        setUnreadNotifications(prev => Math.max(0, prev - 1))
      } catch (error) {
        console.error('标记已读失败:', error)
      }
    }

    // 根据通知类型跳转
    switch (notification.type) {
      case 'friend_request':
      case 'friend':
        navigate('/friends?tab=requests')
        break
      case 'message':
        if (notification.related_id) {
          setActiveTab('messages')
          // 如果有相关ID，可以选择对应的会话
        }
        break
      case 'comment':
        if (notification.related_id) {
          navigate(`/community/post/${notification.related_id}`)
        }
        break
      case 'like':
        if (notification.related_id) {
          navigate(`/community/post/${notification.related_id}`)
        }
        break
      default:
        // 其他类型可以不跳转，或跳转到通用页面
        break
    }
  }

  // 渲染通知列表
  const renderNotifications = () => (
    <div className={styles.notificationList}>
      <div className={styles.listHeader}>
        <Title level={5} style={{ margin: 0 }}>
          {isEnglish ? 'Notifications' : '通知'}
        </Title>
        {unreadNotifications > 0 && (
          <Button size="small" icon={<CheckOutlined />} onClick={handleMarkAllRead}>
            {isEnglish ? 'Mark all read' : '全部已读'}
          </Button>
        )}
      </div>
      
      <Spin spinning={loading}>
        {notifications.length === 0 ? (
          <Empty description={isEnglish ? 'No notifications' : '暂无通知'} />
        ) : (
          <List
            dataSource={notifications}
            renderItem={item => (
              <List.Item 
                className={`${styles.notificationItem} ${!item.is_read ? styles.unread : ''}`}
                onClick={() => handleNotificationClick(item)}
                style={{ cursor: 'pointer' }}
              >
                <List.Item.Meta
                  avatar={getNotificationIcon(item.type)}
                  title={
                    <span style={{ color: !item.is_read ? '#1890ff' : 'inherit' }}>
                      {item.title}
                    </span>
                  }
                  description={
                    <div>
                      {item.content && <Text type="secondary">{item.content}</Text>}
                      <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                        {formatTime(item.created_at)}
                      </Text>
                    </div>
                  }
                />
                {!item.is_read && (
                  <div style={{ 
                    width: 8, 
                    height: 8, 
                    borderRadius: '50%', 
                    backgroundColor: '#1890ff',
                    marginLeft: 8 
                  }} />
                )}
              </List.Item>
            )}
          />
        )}
      </Spin>
    </div>
  )

  // 渲染私信会话列表
  const renderConversations = () => (
    <div className={styles.conversationList}>
      <Title level={5}>{isEnglish ? 'Messages' : '私信'}</Title>
      
      <Spin spinning={loading}>
        {conversations.length === 0 ? (
          <Empty description={isEnglish ? 'No messages' : '暂无私信'} />
        ) : (
          <List
            dataSource={conversations}
            renderItem={conv => {
              const displayName = conv.other_user_name || conv.other_user_id
              return (
                <List.Item 
                  className={styles.conversationItem}
                  onClick={() => handleSelectConversation(conv.other_user_id, conv.other_user_name)}
                >
                  <List.Item.Meta
                    avatar={
                      <Badge count={conv.unread_count} size="small">
                        <Avatar 
                          src={conv.other_user_avatar}
                          style={{ backgroundColor: '#1890ff' }}
                        >
                          {displayName[0]?.toUpperCase()}
                        </Avatar>
                      </Badge>
                    }
                    title={displayName}
                    description={
                      <Text type="secondary" ellipsis>
                        {conv.last_message?.content}
                      </Text>
                    }
                  />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {conv.last_message && formatTime(conv.last_message.created_at)}
                  </Text>
                </List.Item>
              )
            }}
          />
        )}
      </Spin>
    </div>
  )

  // 渲染聊天窗口
  const renderChatWindow = () => (
    <div className={styles.chatWindow}>
      <div className={styles.chatHeader}>
        <Button 
          icon={<ArrowLeftOutlined />} 
          type="text"
          onClick={() => {
            setSelectedConversation(null)
            setSelectedConversationName(null)
            // 清除 URL 参数
            navigate('/messages', { replace: true })
          }}
        />
        <Title level={5} style={{ margin: 0 }}>{selectedConversationName || selectedConversation}</Title>
      </div>
      
      <div className={styles.chatMessages}>
        <Spin spinning={loading}>
          {messages.map(msg => (
            <div 
              key={msg.id}
              className={`${styles.messageItem} ${msg.sender_id === user?.id ? styles.sent : styles.received}`}
            >
              <div className={styles.messageBubble}>
                {msg.content}
              </div>
              <Text type="secondary" style={{ fontSize: 11 }}>
                {formatTime(msg.created_at)}
              </Text>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </Spin>
      </div>
      
      <div className={styles.chatInput}>
        <TextArea
          placeholder={isEnglish ? 'Type a message...' : '输入消息...'}
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          autoSize={{ minRows: 1, maxRows: 4 }}
          onPressEnter={e => {
            if (!e.shiftKey) {
              e.preventDefault()
              handleSendMessage()
            }
          }}
        />
        <Button 
          type="primary" 
          icon={<SendOutlined />}
          loading={sending}
          onClick={handleSendMessage}
          disabled={!newMessage.trim()}
        />
      </div>
    </div>
  )

  const tabItems = [
    {
      key: 'notifications',
      label: (
        <Badge count={unreadNotifications} size="small" offset={[10, 0]}>
          <Space>
            <BellOutlined />
            {isEnglish ? 'Notifications' : '通知'}
          </Space>
        </Badge>
      ),
      children: renderNotifications()
    },
    {
      key: 'messages',
      label: (
        <Space>
          <MessageOutlined />
          {isEnglish ? 'Messages' : '私信'}
        </Space>
      ),
      children: selectedConversation ? renderChatWindow() : renderConversations()
    }
  ]

  return (
    <div className={styles.container}>
      <Card className={styles.mainCard}>
        <Tabs
          activeKey={activeTab}
          onChange={key => {
            setActiveTab(key)
            setSelectedConversation(null)
          }}
          items={tabItems}
        />
      </Card>
    </div>
  )
}

export default MessagesPage
