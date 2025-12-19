import { Card, Row, Col, Typography } from 'antd'
import { 
  SwapOutlined, 
  BankOutlined,
  RightOutlined
} from '@ant-design/icons'
import styles from './AnalysisSelector.module.css'

const { Title, Text } = Typography

interface AnalysisSelectorProps {
  onSelect: (type: 'transfer' | 'university') => void
}

/**
 * 分析类型选择器
 * 让用户选择插班分析或大学申请分析
 */
const AnalysisSelector = ({ onSelect }: AnalysisSelectorProps) => {
  return (
    <div className={styles.selectorContainer}>
      <div className={styles.header}>
        <Title level={2} className="gradient-title">
          选择分析类型
        </Title>
        <Text type="secondary">
          请选择您需要的分析服务
        </Text>
      </div>

      <Row gutter={[24, 24]} className={styles.cardsRow}>
        <Col xs={24} md={12}>
          <Card 
            className={styles.selectorCard}
            hoverable
            onClick={() => onSelect('transfer')}
          >
            <div className={styles.cardContent}>
              <div className={styles.iconWrapper} style={{ backgroundColor: '#e6f7ff' }}>
                <SwapOutlined className={styles.icon} style={{ color: '#1890ff' }} />
              </div>
              <div className={styles.textContent}>
                <Title level={4}>插班分析</Title>
                <Text type="secondary">
                  分析学生的插班可行性，提供学校推荐、科目提升建议和学习计划
                </Text>
              </div>
              <RightOutlined className={styles.arrow} />
            </div>
            <div className={styles.features}>
              <span className={styles.featureTag}>智能学校推荐</span>
              <span className={styles.featureTag}>科目分析</span>
              <span className={styles.featureTag}>学习计划</span>
            </div>
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card 
            className={styles.selectorCard}
            hoverable
            onClick={() => onSelect('university')}
          >
            <div className={styles.cardContent}>
              <div className={styles.iconWrapper} style={{ backgroundColor: '#f6ffed' }}>
                <BankOutlined className={styles.icon} style={{ color: '#52c41a' }} />
              </div>
              <div className={styles.textContent}>
                <Title level={4}>大学申请分析</Title>
                <Text type="secondary">
                  分析DSE成绩与目标大学专业的匹配度，提供职业规划建议
                </Text>
              </div>
              <RightOutlined className={styles.arrow} />
            </div>
            <div className={styles.features}>
              <span className={styles.featureTag}>录取概率分析</span>
              <span className={styles.featureTag}>专业推荐</span>
              <span className={styles.featureTag}>就业趋势</span>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default AnalysisSelector

