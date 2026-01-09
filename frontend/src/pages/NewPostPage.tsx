/**
 * 新建帖子页面
 */

import React, { useState } from 'react'
import { 
  Card, 
  Input, 
  Button, 
  Select,
  Typography,
  message
} from 'antd'
import { 
  ArrowLeftOutlined,
  SendOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useLanguageStore } from '../stores/languageStore'
import { useAuthStore } from '../stores/authStore'
import { createPost, PostCategory, POST_CATEGORIES } from '../services/communityApi'
import styles from './CommunityPage.module.css'

const { Title, Text } = Typography
const { TextArea } = Input

const NewPostPage: React.FC = () => {
  const { locale } = useLanguageStore()
  const { user, isAuthenticated } = useAuthStore()
  const navigate = useNavigate()
  const isEnglish = locale === 'en'

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState<PostCategory>('general')
  const [submitting, setSubmitting] = useState(false)

  const getUserName = () => user?.name || ''

  const handleSubmit = async () => {
    if (!title.trim()) {
      message.warning(isEnglish ? 'Please enter a title' : '请输入标题')
      return
    }
    if (!content.trim()) {
      message.warning(isEnglish ? 'Please enter content' : '请输入内容')
      return
    }
    if (title.length > 100) {
      message.warning(isEnglish ? 'Title is too long (max 100 characters)' : '标题过长（最多100字）')
      return
    }
    if (content.length > 10000) {
      message.warning(isEnglish ? 'Content is too long (max 10000 characters)' : '内容过长（最多10000字）')
      return
    }

    if (!isAuthenticated || !user?.id) {
      message.warning(isEnglish ? 'Please login first' : '请先登录')
      navigate('/login')
      return
    }
    const userId = user.id

    setSubmitting(true)
    try {
      const result = await createPost({
        user_id: userId,
        user_name: getUserName(),
        user_avatar: user.avatar,
        title: title.trim(),
        content: content.trim(),
        category
      })

      if (result.success) {
        message.success(isEnglish ? 'Post published!' : '发布成功！')
        navigate(`/community/post/${result.data.id}`)
      } else {
        message.error(result.error || (isEnglish ? 'Failed to publish' : '发布失败'))
      }
    } catch (error) {
      console.error('发布失败:', error)
      message.error(isEnglish ? 'Failed to publish' : '发布失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.newPostContainer}>
      <Button 
        icon={<ArrowLeftOutlined />} 
        onClick={() => navigate('/community')}
        className={styles.backButton}
      >
        {isEnglish ? 'Back' : '返回'}
      </Button>

      <Card 
        title={
          <Title level={4} style={{ margin: 0 }}>
            {isEnglish ? 'New Post' : '发布新帖子'}
          </Title>
        }
        className={styles.newPostCard}
      >
        {/* 规则提示 */}
        <div className={styles.tips}>
          <Text strong style={{ color: '#52c41a' }}>
            <CheckCircleOutlined /> {isEnglish ? 'Allowed Content:' : '允许内容：'}
          </Text>
          <ul className={styles.tipsList}>
            <li>{isEnglish ? 'Study methods and tips' : '学习方法分享'}</li>
            <li>{isEnglish ? 'Review experiences' : '复习经验交流'}</li>
            <li>{isEnglish ? 'Practice achievements' : '刷题成果分享'}</li>
            <li>{isEnglish ? 'Questions and help' : '问题求助提问'}</li>
          </ul>
          <Text strong style={{ color: '#ff4d4f' }}>
            <CloseCircleOutlined /> {isEnglish ? 'Prohibited Content:' : '禁止内容：'}
          </Text>
          <ul className={`${styles.tipsList} ${styles.banList}`}>
            <li>{isEnglish ? 'Personal attacks or insults' : '人身攻击、侮辱他人'}</li>
            <li>{isEnglish ? 'Advertisements or promotions' : '广告、商业推广'}</li>
            <li>{isEnglish ? 'Privacy violations' : '泄露隐私信息'}</li>
            <li>{isEnglish ? 'Inappropriate content' : '不当内容'}</li>
          </ul>
        </div>

        <div className={styles.formItem}>
          <Text strong>{isEnglish ? 'Category' : '分类'}</Text>
          <Select
            value={category}
            onChange={setCategory}
            className={styles.categorySelect}
            style={{ marginLeft: 16 }}
            options={POST_CATEGORIES.filter(c => c.value !== 'all').map(c => ({
              value: c.value,
              label: isEnglish ? c.labelEn : c.label
            }))}
          />
        </div>

        <div className={styles.formItem}>
          <Text strong>{isEnglish ? 'Title' : '标题'} *</Text>
          <Input
            placeholder={isEnglish ? 'Enter your post title...' : '请输入帖子标题...'}
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={100}
            showCount
            style={{ marginTop: 8 }}
          />
        </div>

        <div className={styles.formItem}>
          <Text strong>{isEnglish ? 'Content' : '内容'} *</Text>
          <TextArea
            placeholder={isEnglish ? 'Share your thoughts, experiences, or questions...' : '分享你的想法、经验或问题...'}
            value={content}
            onChange={e => setContent(e.target.value)}
            maxLength={10000}
            showCount
            className={styles.contentInput}
            style={{ marginTop: 8 }}
          />
        </div>

        <div className={styles.submitBar}>
          <Text type="secondary">
            {isEnglish 
              ? 'Posts that violate rules will be deleted' 
              : '违规内容将被删除，请遵守社区规则'}
          </Text>
          <Button
            type="primary"
            size="large"
            icon={<SendOutlined />}
            loading={submitting}
            onClick={handleSubmit}
          >
            {isEnglish ? 'Publish' : '发布'}
          </Button>
        </div>
      </Card>
    </div>
  )
}

export default NewPostPage
