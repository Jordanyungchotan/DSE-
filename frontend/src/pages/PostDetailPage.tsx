/**
 * 帖子详情页面
 */

import React, { useState, useEffect } from 'react'
import { 
  Card, 
  Avatar, 
  Button, 
  Tag, 
  Space, 
  Input, 
  Typography,
  message,
  Spin,
  Popconfirm,
  Divider,
  Modal,
  Select
} from 'antd'
import { 
  ArrowLeftOutlined,
  LikeOutlined, 
  LikeFilled,
  MessageOutlined,
  EyeOutlined,
  DeleteOutlined,
  PushpinOutlined,
  EditOutlined
} from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import { useLanguageStore } from '../stores/languageStore'
import { useAuthStore } from '../stores/authStore'
import { 
  getPostDetail, 
  getComments,
  createComment,
  deleteComment,
  togglePostLike,
  deletePost,
  updatePost,
  Post,
  Comment,
  POST_CATEGORIES,
  PostCategory
} from '../services/communityApi'
import styles from './CommunityPage.module.css'

const { Title, Text } = Typography
const { TextArea } = Input

const PostDetailPage: React.FC = () => {
  const { locale } = useLanguageStore()
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const { postId } = useParams<{ postId: string }>()
  const isEnglish = locale === 'en'

  const [post, setPost] = useState<Post | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  
  // 回复相关状态
  const [replyTo, setReplyTo] = useState<Comment | null>(null)
  const [replyText, setReplyText] = useState('')
  
  // 编辑相关状态
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editCategory, setEditCategory] = useState<PostCategory>('general')
  const [editLoading, setEditLoading] = useState(false)

  const getUserId = () => user?.id || ''
  const getUserName = () => user?.name || ''

  useEffect(() => {
    const fetchData = async () => {
      if (!postId) return
      setLoading(true)
      try {
        const userId = getUserId()
        const [postResult, commentsResult] = await Promise.all([
          getPostDetail(postId, userId),
          getComments(postId)
        ])
        
        if (postResult.success) {
          setPost(postResult.data)
        } else {
          message.error('帖子不存在')
          navigate('/community')
        }
        
        if (commentsResult.success) {
          setComments(commentsResult.data)
        }
      } catch (error) {
        console.error('获取帖子详情失败:', error)
        message.error('获取帖子详情失败')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [postId, navigate])

  const handleLike = async () => {
    if (!post) return
    const userId = getUserId()
    if (!userId) {
      message.warning('请先登录')
      navigate('/login')
      return
    }

    try {
      const result = await togglePostLike(post.id, userId)
      if (result.success) {
        setPost(prev => prev ? {
          ...prev,
          isLiked: result.liked,
          like_count: result.liked ? prev.like_count + 1 : prev.like_count - 1
        } : null)
      }
    } catch (error) {
      console.error('点赞失败:', error)
    }
  }

  const handleSubmitComment = async (parentId?: number) => {
    const text = parentId ? replyText : commentText
    if (!text.trim()) {
      message.warning(isEnglish ? 'Please enter comment' : '请输入评论内容')
      return
    }
    
    const userId = getUserId()
    if (!userId) {
      message.warning(isEnglish ? 'Please login first' : '请先登录')
      navigate('/login')
      return
    }

    setSubmitting(true)
    try {
      const result = await createComment(postId!, {
        user_id: userId,
        user_name: getUserName(),
        user_avatar: user?.avatar,
        content: text.trim(),
        parent_id: parentId
      })
      
      if (result.success) {
        message.success(isEnglish ? 'Comment posted' : '评论成功')
        if (parentId) {
          setReplyText('')
          setReplyTo(null)
        } else {
          setCommentText('')
        }
        // 刷新评论列表
        const commentsResult = await getComments(postId!)
        if (commentsResult.success) {
          setComments(commentsResult.data)
        }
        // 更新评论数
        setPost(prev => prev ? { ...prev, comment_count: prev.comment_count + 1 } : null)
      } else {
        message.error(result.error || (isEnglish ? 'Failed' : '评论失败'))
      }
    } catch (error) {
      console.error('评论失败:', error)
      message.error(isEnglish ? 'Failed' : '评论失败')
    } finally {
      setSubmitting(false)
    }
  }

  // 构建嵌套评论结构
  const buildCommentTree = (comments: Comment[]) => {
    const commentMap = new Map<number, Comment & { replies: Comment[] }>()
    const rootComments: (Comment & { replies: Comment[] })[] = []

    // 初始化所有评论
    comments.forEach(c => {
      commentMap.set(c.id, { ...c, replies: [] })
    })

    // 构建树结构
    comments.forEach(c => {
      const comment = commentMap.get(c.id)!
      if (c.parent_id && commentMap.has(c.parent_id)) {
        commentMap.get(c.parent_id)!.replies.push(comment)
      } else {
        rootComments.push(comment)
      }
    })

    return rootComments
  }

  const commentTree = buildCommentTree(comments)

  const handleDeleteComment = async (commentId: number) => {
    const userId = getUserId()
    try {
      const result = await deleteComment(commentId, userId)
      if (result.success) {
        message.success('删除成功')
        setComments(prev => prev.filter(c => c.id !== commentId))
        setPost(prev => prev ? { ...prev, comment_count: prev.comment_count - 1 } : null)
      } else {
        message.error(result.error || '删除失败')
      }
    } catch (error) {
      message.error('删除失败')
    }
  }

  const handleDeletePost = async () => {
    if (!post) return
    const userId = getUserId()
    try {
      const result = await deletePost(post.id, userId)
      if (result.success) {
        message.success('删除成功')
        navigate('/community')
      } else {
        message.error(result.error || '删除失败')
      }
    } catch (error) {
      message.error('删除失败')
    }
  }

  // 打开编辑模态框
  const handleOpenEdit = () => {
    if (!post) return
    setEditTitle(post.title)
    setEditContent(post.content)
    setEditCategory(post.category as PostCategory)
    setEditModalVisible(true)
  }

  // 保存编辑
  const handleSaveEdit = async () => {
    if (!post || !user?.id) return
    
    if (!editTitle.trim()) {
      message.warning(isEnglish ? 'Title is required' : '请输入标题')
      return
    }
    if (!editContent.trim()) {
      message.warning(isEnglish ? 'Content is required' : '请输入内容')
      return
    }

    setEditLoading(true)
    try {
      const result = await updatePost(post.id, {
        user_id: user.id,
        title: editTitle.trim(),
        content: editContent.trim(),
        category: editCategory
      })
      
      if (result.success) {
        message.success(isEnglish ? 'Post updated!' : '更新成功！')
        // 更新本地状态
        setPost(prev => prev ? {
          ...prev,
          title: editTitle.trim(),
          content: editContent.trim(),
          category: editCategory
        } : null)
        setEditModalVisible(false)
      } else {
        message.error(result.error || (isEnglish ? 'Update failed' : '更新失败'))
      }
    } catch (error) {
      console.error('更新失败:', error)
      message.error(isEnglish ? 'Update failed' : '更新失败')
    } finally {
      setEditLoading(false)
    }
  }

  const getCategoryLabel = (cat: string) => {
    const found = POST_CATEGORIES.find(c => c.value === cat)
    return found ? (isEnglish ? found.labelEn : found.label) : cat
  }

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString()
  }

  if (loading) {
    return (
      <div className={styles.detailContainer}>
        <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />
      </div>
    )
  }

  if (!post) {
    return null
  }

  const isOwner = post.user_id === getUserId()

  return (
    <div className={styles.detailContainer}>
      <Button 
        icon={<ArrowLeftOutlined />} 
        onClick={() => navigate('/community')}
        className={styles.backButton}
      >
        {isEnglish ? 'Back' : '返回'}
      </Button>

      <Card className={styles.postCard}>
        <div className={styles.postHeader}>
          <div className={styles.authorInfo}>
            <Avatar 
              size={48}
              src={post.user_avatar}
              style={{ backgroundColor: '#1890ff' }}
            >
              {post.user_name?.[0] || 'U'}
            </Avatar>
            <div className={styles.authorMeta}>
              <Text strong>{post.user_name || 'Anonymous'}</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {formatTime(post.created_at)}
              </Text>
            </div>
          </div>
          <Space>
            <Tag color="blue">{getCategoryLabel(post.category)}</Tag>
            {post.is_pinned ? (
              <Tag icon={<PushpinOutlined />} color="orange">
                {isEnglish ? 'Pinned' : '置顶'}
              </Tag>
            ) : null}
            {isOwner && (
              <>
                <Button 
                  type="text" 
                  icon={<EditOutlined />} 
                  onClick={handleOpenEdit}
                />
                <Popconfirm
                  title={isEnglish ? 'Delete this post?' : '确定删除这篇帖子吗？'}
                  onConfirm={handleDeletePost}
                  okText={isEnglish ? 'Yes' : '确定'}
                  cancelText={isEnglish ? 'No' : '取消'}
                >
                  <Button type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </>
            )}
          </Space>
        </div>

        <Title level={3}>{post.title}</Title>

        <div className={styles.postBody}>
          {post.content}
        </div>

        <div className={styles.postActions}>
          <div 
            className={`${styles.actionBtn} ${post.isLiked ? styles.liked : ''}`}
            onClick={handleLike}
          >
            {post.isLiked ? <LikeFilled /> : <LikeOutlined />}
            <span>{post.like_count}</span>
          </div>
          <div className={styles.actionBtn}>
            <MessageOutlined />
            <span>{post.comment_count}</span>
          </div>
          <div className={styles.actionBtn}>
            <EyeOutlined />
            <span>{post.view_count}</span>
          </div>
        </div>
      </Card>

      {/* 评论区 */}
      <Card 
        title={
          <Space>
            <MessageOutlined />
            {isEnglish ? 'Comments' : '评论'} ({comments.length})
          </Space>
        }
        className={styles.postCard}
      >
        <div className={styles.commentInput}>
          <Avatar style={{ backgroundColor: '#1890ff' }}>
            {getUserName()?.[0] || 'U'}
          </Avatar>
          <TextArea
            placeholder={isEnglish ? 'Write a comment...' : '写下你的评论...'}
            value={commentText}
            onChange={e => setCommentText(e.target.value)}
            autoSize={{ minRows: 2, maxRows: 6 }}
            style={{ flex: 1 }}
          />
          <Button 
            type="primary"
            loading={submitting}
            onClick={() => handleSubmitComment()}
          >
            {isEnglish ? 'Post' : '发布'}
          </Button>
        </div>

        <Divider />

        {commentTree.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
            {isEnglish ? 'No comments yet' : '暂无评论'}
          </div>
        ) : (
          commentTree.map(comment => (
            <div key={comment.id}>
              {/* 主评论 */}
              <div className={styles.commentItem}>
                <div className={styles.commentHeader}>
                  <Space>
                    <Avatar 
                      size="small"
                      src={comment.user_avatar}
                      style={{ backgroundColor: '#87d068' }}
                    >
                      {comment.user_name?.[0] || 'U'}
                    </Avatar>
                    <Text strong>{comment.user_name || 'Anonymous'}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {formatTime(comment.created_at)}
                    </Text>
                  </Space>
                  <Space>
                    <Button 
                      type="text" 
                      size="small"
                      icon={<MessageOutlined />}
                      onClick={() => setReplyTo(replyTo?.id === comment.id ? null : comment)}
                    >
                      {isEnglish ? 'Reply' : '回复'}
                    </Button>
                    {comment.user_id === getUserId() && (
                      <Popconfirm
                        title={isEnglish ? 'Delete this comment?' : '确定删除这条评论吗？'}
                        onConfirm={() => handleDeleteComment(comment.id)}
                        okText={isEnglish ? 'Yes' : '确定'}
                        cancelText={isEnglish ? 'No' : '取消'}
                      >
                        <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                      </Popconfirm>
                    )}
                  </Space>
                </div>
                <div className={styles.commentContent}>
                  {comment.content}
                </div>

                {/* 回复输入框 */}
                {replyTo?.id === comment.id && (
                  <div className={styles.replyInput}>
                    <TextArea
                      placeholder={isEnglish ? `Reply to ${comment.user_name}...` : `回复 ${comment.user_name}...`}
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      autoSize={{ minRows: 2, maxRows: 4 }}
                      style={{ flex: 1 }}
                    />
                    <Space style={{ marginTop: 8 }}>
                      <Button size="small" onClick={() => setReplyTo(null)}>
                        {isEnglish ? 'Cancel' : '取消'}
                      </Button>
                      <Button 
                        type="primary" 
                        size="small"
                        loading={submitting}
                        onClick={() => handleSubmitComment(comment.id)}
                      >
                        {isEnglish ? 'Reply' : '回复'}
                      </Button>
                    </Space>
                  </div>
                )}
              </div>

              {/* 子评论（回复） */}
              {comment.replies && comment.replies.length > 0 && (
                <div className={styles.repliesContainer}>
                  {comment.replies.map(reply => (
                    <div key={reply.id} className={styles.replyItem}>
                      <div className={styles.commentHeader}>
                        <Space>
                          <Avatar 
                            size="small"
                            src={reply.user_avatar}
                            style={{ backgroundColor: '#1890ff' }}
                          >
                            {reply.user_name?.[0] || 'U'}
                          </Avatar>
                          <Text strong>{reply.user_name || 'Anonymous'}</Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {isEnglish ? 'replied to' : '回复了'} {comment.user_name}
                          </Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {formatTime(reply.created_at)}
                          </Text>
                        </Space>
                        {reply.user_id === getUserId() && (
                          <Popconfirm
                            title={isEnglish ? 'Delete this reply?' : '确定删除这条回复吗？'}
                            onConfirm={() => handleDeleteComment(reply.id)}
                            okText={isEnglish ? 'Yes' : '确定'}
                            cancelText={isEnglish ? 'No' : '取消'}
                          >
                            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                          </Popconfirm>
                        )}
                      </div>
                      <div className={styles.commentContent}>
                        {reply.content}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </Card>

      {/* 编辑帖子模态框 */}
      <Modal
        title={isEnglish ? 'Edit Post' : '编辑帖子'}
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        onOk={handleSaveEdit}
        confirmLoading={editLoading}
        okText={isEnglish ? 'Save' : '保存'}
        cancelText={isEnglish ? 'Cancel' : '取消'}
        width={600}
      >
        <div style={{ marginBottom: 16 }}>
          <Text strong>{isEnglish ? 'Category' : '分类'}</Text>
          <Select
            value={editCategory}
            onChange={setEditCategory}
            style={{ width: 200, marginLeft: 16 }}
            options={POST_CATEGORIES.filter(c => c.value !== 'all').map(c => ({
              value: c.value,
              label: isEnglish ? c.labelEn : c.label
            }))}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <Text strong>{isEnglish ? 'Title' : '标题'}</Text>
          <Input
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            maxLength={100}
            showCount
            style={{ marginTop: 8 }}
          />
        </div>
        <div>
          <Text strong>{isEnglish ? 'Content' : '内容'}</Text>
          <TextArea
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
            maxLength={10000}
            showCount
            autoSize={{ minRows: 6, maxRows: 15 }}
            style={{ marginTop: 8 }}
          />
        </div>
      </Modal>
    </div>
  )
}

export default PostDetailPage
