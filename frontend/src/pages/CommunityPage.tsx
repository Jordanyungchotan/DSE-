/**
 * 学习社区"量子纠缠" - 帖子列表页面
 */

import React, { useState, useEffect, useCallback } from 'react'
import { 
  Card, 
  List, 
  Avatar, 
  Button, 
  Tag, 
  Space, 
  Tabs, 
  Empty, 
  Spin, 
  message,
  Badge,
  Typography,
  Input
} from 'antd'
import { 
  PlusOutlined, 
  LikeOutlined, 
  LikeFilled,
  MessageOutlined, 
  EyeOutlined,
  PushpinOutlined,
  SearchOutlined,
  TeamOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useLanguageStore } from '../stores/languageStore'
import { useAuthStore } from '../stores/authStore'
import { 
  getPosts, 
  togglePostLike, 
  Post, 
  PostCategory, 
  POST_CATEGORIES 
} from '../services/communityApi'
import styles from './CommunityPage.module.css'

const { Title, Text, Paragraph } = Typography
const { Search } = Input

const CommunityPage: React.FC = () => {
  const { locale } = useLanguageStore()
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const isEnglish = locale === 'en'

  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState<PostCategory>('all')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [searchText, setSearchText] = useState('')

  // 获取当前用户ID
  const getUserId = () => user?.id || ''

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getPosts(category, page, 20)
      if (result.success) {
        setPosts(result.data.posts)
        setTotal(result.data.pagination.total)
      }
    } catch (error) {
      console.error('获取帖子失败:', error)
      message.error('获取帖子失败')
    } finally {
      setLoading(false)
    }
  }, [category, page])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  const handleLike = async (e: React.MouseEvent, post: Post) => {
    e.stopPropagation()
    const userId = getUserId()
    if (!userId) {
      message.warning('请先登录')
      navigate('/login')
      return
    }

    try {
      const result = await togglePostLike(post.id, userId)
      if (result.success) {
        setPosts(prev => prev.map(p => 
          p.id === post.id 
            ? { 
                ...p, 
                isLiked: result.liked, 
                like_count: result.liked ? p.like_count + 1 : p.like_count - 1 
              } 
            : p
        ))
      }
    } catch (error) {
      console.error('点赞失败:', error)
    }
  }

  const getCategoryLabel = (cat: string) => {
    const found = POST_CATEGORIES.find(c => c.value === cat)
    return found ? (isEnglish ? found.labelEn : found.label) : cat
  }

  const getCategoryColor = (cat: string) => {
    const colors: Record<string, string> = {
      general: 'blue',
      study_method: 'green',
      review_experience: 'orange',
      practice_share: 'purple',
      help: 'red'
    }
    return colors[cat] || 'default'
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    if (diff < 60000) return isEnglish ? 'Just now' : '刚刚'
    if (diff < 3600000) return `${Math.floor(diff / 60000)} ${isEnglish ? 'min ago' : '分钟前'}`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} ${isEnglish ? 'hour ago' : '小时前'}`
    if (diff < 604800000) return `${Math.floor(diff / 86400000)} ${isEnglish ? 'day ago' : '天前'}`
    return date.toLocaleDateString()
  }

  const filteredPosts = searchText 
    ? posts.filter(p => 
        p.title.toLowerCase().includes(searchText.toLowerCase()) ||
        p.content.toLowerCase().includes(searchText.toLowerCase())
      )
    : posts

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <TeamOutlined className={styles.headerIcon} />
          <div>
            <Title level={2} className={styles.title}>
              {isEnglish ? 'Quantum Entanglement' : '量子纠缠'}
            </Title>
            <Text type="secondary">
              {isEnglish 
                ? 'DSE Learning Community - Share, Discuss, Grow Together'
                : 'DSE 学习社区 - 分享经验，互助成长'}
            </Text>
          </div>
        </div>
        <Button 
          type="primary" 
          icon={<PlusOutlined />}
          size="large"
          onClick={() => navigate('/community/new')}
        >
          {isEnglish ? 'New Post' : '发布帖子'}
        </Button>
      </div>

      <Card className={styles.mainCard}>
        <div className={styles.toolbar}>
          <Tabs
            activeKey={category}
            onChange={(key) => {
              setCategory(key as PostCategory)
              setPage(1)
            }}
            items={POST_CATEGORIES.map(cat => ({
              key: cat.value,
              label: isEnglish ? cat.labelEn : cat.label
            }))}
          />
          <Search
            placeholder={isEnglish ? 'Search posts...' : '搜索帖子...'}
            allowClear
            style={{ width: 250 }}
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            prefix={<SearchOutlined />}
          />
        </div>

        <Spin spinning={loading}>
          {filteredPosts.length === 0 ? (
            <Empty 
              description={isEnglish ? 'No posts yet' : '暂无帖子'}
              style={{ padding: 60 }}
            >
              <Button type="primary" onClick={() => navigate('/community/new')}>
                {isEnglish ? 'Be the first to post!' : '来发布第一个帖子吧！'}
              </Button>
            </Empty>
          ) : (
            <List
              itemLayout="vertical"
              dataSource={filteredPosts}
              pagination={{
                current: page,
                pageSize: 20,
                total,
                onChange: setPage,
                showSizeChanger: false
              }}
              renderItem={post => (
                <List.Item
                  className={`${styles.postItem} ${post.is_pinned ? styles.pinned : ''}`}
                  onClick={() => navigate(`/community/post/${post.id}`)}
                  actions={[
                    <Space key="views">
                      <EyeOutlined />
                      {post.view_count}
                    </Space>,
                    <Space 
                      key="likes" 
                      onClick={(e) => handleLike(e, post)}
                      className={styles.likeAction}
                    >
                      {post.isLiked ? <LikeFilled style={{ color: '#1890ff' }} /> : <LikeOutlined />}
                      {post.like_count}
                    </Space>,
                    <Space key="comments">
                      <MessageOutlined />
                      {post.comment_count}
                    </Space>,
                    <Text key="time" type="secondary" style={{ fontSize: 12 }}>
                      {formatTime(post.created_at)}
                    </Text>
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <Avatar 
                        src={post.user_avatar} 
                        style={{ backgroundColor: '#1890ff' }}
                      >
                        {post.user_name?.[0] || 'U'}
                      </Avatar>
                    }
                    title={
                      <div className={styles.postTitle}>
                        {post.is_pinned ? (
                          <Badge 
                            count={<PushpinOutlined style={{ color: '#f50' }} />} 
                            offset={[-8, 0]}
                          >
                            <span>{post.title}</span>
                          </Badge>
                        ) : (
                          <span>{post.title}</span>
                        )}
                        <Tag color={getCategoryColor(post.category)}>
                          {getCategoryLabel(post.category)}
                        </Tag>
                      </div>
                    }
                    description={
                      <Text type="secondary" style={{ fontSize: 13 }}>
                        {post.user_name || 'Anonymous'}
                      </Text>
                    }
                  />
                  <Paragraph 
                    ellipsis={{ rows: 2 }} 
                    className={styles.postContent}
                  >
                    {post.content}
                  </Paragraph>
                </List.Item>
              )}
            />
          )}
        </Spin>
      </Card>
    </div>
  )
}

export default CommunityPage
