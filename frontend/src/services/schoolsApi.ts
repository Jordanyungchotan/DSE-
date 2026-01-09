/**
 * 香港中学 API 服务
 */

import { ragFetchJson } from '../config/api'

// 区域信息
export interface Region {
  code: string
  name_zh: string
  name_en: string
  districts: District[]
}

// 区信息
export interface District {
  code: string
  name_zh: string
  name_en: string
}

// 学校信息
export interface School {
  id?: number
  name: string
  name_zh: string
  name_en: string
  type: string
  gender: string
  district?: string
  region?: string
  district_name?: string
  region_name?: string
}

// 区域颜色映射
export const REGION_COLORS: Record<string, string> = {
  '香港島': '#faad14',   // 港岛 - 橙色
  '九龍': '#52c41a',      // 九龙 - 绿色
  '新界': '#1890ff',      // 新界 - 蓝色
  hk_island: '#faad14',
  kowloon: '#52c41a',
  nt: '#1890ff',
}

// 区域图标
export const REGION_ICONS: Record<string, string> = {
  '香港島': '🏝️',
  '九龍': '🏙️',
  '新界': '🌄',
}

/**
 * 获取所有区域和区列表
 */
export async function getRegions(): Promise<{
  success: boolean
  data?: Region[]
  error?: string
}> {
  try {
    const result = await ragFetchJson('/api/districts') as any
    
    if (result.districts) {
      // 转换新的API格式
      const regions: Region[] = result.districts.regions.map((r: any) => ({
        code: r.name,
        name_zh: r.name,
        name_en: r.name_en,
        districts: r.districts.map((d: string) => ({
          code: d,
          name_zh: d,
          name_en: d, // 可以后续添加英文翻译
        })),
      }))
      
      return { success: true, data: regions }
    }
    
    return { success: false, error: '获取区域数据失败' }
  } catch (error) {
    console.error('获取区域列表失败:', error)
    return { success: false, error: '网络错误' }
  }
}

/**
 * 按区获取学校列表
 */
export async function getSchoolsByDistrict(district: string): Promise<{
  success: boolean
  data?: School[]
  error?: string
}> {
  try {
    const result = await ragFetchJson(`/api/schools/by-district?district=${encodeURIComponent(district)}`) as any
    
    if (result.success && result.schools) {
      // 转换学校数据格式
      const schools: School[] = result.schools.map((s: any, index: number) => ({
        id: index + 1,
        name: s.name,
        name_zh: s.name,
        name_en: s.name_en || '',
        type: s.type || '',
        gender: s.gender || '',
        district: result.district,
        district_name: result.district,
      }))
      
      return { success: true, data: schools }
    }
    
    return { success: false, error: '获取学校数据失败' }
  } catch (error) {
    console.error('获取学校列表失败:', error)
    return { success: false, error: '网络错误' }
  }
}

/**
 * 搜索学校
 */
export async function searchSchools(query: string): Promise<{
  success: boolean
  data?: School[]
  error?: string
}> {
  if (query.length < 2) {
    return { success: true, data: [] }
  }
  
  try {
    // 获取所有学校数据进行本地搜索
    const result = await ragFetchJson('/api/schools/by-district') as any
    
    if (result.success && result.districts) {
      const allSchools: School[] = []
      
      for (const [district, schools] of Object.entries(result.districts)) {
        (schools as any[]).forEach((s) => {
          allSchools.push({
            id: allSchools.length + 1,
            name: s.name,
            name_zh: s.name,
            name_en: s.name_en || '',
            type: s.type || '',
            gender: s.gender || '',
            district: district,
            district_name: district,
          })
        })
      }
      
      // 本地搜索
      const lowerQuery = query.toLowerCase()
      const filtered = allSchools.filter(school => 
        school.name_zh.toLowerCase().includes(lowerQuery) ||
        (school.name_en && school.name_en.toLowerCase().includes(lowerQuery))
      )
      
      return { success: true, data: filtered.slice(0, 20) }
    }
    
    return { success: false, error: '搜索失败' }
  } catch (error) {
    console.error('搜索学校失败:', error)
    return { success: false, error: '网络错误' }
  }
}

/**
 * 获取所有学校（分页）
 */
export async function getAllSchools(page = 1, limit = 50): Promise<{
  success: boolean
  data?: School[]
  pagination?: {
    page: number
    limit: number
    total: number
    pages: number
  }
  error?: string
}> {
  try {
    const result = await ragFetchJson('/api/schools/by-district') as any
    
    if (result.success && result.districts) {
      const allSchools: School[] = []
      
      for (const [district, schools] of Object.entries(result.districts)) {
        (schools as any[]).forEach((s) => {
          allSchools.push({
            id: allSchools.length + 1,
            name: s.name,
            name_zh: s.name,
            name_en: s.name_en || '',
            type: s.type || '',
            gender: s.gender || '',
            district: district,
            district_name: district,
          })
        })
      }
      
      const start = (page - 1) * limit
      const paginatedSchools = allSchools.slice(start, start + limit)
      
      return {
        success: true,
        data: paginatedSchools,
        pagination: {
          page,
          limit,
          total: allSchools.length,
          pages: Math.ceil(allSchools.length / limit),
        },
      }
    }
    
    return { success: false, error: '获取学校列表失败' }
  } catch (error) {
    console.error('获取学校列表失败:', error)
    return { success: false, error: '网络错误' }
  }
}
