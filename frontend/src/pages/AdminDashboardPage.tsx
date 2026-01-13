import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Table, Card, Button, Tag, Space, Typography, message, 
  Modal, Input, Select, Statistic, Row, Col, Tooltip, Divider, List, Avatar,
  Tabs, Progress, Badge, Empty, Spin, Upload
} from 'antd'
import { 
  DownloadOutlined, LogoutOutlined, ReloadOutlined, 
  CheckCircleOutlined, ClockCircleOutlined, PhoneOutlined,
  UserOutlined, MailOutlined, MessageOutlined, DeleteOutlined,
  ExclamationCircleOutlined, TeamOutlined, BarChartOutlined,
  RiseOutlined, BookOutlined, TrophyOutlined, DatabaseOutlined,
  SafetyOutlined, EditOutlined, CloseCircleOutlined, GiftOutlined,
  DollarOutlined, ShoppingOutlined, LockOutlined, UnlockOutlined,
  WarningOutlined, StopOutlined, SyncOutlined, CrownOutlined,
  FundOutlined, PlusOutlined, LoadingOutlined, CommentOutlined,
  PushpinOutlined
} from '@ant-design/icons'
import { apiFetch, ragFetch } from '../config/api'
import styles from './AdminDashboardPage.module.css'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

interface Inquiry {
  id: string
  name: string
  phone: string | null
  email: string | null
  message: string
  status: 'pending' | 'contacted' | 'resolved'
  notes: string | null
  created_at: string
  updated_at: string
}

interface SystemStats {
  totalUsers: number
  todayUsers: number
  totalAnalysis: number
  todayAnalysis: number
}

interface RecentUser {
  id: string
  name: string
  email: string
  created_at: string
}

interface LevelTestStats {
  totalTests: number
  completedTests: number
  todayTests: number
  averageScore: number
  subjectDistribution: Array<{ subject: string; count: number; avg_score: number }>
  gradeDistribution: Array<{ grade: string; count: number; avg_score: number }>
  levelDistribution: Array<{ overall_level: string; count: number }>
  cachedQuestions: number
  pendingReviews: number
}

interface ReviewItem {
  id: string
  question_id: string
  source_type: string
  status: string
  question_data: string
  grade: string
  subject: string
  difficulty: string
  question_type: string
  created_at: string
}

// 积分系统相关接口
interface PointsDashboardStats {
  date: string
  todayPointsEarned: number
  todayPointsSpent: number
  totalUsers: number
  pendingOrders: number
  todayFraudEvents: number
}

interface TopEarner {
  user_id: string
  total_earned: number
  action_count: number
}

interface FraudRule {
  id: number
  rule_code: string
  name: string
  description: string
  check_type: string
  threshold_value: number
  time_window_seconds: number
  is_active: boolean
  penalty_action: string
}

interface PointsLedgerItem {
  id: number
  user_id: string
  change_points: number
  current_points: number
  type: string
  description: string
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

interface PointsOrder {
  id: string
  user_id: string
  item_id: number
  item_name: string
  item_type: string
  quantity: number
  total_cost: number
  status: string
  receiver_info: string | null
  shipping_info: string | null
  created_at: string
  fulfilled_at: string | null
}

// 商城商品接口
interface MallItem {
  id: number
  name: string
  description: string | null
  image_url: string | null
  price: number
  stock: number
  item_type: string
  delivery_info: string | null
  is_visible: boolean
  sort_order: number
  created_at?: string
  updated_at?: string
}

interface TestRecord {
  id: string
  user_id: string
  user_name: string
  user_email: string
  grade: string
  subject: string
  test_type: string
  status: string
  score: number
  overall_level: string
  question_count: number
  created_at: string
  completed_at: string
}

const AdminDashboardPage = () => {
  const navigate = useNavigate()
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [editStatus, setEditStatus] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [updating, setUpdating] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  
  // 系统统计数据
  const [systemStats, setSystemStats] = useState<SystemStats>({
    totalUsers: 0,
    todayUsers: 0,
    totalAnalysis: 0,
    todayAnalysis: 0,
  })
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([])
  
  // 水平测试管理相关状态
  const [levelTestStats, setLevelTestStats] = useState<LevelTestStats | null>(null)
  const [reviewQueue, setReviewQueue] = useState<ReviewItem[]>([])
  const [testRecords, setTestRecords] = useState<TestRecord[]>([])
  const [levelTestLoading, setLevelTestLoading] = useState(false)
  const [reviewModalVisible, setReviewModalVisible] = useState(false)
  const [selectedReview, setSelectedReview] = useState<ReviewItem | null>(null)
  const [reviewStatus, setReviewStatus] = useState<'approved' | 'rejected' | 'modified'>('approved')
  const [reviewComments, setReviewComments] = useState('')

  // 积分系统管理相关状态
  const [pointsStats, setPointsStats] = useState<PointsDashboardStats | null>(null)
  const [topEarners, setTopEarners] = useState<TopEarner[]>([])
  const [fraudRules, setFraudRules] = useState<FraudRule[]>([])
  const [pointsLedger, setPointsLedger] = useState<PointsLedgerItem[]>([])
  const [pointsOrders, setPointsOrders] = useState<PointsOrder[]>([])
  const [pointsLoading, setPointsLoading] = useState(false)
  const [ledgerUserId, setLedgerUserId] = useState('')
  const [orderStatus, setOrderStatus] = useState('')
  const [ruleModalVisible, setRuleModalVisible] = useState(false)
  const [selectedRule, setSelectedRule] = useState<FraudRule | null>(null)
  const [editThreshold, setEditThreshold] = useState(0)
  const [editRuleActive, setEditRuleActive] = useState(true)
  const [grantModalVisible, setGrantModalVisible] = useState(false)
  const [grantUserId, setGrantUserId] = useState('')
  const [grantPoints, setGrantPoints] = useState(0)
  const [grantReason, setGrantReason] = useState('')
  const [userSearchResults, setUserSearchResults] = useState<{user_id: string, total_points: number, available_points: number}[]>([])
  const [userSearchLoading, setUserSearchLoading] = useState(false)

  // 商城商品管理相关状态
  const [mallItems, setMallItems] = useState<MallItem[]>([])
  const [mallItemsLoading, setMallItemsLoading] = useState(false)
  const [itemModalVisible, setItemModalVisible] = useState(false)
  const [editingItem, setEditingItem] = useState<MallItem | null>(null)
  const [itemForm, setItemForm] = useState<Partial<MallItem>>({
    name: '',
    description: '',
    image_url: '',
    price: 0,
    stock: -1,
    item_type: 'VIRTUAL',
    delivery_info: '',
    is_visible: true,
    sort_order: 0,
  })
  const [imageUploading, setImageUploading] = useState(false)

  // 社区管理相关状态
  interface CommunityPost {
    id: number
    user_id: string
    user_name: string | null
    title: string
    content: string
    category: string
    view_count: number
    like_count: number
    comment_count: number
    is_pinned: number
    is_deleted: number
    created_at: string
  }
  interface CommunityStats {
    totalPosts: number
    totalComments: number
    todayPosts: number
    todayComments: number
  }
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>([])
  const [communityStats, setCommunityStats] = useState<CommunityStats | null>(null)
  const [communityLoading, setCommunityLoading] = useState(false)

  // 用户管理相关状态
  type ConsultantRole = 'user' | 'consultant' | 'admin'
  
  interface AdminUser {
    id: string
    name: string
    email: string
    phone: string | null
    avatar: string | null
    created_at: string
    points: number
    analysis_count: number
    test_count: number
    post_count: number
    role?: ConsultantRole  // 顾问角色授权
  }
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [usersPagination, setUsersPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 })
  const [usersSearchTerm, setUsersSearchTerm] = useState('')
  const [roleUpdating, setRoleUpdating] = useState<string | null>(null)  // 正在更新角色的用户ID

  const adminKey = sessionStorage.getItem('adminKey')

  useEffect(() => {
    if (!adminKey) {
      navigate('/admin')
      return
    }
    loadInquiries()
    loadSystemStats()
  }, [adminKey, navigate])

  useEffect(() => {
    if (activeTab === 'levelTest' && adminKey) {
      loadLevelTestStats()
      loadReviewQueue()
      loadTestRecords()
    }
  }, [activeTab, adminKey])

  useEffect(() => {
    if (activeTab === 'points' && adminKey) {
      loadPointsStats()
      loadTopEarners()
      loadFraudRules()
      loadPointsOrders()
    }
  }, [activeTab, adminKey])

  useEffect(() => {
    if (activeTab === 'mallItems' && adminKey) {
      loadMallItems()
    }
  }, [activeTab, adminKey])

  useEffect(() => {
    if (activeTab === 'community' && adminKey) {
      loadCommunityData()
    }
  }, [activeTab, adminKey])

  useEffect(() => {
    if (activeTab === 'users' && adminKey) {
      loadAdminUsers()
    }
  }, [activeTab, adminKey])

