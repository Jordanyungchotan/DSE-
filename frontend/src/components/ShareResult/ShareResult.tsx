import { useRef } from 'react'
import { Modal, Button, Typography, Space, message, Tooltip, Divider } from 'antd'
import {
  ShareAltOutlined,
  CopyOutlined,
  DownloadOutlined,
  WechatOutlined,
  InstagramOutlined,
  FacebookOutlined,
  LinkOutlined,
  TrophyOutlined,
  CheckCircleOutlined,
  FireOutlined,
} from '@ant-design/icons'
import styles from './ShareResult.module.css'

const { Title, Text } = Typography

interface ShareResultProps {
  visible: boolean
  onClose: () => void
  result: {
    subject: string
    subjectName: string
    grade: string
    gradeName: string
    difficulty: string
    difficultyName: string
    questionCount: number
    correctCount: number
    accuracy: number
    score: number
    timeSpent: number
    date: string
  }
}

/**
 * 分享成绩组件
 */
const ShareResult = ({ visible, onClose, result }: ShareResultProps) => {
  const cardRef = useRef<HTMLDivElement>(null)

  // 生成分享文本
  const generateShareText = () => {
    const grade = result.accuracy >= 80 ? '优秀' : result.accuracy >= 60 ? '良好' : '继续努力'
    return `🎯 我在DSE智能刷题系统完成了${result.subjectName}练习！

📊 练习成绩：
• 科目：${result.subjectName} (${result.gradeName})
• 难度：${result.difficultyName}
• 题目：${result.questionCount}题
• 正确：${result.correctCount}题
• 正确率：${result.accuracy.toFixed(1)}%
• 评价：${grade}

⏱️ 用时：${Math.floor(result.timeSpent / 60)}分${result.timeSpent % 60}秒

📚 DSE智能刷题系统 - 助力DSE考试成功！
🔗 立即体验：${window.location.origin}/quiz`
  }

  // 复制分享文本
  const copyShareText = async () => {
    const text = generateShareText()
    try {
      await navigator.clipboard.writeText(text)
      message.success('已复制到剪贴板')
    } catch {
      // 降级方案
      const textarea = document.createElement('textarea')
      textarea.value = text
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      message.success('已复制到剪贴板')
    }
  }

  // 复制链接
  const copyLink = async () => {
    const link = `${window.location.origin}/quiz`
    try {
      await navigator.clipboard.writeText(link)
      message.success('链接已复制')
    } catch {
      message.error('复制失败，请手动复制')
    }
  }

  // 下载成绩卡片
  const downloadCard = async () => {
    if (!cardRef.current) return

    try {
      // 使用 html2canvas 动态导入（如果需要）
      // 这里使用简化方案：生成图片 URL
      message.info('正在生成图片...')
      
      // 创建 canvas 并绘制
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      canvas.width = 400
      canvas.height = 500

      // 绘制背景
      const gradient = ctx.createLinearGradient(0, 0, 400, 500)
      gradient.addColorStop(0, '#2b6cb0')
      gradient.addColorStop(1, '#4a5568')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, 400, 500)

      // 绘制内容
      ctx.fillStyle = 'white'
      ctx.font = 'bold 24px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('DSE智能刷题', 200, 50)
      
      ctx.font = '18px sans-serif'
      ctx.fillText(result.subjectName, 200, 90)

      // 成绩
      ctx.font = 'bold 72px sans-serif'
      ctx.fillText(`${result.accuracy.toFixed(0)}%`, 200, 200)

      ctx.font = '16px sans-serif'
      ctx.fillText('正确率', 200, 240)

      // 详情
      ctx.font = '14px sans-serif'
      ctx.textAlign = 'left'
      const details = [
        `📝 题目数量：${result.questionCount}`,
        `✅ 正确数量：${result.correctCount}`,
        `⏱️ 用时：${Math.floor(result.timeSpent / 60)}分${result.timeSpent % 60}秒`,
        `📅 日期：${result.date}`,
      ]
      details.forEach((text, i) => {
        ctx.fillText(text, 50, 300 + i * 30)
      })

      // 底部
      ctx.textAlign = 'center'
      ctx.fillText('DSE智能刷题系统', 200, 470)

      // 下载
      const link = document.createElement('a')
      link.download = `DSE成绩_${result.subjectName}_${result.date}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()

      message.success('图片已保存')
    } catch (error) {
      console.error('下载失败:', error)
      message.error('下载失败，请稍后重试')
    }
  }

  // 社交分享
  const shareToSocial = (platform: 'instagram' | 'facebook' | 'weibo') => {
    const text = encodeURIComponent(generateShareText())
    const url = encodeURIComponent(`${window.location.origin}/quiz`)

    let shareUrl = ''
    switch (platform) {
      case 'instagram':
        // Instagram不支持直接分享链接，复制文字后引导用户打开Instagram
        copyShareText()
        message.info('文字已复制，请打开Instagram粘贴分享')
        return
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${text}`
        break
      case 'weibo':
        shareUrl = `https://service.weibo.com/share/share.php?url=${url}&title=${text}`
        break
    }

    window.open(shareUrl, '_blank', 'width=600,height=400')
  }

  // 获取评价
  const getGrade = () => {
    if (result.accuracy >= 90) return { text: '卓越', color: '#722ed1', icon: <TrophyOutlined /> }
    if (result.accuracy >= 80) return { text: '优秀', color: '#52c41a', icon: <FireOutlined /> }
    if (result.accuracy >= 70) return { text: '良好', color: '#1890ff', icon: <CheckCircleOutlined /> }
    if (result.accuracy >= 60) return { text: '及格', color: '#fa8c16', icon: <CheckCircleOutlined /> }
    return { text: '继续努力', color: '#f5222d', icon: <FireOutlined /> }
  }

  const grade = getGrade()

  return (
    <Modal
      title={
        <span>
          <ShareAltOutlined /> 分享成绩
        </span>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={480}
      centered
    >
      <div className={styles.shareContainer}>
        {/* 成绩卡片预览 */}
        <div className={styles.cardPreview} ref={cardRef}>
          <div className={styles.cardBg}>
            <div className={styles.cardHeader}>
              <Text className={styles.cardLogo}>🎓 DSE智能刷题</Text>
              <Text className={styles.cardSubject}>{result.subjectName}</Text>
            </div>

            <div className={styles.cardScore}>
              <div className={styles.scoreCircle} style={{ borderColor: grade.color }}>
                <span className={styles.scoreValue}>{result.accuracy.toFixed(0)}</span>
                <span className={styles.scoreUnit}>%</span>
              </div>
              <div className={styles.gradeTag} style={{ backgroundColor: grade.color }}>
                {grade.icon} {grade.text}
              </div>
            </div>

            <div className={styles.cardDetails}>
              <div className={styles.detailItem}>
                <span>📝 题目</span>
                <span>{result.questionCount}题</span>
              </div>
              <div className={styles.detailItem}>
                <span>✅ 正确</span>
                <span>{result.correctCount}题</span>
              </div>
              <div className={styles.detailItem}>
                <span>⏱️ 用时</span>
                <span>{Math.floor(result.timeSpent / 60)}分{result.timeSpent % 60}秒</span>
              </div>
              <div className={styles.detailItem}>
                <span>📅 日期</span>
                <span>{result.date}</span>
              </div>
            </div>

            <div className={styles.cardFooter}>
              <Text>DSE智能刷题系统 · 助力DSE考试成功</Text>
            </div>
          </div>
        </div>

        <Divider />

        {/* 分享操作 */}
        <div className={styles.shareActions}>
          <Title level={5}>分享方式</Title>
          
          <Space wrap className={styles.actionButtons}>
            <Tooltip title="复制文字">
              <Button icon={<CopyOutlined />} onClick={copyShareText}>
                复制文字
              </Button>
            </Tooltip>
            <Tooltip title="复制链接">
              <Button icon={<LinkOutlined />} onClick={copyLink}>
                复制链接
              </Button>
            </Tooltip>
            <Tooltip title="保存图片">
              <Button icon={<DownloadOutlined />} onClick={downloadCard}>
                保存图片
              </Button>
            </Tooltip>
          </Space>

          <Divider>社交平台</Divider>

          <Space wrap className={styles.socialButtons}>
            <Button
              icon={<InstagramOutlined />}
              onClick={() => shareToSocial('instagram')}
              className={styles.instagramBtn}
            >
              Instagram
            </Button>
            <Button
              icon={<FacebookOutlined />}
              onClick={() => shareToSocial('facebook')}
              className={styles.facebookBtn}
            >
              Facebook
            </Button>
            <Button
              icon={<WechatOutlined />}
              onClick={() => {
                copyShareText()
                message.info('文字已复制，请打开微信粘贴分享')
              }}
              className={styles.wechatBtn}
            >
              微信
            </Button>
          </Space>
        </div>
      </div>
    </Modal>
  )
}

export default ShareResult

