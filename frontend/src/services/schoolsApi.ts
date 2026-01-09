/**
 * 香港中学 API 服务
 */

import { ragFetchJson } from '../config/api'

// 区域信息
export interface Region {
  code: string
  name_zh: string
  name_en: string
  display_order: number
  districts: District[]
}

// 区信息
export interface District {
  code: string
  name_zh: string
  name_en: string
  display_order: number
}

// 学校信息
export interface School {
  id: number
  school_id: string
  name_zh: string
  name_en: string
  district_code: string
  district_name: string
  region_code: string
  region_name: string
}

// 区域颜色映射
export const REGION_COLORS: Record<string, string> = {
  hk_island: '#faad14',   // 港岛 - 橙色
  kowloon: '#52c41a',      // 九龙 - 绿色
  nt_east: '#722ed1',      // 新界东 - 紫色
  nt_west: '#1890ff',      // 新界西 - 蓝色
}

// 区域图标
export const REGION_ICONS: Record<string, string> = {
  hk_island: '🏝️',
  kowloon: '🏙️',
  nt_east: '🌄',
  nt_west: '🏔️',
}

/**
 * 获取所有区域和区列表
 */
export async function getRegions(): Promise<{
  success: boolean
  data?: Region[]
  error?: string
}> {
  return ragFetchJson('/api/schools/regions')
}

/**
 * 按区获取学校列表
 */
export async function getSchoolsByDistrict(districtCode: string): Promise<{
  success: boolean
  data?: School[]
  error?: string
}> {
  return ragFetchJson(`/api/schools/by-district/${districtCode}`)
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
  return ragFetchJson(`/api/schools/search?q=${encodeURIComponent(query)}`)
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
  return ragFetchJson(`/api/schools?page=${page}&limit=${limit}`)
}
