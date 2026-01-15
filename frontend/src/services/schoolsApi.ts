/**
 * 香港中学 API 服务
 */

import { apiFetch } from '../config/api'

// 封装 JSON 解析
async function apiFetchJson<T = unknown>(path: string, options?: RequestInit): Promise<T> {
  const response = await apiFetch(path, options)
  return response.json()
}

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
 * 后端 API: GET /api/schools/regions
 */
export async function getRegions(): Promise<{
  success: boolean
  data?: Region[]
  error?: string
}> {
  try {
    const result = await apiFetchJson('/api/schools/regions') as any
    
    // 后端返回格式: { success: true, data: [{ code, name_zh, name_en, display_order, districts: [...] }] }
    if (result.success && result.data && Array.isArray(result.data)) {
      const regions: Region[] = result.data.map((r: any) => ({
        code: r.code,
        name_zh: r.name_zh,
        name_en: r.name_en,
        districts: (r.districts || []).map((d: any) => ({
          code: d.code,
          name_zh: d.name_zh,
          name_en: d.name_en,
        })),
      }))
      
      return { success: true, data: regions }
    }
    
    // 兼容 { regions: [...] } 格式
    if (result.regions && Array.isArray(result.regions)) {
      const regions: Region[] = result.regions.map((r: any) => ({
        code: r.code,
        name_zh: r.name_zh,
        name_en: r.name_en,
        districts: (r.districts || []).map((d: any) => ({
          code: d.code,
          name_zh: d.name_zh,
          name_en: d.name_en,
        })),
      }))
      
      return { success: true, data: regions }
    }
    
    // 兼容旧格式
    if (result.districts?.regions) {
      const regions: Region[] = result.districts.regions.map((r: any) => ({
        code: r.name || r.code,
        name_zh: r.name || r.name_zh,
        name_en: r.name_en || '',
        districts: (r.districts || []).map((d: any) => ({
          code: typeof d === 'string' ? d : d.code,
          name_zh: typeof d === 'string' ? d : d.name_zh,
          name_en: typeof d === 'string' ? d : d.name_en || '',
        })),
      }))
      
      return { success: true, data: regions }
    }
    
    console.error('getRegions: unexpected response format', result)
    return { success: false, error: '获取区域数据失败' }
  } catch (error) {
    console.error('获取区域列表失败:', error)
    return { success: false, error: '网络错误' }
  }
}

/**
 * 按区获取学校列表
 * 后端 API: GET /api/schools/by-district/:districtCode
 */
export async function getSchoolsByDistrict(district: string): Promise<{
  success: boolean
  data?: School[]
  error?: string
}> {
  try {
    // 后端路径是 /api/schools/by-district/:districtCode (路径参数，不是查询参数)
    const result = await apiFetchJson(`/api/schools/by-district/${encodeURIComponent(district)}`) as any
    
    // 后端返回格式: { success: true, data: [...] }
    if (result.success && result.data && Array.isArray(result.data)) {
      const schools: School[] = result.data.map((s: any, index: number) => ({
        id: s.id || index + 1,
        name: s.name_zh || s.name,
        name_zh: s.name_zh || s.name,
        name_en: s.name_en || '',
        type: s.school_type || s.type || '',
        gender: s.gender || '',
        district: s.district_code || district,
        district_name: s.district_name || district,
        region: s.region_code,
        region_name: s.region_name,
      }))
      
      return { success: true, data: schools }
    }
    
    // 兼容 { schools: [...] } 格式
    if (result.schools && Array.isArray(result.schools)) {
      const schools: School[] = result.schools.map((s: any, index: number) => ({
        id: s.id || index + 1,
        name: s.name_zh || s.name,
        name_zh: s.name_zh || s.name,
        name_en: s.name_en || '',
        type: s.school_type || s.type || '',
        gender: s.gender || '',
        district: result.district?.code || district,
        district_name: result.district?.name_zh || district,
        region: result.district?.region_code,
        region_name: result.district?.region_name,
      }))
      
      return { success: true, data: schools }
    }
    
    console.error('getSchoolsByDistrict: unexpected response format', result)
    return { success: false, error: '获取学校数据失败' }
  } catch (error) {
    console.error('获取学校列表失败:', error)
    return { success: false, error: '网络错误' }
  }
}

/**
 * 搜索学校
 * 后端 API: GET /api/schools/search?q=xxx
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
    // 使用后端搜索 API
    const result = await apiFetchJson(`/api/schools/search?q=${encodeURIComponent(query)}`) as any
    
    // 后端返回格式: { success: true, data: [...] }
    if (result.success && result.data && Array.isArray(result.data)) {
      const schools: School[] = result.data.map((s: any, index: number) => ({
        id: s.id || index + 1,
        name: s.name_zh || s.name,
        name_zh: s.name_zh || s.name,
        name_en: s.name_en || '',
        type: s.school_type || s.type || '',
        gender: s.gender || '',
        district: s.district_code,
        district_name: s.district_name,
        region: s.region_code,
        region_name: s.region_name,
      }))
      
      return { success: true, data: schools }
    }
    
    // 兼容 { schools: [...] } 格式
    if (result.schools && Array.isArray(result.schools)) {
      const schools: School[] = result.schools.map((s: any, index: number) => ({
        id: s.id || index + 1,
        name: s.name_zh || s.name,
        name_zh: s.name_zh || s.name,
        name_en: s.name_en || '',
        type: s.school_type || s.type || '',
        gender: s.gender || '',
        district: s.district_code,
        district_name: s.district_name,
        region: s.region_code,
        region_name: s.region_name,
      }))
      
      return { success: true, data: schools }
    }
    
    console.error('searchSchools: unexpected response format', result)
    return { success: false, error: '搜索失败' }
  } catch (error) {
    console.error('搜索学校失败:', error)
    return { success: false, error: '网络错误' }
  }
}

/**
 * 获取所有学校（分页）
 * 
 * 策略：先获取所有区域，然后汇总所有学校数据
 * 注意：/api/schools 需要认证，使用 /api/schools/by-district/:code 代替
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
    // 先获取所有区域
    const regionsResult = await getRegions()
    if (!regionsResult.success || !regionsResult.data) {
      return { success: false, error: '获取区域数据失败' }
    }
    
    // 汇总所有学校
    const allSchools: School[] = []
    
    for (const region of regionsResult.data) {
      for (const district of region.districts) {
        const schoolsResult = await getSchoolsByDistrict(district.code)
        if (schoolsResult.success && schoolsResult.data) {
          allSchools.push(...schoolsResult.data)
        }
      }
    }
    
    // 手动分页
    const total = allSchools.length
    const start = (page - 1) * limit
    const paginatedSchools = allSchools.slice(start, start + limit)
    
    return {
      success: true,
      data: paginatedSchools,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }
  } catch (error) {
    console.error('获取学校列表失败:', error)
    return { success: false, error: '网络错误' }
  }
}
