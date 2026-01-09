/**
 * 香港18区中学选择组件
 * 支持按区域/区选择和搜索
 */

import { useState, useEffect, useCallback } from 'react'
import { Select, Input, Card, Tag, Space, Spin, Empty, Divider } from 'antd'
import { SearchOutlined, EnvironmentOutlined, BankOutlined } from '@ant-design/icons'
import {
  getRegions,
  getSchoolsByDistrict,
  searchSchools,
  Region,
  School,
  REGION_COLORS,
} from '../services/schoolsApi'
import { useLanguageStore } from '../stores/languageStore'

interface SchoolSelectorProps {
  value?: string  // 选中的学校名称
  onChange?: (school: School | null) => void
  disabled?: boolean
}

export default function SchoolSelector({
  value,
  onChange,
  disabled = false,
}: SchoolSelectorProps) {
  const { locale } = useLanguageStore()
  const isEn = locale === 'en'

  const [regions, setRegions] = useState<Region[]>([])
  const [selectedRegion, setSelectedRegion] = useState<string>('')
  const [selectedDistrict, setSelectedDistrict] = useState<string>('')
  const [schools, setSchools] = useState<School[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<School[]>([])
  const [loading, setLoading] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)

  // 加载区域数据
  useEffect(() => {
    async function loadRegions() {
      const result = await getRegions()
      if (result.success && result.data) {
        setRegions(result.data)
      }
    }
    loadRegions()
  }, [])

  // 加载区内学校
  useEffect(() => {
    async function loadSchools() {
      if (!selectedDistrict) {
        setSchools([])
        return
      }
      setLoading(true)
      const result = await getSchoolsByDistrict(selectedDistrict)
      if (result.success && result.data) {
        setSchools(result.data)
      }
      setLoading(false)
    }
    loadSchools()
  }, [selectedDistrict])

  // 搜索学校
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query)
    if (query.length < 2) {
      setSearchResults([])
      return
    }
    setSearchLoading(true)
    const result = await searchSchools(query)
    if (result.success && result.data) {
      setSearchResults(result.data)
    }
    setSearchLoading(false)
  }, [])

  // 选择区域
  const handleRegionChange = (regionCode: string) => {
    setSelectedRegion(regionCode)
    setSelectedDistrict('')
    setSchools([])
  }

  // 选择区
  const handleDistrictChange = (districtCode: string) => {
    setSelectedDistrict(districtCode)
  }

  // 选择学校
  const handleSelectSchool = (school: School) => {
    onChange?.(school)
    // 清空搜索
    setSearchQuery('')
    setSearchResults([])
  }

  // 获取当前区域的区列表
  const currentRegion = regions.find(r => r.code === selectedRegion)
  const districts = currentRegion?.districts || []

  return (
    <div>
      {/* 搜索框 */}
      <Input
        prefix={<SearchOutlined />}
        placeholder={isEn ? 'Search school by name...' : '搜索学校名称...'}
        value={searchQuery}
        onChange={e => handleSearch(e.target.value)}
        allowClear
        disabled={disabled}
        style={{ marginBottom: 16 }}
      />

      {/* 搜索结果 */}
      {searchQuery.length >= 2 && (
        <Card 
          size="small" 
          style={{ marginBottom: 16, maxHeight: 300, overflow: 'auto' }}
          title={
            <Space>
              <SearchOutlined />
              <span>{isEn ? 'Search Results' : '搜索结果'}</span>
              <Tag>{searchResults.length}</Tag>
            </Space>
          }
        >
          {searchLoading ? (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <Spin />
            </div>
          ) : searchResults.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {searchResults.map((school, index) => (
                <div
                  key={school.id || index}
                  onClick={() => handleSelectSchool(school)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    background: value === school.name_zh ? '#e6f4ff' : '#fafafa',
                    border: value === school.name_zh ? '1px solid #1890ff' : '1px solid transparent',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => {
                    if (value !== school.name_zh) {
                      e.currentTarget.style.background = '#f0f0f0'
                    }
                  }}
                  onMouseLeave={e => {
                    if (value !== school.name_zh) {
                      e.currentTarget.style.background = '#fafafa'
                    }
                  }}
                >
                  <div style={{ fontWeight: 500 }}>
                    <BankOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                    {school.name_zh}
                  </div>
                  {school.name_en && (
                    <div style={{ fontSize: 12, color: '#666', marginLeft: 22 }}>
                      {school.name_en}
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: '#999', marginLeft: 22 }}>
                    <EnvironmentOutlined style={{ marginRight: 4 }} />
                    {school.district_name || school.district}
                    {school.type && <Tag style={{ marginLeft: 8, fontSize: 12 }}>{school.type}</Tag>}
                    {school.gender && <Tag style={{ fontSize: 12 }}>{school.gender}</Tag>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty 
              description={isEn ? 'No schools found' : '未找到匹配的学校'} 
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          )}
        </Card>
      )}

      <Divider style={{ margin: '12px 0' }}>
        {isEn ? 'Or browse by district' : '或按18区浏览学校'}
      </Divider>

      {/* 区域选择 */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <Select
          placeholder={isEn ? 'Select Region' : '选择区域'}
          value={selectedRegion || undefined}
          onChange={handleRegionChange}
          style={{ flex: 1 }}
          disabled={disabled}
          allowClear
        >
          {regions.map(region => (
            <Select.Option key={region.code} value={region.code}>
              <Tag color={REGION_COLORS[region.code] || REGION_COLORS[region.name_zh]} style={{ marginRight: 8 }}>
                {isEn ? region.name_en : region.name_zh}
              </Tag>
            </Select.Option>
          ))}
        </Select>

        <Select
          placeholder={isEn ? 'Select District' : '选择区'}
          value={selectedDistrict || undefined}
          onChange={handleDistrictChange}
          style={{ flex: 1 }}
          disabled={disabled || !selectedRegion}
          allowClear
        >
          {districts.map(district => (
            <Select.Option key={district.code} value={district.code}>
              {district.name_zh}
            </Select.Option>
          ))}
        </Select>
      </div>

      {/* 区内学校列表 */}
      {selectedDistrict && (
        <Card 
          size="small"
          style={{ maxHeight: 300, overflow: 'auto' }}
          title={
            <Space>
              <BankOutlined />
              <span>{selectedDistrict}的学校</span>
              <Tag>{schools.length}所</Tag>
            </Space>
          }
        >
          {loading ? (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <Spin />
            </div>
          ) : schools.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {schools.map((school, index) => (
                <div
                  key={school.id || index}
                  onClick={() => handleSelectSchool(school)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    background: value === school.name_zh ? '#e6f4ff' : '#fafafa',
                    border: value === school.name_zh ? '1px solid #1890ff' : '1px solid transparent',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => {
                    if (value !== school.name_zh) {
                      e.currentTarget.style.background = '#f0f0f0'
                    }
                  }}
                  onMouseLeave={e => {
                    if (value !== school.name_zh) {
                      e.currentTarget.style.background = '#fafafa'
                    }
                  }}
                >
                  <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <BankOutlined style={{ color: '#1890ff' }} />
                    <span>{school.name_zh}</span>
                    {school.type && <Tag color={school.type === '直資' ? 'blue' : school.type === '官立' ? 'green' : 'default'} style={{ fontSize: 11 }}>{school.type}</Tag>}
                    {school.gender && <Tag color={school.gender === '男' ? 'cyan' : school.gender === '女' ? 'magenta' : 'default'} style={{ fontSize: 11 }}>{school.gender}</Tag>}
                  </div>
                  {school.name_en && (
                    <div style={{ fontSize: 12, color: '#666', marginLeft: 22, marginTop: 4 }}>
                      {school.name_en}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <Empty 
              description={isEn ? 'No schools in this district' : '该区暂无学校数据'} 
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          )}
        </Card>
      )}

      {/* 已选择的学校 */}
      {value && (
        <div style={{ marginTop: 16, padding: 12, background: '#f6ffed', borderRadius: 8, border: '1px solid #b7eb8f' }}>
          <div style={{ fontWeight: 500, color: '#52c41a' }}>
            ✓ {isEn ? 'Selected: ' : '已选择: '}{value}
          </div>
        </div>
      )}
    </div>
  )
}
