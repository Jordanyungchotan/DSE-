/**
 * 好友系统页面
 */

import React, { useState, useEffect, useCallback } from 'react'
import { 
  Card, 
  Tabs, 
  List, 
  Avatar, 
  Button, 
  Space,
  Typography,
  message,
  Empty,
  Spin,
  Badge,
  Popconfirm,
  Select,
  Divider
} from 'antd'
import { 
  UserAddOutlined,
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
  TeamOutlined,
  UserOutlined,
  MessageOutlined
} from '@ant-design/icons'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useLanguageStore } from '../stores/languageStore'
import { useAuthStore } from '../stores/authStore'
import { 
  getFriendList,
  getFriendRequests,
  sendFriendRequest,
  respondFriendRequest,
  deleteFriend,
  searchUsers,
  getUsersBatch,
  Friend,
  FriendRequest,
  SearchUser
} from '../services/communityApi'
import styles from './CommunityPage.module.css'

const { Title, Text } = Typography

// 防抖函数
function debounce<T extends (arg: string) => void>(func: T, wait: number): (arg: string) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null
  return function (arg: string) {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(arg), wait)
  }
}

const FriendsPage: React.FC = () => {
  const { locale } = useLanguageStore()
  const { user, isAuthenticated } = useAuthStore()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isEnglish = locale === 'en'

  const [friends, setFriends] = useState<Friend[]>([])
  const [receivedRequests, setReceivedRequests] = useState<FriendRequest[]>([])
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'friends')
  const [sending, setSending] = useState(false)
  
  // 用户搜索相关状态
  const [searchResults, setSearchResults] = useState<SearchUser[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)

  const getUserId = () => user?.id || ''

  const fetchData = async () => {
    if (!isAuthenticated || !user?.id) {
      message.warning(isEnglish ? 'Please login first' : '请先登录')
      navigate('/login')
      return
    }
    const userId = user.id

    setLoading(true)
    try {
      const [friendsResult, requestsResult] = await Promise.all([
        getFriendList(userId),
        getFriendRequests(userId)
      ])

      if (friendsResult.success) {
        // 获取好友的头像信息
        const friendIds = friendsResult.data.map((f: Friend) => f.friend_id)
        if (friendIds.length > 0) {
          const usersInfo = await getUsersBatch(friendIds)
          if (usersInfo.success) {
            // 将头像信息合并到好友数据中
            const avatarMap = new Map(usersInfo.data.map(u => [u.id, u.avatar]))
            const friendsWithAvatars = friendsResult.data.map((f: Friend) => ({
              ...f,
              friend_avatar: avatarMap.get(f.friend_id) || null
            }))
            setFriends(friendsWithAvatars)
          } else {
            setFriends(friendsResult.data)
          }
        } else {
          setFriends(friendsResult.data)
        }
      }
      if (requestsResult.success) {
        setReceivedRequests(requestsResult.data.received)
        setSentRequests(requestsResult.data.sent)
      }
    } catch (error) {
      console.error('获取好友数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // 搜索用户
  const handleSearchUsers = useCallback(
    debounce(async (query: string) => {
      if (!query || query.length < 2) {
        setSearchResults([])
        return
      }
      setSearchLoading(true)
      try {
        const result = await searchUsers(query, user?.id)
        if (result.success) {
          setSearchResults(result.data || [])
        }
      } catch (error) {
        console.error('搜索用户失败:', error)
      } finally {
        setSearchLoading(false)
      }
    }, 300),
    [user?.id]
  )

  const handleSendRequest = async () => {
    if (!selectedUserId) {
      message.warning(isEnglish ? 'Please select a user' : '请选择要添加的用户')
      return
    }

    const userId = getUserId()
    if (selectedUserId === userId) {
      message.warning(isEnglish ? "Can't add yourself" : '不能添加自己为好友')
      return
    }

    // 获取选中用户的名称
    const selectedUser = searchResults.find(u => u.id === selectedUserId)
    const receiverName = selectedUser?.name

    setSending(true)
    try {
      const result = await sendFriendRequest(userId, selectedUserId, user?.name, receiverName)
      if (result.success) {
        message.success(isEnglish ? 'Friend request sent!' : '好友请求已发送！')
        setSelectedUserId(null)
        setSearchResults([])
        fetchData()
      } else {
        message.error(result.error || (isEnglish ? 'Failed to send request' : '发送请求失败'))
      }
    } catch (error) {
      message.error(isEnglish ? 'Failed to send request' : '发送请求失败')
    } finally {
      setSending(false)
    }
  }

  const handleRespond = async (requesterId: string, accept: boolean) => {
    const userId = getUserId()
    try {
      const result = await respondFriendRequest(userId, requesterId, accept ? 'accepted' : 'rejected')
      if (result.success) {
        message.success(accept 
          ? (isEnglish ? 'Friend added!' : '已添加好友！')
          : (isEnglish ? 'Request rejected' : '已拒绝请求')
        )
        fetchData()
      } else {
        message.error(result.error || (isEnglish ? 'Operation failed' : '操作失败'))
      }
    } catch (error) {
      message.error(isEnglish ? 'Operation failed' : '操作失败')
    }
  }

  const handleDeleteFriend = async (friendId: string) => {
    const userId = getUserId()
    try {
      const result = await deleteFriend(userId, friendId)
      if (result.success) {
        message.success(isEnglish ? 'Friend removed' : '已删除好友')
        fetchData()
      } else {
        message.error(result.error || (isEnglish ? 'Failed to remove' : '删除失败'))
      }
    } catch (error) {
      message.error(isEnglish ? 'Failed to remove' : '删除失败')
    }
  }

  const pendingCount = receivedRequests.length

  const tabItems = [
    {
      key: 'friends',
      label: (
        <Space>
          <TeamOutlined />
          {isEnglish ? 'Friends' : '好友列表'} ({friends.length})
        </Space>
      ),
      children: (
        <Spin spinning={loading}>
          {friends.length === 0 ? (
            <Empty 
              description={isEnglish ? 'No friends yet' : '暂无好友'}
              style={{ padding: 40 }}
            />
          ) : (
            <List
              dataSource={friends}
              renderItem={friend => (
                <div className={styles.friendCard}>
                  <div className={styles.friendInfo}>
                    <Avatar 
                      size={48} 
                      src={friend.friend_avatar}
                      style={{ backgroundColor: '#1890ff' }}
                    >
                      {(friend.friend_name || friend.friend_id)?.[0]?.toUpperCase() || 'U'}
                    </Avatar>
                    <div>
                      <Text strong>{friend.friend_name || friend.friend_id}</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {isEnglish ? 'Friends since' : '成为好友于'}: {new Date(friend.updated_at).toLocaleDateString()}
                      </Text>
                    </div>
                  </div>
                  <Space>
                    <Button 
                      type="primary" 
                      ghost
                      icon={<MessageOutlined />}
                      onClick={() => navigate(`/messages?chat=${friend.friend_id}&name=${encodeURIComponent(friend.friend_name || friend.friend_id)}`)}
                    >
                      {isEnglish ? 'Message' : '私信'}
                    </Button>
                    <Popconfirm
                      title={isEnglish ? 'Remove this friend?' : '确定删除这个好友吗？'}
                      onConfirm={() => handleDeleteFriend(friend.friend_id)}
                      okText={isEnglish ? 'Yes' : '确定'}
                      cancelText={isEnglish ? 'No' : '取消'}
                    >
                      <Button type="text" danger icon={<DeleteOutlined />}>
                        {isEnglish ? 'Remove' : '删除'}
                      </Button>
                    </Popconfirm>
                  </Space>
                </div>
              )}
            />
          )}
        </Spin>
      )
    },
    {
      key: 'requests',
      label: (
        <Badge count={pendingCount} offset={[10, 0]}>
          <Space>
            <UserAddOutlined />
            {isEnglish ? 'Requests' : '好友请求'}
          </Space>
        </Badge>
      ),
      children: (
        <Spin spinning={loading}>
          <Title level={5}>{isEnglish ? 'Received Requests' : '收到的请求'}</Title>
          {receivedRequests.length === 0 ? (
            <Empty 
              description={isEnglish ? 'No pending requests' : '暂无待处理请求'}
              style={{ padding: 20 }}
            />
          ) : (
            <List
              dataSource={receivedRequests}
              renderItem={request => (
                <div className={styles.friendCard}>
                  <div className={styles.friendInfo}>
                    <Avatar size={48} style={{ backgroundColor: '#52c41a' }}>
                      {(request.requester_name || request.requester_id)?.[0]?.toUpperCase() || 'U'}
                    </Avatar>
                    <div>
                      <Text strong>{request.requester_name || request.requester_id}</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {new Date(request.created_at).toLocaleString()}
                      </Text>
                    </div>
                  </div>
                  <div className={styles.requestActions}>
                    <Button 
                      type="primary" 
                      icon={<CheckOutlined />}
                      onClick={() => handleRespond(request.requester_id, true)}
                    >
                      {isEnglish ? 'Accept' : '接受'}
                    </Button>
                    <Button 
                      danger
                      icon={<CloseOutlined />}
                      onClick={() => handleRespond(request.requester_id, false)}
                    >
                      {isEnglish ? 'Reject' : '拒绝'}
                    </Button>
                  </div>
                </div>
              )}
            />
          )}

          <Title level={5} style={{ marginTop: 24 }}>
            {isEnglish ? 'Sent Requests' : '发出的请求'}
          </Title>
          {sentRequests.length === 0 ? (
            <Empty 
              description={isEnglish ? 'No sent requests' : '暂无发出的请求'}
              style={{ padding: 20 }}
            />
          ) : (
            <List
              dataSource={sentRequests}
              renderItem={request => (
                <div className={styles.friendCard}>
                  <div className={styles.friendInfo}>
                    <Avatar size={48} style={{ backgroundColor: '#faad14' }}>
                      {(request.receiver_name || request.receiver_id)?.[0]?.toUpperCase() || 'U'}
                    </Avatar>
                    <div>
                      <Text strong>{request.receiver_name || request.receiver_id}</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {isEnglish ? 'Pending...' : '等待对方确认...'}
                      </Text>
                    </div>
                  </div>
                </div>
              )}
            />
          )}
        </Spin>
      )
    },
    {
      key: 'add',
      label: (
        <Space>
          <UserAddOutlined />
          {isEnglish ? 'Add Friend' : '添加好友'}
        </Space>
      ),
      children: (
        <div style={{ maxWidth: 500, margin: '40px auto', textAlign: 'center' }}>
          <UserAddOutlined style={{ fontSize: 64, color: '#1890ff', marginBottom: 24 }} />
          <Title level={4}>
            {isEnglish ? 'Add a Friend' : '添加好友'}
          </Title>
          <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
            {isEnglish 
              ? 'Search by name or email to find and add friends'
              : '通过名称或邮箱搜索并添加好友'}
          </Text>
          
          <div style={{ marginBottom: 16 }}>
            <Select
              showSearch
              allowClear
              style={{ width: '100%' }}
              placeholder={isEnglish ? 'Type name or email to search...' : '输入名称或邮箱搜索用户...'}
              value={selectedUserId}
              onChange={(value) => setSelectedUserId(value)}
              onSearch={handleSearchUsers}
              loading={searchLoading}
              filterOption={false}
              notFoundContent={
                searchLoading ? (
                  <Spin size="small" />
                ) : searchResults.length === 0 ? (
                  <Empty 
                    description={isEnglish ? 'Type at least 2 characters to search' : '请输入至少2个字符进行搜索'} 
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                ) : null
              }
              optionLabelProp="label"
              options={searchResults.map(user => ({
                value: user.id,
                label: `${user.name} (${user.email})`,
                data: user
              }))}
              optionRender={(option) => {
                const user = option.data?.data as SearchUser | undefined
                if (!user) return option.label
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
                    <Avatar 
                      size={36} 
                      src={user.avatar}
                      icon={<UserOutlined />}
                      style={{ backgroundColor: '#1890ff', flexShrink: 0 }}
                    />
                    <div style={{ textAlign: 'left', overflow: 'hidden' }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{user.name}</div>
                      <div style={{ fontSize: 12, color: '#888', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</div>
                    </div>
                  </div>
                )
              }}
            />
          </div>
          
          <Button 
            type="primary" 
            size="large"
            loading={sending}
            onClick={handleSendRequest}
            disabled={!selectedUserId}
            icon={<UserAddOutlined />}
            style={{ width: '100%' }}
          >
            {isEnglish ? 'Send Friend Request' : '发送好友请求'}
          </Button>
          
          <Divider />
          
          <Text type="secondary" style={{ fontSize: 12 }}>
            {isEnglish 
              ? 'Your friend will receive a notification and can accept or decline your request'
              : '对方会收到通知，可以选择接受或拒绝您的好友请求'}
          </Text>
        </div>
      )
    }
  ]

  return (
    <div className={styles.friendsContainer}>
      <Card
        title={
          <Space>
            <TeamOutlined />
            <Title level={4} style={{ margin: 0 }}>
              {isEnglish ? 'Friends' : '好友'}
            </Title>
          </Space>
        }
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
        />
      </Card>
    </div>
  )
}

export default FriendsPage