  // 加载用户列表
  const loadAdminUsers = async (page = 1, search = usersSearchTerm) => {
    setUsersLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(usersPagination.pageSize),
        ...(search && { search })
      })
      const response = await apiFetch(`/api/admin/users?${params}`, {
        headers: { 'X-Admin-Key': adminKey || '' }
      })
      if (response.ok) {
        const data = await response.json()
        setAdminUsers(data.users || [])
        setUsersPagination(data.pagination || { page: 1, pageSize: 20, total: 0, totalPages: 0 })
      } else {
        message.error('获取用户列表失败')
      }
    } catch (error) {
      console.error('加载用户列表失败:', error)
      message.error('加载用户列表失败')
    } finally {
      setUsersLoading(false)
    }
  }

  // 更新用户角色（顾问授权）
  const handleUpdateUserRole = async (userId: string, newRole: ConsultantRole) => {
    setRoleUpdating(userId)
    try {
      const response = await ragFetch(`/api/admin/users/${userId}/role`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': 'admin'  // 使用管理员身份
        },
        body: JSON.stringify({ role: newRole })
      })
      
      if (response.ok) {
        const roleLabels: Record<ConsultantRole, string> = {
          user: '普通用户',
          consultant: '顾问',
          admin: '管理员'
        }
        message.success(`用户角色已更新为「${roleLabels[newRole]}」`)
        // 更新本地状态
        setAdminUsers(prev => prev.map(u => 
          u.id === userId ? { ...u, role: newRole } : u
        ))
      } else {
        const data = await response.json()
        message.error(data.error || '角色更新失败')
      }
    } catch (error) {
      console.error('更新角色失败:', error)
      message.error('角色更新失败')
    } finally {
      setRoleUpdating(null)
    }
  }

  // 删除用户
  const handleDeleteUser = async (userId: string, userName: string) => {
    Modal.confirm({
      title: '⚠️ 确认删除用户',
      content: (
        <div>
          <p>确定要删除用户 <strong>{userName}</strong> 吗？</p>
          <p style={{ color: '#ff4d4f' }}>此操作将删除该用户的所有数据，包括：</p>
          <ul style={{ color: '#666', fontSize: 12 }}>
            <li>帖子和评论</li>
            <li>好友关系</li>
            <li>积分和交易记录</li>
            <li>分析记录</li>
            <li>测试记录</li>
            <li>通知和消息</li>
          </ul>
          <p style={{ color: '#ff4d4f', fontWeight: 'bold' }}>此操作不可恢复！</p>
        </div>
      ),
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          const response = await apiFetch(`/api/admin/users/${userId}`, {
            method: 'DELETE',
            headers: { 'X-Admin-Key': adminKey || '' }
          })
          if (response.ok) {
            message.success('用户删除成功')
            loadAdminUsers(usersPagination.page)
            loadSystemStats() // 刷新统计
          } else {
            const data = await response.json()
            message.error(data.error || '删除失败')
          }
        } catch (error) {
          console.error('删除用户失败:', error)
          message.error('删除用户失败')
        }
      }
    })
  }

  // 加载社区数据
  const loadCommunityData = async () => {
    setCommunityLoading(true)
    try {
      const [postsResponse, statsResponse] = await Promise.all([
        ragFetch('/api/posts?limit=50'),
        ragFetch('/api/admin/community/stats')
      ])
      
      const postsRes = await postsResponse.json()
      const statsRes = await statsResponse.json()
      
      if (postsRes.success) {
        setCommunityPosts(postsRes.data.posts || [])
      }
      if (statsRes.success) {
        setCommunityStats(statsRes.data)
      }
    } catch (error) {
      console.error('加载社区数据失败:', error)
    } finally {
      setCommunityLoading(false)
    }
  }

  // 管理员删除帖子
  const handleAdminDeletePost = async (postId: number) => {
    try {
      const response = await ragFetch(`/api/admin/community/posts/${postId}?admin_id=${adminKey}`, {
        method: 'DELETE'
      })
      const res = await response.json()
      if (res.success) {
        message.success('帖子已删除')
        loadCommunityData()
      } else {
        message.error(res.error || '删除失败')
      }
    } catch (error) {
      message.error('删除失败')
    }
  }

  // 管理员置顶帖子
  const handleAdminPinPost = async (postId: number) => {
    try {
      const response = await ragFetch(`/api/admin/community/posts/${postId}/pin`, {
        method: 'POST',
        headers: { 'X-Admin-Key': adminKey || '' }
      })
      const res = await response.json()
      if (res.success) {
        message.success(res.is_pinned ? '已置顶' : '已取消置顶')
        loadCommunityData()
      } else {
        message.error(res.error || '操作失败')
      }
    } catch (error) {
      message.error('操作失败')
    }
  }

  // 加载系统统计数据
  const loadSystemStats = async () => {
    try {
      const response = await apiFetch('/api/admin/stats', {
        headers: { 'X-Admin-Key': adminKey || '' }
      })
      
      if (response.ok) {
        const data = await response.json()
        setSystemStats(data.stats)
        setRecentUsers(data.recentUsers || [])
      }
    } catch {
      console.error('加载统计数据失败')
    }
  }

  // 加载水平测试统计
  const loadLevelTestStats = async () => {
    setLevelTestLoading(true)
    try {
      const response = await apiFetch('/api/admin/level-test/stats', {
        headers: { 'X-Admin-Key': adminKey || '' }
      })
      
      if (response.ok) {
        const data = await response.json()
        setLevelTestStats(data)
      }
    } catch {
      console.error('加载水平测试统计失败')
    } finally {
      setLevelTestLoading(false)
    }
  }

  // 加载审核队列
  const loadReviewQueue = async () => {
    try {
      const response = await apiFetch('/api/admin/level-test/review-queue?status=pending', {
        headers: { 'X-Admin-Key': adminKey || '' }
      })
      
      if (response.ok) {
        const data = await response.json()
        setReviewQueue(data.reviews || [])
      }
    } catch {
      console.error('加载审核队列失败')
    }
  }

  // 加载测试记录
  const loadTestRecords = async () => {
    try {
      const response = await apiFetch('/api/admin/level-test/tests?limit=20', {
        headers: { 'X-Admin-Key': adminKey || '' }
      })
      
      if (response.ok) {
        const data = await response.json()
        setTestRecords(data.tests || [])
      }
    } catch {
      console.error('加载测试记录失败')
    }
  }

  // ========== 积分系统管理函数 ==========
  
  // 加载积分系统统计
  const loadPointsStats = async () => {
    setPointsLoading(true)
    try {
      const response = await ragFetch('/admin/dashboard/stats', {
        headers: { 'X-Admin-Token': adminKey || '' }
      })
      
      if (response.ok) {
        const data = await response.json()
        setPointsStats(data.data)
      }
    } catch {
      console.error('加载积分统计失败')
    } finally {
      setPointsLoading(false)
    }
  }

  // 加载积分获取排行榜
  const loadTopEarners = async () => {
    try {
      const response = await ragFetch('/admin/points/top-earners?limit=10', {
        headers: { 'X-Admin-Token': adminKey || '' }
      })
      
      if (response.ok) {
        const data = await response.json()
        setTopEarners(data.data || [])
      }
    } catch {
      console.error('加载排行榜失败')
    }
  }

  // 加载防刷规则
  const loadFraudRules = async () => {
    try {
      const response = await ragFetch('/admin/fraud/rules', {
        headers: { 'X-Admin-Token': adminKey || '' }
      })
      
      if (response.ok) {
        const data = await response.json()
        setFraudRules(data.data || [])
      }
    } catch {
      console.error('加载防刷规则失败')
    }
  }

  // 加载积分流水
  const loadPointsLedger = async (userId?: string) => {
    try {
      const params = new URLSearchParams()
      if (userId) params.append('user_id', userId)
      params.append('limit', '50')
      
      const response = await ragFetch(`/admin/points/ledger?${params}`, {
        headers: { 'X-Admin-Token': adminKey || '' }
      })
      
      if (response.ok) {
        const data = await response.json()
        setPointsLedger(data.data || [])
      }
    } catch {
      console.error('加载积分流水失败')
    }
  }

  // 加载兑换订单
  const loadPointsOrders = async (status?: string) => {
    try {
      const params = new URLSearchParams()
      if (status) params.append('status', status)
      params.append('limit', '50')
      
      const response = await ragFetch(`/admin/mall/orders?${params}`, {
        headers: { 'X-Admin-Token': adminKey || '' }
      })
      
      if (response.ok) {
        const data = await response.json()
        setPointsOrders(data.data || [])
      }
    } catch {
      console.error('加载订单失败')
    }
  }

  // 更新防刷规则
  const handleUpdateRule = async () => {
    if (!selectedRule) return
    
    setUpdating(true)
    try {
      const response = await ragFetch(`/admin/fraud/rules/${selectedRule.rule_code}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'X-Admin-Token': adminKey || '' 
        },
        body: JSON.stringify({ 
          threshold_value: editThreshold,
          is_active: editRuleActive
        })
      })
      
      if (response.ok) {
        message.success('规则更新成功')
        setRuleModalVisible(false)
        loadFraudRules()
      } else {
        throw new Error('更新失败')
      }
    } catch {
      message.error('规则更新失败')
    } finally {
      setUpdating(false)
    }
  }

  // 搜索用户
  const searchUsers = async (query: string) => {
    if (!query && query !== '') return
    setUserSearchLoading(true)
    try {
      const response = await ragFetch(`/admin/users/search?q=${encodeURIComponent(query)}&limit=20`, {
        headers: { 'X-Admin-Token': adminKey || '' }
      })
      if (response.ok) {
        const data = await response.json()
        setUserSearchResults(data.data || [])
      }
    } catch {
      console.error('搜索用户失败')
    } finally {
      setUserSearchLoading(false)
    }
  }

  // 加载所有用户（打开弹窗时）
  const loadAllUsers = async () => {
    setUserSearchLoading(true)
    try {
      const response = await ragFetch('/admin/users/search?limit=50', {
        headers: { 'X-Admin-Token': adminKey || '' }
      })
      if (response.ok) {
        const data = await response.json()
        setUserSearchResults(data.data || [])
      }
    } catch {
      console.error('加载用户失败')
    } finally {
      setUserSearchLoading(false)
    }
  }

  // 手动补发积分
  const handleGrantPoints = async () => {
    if (!grantUserId || !grantPoints || !grantReason) {
      message.warning('请填写完整信息')
      return
    }
    
    setUpdating(true)
    try {
      const response = await ragFetch('/admin/points/grant', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Admin-Token': adminKey || '' 
        },
        body: JSON.stringify({ 
          user_id: grantUserId,
          points: grantPoints,
          reason: grantReason
        })
      })
      
      if (response.ok) {
        message.success('积分补发成功')
        setGrantModalVisible(false)
        setGrantUserId('')
        setGrantPoints(0)
        setGrantReason('')
        loadPointsStats()
        loadTopEarners()
      } else {
        throw new Error('补发失败')
      }
    } catch {
      message.error('积分补发失败')
    } finally {
      setUpdating(false)
    }
  }

  // 履约订单
  const handleFulfillOrder = async (orderId: string, status: string) => {
    try {
      const response = await ragFetch(`/admin/mall/orders/${orderId}/fulfill`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Admin-Token': adminKey || '' 
        },
        body: JSON.stringify({ status })
      })
      
      if (response.ok) {
        message.success('订单状态更新成功')
        loadPointsOrders(orderStatus)
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || '更新失败')
      }
    } catch (err) {
      message.error(err instanceof Error ? err.message : '订单更新失败')
    }
  }

  // ========== 商城商品管理函数 ==========

  // 加载商品列表
  const loadMallItems = async () => {
    setMallItemsLoading(true)
    try {
      const response = await ragFetch('/admin/mall/items', {
        headers: { 'X-Admin-Token': adminKey || '' }
      })
      
      if (response.ok) {
        const data = await response.json()
        setMallItems(data.data || [])
      }
    } catch {
      console.error('加载商品列表失败')
    } finally {
      setMallItemsLoading(false)
    }
  }

  // 打开新建商品弹窗
  const handleAddItem = () => {
    setEditingItem(null)
    setItemForm({
      name: '',
      description: '',
      image_url: '',
      price: 0,
      stock: -1,
      item_type: 'VIRTUAL',
      delivery_info: '',
      is_visible: true,
      sort_order: 0,
    })
    setItemModalVisible(true)
  }

  // 图片上传处理 - 转为 base64
  const handleImageUpload = (file: File): boolean => {
    // 限制文件大小 (2MB)
    const maxSize = 2 * 1024 * 1024
    if (file.size > maxSize) {
      message.error('图片大小不能超过 2MB')
      return false
    }

    // 限制文件类型
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!validTypes.includes(file.type)) {
      message.error('只支持 JPG、PNG、GIF、WEBP 格式的图片')
      return false
    }

    setImageUploading(true)
    
    const reader = new FileReader()
    reader.onload = (e) => {
      const base64 = e.target?.result as string
      setItemForm(prev => ({ ...prev, image_url: base64 }))
      setImageUploading(false)
      message.success('图片上传成功')
    }
    reader.onerror = () => {
      message.error('图片读取失败')
      setImageUploading(false)
    }
    reader.readAsDataURL(file)
    
    return false // 阻止默认上传行为
  }

  // 打开编辑商品弹窗
  const handleEditItem = (item: MallItem) => {
    setEditingItem(item)
    setItemForm({
      name: item.name,
      description: item.description || '',
      image_url: item.image_url || '',
      price: item.price,
      stock: item.stock,
      item_type: item.item_type,
      delivery_info: item.delivery_info || '',
      is_visible: item.is_visible,
      sort_order: item.sort_order,
    })
    setItemModalVisible(true)
  }

  // 保存商品
  const handleSaveItem = async () => {
    if (!itemForm.name || itemForm.price === undefined) {
      message.warning('请填写商品名称和价格')
      return
    }

    setUpdating(true)
    try {
      if (editingItem) {
        // 更新商品
        const response = await ragFetch(`/admin/mall/items/${editingItem.id}`, {
          method: 'PATCH',
          headers: { 
            'Content-Type': 'application/json',
            'X-Admin-Token': adminKey || '' 
          },
          body: JSON.stringify(itemForm)
        })
        
        if (response.ok) {
          message.success('商品更新成功')
          setItemModalVisible(false)
          loadMallItems()
        } else {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || '更新失败')
        }
      } else {
        // 创建商品
        const response = await ragFetch('/admin/mall/items', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-Admin-Token': adminKey || '' 
          },
          body: JSON.stringify(itemForm)
        })
        
        if (response.ok) {
          message.success('商品创建成功')
          setItemModalVisible(false)
          loadMallItems()
        } else {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || '创建失败')
        }
      }
    } catch (err) {
      message.error(err instanceof Error ? err.message : '保存商品失败')
    } finally {
      setUpdating(false)
    }
  }

  // 切换商品上下架状态
  const handleToggleItem = async (itemId: number) => {
    try {
      const response = await ragFetch(`/admin/mall/items/${itemId}/toggle`, {
        method: 'POST',
        headers: { 'X-Admin-Token': adminKey || '' }
      })
      
      if (response.ok) {
        const data = await response.json()
        message.success(data.message)
        loadMallItems()
      } else {
        throw new Error('操作失败')
      }
    } catch {
      message.error('操作失败')
    }
  }

  // 删除商品
  const handleDeleteItem = (item: MallItem, force: boolean = false) => {
    const doDelete = async () => {
      try {
        const url = force 
          ? `/admin/mall/items/${item.id}?force=true`
          : `/admin/mall/items/${item.id}`
        
        const response = await ragFetch(url, {
          method: 'DELETE',
          headers: { 'X-Admin-Token': adminKey || '' }
        })
        
        if (response.ok) {
          message.success('商品已删除')
          loadMallItems()
        } else {
          const data = await response.json()
          
          // 如果有关联订单，询问是否强制删除
          if (data.hasOrders) {
            Modal.confirm({
              title: '该商品有关联订单',
              icon: <WarningOutlined style={{ color: '#faad14' }} />,
              content: (
                <div>
                  <p>{data.error}</p>
                  <p style={{ color: '#f5222d' }}>强制删除后，相关订单记录将无法显示商品信息。</p>
                </div>
              ),
              okText: '强制删除',
              okType: 'danger',
              cancelText: '取消',
              onOk: () => handleDeleteItem(item, true)
            })
          } else {
            message.error(data.error || '删除失败')
          }
        }
      } catch {
        message.error('删除失败')
      }
    }

    if (force) {
      // 强制删除直接执行
      doDelete()
    } else {
      // 普通删除先确认
      Modal.confirm({
        title: '确认删除',
        icon: <ExclamationCircleOutlined />,
        content: `确定要删除商品 "${item.name}" 吗？`,
        okText: '删除',
        okType: 'danger',
        cancelText: '取消',
        onOk: doDelete
      })
    }
  }

  // 冻结/解冻用户
  const handleFreezeUser = async (userId: string, action: 'freeze' | 'unfreeze' | 'ban') => {
    Modal.confirm({
      title: action === 'ban' ? '确认封禁用户' : action === 'freeze' ? '确认冻结用户' : '确认解冻用户',
      icon: action === 'unfreeze' ? <UnlockOutlined /> : <LockOutlined />,
      content: `确定要${action === 'ban' ? '封禁' : action === 'freeze' ? '冻结' : '解冻'}用户 ${userId} 吗？`,
      okText: '确认',
      okType: action === 'unfreeze' ? 'primary' : 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          const response = await ragFetch(`/admin/users/${userId}/freeze`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'X-Admin-Token': adminKey || '' 
            },
            body: JSON.stringify({ 
              action,
              duration_hours: action === 'freeze' ? 24 : undefined,
              reason: action === 'freeze' ? '管理员手动冻结' : undefined
            })
          })
          
          if (response.ok) {
            message.success(`用户${action === 'ban' ? '封禁' : action === 'freeze' ? '冻结' : '解冻'}成功`)
          } else {
            throw new Error('操作失败')
          }
        } catch {
          message.error('操作失败')
        }
      }
    })
  }

  // 处理题目审核
  const handleReviewQuestion = async () => {
    if (!selectedReview) return
    
    setUpdating(true)
    try {
      const response = await apiFetch(`/api/admin/level-test/question/${selectedReview.question_id}/review`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'X-Admin-Key': adminKey || '' 
        },
        body: JSON.stringify({ 
          status: reviewStatus, 
          comments: reviewComments 
        })
      })
      
      if (response.ok) {
        message.success('审核完成')
        setReviewModalVisible(false)
        loadReviewQueue()
        loadLevelTestStats()
      } else {
        throw new Error('审核失败')
      }
    } catch {
      message.error('审核失败')
    } finally {
      setUpdating(false)
    }
  }

  const loadInquiries = async () => {
    setLoading(true)
    try {
      const response = await apiFetch('/api/admin/inquiries', {
        headers: { 'X-Admin-Key': adminKey || '' }
      })
      
      if (!response.ok) {
        throw new Error('加载失败')
      }
      
      const data = await response.json()
      setInquiries(data.inquiries || [])
    } catch {
      message.error('加载客户咨询失败')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    sessionStorage.removeItem('adminKey')
    navigate('/admin')
  }

  const handleViewDetails = (inquiry: Inquiry) => {
    setSelectedInquiry(inquiry)
    setEditStatus(inquiry.status)
    setEditNotes(inquiry.notes || '')
    setModalVisible(true)
  }

  const handleUpdateStatus = async () => {
    if (!selectedInquiry) return
    
    setUpdating(true)
    try {
      const response = await apiFetch(`/api/admin/inquiry/${selectedInquiry.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'X-Admin-Key': adminKey || '' 
        },
        body: JSON.stringify({ status: editStatus, notes: editNotes })
      })
      
      if (!response.ok) {
        throw new Error('更新失败')
      }
      
      message.success('更新成功')
      setModalVisible(false)
      loadInquiries()
    } catch {
      message.error('更新失败')
    } finally {
      setUpdating(false)
    }
  }

  const handleDelete = (inquiry: Inquiry) => {
    Modal.confirm({
      title: '确认删除',
      icon: <ExclamationCircleOutlined />,
      content: `确定要删除 "${inquiry.name}" 的咨询记录吗？此操作不可恢复。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          const response = await apiFetch(`/api/admin/inquiry/${inquiry.id}`, {
            method: 'DELETE',
            headers: { 'X-Admin-Key': adminKey || '' }
          })
          
          if (!response.ok) {
            throw new Error('删除失败')
          }
          
          message.success('删除成功')
          loadInquiries()
        } catch {
          message.error('删除失败')
        }
      }
    })
  }

  const exportToCSV = () => {
    if (inquiries.length === 0) {
      message.warning('没有数据可导出')
      return
    }

    const headers = ['姓名', '电话', '邮箱', '咨询内容', '状态', '备注', '提交时间']
    const statusMap: Record<string, string> = {
      pending: '待处理',
      contacted: '已联系',
      resolved: '已解决'
    }
    
    const rows = inquiries.map(item => [
      item.name,
      item.phone || '',
      item.email || '',
      item.message.replace(/,/g, '，').replace(/\n/g, ' '),
      statusMap[item.status] || item.status,
      (item.notes || '').replace(/,/g, '，').replace(/\n/g, ' '),
      new Date(item.created_at).toLocaleString('zh-CN')
    ])

    const csvContent = '\uFEFF' + [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `客户咨询_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    
    message.success('导出成功')
  }

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'pending':
        return <Tag icon={<ClockCircleOutlined />} color="warning">待处理</Tag>
      case 'contacted':
        return <Tag icon={<PhoneOutlined />} color="processing">已联系</Tag>
      case 'resolved':
        return <Tag icon={<CheckCircleOutlined />} color="success">已解决</Tag>
      default:
        return <Tag>{status}</Tag>
    }
  }

  const getTestStatusTag = (status: string) => {
    switch (status) {
      case 'pending':
        return <Tag color="default">待开始</Tag>
      case 'active':
        return <Tag color="processing">进行中</Tag>
      case 'completed':
        return <Tag color="warning">待评分</Tag>
      case 'graded':
        return <Tag color="success">已完成</Tag>
      default:
        return <Tag>{status}</Tag>
    }
  }

  const getLevelTag = (level: string) => {
    const colors: Record<string, string> = {
      '5**': '#722ed1',
      '5*': '#1890ff',
      '5': '#13c2c2',
      '4': '#52c41a',
      '3': '#faad14',
      '2': '#fa8c16',
      '1': '#f5222d',
      'U': '#d9d9d9',
    }
    return <Tag color={colors[level] || 'default'}>{level}</Tag>
  }

  const columns = [
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: 100,
      render: (name: string) => (
        <Space>
          <UserOutlined />
          <Text strong>{name}</Text>
        </Space>
      )
    },
    {
      title: '联系方式',
      key: 'contact',
      width: 180,
      render: (_: unknown, record: Inquiry) => (
        <div>
          {record.phone && (
            <div><PhoneOutlined /> {record.phone}</div>
          )}
          {record.email && (
            <div><MailOutlined /> {record.email}</div>
          )}
          {!record.phone && !record.email && (
            <Text type="secondary">未提供</Text>
          )}
        </div>
      )
    },
    {
      title: '咨询内容',
      dataIndex: 'message',
      key: 'message',
      ellipsis: true,
      render: (messageText: string) => (
        <Tooltip title={messageText}>
          <Paragraph ellipsis={{ rows: 2 }} style={{ margin: 0 }}>
            <MessageOutlined style={{ marginRight: 8 }} />
            {messageText}
          </Paragraph>
        </Tooltip>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      filters: [
        { text: '待处理', value: 'pending' },
        { text: '已联系', value: 'contacted' },
        { text: '已解决', value: 'resolved' },
      ],
      onFilter: (value: unknown, record: Inquiry) => record.status === value,
      render: (status: string) => getStatusTag(status)
    },
    {
      title: '提交时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      sorter: (a: Inquiry, b: Inquiry) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      render: (date: string) => new Date(date).toLocaleString('zh-CN')
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: unknown, record: Inquiry) => (
        <Space>
          <Button type="link" onClick={() => handleViewDetails(record)}>
            详情
          </Button>
          <Button 
            type="link" 
            danger 
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
          >
            删除
          </Button>
        </Space>
      )
    }
  ]

  const testRecordColumns = [
    {
      title: '用户',
      key: 'user',
      width: 150,
      render: (_: unknown, record: TestRecord) => (
        <div>
          <div><Text strong>{record.user_name || '匿名'}</Text></div>
          <Text type="secondary" style={{ fontSize: 12 }}>{record.user_email}</Text>
        </div>
      )
    },
    {
      title: '科目',
      dataIndex: 'subject',
      key: 'subject',
      width: 100,
    },
    {
      title: '年级',
      dataIndex: 'grade',
      key: 'grade',
      width: 80,
    },
    {
      title: '类型',
      dataIndex: 'test_type',
      key: 'test_type',
      width: 80,
      render: (type: string) => type === 'quick' ? '快速测试' : '完整测试'
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => getTestStatusTag(status)
    },
    {
      title: '分数',
      dataIndex: 'score',
      key: 'score',
      width: 80,
      render: (score: number) => score ? `${Math.round(score)}分` : '-'
    },
    {
      title: '等级',
      dataIndex: 'overall_level',
      key: 'overall_level',
      width: 80,
      render: (level: string) => level ? getLevelTag(level) : '-'
    },
    {
      title: '题目数',
      dataIndex: 'question_count',
      key: 'question_count',
      width: 80,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (date: string) => new Date(date).toLocaleString('zh-CN')
    },
  ]

  // 统计数据
  const stats = {
    total: inquiries.length,
    pending: inquiries.filter(i => i.status === 'pending').length,
    contacted: inquiries.filter(i => i.status === 'contacted').length,
    resolved: inquiries.filter(i => i.status === 'resolved').length,
  }

  // 渲染系统概览标签页
  const renderOverviewTab = () => (
    <>
      <Row gutter={[16, 16]} className={styles.statsRow}>
        <Col xs={12} sm={6}>
          <Card className={styles.statCard}>
            <Statistic 
              title="注册用户总数" 
              value={systemStats.totalUsers}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className={styles.statCard}>
            <Statistic 
              title="今日新用户" 
              value={systemStats.todayUsers}
              prefix={<RiseOutlined />}
              valueStyle={{ color: '#13c2c2' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className={styles.statCard}>
            <Statistic 
              title="分析报告总数" 
              value={systemStats.totalAnalysis}
              prefix={<BarChartOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className={styles.statCard}>
            <Statistic 
              title="今日分析数" 
              value={systemStats.todayAnalysis}
              prefix={<RiseOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {recentUsers.length > 0 && (
        <Card 
          title="最近注册用户" 
          className={styles.tableCard}
          style={{ marginBottom: 24 }}
        >
          <List
            itemLayout="horizontal"
            dataSource={recentUsers}
            renderItem={(user) => (
              <List.Item>
                <List.Item.Meta
                  avatar={<Avatar icon={<UserOutlined />} style={{ backgroundColor: '#722ed1' }} />}
                  title={user.name}
                  description={
                    <Space split={<Divider type="vertical" />}>
                      <span><MailOutlined /> {user.email}</span>
                      <span>注册时间: {new Date(user.created_at).toLocaleString('zh-CN')}</span>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        </Card>
      )}
    </>
  )

  // 渲染客户咨询标签页
  const renderInquiriesTab = () => (
    <>
      <Row gutter={[16, 16]} className={styles.statsRow}>
        <Col xs={12} sm={6}>
          <Card className={styles.statCard}>
            <Statistic title="总咨询数" value={stats.total} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className={`${styles.statCard} ${styles.pending}`}>
            <Statistic 
              title="待处理" 
              value={stats.pending} 
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className={`${styles.statCard} ${styles.contacted}`}>
            <Statistic 
              title="已联系" 
              value={stats.contacted}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className={`${styles.statCard} ${styles.resolved}`}>
            <Statistic 
              title="已解决" 
              value={stats.resolved}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      <Card 
        className={styles.tableCard}
        title="客户咨询列表"
        extra={
          <Space>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={loadInquiries}
              loading={loading}
            >
              刷新
            </Button>
            <Button 
              type="primary" 
              icon={<DownloadOutlined />} 
              onClick={exportToCSV}
            >
              导出CSV
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={inquiries}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showTotal: (total) => `共 ${total} 条记录`
          }}
          scroll={{ x: 800 }}
        />
      </Card>
    </>
  )

  // 渲染水平测试管理标签页
  const renderLevelTestTab = () => (
    <Spin spinning={levelTestLoading}>
      {/* 水平测试统计 */}
      <Row gutter={[16, 16]} className={styles.statsRow}>
        <Col xs={12} sm={6}>
          <Card className={styles.statCard}>
            <Statistic 
              title="测试总数" 
              value={levelTestStats?.totalTests || 0}
              prefix={<BookOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className={styles.statCard}>
            <Statistic 
              title="已完成测试" 
              value={levelTestStats?.completedTests || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className={styles.statCard}>
            <Statistic 
              title="今日测试" 
              value={levelTestStats?.todayTests || 0}
              prefix={<RiseOutlined />}
              valueStyle={{ color: '#13c2c2' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className={styles.statCard}>
            <Statistic 
              title="平均分数" 
              value={levelTestStats?.averageScore || 0}
              prefix={<TrophyOutlined />}
              valueStyle={{ color: '#faad14' }}
              suffix="分"
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12}>
          <Card className={styles.statCard}>
            <Statistic 
              title="缓存题目数" 
              value={levelTestStats?.cachedQuestions || 0}
              prefix={<DatabaseOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card className={styles.statCard}>
            <Statistic 
              title={
                <span>
                  待审核题目 
                  {(levelTestStats?.pendingReviews || 0) > 0 && (
                    <Badge count={levelTestStats?.pendingReviews} style={{ marginLeft: 8 }} />
                  )}
                </span>
              }
              value={levelTestStats?.pendingReviews || 0}
              prefix={<SafetyOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 科目分布 */}
      {levelTestStats?.subjectDistribution && levelTestStats.subjectDistribution.length > 0 && (
        <Card title="科目测试分布" className={styles.tableCard} style={{ marginBottom: 24 }}>
          <Row gutter={[16, 16]}>
            {levelTestStats.subjectDistribution.map((item) => (
              <Col xs={24} sm={12} md={8} key={item.subject}>
                <Card size="small" className={styles.subjectCard}>
                  <div className={styles.subjectHeader}>
                    <Text strong>{item.subject}</Text>
                    <Tag color="blue">{item.count} 次</Tag>
                  </div>
                  <Progress 
                    percent={item.avg_score ? Math.round(item.avg_score) : 0} 
                    size="small"
                    status="active"
                    format={(percent) => `平均 ${percent}分`}
                  />
                </Card>
              </Col>
            ))}
          </Row>
        </Card>
      )}

      {/* 等级分布 */}
      {levelTestStats?.levelDistribution && levelTestStats.levelDistribution.length > 0 && (
        <Card title="等级分布" className={styles.tableCard} style={{ marginBottom: 24 }}>
          <Row gutter={[16, 16]}>
            {levelTestStats.levelDistribution.map((item) => (
              <Col xs={8} sm={6} md={4} lg={3} key={item.overall_level}>
                <Card size="small" className={styles.levelCard}>
                  <div className={styles.levelContent}>
                    {getLevelTag(item.overall_level)}
                    <Text strong style={{ fontSize: 20, marginTop: 8 }}>{item.count}</Text>
                    <Text type="secondary">人</Text>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </Card>
      )}

      {/* 待审核题目 */}
      <Card 
        title={
          <span>
            待审核题目
            {reviewQueue.length > 0 && (
              <Badge count={reviewQueue.length} style={{ marginLeft: 8 }} />
            )}
          </span>
        }
        className={styles.tableCard} 
        style={{ marginBottom: 24 }}
        extra={
          <Button icon={<ReloadOutlined />} onClick={loadReviewQueue}>
            刷新
          </Button>
        }
      >
        {reviewQueue.length === 0 ? (
          <Empty description="暂无待审核题目" />
        ) : (
          <List
            dataSource={reviewQueue}
            renderItem={(item) => {
              let questionData: { question?: string; options?: string[] } = {}
              try {
                questionData = JSON.parse(item.question_data || '{}')
              } catch {
                questionData = {}
              }
              
              return (
                <List.Item
                  actions={[
                    <Button 
                      key="review"
                      type="primary" 
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => {
                        setSelectedReview(item)
                        setReviewStatus('approved')
                        setReviewComments('')
                        setReviewModalVisible(true)
                      }}
                    >
                      审核
                    </Button>
                  ]}
                >
                  <List.Item.Meta
                    title={
                      <Space>
                        <Tag>{item.grade}</Tag>
                        <Tag color="blue">{item.subject}</Tag>
                        <Tag color={item.difficulty === 'hard' ? 'red' : item.difficulty === 'medium' ? 'orange' : 'green'}>
                          {item.difficulty === 'hard' ? '困难' : item.difficulty === 'medium' ? '中等' : '简单'}
                        </Tag>
                        <Tag>{item.question_type === 'choice' ? '选择题' : item.question_type === 'short' ? '简答题' : '论述题'}</Tag>
                      </Space>
                    }
                    description={
                      <Paragraph ellipsis={{ rows: 2 }} style={{ margin: 0 }}>
                        {questionData.question || '题目内容加载中...'}
                      </Paragraph>
                    }
                  />
                </List.Item>
              )
            }}
          />
        )}
      </Card>

      {/* 测试记录列表 */}
      <Card 
        title="最近测试记录" 
        className={styles.tableCard}
        extra={
          <Button icon={<ReloadOutlined />} onClick={loadTestRecords}>
            刷新
          </Button>
        }
      >
        <Table
          columns={testRecordColumns}
          dataSource={testRecords}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showTotal: (total) => `共 ${total} 条记录`
          }}
          scroll={{ x: 1000 }}
        />
      </Card>
    </Spin>
  )

  // 渲染积分系统管理标签页
  const renderPointsTab = () => (
    <Spin spinning={pointsLoading}>
      {/* 积分系统统计 */}
      <Row gutter={[16, 16]} className={styles.statsRow}>
        <Col xs={12} sm={8} md={4}>
          <Card className={styles.statCard}>
            <Statistic 
              title="今日发放积分" 
              value={pointsStats?.todayPointsEarned || 0}
              prefix={<RiseOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card className={styles.statCard}>
            <Statistic 
              title="今日消耗积分" 
              value={pointsStats?.todayPointsSpent || 0}
              prefix={<FundOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card className={styles.statCard}>
            <Statistic 
              title="积分用户数" 
              value={pointsStats?.totalUsers || 0}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card className={styles.statCard}>
            <Statistic 
              title="待处理订单" 
              value={pointsStats?.pendingOrders || 0}
              prefix={<ShoppingOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card className={styles.statCard}>
            <Statistic 
              title="今日风控事件" 
              value={pointsStats?.todayFraudEvents || 0}
              prefix={<WarningOutlined />}
              valueStyle={{ color: pointsStats?.todayFraudEvents ? '#f5222d' : '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card className={styles.statCard}>
            <Button 
              type="primary" 
              icon={<GiftOutlined />}
              onClick={() => {
                setGrantModalVisible(true)
                loadAllUsers()
              }}
              block
            >
              手动补发积分
            </Button>
          </Card>
        </Col>
      </Row>

      {/* 今日积分获取 Top 10 */}
      <Card 
        title={<><CrownOutlined style={{ color: '#faad14', marginRight: 8 }} />今日积分获取排行</>}
        className={styles.tableCard}
        style={{ marginBottom: 24 }}
        extra={
          <Button icon={<ReloadOutlined />} onClick={loadTopEarners}>刷新</Button>
        }
      >
        {topEarners.length === 0 ? (
          <Empty description="暂无数据" />
        ) : (
          <Table
            dataSource={topEarners}
            rowKey="user_id"
            pagination={false}
            size="small"
            columns={[
              {
                title: '排名',
                key: 'rank',
                width: 60,
                render: (_, __, index) => (
                  <span style={{ 
                    color: index < 3 ? ['#faad14', '#a0a0a0', '#cd7f32'][index] : undefined,
                    fontWeight: index < 3 ? 'bold' : 'normal',
                    fontSize: index < 3 ? 16 : 14
                  }}>
                    {index + 1}
                  </span>
                )
              },
              { title: '用户ID', dataIndex: 'user_id', key: 'user_id', ellipsis: true },
              { 
                title: '获得积分', 
                dataIndex: 'total_earned', 
                key: 'total_earned',
                render: (v: number) => <Text strong style={{ color: '#52c41a' }}>+{v}</Text>
              },
              { 
                title: '操作次数', 
                dataIndex: 'action_count', 
                key: 'action_count',
                render: (v: number) => <Tag color="blue">{v} 次</Tag>
              },
              {
                title: '操作',
                key: 'actions',
                width: 150,
                render: (_, record: TopEarner) => (
                  <Space>
                    <Button 
                      size="small" 
                      onClick={() => {
                        setLedgerUserId(record.user_id)
                        loadPointsLedger(record.user_id)
                      }}
                    >
                      查看流水
                    </Button>
                  </Space>
                )
              }
            ]}
          />
        )}
      </Card>

      {/* 防刷规则管理 */}
      <Card 
        title={<><SafetyOutlined style={{ color: '#1890ff', marginRight: 8 }} />防刷规则配置</>}
        className={styles.tableCard}
        style={{ marginBottom: 24 }}
        extra={
          <Button icon={<ReloadOutlined />} onClick={loadFraudRules}>刷新</Button>
        }
      >
        <Table
          dataSource={fraudRules}
          rowKey="id"
          pagination={false}
          size="small"
          columns={[
            { title: '规则代码', dataIndex: 'rule_code', key: 'rule_code', width: 180 },
            { title: '名称', dataIndex: 'name', key: 'name' },
            { title: '说明', dataIndex: 'description', key: 'description', ellipsis: true },
            { 
              title: '阈值', 
              dataIndex: 'threshold_value', 
              key: 'threshold_value',
              render: (v: number) => <Tag color="orange">{v}</Tag>
            },
            { 
              title: '状态', 
              dataIndex: 'is_active', 
              key: 'is_active',
              render: (v: boolean) => v ? 
                <Tag icon={<CheckCircleOutlined />} color="success">启用</Tag> : 
                <Tag icon={<StopOutlined />} color="default">禁用</Tag>
            },
            {
              title: '操作',
              key: 'actions',
              width: 80,
              render: (_, record: FraudRule) => (
                <Button 
                  size="small" 
                  icon={<EditOutlined />}
                  onClick={() => {
                    setSelectedRule(record)
                    setEditThreshold(record.threshold_value)
                    setEditRuleActive(record.is_active)
                    setRuleModalVisible(true)
                  }}
                >
                  编辑
                </Button>
              )
            }
          ]}
        />
      </Card>

      {/* 积分流水查询 */}
      <Card 
        title={<><DollarOutlined style={{ color: '#faad14', marginRight: 8 }} />积分流水查询</>}
        className={styles.tableCard}
        style={{ marginBottom: 24 }}
        extra={
          <Space>
            <Input 
              placeholder="输入用户ID" 
              value={ledgerUserId}
              onChange={(e) => setLedgerUserId(e.target.value)}
              style={{ width: 200 }}
              allowClear
            />
            <Button 
              type="primary"
              icon={<SyncOutlined />}
              onClick={() => loadPointsLedger(ledgerUserId || undefined)}
            >
              查询
            </Button>
          </Space>
        }
      >
        <Table
          dataSource={pointsLedger}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          size="small"
          scroll={{ x: 900 }}
          columns={[
            { title: '用户ID', dataIndex: 'user_id', key: 'user_id', width: 150, ellipsis: true },
            { 
              title: '变动', 
              dataIndex: 'change_points', 
              key: 'change_points',
              width: 100,
              render: (v: number) => (
                <Text strong style={{ color: v > 0 ? '#52c41a' : '#f5222d' }}>
                  {v > 0 ? `+${v}` : v}
                </Text>
              )
            },
            { 
              title: '余额', 
              dataIndex: 'current_points', 
              key: 'current_points',
              width: 80
            },
            { 
              title: '类型', 
              dataIndex: 'type', 
              key: 'type',
              width: 100,
              render: (v: string) => (
                <Tag color={v === 'EARN' ? 'green' : v === 'SPEND' ? 'orange' : 'blue'}>{v}</Tag>
              )
            },
            { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true },
            { title: 'IP', dataIndex: 'ip_address', key: 'ip_address', width: 120, ellipsis: true },
            { 
              title: '时间', 
              dataIndex: 'created_at', 
              key: 'created_at',
              width: 160,
              render: (v: string) => new Date(v).toLocaleString('zh-CN')
            },
            {
              title: '操作',
              key: 'actions',
              width: 100,
              fixed: 'right' as const,
              render: (_, record: PointsLedgerItem) => (
                <Space>
                  <Tooltip title="冻结用户">
                    <Button 
                      size="small" 
                      danger
                      icon={<LockOutlined />}
                      onClick={() => handleFreezeUser(record.user_id, 'freeze')}
                    />
                  </Tooltip>
                </Space>
              )
            }
          ]}
        />
      </Card>

      {/* 兑换订单管理 */}
      <Card 
        title={<><ShoppingOutlined style={{ color: '#722ed1', marginRight: 8 }} />兑换订单管理</>}
        className={styles.tableCard}
        extra={
          <Space>
            <Select
              placeholder="订单状态"
              value={orderStatus || undefined}
              onChange={(v) => {
                setOrderStatus(v || '')
                loadPointsOrders(v || undefined)
              }}
              style={{ width: 120 }}
              allowClear
              options={[
                { value: 'PAID', label: '待履约' },
                { value: 'SHIPPING', label: '发货中' },
                { value: 'FULFILLED', label: '已履约' },
                { value: 'COMPLETED', label: '已完成' },
              ]}
            />
            <Button icon={<ReloadOutlined />} onClick={() => loadPointsOrders(orderStatus || undefined)}>
              刷新
            </Button>
          </Space>
        }
      >
        <Table
          dataSource={pointsOrders}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          size="small"
          scroll={{ x: 1000 }}
          columns={[
            { title: '订单号', dataIndex: 'id', key: 'id', width: 180 },
            { title: '用户ID', dataIndex: 'user_id', key: 'user_id', width: 150, ellipsis: true },
            { title: '商品', dataIndex: 'item_name', key: 'item_name', width: 120 },
            { 
              title: '类型', 
              dataIndex: 'item_type', 
              key: 'item_type',
              width: 70,
              render: (v: string) => (
                <Tag color={v === 'VIRTUAL' ? 'purple' : v === 'DIGITAL' ? 'cyan' : 'orange'}>
                  {v === 'VIRTUAL' ? '虚拟' : v === 'DIGITAL' ? '数字' : '实物'}
                </Tag>
              )
            },
            { 
              title: '收货信息', 
              dataIndex: 'receiver_info', 
              key: 'receiver_info',
              width: 200,
              render: (v: string | null, record: PointsOrder) => {
                if (record.item_type !== 'PHYSICAL' || !v) {
                  return <Text type="secondary">-</Text>
                }
                try {
                  const info = JSON.parse(v)
                  return (
                    <Tooltip title={
                      <div>
                        <div><strong>姓名：</strong>{info.name}</div>
                        <div><strong>电话：</strong>{info.phone}</div>
                        <div><strong>地址：</strong>{info.address}</div>
                      </div>
                    }>
                      <div style={{ cursor: 'pointer' }}>
                        <div style={{ fontSize: 12 }}>{info.name} / {info.phone}</div>
                        <div style={{ fontSize: 11, color: '#999', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
                          {info.address}
                        </div>
                      </div>
                    </Tooltip>
                  )
                } catch {
                  return <Text type="secondary" style={{ fontSize: 12 }}>{v}</Text>
                }
              }
            },
            { title: '数量', dataIndex: 'quantity', key: 'quantity', width: 60 },
            { 
              title: '消耗积分', 
              dataIndex: 'total_cost', 
              key: 'total_cost',
              width: 100,
              render: (v: number) => <Text type="danger">-{v}</Text>
            },
            { 
              title: '状态', 
              dataIndex: 'status', 
              key: 'status',
              width: 100,
              render: (v: string) => {
                const statusMap: Record<string, { color: string; text: string }> = {
                  'PAID': { color: 'processing', text: '待履约' },
                  'SHIPPING': { color: 'warning', text: '发货中' },
                  'FULFILLED': { color: 'success', text: '已履约' },
                  'COMPLETED': { color: 'default', text: '已完成' },
                }
                const s = statusMap[v] || { color: 'default', text: v }
                return <Tag color={s.color}>{s.text}</Tag>
              }
            },
            { 
              title: '创建时间', 
              dataIndex: 'created_at', 
              key: 'created_at',
              width: 160,
              render: (v: string) => new Date(v).toLocaleString('zh-CN')
            },
            {
              title: '操作',
              key: 'actions',
              width: 120,
              fixed: 'right' as const,
              render: (_, record: PointsOrder) => (
                <Space>
                  {record.status === 'PAID' && (
                    <>
                      {record.item_type === 'PHYSICAL' ? (
                        <Button 
                          size="small" 
                          type="primary"
                          onClick={() => handleFulfillOrder(record.id, 'SHIPPING')}
                        >
                          发货
                        </Button>
                      ) : (
                        <Button 
                          size="small" 
                          type="primary"
                          onClick={() => handleFulfillOrder(record.id, 'FULFILLED')}
                        >
                          履约
                        </Button>
                      )}
                    </>
                  )}
                  {record.status === 'SHIPPING' && (
                    <Button 
                      size="small" 
                      onClick={() => handleFulfillOrder(record.id, 'COMPLETED')}
                    >
                      完成
                    </Button>
                  )}
                </Space>
              )
            }
          ]}
        />
      </Card>
    </Spin>
  )

  // 渲染商城商品管理标签页
  const renderMallItemsTab = () => (
    <Spin spinning={mallItemsLoading}>
      {/* 操作按钮 */}
      <Card 
        title={<><ShoppingOutlined style={{ color: '#722ed1', marginRight: 8 }} />商城商品管理</>}
        className={styles.tableCard}
        extra={
          <Space>
            <Button 
              type="primary" 
              icon={<GiftOutlined />}
              onClick={handleAddItem}
            >
              添加商品
            </Button>
            <Button icon={<ReloadOutlined />} onClick={loadMallItems}>
              刷新
            </Button>
          </Space>
        }
      >
        <Table
          dataSource={mallItems}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          scroll={{ x: 1200 }}
          columns={[
            {
              title: '图片',
              dataIndex: 'image_url',
              key: 'image_url',
              width: 80,
              render: (url: string) => (
                url ? (
                  <img 
                    src={url} 
                    alt="商品" 
                    style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 4 }}
                  />
                ) : (
                  <div style={{ 
                    width: 50, 
                    height: 50, 
                    backgroundColor: '#f0f0f0', 
                    borderRadius: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <ShoppingOutlined style={{ color: '#999' }} />
                  </div>
                )
              )
            },
            { 
              title: '商品名称', 
              dataIndex: 'name', 
              key: 'name',
              width: 180,
              render: (name: string, record: MallItem) => (
                <div>
                  <Text strong>{name}</Text>
                  {!record.is_visible && <Tag color="default" style={{ marginLeft: 8 }}>已下架</Tag>}
                </div>
              )
            },
            { 
              title: '描述', 
              dataIndex: 'description', 
              key: 'description',
              ellipsis: true,
              width: 200
            },
            { 
              title: '价格', 
              dataIndex: 'price', 
              key: 'price',
              width: 100,
              render: (v: number) => <Text strong style={{ color: '#fa8c16' }}>{v} 积分</Text>
            },
            { 
              title: '库存', 
              dataIndex: 'stock', 
              key: 'stock',
              width: 80,
              render: (v: number) => v === -1 ? <Tag color="green">无限</Tag> : <Tag color={v > 0 ? 'blue' : 'red'}>{v}</Tag>
            },
            { 
              title: '类型', 
              dataIndex: 'item_type', 
              key: 'item_type',
              width: 80,
              render: (v: string) => {
                const types: Record<string, { color: string; text: string }> = {
                  'VIRTUAL': { color: 'purple', text: '虚拟' },
                  'DIGITAL': { color: 'cyan', text: '数字' },
                  'PHYSICAL': { color: 'orange', text: '实物' },
                }
                const t = types[v] || { color: 'default', text: v }
                return <Tag color={t.color}>{t.text}</Tag>
              }
            },
            { 
              title: '状态', 
              dataIndex: 'is_visible', 
              key: 'is_visible',
              width: 80,
              render: (v: boolean) => v ? 
                <Tag icon={<CheckCircleOutlined />} color="success">上架</Tag> : 
                <Tag icon={<StopOutlined />} color="default">下架</Tag>
            },
            { 
              title: '排序', 
              dataIndex: 'sort_order', 
              key: 'sort_order',
              width: 60
            },
            {
              title: '操作',
              key: 'actions',
              width: 200,
              fixed: 'right' as const,
              render: (_: unknown, record: MallItem) => (
                <Space>
                  <Button 
                    size="small" 
                    icon={<EditOutlined />}
                    onClick={() => handleEditItem(record)}
                  >
                    编辑
                  </Button>
                  <Button 
                    size="small"
                    type={record.is_visible ? 'default' : 'primary'}
                    icon={record.is_visible ? <StopOutlined /> : <CheckCircleOutlined />}
                    onClick={() => handleToggleItem(record.id)}
                  >
                    {record.is_visible ? '下架' : '上架'}
                  </Button>
                  <Button 
                    size="small" 
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleDeleteItem(record)}
                  >
                    删除
                  </Button>
                </Space>
              )
            }
          ]}
        />
      </Card>
    </Spin>
  )

  // 社区管理标签页
  const renderCommunityTab = () => (
    <Spin spinning={communityLoading}>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic 
              title="总帖子数" 
              value={communityStats?.totalPosts || 0}
              prefix={<CommentOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="总评论数" 
              value={communityStats?.totalComments || 0}
              prefix={<MessageOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="今日新帖" 
              value={communityStats?.todayPosts || 0}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="今日评论" 
              value={communityStats?.todayComments || 0}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      <Card 
        title="帖子管理" 
        extra={
          <Button icon={<ReloadOutlined />} onClick={loadCommunityData}>
            刷新
          </Button>
        }
      >
        <Table
          dataSource={communityPosts}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          columns={[
            {
              title: 'ID',
              dataIndex: 'id',
              width: 60
            },
            {
              title: '标题',
              dataIndex: 'title',
              ellipsis: true,
              width: 200,
              render: (title, record) => (
                <Space>
                  {record.is_pinned ? <Tag color="orange" icon={<PushpinOutlined />}>置顶</Tag> : null}
                  <span>{title}</span>
                </Space>
              )
            },
            {
              title: '作者',
              dataIndex: 'user_name',
              width: 100,
              render: (name, record) => name || record.user_id
            },
            {
              title: '分类',
              dataIndex: 'category',
              width: 100,
              render: (cat) => {
                const colors: Record<string, string> = {
                  general: 'blue',
                  study_method: 'green',
                  review_experience: 'orange',
                  practice_share: 'purple',
                  help: 'red'
                }
                const labels: Record<string, string> = {
                  general: '综合',
                  study_method: '学习方法',
                  review_experience: '复习经验',
                  practice_share: '刷题分享',
                  help: '求助'
                }
                return <Tag color={colors[cat] || 'default'}>{labels[cat] || cat}</Tag>
              }
            },
            {
              title: '浏览',
              dataIndex: 'view_count',
              width: 70
            },
            {
              title: '点赞',
              dataIndex: 'like_count',
              width: 70
            },
            {
              title: '评论',
              dataIndex: 'comment_count',
              width: 70
            },
            {
              title: '发布时间',
              dataIndex: 'created_at',
              width: 150,
              render: (date) => new Date(date).toLocaleString()
            },
            {
              title: '操作',
              width: 150,
              render: (_, record: CommunityPost) => (
                <Space>
                  <Tooltip title={record.is_pinned ? '取消置顶' : '置顶'}>
                    <Button 
                      size="small"
                      type={record.is_pinned ? 'primary' : 'default'}
                      icon={<PushpinOutlined />}
                      onClick={() => handleAdminPinPost(record.id)}
                    />
                  </Tooltip>
                  <Tooltip title="删除">
                    <Button 
                      size="small" 
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => {
                        Modal.confirm({
                          title: '确认删除',
                          content: `确定要删除帖子"${record.title}"吗？`,
                          onOk: () => handleAdminDeletePost(record.id)
                        })
                      }}
                    />
                  </Tooltip>
                </Space>
              )
            }
          ]}
        />
      </Card>
    </Spin>
  )

  // 用户管理标签页
  const renderUsersTab = () => {
    // 计算各角色用户数
    const roleStats = {
      total: adminUsers.length,
      user: adminUsers.filter(u => !u.role || u.role === 'user').length,
      consultant: adminUsers.filter(u => u.role === 'consultant').length,
      admin: adminUsers.filter(u => u.role === 'admin').length,
    }
    
    return (
    <Spin spinning={usersLoading}>
      {/* 角色统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card className={styles.statCard}>
            <Statistic 
              title="总用户数" 
              value={usersPagination.total || roleStats.total}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className={styles.statCard}>
            <Statistic 
              title="普通用户" 
              value={roleStats.user}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className={styles.statCard}>
            <Statistic 
              title={<span style={{ color: '#52c41a', fontWeight: 'bold' }}>🎓 顾问</span>}
              value={roleStats.consultant}
              prefix={<SafetyOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className={styles.statCard}>
            <Statistic 
              title="管理员" 
              value={roleStats.admin}
              prefix={<CrownOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="用户管理 / 顾问授权" style={{ marginBottom: 24 }}>
        <Space style={{ marginBottom: 16 }}>
          <Input.Search
            placeholder="搜索用户（ID/姓名/邮箱）"
            allowClear
            style={{ width: 300 }}
            value={usersSearchTerm}
            onChange={(e) => setUsersSearchTerm(e.target.value)}
            onSearch={(value) => {
              setUsersSearchTerm(value)
              loadAdminUsers(1, value)
            }}
          />
          <Button 
            icon={<ReloadOutlined />} 
            onClick={() => loadAdminUsers(usersPagination.page)}
          >
            刷新
          </Button>
        </Space>

        <Table
          dataSource={adminUsers}
          rowKey="id"
          pagination={{
            current: usersPagination.page,
            pageSize: usersPagination.pageSize,
            total: usersPagination.total,
            showTotal: (total) => `共 ${total} 个用户`,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            onChange: (page, pageSize) => {
              setUsersPagination(prev => ({ ...prev, page, pageSize }))
              loadAdminUsers(page, usersSearchTerm)
            }
          }}
          columns={[
            {
              title: '用户',
              dataIndex: 'name',
              render: (name: string, record: AdminUser) => (
                <Space>
                  <Avatar 
                    size="small" 
                    src={record.avatar} 
                    icon={<UserOutlined />}
                  />
                  <div>
                    <div>{name}</div>
                    <Text type="secondary" style={{ fontSize: 12 }}>{record.email}</Text>
                  </div>
                </Space>
              )
            },
            {
              title: 'ID',
              dataIndex: 'id',
              width: 120,
              render: (id: string) => (
                <Tooltip title={id}>
                  <Text copyable style={{ fontSize: 11 }}>{id.substring(0, 8)}...</Text>
                </Tooltip>
              )
            },
            {
              title: '角色',
              dataIndex: 'role',
              width: 130,
              filters: [
                { text: '普通用户', value: 'user' },
                { text: '顾问', value: 'consultant' },
                { text: '管理员', value: 'admin' },
              ],
              onFilter: (value: unknown, record: AdminUser) => record.role === value,
              render: (role: ConsultantRole | undefined, record: AdminUser) => (
                <Select
                  value={role || 'user'}
                  onChange={(newRole) => handleUpdateUserRole(record.id, newRole)}
                  loading={roleUpdating === record.id}
                  disabled={roleUpdating !== null}
                  size="small"
                  style={{ width: 110 }}
                  options={[
                    { 
                      value: 'user', 
                      label: <span><UserOutlined style={{ marginRight: 4 }} />普通用户</span>
                    },
                    { 
                      value: 'consultant', 
                      label: <span style={{ color: '#52c41a' }}><TeamOutlined style={{ marginRight: 4 }} />顾问</span>
                    },
                    { 
                      value: 'admin', 
                      label: <span style={{ color: '#ff4d4f' }}><CrownOutlined style={{ marginRight: 4 }} />管理员</span>
                    },
                  ]}
                />
              )
            },
            {
              title: '电话',
              dataIndex: 'phone',
              width: 120,
              render: (phone: string) => phone || '-'
            },
            {
              title: '积分',
              dataIndex: 'points',
              width: 80,
              sorter: (a: AdminUser, b: AdminUser) => (a.points || 0) - (b.points || 0),
              render: (points: number) => (
                <Tag color="gold">{points || 0}</Tag>
              )
            },
            {
              title: '分析次数',
              dataIndex: 'analysis_count',
              width: 90,
              sorter: (a: AdminUser, b: AdminUser) => a.analysis_count - b.analysis_count,
              render: (count: number) => count || 0
            },
            {
              title: '测试次数',
              dataIndex: 'test_count',
              width: 90,
              sorter: (a: AdminUser, b: AdminUser) => a.test_count - b.test_count,
              render: (count: number) => count || 0
            },
            {
              title: '发帖数',
              dataIndex: 'post_count',
              width: 80,
              sorter: (a: AdminUser, b: AdminUser) => a.post_count - b.post_count,
              render: (count: number) => count || 0
            },
            {
              title: '注册时间',
              dataIndex: 'created_at',
              width: 160,
              sorter: (a: AdminUser, b: AdminUser) => 
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
              render: (date: string) => new Date(date).toLocaleString('zh-CN')
            },
            {
              title: '操作',
              width: 120,
              render: (_, record: AdminUser) => (
                <Space>
                  <Tooltip title="查看积分记录">
                    <Button
                      size="small"
                      icon={<DollarOutlined />}
                      onClick={() => {
                        setLedgerUserId(record.id)
                        loadPointsLedger(record.id)
                        setActiveTab('points')
                      }}
                    />
                  </Tooltip>
                  <Tooltip title="删除用户">
                    <Button
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => handleDeleteUser(record.id, record.name)}
                    />
                  </Tooltip>
                </Space>
              )
            }
          ]}
        />
      </Card>
    </Spin>
  )}

  const tabItems = [
    {
      key: 'overview',
      label: (
        <span>
          <BarChartOutlined />
          系统概览
        </span>
      ),
      children: renderOverviewTab(),
    },
    {
      key: 'users',
      label: (
        <span>
          <TeamOutlined />
          用户管理
        </span>
      ),
      children: renderUsersTab(),
    },
    {
      key: 'inquiries',
      label: (
        <span>
          <MessageOutlined />
          客户咨询
          {stats.pending > 0 && <Badge count={stats.pending} style={{ marginLeft: 8 }} />}
        </span>
      ),
      children: renderInquiriesTab(),
    },
    {
      key: 'levelTest',
      label: (
        <span>
          <BookOutlined />
          水平测试管理
          {(levelTestStats?.pendingReviews || 0) > 0 && (
            <Badge count={levelTestStats?.pendingReviews} style={{ marginLeft: 8 }} />
          )}
        </span>
      ),
      children: renderLevelTestTab(),
    },
    {
      key: 'points',
      label: (
        <span>
          <GiftOutlined />
          积分系统管理
          {(pointsStats?.pendingOrders || 0) > 0 && (
            <Badge count={pointsStats?.pendingOrders} style={{ marginLeft: 8 }} />
          )}
        </span>
      ),
      children: renderPointsTab(),
    },
    {
      key: 'mallItems',
      label: (
        <span>
          <ShoppingOutlined />
          商城商品管理
        </span>
      ),
      children: renderMallItemsTab(),
    },
    {
      key: 'community',
      label: (
        <span>
          <CommentOutlined />
          社区管理
        </span>
      ),
      children: renderCommunityTab(),
    },
  ]

  return (
    <div className={styles.adminDashboard}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <Title level={3} style={{ margin: 0, color: '#fff' }}>
            管理员后台
          </Title>
          <Button 
            icon={<LogoutOutlined />} 
            onClick={handleLogout}
            type="text"
            style={{ color: '#fff' }}
          >
            退出登录
          </Button>
        </div>
      </header>

      <main className={styles.main}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          size="large"
        />
      </main>

      {/* 咨询详情弹窗 */}
      <Modal
        title="咨询详情"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setModalVisible(false)}>
            取消
          </Button>,
          <Button 
            key="save" 
            type="primary" 
            loading={updating}
            onClick={handleUpdateStatus}
          >
            保存
          </Button>
        ]}
        width={600}
      >
        {selectedInquiry && (
          <div className={styles.detailContent}>
            <div className={styles.detailItem}>
              <Text type="secondary">姓名：</Text>
              <Text strong>{selectedInquiry.name}</Text>
            </div>
            <div className={styles.detailItem}>
              <Text type="secondary">电话：</Text>
              <Text>{selectedInquiry.phone || '未提供'}</Text>
            </div>
            <div className={styles.detailItem}>
              <Text type="secondary">邮箱：</Text>
              <Text>{selectedInquiry.email || '未提供'}</Text>
            </div>
            <div className={styles.detailItem}>
              <Text type="secondary">咨询内容：</Text>
              <Paragraph style={{ marginTop: 8, marginBottom: 0 }}>
                {selectedInquiry.message}
              </Paragraph>
            </div>
            <div className={styles.detailItem}>
              <Text type="secondary">提交时间：</Text>
              <Text>{new Date(selectedInquiry.created_at).toLocaleString('zh-CN')}</Text>
            </div>
            
            <div className={styles.editSection}>
              <div className={styles.detailItem}>
                <Text type="secondary">状态：</Text>
                <Select
                  value={editStatus}
                  onChange={setEditStatus}
                  style={{ width: 150 }}
                  options={[
                    { value: 'pending', label: '待处理' },
                    { value: 'contacted', label: '已联系' },
                    { value: 'resolved', label: '已解决' },
                  ]}
                />
              </div>
              <div className={styles.detailItem}>
                <Text type="secondary">备注：</Text>
                <TextArea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={3}
                  placeholder="添加跟进备注..."
                  style={{ marginTop: 8 }}
                />
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* 题目审核弹窗 */}
      <Modal
        title="题目审核"
        open={reviewModalVisible}
        onCancel={() => setReviewModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setReviewModalVisible(false)}>
            取消
          </Button>,
          <Button 
            key="reject" 
            danger
            icon={<CloseCircleOutlined />}
            onClick={() => {
              setReviewStatus('rejected')
              handleReviewQuestion()
            }}
            loading={updating}
          >
            拒绝
          </Button>,
          <Button 
            key="approve" 
            type="primary" 
            icon={<CheckCircleOutlined />}
            loading={updating}
            onClick={() => {
              setReviewStatus('approved')
              handleReviewQuestion()
            }}
          >
            通过
          </Button>
        ]}
        width={700}
      >
        {selectedReview && (
          <div className={styles.reviewContent}>
            <div className={styles.reviewMeta}>
              <Space>
                <Tag>{selectedReview.grade}</Tag>
                <Tag color="blue">{selectedReview.subject}</Tag>
                <Tag color={selectedReview.difficulty === 'hard' ? 'red' : selectedReview.difficulty === 'medium' ? 'orange' : 'green'}>
                  {selectedReview.difficulty === 'hard' ? '困难' : selectedReview.difficulty === 'medium' ? '中等' : '简单'}
                </Tag>
                <Tag>{selectedReview.question_type === 'choice' ? '选择题' : selectedReview.question_type === 'short' ? '简答题' : '论述题'}</Tag>
              </Space>
            </div>
            
            <div className={styles.questionPreview}>
              <Title level={5}>题目内容</Title>
              <Card size="small" className={styles.previewCard}>
                {(() => {
                  try {
                    const data = JSON.parse(selectedReview.question_data || '{}')
                    return (
                      <>
                        <Paragraph>{data.question}</Paragraph>
                        {data.options && (
                          <div className={styles.optionsList}>
                            {data.options.map((opt: string, idx: number) => (
                              <div key={idx} className={styles.optionItem}>
                                {String.fromCharCode(65 + idx)}. {opt}
                              </div>
                            ))}
                          </div>
                        )}
                        {data.answer && (
                          <div className={styles.answerSection}>
                            <Text strong>正确答案：</Text> {data.answer}
                          </div>
                        )}
                        {data.explanation && (
                          <div className={styles.explanationSection}>
                            <Text strong>解析：</Text> {data.explanation}
                          </div>
                        )}
                      </>
                    )
                  } catch {
                    return <Text type="secondary">题目数据解析失败</Text>
                  }
                })()}
              </Card>
            </div>

            <div className={styles.reviewForm}>
              <Title level={5}>审核意见</Title>
              <TextArea
                value={reviewComments}
                onChange={(e) => setReviewComments(e.target.value)}
                rows={3}
                placeholder="添加审核意见（可选）..."
              />
            </div>
          </div>
        )}
      </Modal>

      {/* 编辑防刷规则弹窗 */}
      <Modal
        title="编辑防刷规则"
        open={ruleModalVisible}
        onCancel={() => setRuleModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setRuleModalVisible(false)}>
            取消
          </Button>,
          <Button 
            key="save" 
            type="primary" 
            loading={updating}
            onClick={handleUpdateRule}
          >
            保存
          </Button>
        ]}
        width={500}
      >
        {selectedRule && (
          <div className={styles.detailContent}>
            <div className={styles.detailItem}>
              <Text type="secondary">规则代码：</Text>
              <Text strong>{selectedRule.rule_code}</Text>
            </div>
            <div className={styles.detailItem}>
              <Text type="secondary">规则名称：</Text>
              <Text>{selectedRule.name}</Text>
            </div>
            <div className={styles.detailItem}>
              <Text type="secondary">说明：</Text>
              <Text>{selectedRule.description}</Text>
            </div>
            <Divider />
            <div className={styles.detailItem}>
              <Text type="secondary">阈值：</Text>
              <Input 
                type="number"
                value={editThreshold}
                onChange={(e) => setEditThreshold(Number(e.target.value))}
                style={{ width: 150 }}
              />
            </div>
            <div className={styles.detailItem}>
              <Text type="secondary">状态：</Text>
              <Select
                value={editRuleActive}
                onChange={setEditRuleActive}
                style={{ width: 150 }}
                options={[
                  { value: true, label: '启用' },
                  { value: false, label: '禁用' },
                ]}
              />
            </div>
          </div>
        )}
      </Modal>

      {/* 手动补发积分弹窗 */}
      <Modal
        title="手动补发积分"
        open={grantModalVisible}
        onCancel={() => {
          setGrantModalVisible(false)
          setGrantUserId('')
          setGrantPoints(0)
          setGrantReason('')
        }}
        footer={[
          <Button key="cancel" onClick={() => setGrantModalVisible(false)}>
            取消
          </Button>,
          <Button 
            key="grant" 
            type="primary" 
            icon={<GiftOutlined />}
            loading={updating}
            onClick={handleGrantPoints}
          >
            补发积分
          </Button>
        ]}
        width={500}
      >
        <div className={styles.detailContent}>
          <div className={styles.detailItem}>
            <Text type="secondary">选择用户：</Text>
            <Select
              showSearch
              value={grantUserId || undefined}
              onChange={(value) => setGrantUserId(value)}
              placeholder="搜索或选择用户"
              style={{ width: '100%', marginTop: 8 }}
              loading={userSearchLoading}
              filterOption={false}
              onSearch={(value) => searchUsers(value)}
              notFoundContent={userSearchLoading ? <Spin size="small" /> : '暂无用户'}
              options={userSearchResults.map(user => ({
                value: user.user_id,
                label: (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ 
                      maxWidth: 280, 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {user.user_id}
                    </span>
                    <Tag color="gold" style={{ marginLeft: 8 }}>{user.available_points} 积分</Tag>
                  </div>
                )
              }))}
            />
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
              输入用户邮箱或ID进行搜索
            </Text>
          </div>
          <div className={styles.detailItem}>
            <Text type="secondary">积分数量：</Text>
            <Input 
              type="number"
              value={grantPoints || ''}
              onChange={(e) => setGrantPoints(Number(e.target.value))}
              placeholder="请输入积分数量"
              style={{ width: '100%', marginTop: 8 }}
            />
          </div>
          <div className={styles.detailItem}>
            <Text type="secondary">补发原因：</Text>
            <TextArea
              value={grantReason}
              onChange={(e) => setGrantReason(e.target.value)}
              rows={3}
              placeholder="请输入补发原因..."
              style={{ marginTop: 8 }}
            />
          </div>
        </div>
      </Modal>

      {/* 商品编辑弹窗 */}
      <Modal
        title={editingItem ? '编辑商品' : '添加商品'}
        open={itemModalVisible}
        onCancel={() => setItemModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setItemModalVisible(false)}>
            取消
          </Button>,
          <Button 
            key="save" 
            type="primary" 
            icon={<GiftOutlined />}
            loading={updating}
            onClick={handleSaveItem}
          >
            保存
          </Button>
        ]}
        width={600}
      >
        <div className={styles.detailContent}>
          <Row gutter={16}>
            <Col span={24}>
              <div className={styles.detailItem}>
                <Text type="secondary">商品名称 *</Text>
                <Input 
                  value={itemForm.name}
                  onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                  placeholder="请输入商品名称"
                  style={{ width: '100%', marginTop: 8 }}
                />
              </div>
            </Col>
            <Col span={24}>
              <div className={styles.detailItem}>
                <Text type="secondary">商品描述</Text>
                <TextArea
                  value={itemForm.description || ''}
                  onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                  rows={2}
                  placeholder="请输入商品描述..."
                  style={{ marginTop: 8 }}
                />
              </div>
            </Col>
            <Col span={24}>
              <div className={styles.detailItem}>
                <Text type="secondary">商品图片</Text>
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                  <Upload
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    showUploadList={false}
                    beforeUpload={handleImageUpload}
                    disabled={imageUploading}
                  >
                    <div style={{ 
                      width: 120, 
                      height: 120, 
                      border: '1px dashed #d9d9d9', 
                      borderRadius: 8, 
                      display: 'flex', 
                      flexDirection: 'column',
                      alignItems: 'center', 
                      justifyContent: 'center',
                      cursor: 'pointer',
                      backgroundColor: '#fafafa',
                      overflow: 'hidden'
                    }}>
                      {itemForm.image_url ? (
                        <img 
                          src={itemForm.image_url} 
                          alt="商品图片" 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => { 
                            (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50"><text x="10" y="30" fill="%23999">?</text></svg>'
                          }}
                        />
                      ) : imageUploading ? (
                        <>
                          <LoadingOutlined style={{ fontSize: 24, color: '#999' }} />
                          <Text type="secondary" style={{ fontSize: 12, marginTop: 8 }}>上传中...</Text>
                        </>
                      ) : (
                        <>
                          <PlusOutlined style={{ fontSize: 24, color: '#999' }} />
                          <Text type="secondary" style={{ fontSize: 12, marginTop: 8 }}>上传图片</Text>
                        </>
                      )}
                    </div>
                  </Upload>
                  <div style={{ flex: 1 }}>
                    <Input 
                      value={itemForm.image_url || ''}
                      onChange={(e) => setItemForm({ ...itemForm, image_url: e.target.value })}
                      placeholder="或输入图片URL"
                      style={{ width: '100%' }}
                    />
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                      支持上传 JPG、PNG、GIF、WEBP 格式，最大 2MB
                    </Text>
                    {itemForm.image_url && (
                      <Button 
                        type="link" 
                        danger 
                        size="small" 
                        style={{ padding: 0, marginTop: 4 }}
                        onClick={() => setItemForm({ ...itemForm, image_url: '' })}
                      >
                        清除图片
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Col>
            <Col span={12}>
              <div className={styles.detailItem}>
                <Text type="secondary">兑换积分 *</Text>
                <Input 
                  type="number"
                  value={itemForm.price || 0}
                  onChange={(e) => setItemForm({ ...itemForm, price: Number(e.target.value) })}
                  placeholder="请输入所需积分"
                  style={{ width: '100%', marginTop: 8 }}
                  suffix="积分"
                />
              </div>
            </Col>
            <Col span={12}>
              <div className={styles.detailItem}>
                <Text type="secondary">库存（-1表示无限）</Text>
                <Input 
                  type="number"
                  value={itemForm.stock}
                  onChange={(e) => setItemForm({ ...itemForm, stock: Number(e.target.value) })}
                  placeholder="库存数量"
                  style={{ width: '100%', marginTop: 8 }}
                />
              </div>
            </Col>
            <Col span={12}>
              <div className={styles.detailItem}>
                <Text type="secondary">商品类型</Text>
                <Select
                  value={itemForm.item_type}
                  onChange={(v) => setItemForm({ ...itemForm, item_type: v })}
                  style={{ width: '100%', marginTop: 8 }}
                  options={[
                    { value: 'VIRTUAL', label: '虚拟商品（如会员权益）' },
                    { value: 'DIGITAL', label: '数字商品（如兑换码）' },
                    { value: 'PHYSICAL', label: '实物商品（需发货）' },
                  ]}
                />
              </div>
            </Col>
            <Col span={12}>
              <div className={styles.detailItem}>
                <Text type="secondary">排序（数字越小越靠前）</Text>
                <Input 
                  type="number"
                  value={itemForm.sort_order || 0}
                  onChange={(e) => setItemForm({ ...itemForm, sort_order: Number(e.target.value) })}
                  style={{ width: '100%', marginTop: 8 }}
                />
              </div>
            </Col>
            <Col span={24}>
              <div className={styles.detailItem}>
                <Text type="secondary">发货/使用说明</Text>
                <TextArea
                  value={itemForm.delivery_info || ''}
                  onChange={(e) => setItemForm({ ...itemForm, delivery_info: e.target.value })}
                  rows={2}
                  placeholder="请输入发货或使用说明..."
                  style={{ marginTop: 8 }}
                />
              </div>
            </Col>
            <Col span={24}>
              <div className={styles.detailItem}>
                <Text type="secondary">上架状态</Text>
                <div style={{ marginTop: 8 }}>
                  <Select
                    value={itemForm.is_visible}
                    onChange={(v) => setItemForm({ ...itemForm, is_visible: v })}
                    style={{ width: 150 }}
                    options={[
                      { value: true, label: '上架' },
                      { value: false, label: '下架' },
                    ]}
                  />
                </div>
              </div>
            </Col>
          </Row>
        </div>
      </Modal>
    </div>
  )
}

export default AdminDashboardPage
