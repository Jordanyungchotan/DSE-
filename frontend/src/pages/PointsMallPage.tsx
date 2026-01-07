import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Typography, Button, List, Tag, Spin, message, Row, Col, Modal, Input, Empty, Badge, Statistic } from 'antd'
import { 
  GiftOutlined, 
  ShoppingCartOutlined,
  ArrowLeftOutlined,
  TrophyOutlined,
  InboxOutlined
} from '@ant-design/icons'
import { ragFetch } from '../config/api'
import { useAuthStore } from '../stores/authStore'
import { useLanguageStore } from '../stores/languageStore'
import styles from './PointsMallPage.module.css'

const { Title, Text, Paragraph } = Typography

interface MallItem {
  id: number
  name: string
  description: string | null
  image_url: string | null
  price: number
  stock: number
  item_type: string
  is_visible: boolean
}

interface PointsOrder {
  id: string
  item_id: number
  item_name: string
  quantity: number
  total_cost: number
  status: string
  created_at: string
}

export default function PointsMallPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { t } = useLanguageStore()
  
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<MallItem[]>([])
  const [orders, setOrders] = useState<PointsOrder[]>([])
  const [balance, setBalance] = useState(0)
  const [exchangeModal, setExchangeModal] = useState<{ visible: boolean; item: MallItem | null }>({ visible: false, item: null })
  const [exchanging, setExchanging] = useState(false)
  const [receiverInfo, setReceiverInfo] = useState({ name: '', phone: '', address: '' })
  const [activeTab, setActiveTab] = useState<'items' | 'orders'>('items')

  const userId = user?.id || 'anonymous'

  const fetchData = useCallback(async () => {
    if (!userId) return
    
    setLoading(true)
    try {
      const [itemsRes, balanceRes, ordersRes] = await Promise.all([
        ragFetch('/api/mall/items'),
        ragFetch(`/api/points/balance?user_id=${userId}`),
        ragFetch(`/api/mall/orders?user_id=${userId}`)
      ])

      const itemsData = await itemsRes.json()
      const balanceData = await balanceRes.json()
      const ordersData = await ordersRes.json()

      if (itemsData.success) {
        setItems(itemsData.data)
      }
      if (balanceData.success) {
        setBalance(balanceData.data.available)
      }
      if (ordersData.success) {
        setOrders(ordersData.data)
      }
    } catch (error) {
      console.error('Failed to fetch mall data:', error)
      message.error(t('common.error'))
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleExchange = async () => {
    if (!exchangeModal.item) return
    
    // 实物商品需要填写收货信息
    if (exchangeModal.item.item_type === 'PHYSICAL') {
      if (!receiverInfo.name || !receiverInfo.phone || !receiverInfo.address) {
        message.warning('请填写完整的收货信息（姓名、电话、地址）')
        return
      }
    }
    
    setExchanging(true)
    try {
      const res = await ragFetch('/api/mall/exchange', {
        method: 'POST',
        body: JSON.stringify({
          user_id: userId,
          item_id: exchangeModal.item.id,
          quantity: 1,
          receiver_info: exchangeModal.item.item_type === 'PHYSICAL' 
            ? JSON.stringify(receiverInfo)
            : undefined
        })
      })
      const data = await res.json()

      if (data.success) {
        message.success(`${t('points.mall.exchangeSuccess')}${data.orderId}`)
        setExchangeModal({ visible: false, item: null })
        setReceiverInfo({ name: '', phone: '', address: '' })
        fetchData()
      } else {
        message.error(data.error || t('common.error'))
      }
    } catch (error) {
      console.error('Exchange failed:', error)
      message.error(t('common.error'))
    } finally {
      setExchanging(false)
    }
  }

  const getItemTypeTag = (type: string) => {
    switch (type) {
      case 'VIRTUAL':
        return <Tag color="purple">{t('points.mall.virtual')}</Tag>
      case 'DIGITAL':
        return <Tag color="blue">{t('points.mall.digital')}</Tag>
      case 'PHYSICAL':
        return <Tag color="green">{t('points.mall.physical')}</Tag>
      default:
        return null
    }
  }

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Tag color="orange">{t('points.mall.orderStatus.pending')}</Tag>
      case 'PAID':
        return <Tag color="blue">{t('points.mall.orderStatus.paid')}</Tag>
      case 'FULFILLED':
        return <Tag color="green">{t('points.mall.orderStatus.fulfilled')}</Tag>
      case 'CANCELLED':
        return <Tag color="red">{t('points.mall.orderStatus.cancelled')}</Tag>
      default:
        return <Tag>{status}</Tag>
    }
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingWrapper}>
          <Spin size="large" />
          <Text className={styles.loadingText}>{t('common.loading')}</Text>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {/* 头部 */}
      <div className={styles.header}>
        <Button 
          icon={<ArrowLeftOutlined />} 
          onClick={() => navigate('/points')}
          className={styles.backBtn}
        >
          {t('common.back')}
        </Button>
        <Title level={3} className={styles.title}>
          <GiftOutlined /> {t('points.mall.title')}
        </Title>
        <div className={styles.balanceTag}>
          <TrophyOutlined /> {balance} {t('points.mall.availableBalance')}
        </div>
      </div>

      {/* Tab切换 */}
      <div className={styles.tabWrapper}>
        <Button 
          type={activeTab === 'items' ? 'primary' : 'default'}
          onClick={() => setActiveTab('items')}
          className={styles.tabBtn}
        >
          <ShoppingCartOutlined /> {t('points.mall.itemList')}
        </Button>
        <Button 
          type={activeTab === 'orders' ? 'primary' : 'default'}
          onClick={() => setActiveTab('orders')}
          className={styles.tabBtn}
        >
          <InboxOutlined /> {t('points.mall.myOrders')}
          {orders.filter(o => o.status !== 'COMPLETED' && o.status !== 'FULFILLED').length > 0 && (
            <Badge count={orders.filter(o => o.status !== 'COMPLETED' && o.status !== 'FULFILLED').length} style={{ marginLeft: 8 }} />
          )}
        </Button>
      </div>

      {/* 商品列表 */}
      {activeTab === 'items' && (
        <Row gutter={[16, 16]}>
          {items.length > 0 ? (
            items.map(item => (
              <Col key={item.id} xs={24} sm={12} md={8}>
                <Card 
                  className={styles.itemCard}
                  hoverable
                  cover={
                    <div className={styles.itemImage}>
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} />
                      ) : (
                        <GiftOutlined className={styles.placeholderIcon} />
                      )}
                    </div>
                  }
                >
                  <div className={styles.itemContent}>
                    <div className={styles.itemHeader}>
                      <Text strong className={styles.itemName}>{item.name}</Text>
                      {getItemTypeTag(item.item_type)}
                    </div>
                    
                    <Paragraph className={styles.itemDesc} ellipsis={{ rows: 2 }}>
                      {item.description || '-'}
                    </Paragraph>
                    
                    <div className={styles.itemFooter}>
                      <div className={styles.itemPrice}>
                        <TrophyOutlined style={{ color: '#faad14' }} />
                        <Text strong className={styles.priceValue}>{item.price}</Text>
                        <Text type="secondary">{t('points.pointsUnit')}</Text>
                      </div>
                      
                      <div className={styles.itemStock}>
                        {item.stock === -1 ? (
                          <Text type="secondary">{t('points.mall.stockSufficient')}</Text>
                        ) : item.stock > 0 ? (
                          <Text type="secondary">{t('points.mall.remaining')} {item.stock}</Text>
                        ) : (
                          <Text type="danger">{t('points.mall.soldOut')}</Text>
                        )}
                      </div>
                    </div>
                    
                    <Button 
                      type="primary"
                      block
                      disabled={balance < item.price || (item.stock !== -1 && item.stock <= 0)}
                      onClick={() => setExchangeModal({ visible: true, item })}
                      className={styles.exchangeBtn}
                    >
                      {balance < item.price ? t('points.mall.insufficientPoints') : t('points.mall.exchange')}
                    </Button>
                  </div>
                </Card>
              </Col>
            ))
          ) : (
            <Col span={24}>
              <Empty description={t('points.mall.noItems')} />
            </Col>
          )}
        </Row>
      )}

      {/* 订单列表 */}
      {activeTab === 'orders' && (
        <Card className={styles.ordersCard}>
          {orders.length > 0 ? (
            <List
              dataSource={orders}
              renderItem={order => (
                <List.Item className={styles.orderItem}>
                  <div className={styles.orderInfo}>
                    <Text strong>{order.item_name}</Text>
                    <Text type="secondary" className={styles.orderId}>
                      #{order.id}
                    </Text>
                    <Text type="secondary">
                      {new Date(order.created_at).toLocaleString()}
                    </Text>
                  </div>
                  <div className={styles.orderRight}>
                    <div className={styles.orderCost}>
                      <TrophyOutlined style={{ color: '#faad14' }} />
                      <Text strong>{order.total_cost}</Text>
                    </div>
                    {getStatusTag(order.status)}
                  </div>
                </List.Item>
              )}
            />
          ) : (
            <Empty description={t('points.mall.noOrders')} />
          )}
        </Card>
      )}

      {/* 兑换确认弹窗 */}
      <Modal
        title={<><GiftOutlined /> {t('points.mall.confirmExchange')}</>}
        open={exchangeModal.visible}
        onCancel={() => setExchangeModal({ visible: false, item: null })}
        onOk={handleExchange}
        confirmLoading={exchanging}
        okText={t('common.confirm')}
        cancelText={t('common.cancel')}
      >
        {exchangeModal.item && (
          <div className={styles.exchangeModalContent}>
            <Statistic 
              title={t('points.mall.productName')} 
              value={exchangeModal.item.name}
            />
            <Statistic 
              title={t('points.mall.requiredPoints')} 
              value={exchangeModal.item.price}
              prefix={<TrophyOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
            <Statistic 
              title={t('points.mall.currentPoints')} 
              value={balance}
              valueStyle={{ color: balance >= exchangeModal.item.price ? '#52c41a' : '#ff4d4f' }}
            />
            <Statistic 
              title={t('points.mall.afterExchange')} 
              value={balance - exchangeModal.item.price}
            />
            
            {exchangeModal.item.item_type === 'PHYSICAL' && (
              <div className={styles.receiverInput}>
                <Text strong style={{ display: 'block', marginBottom: 12 }}>
                  📦 收货信息（必填）
                </Text>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <Input 
                    value={receiverInfo.name}
                    onChange={e => setReceiverInfo({ ...receiverInfo, name: e.target.value })}
                    placeholder="收货人姓名"
                    prefix={<span style={{ color: '#999' }}>姓名：</span>}
                  />
                  <Input 
                    value={receiverInfo.phone}
                    onChange={e => setReceiverInfo({ ...receiverInfo, phone: e.target.value })}
                    placeholder="联系电话"
                    prefix={<span style={{ color: '#999' }}>电话：</span>}
                  />
                  <Input.TextArea 
                    value={receiverInfo.address}
                    onChange={e => setReceiverInfo({ ...receiverInfo, address: e.target.value })}
                    placeholder="详细收货地址（省/市/区/街道/门牌号）"
                    rows={2}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
