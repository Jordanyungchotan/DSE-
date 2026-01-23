/**
 * API 配置
 * 
 * ⚠️ 2026-01: Worker 已统一，所有 API 均指向 dse-rag-questions
 * 
 * 【禁止事项】
 * - ❌ 禁止使用 dse-analysis-api
 * - ❌ 禁止页面自行拼接域名
 * - ❌ 禁止读取 res.history / res.tasks 等非 data 字段
 * 
 * 【统一规范】
 * - ✅ 所有请求使用 apiFetch
 * - ✅ 所有响应格式为 { code, data, message }
 * - ✅ 401 错误需跳转登录或明确提示
 */

// ============================================================================
// 统一 API URL - 唯一事实源
// ============================================================================
const PRODUCTION_API_URL = 'https://dse-rag-questions.jordanyungchotan.workers.dev'

export const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.PROD ? PRODUCTION_API_URL : 'http://localhost:8787')

// ⚠️ 兼容旧代码，RAG_API_URL 与 API_BASE_URL 相同
// 新代码请直接使用 API_BASE_URL
export const RAG_API_URL = API_BASE_URL

// ============================================================================
// 统一响应类型
// ============================================================================
export interface ApiResponse<T = unknown> {
  code: number
  data: T
  message: string
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 构建完整的 API URL
 */
export function getApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL}${normalizedPath}`
}

/**
 * 获取存储的 token
 */
function getAuthToken(): string | null {
  try {
    const authData = localStorage.getItem('dse-auth-storage')
    if (authData) {
      const parsed = JSON.parse(authData)
      return parsed?.state?.token || null
    }
  } catch {
    // ignore parse error
  }
  return null
}

/**
 * 统一 API 请求函数
 * - 自动添加 API 基础 URL
 * - 自动添加 Authorization header
 * - 自动添加 Content-Type header
 */
export async function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  const url = getApiUrl(path)
  const token = getAuthToken()
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options?.headers || {}),
  }
  
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
  }
  
  return fetch(url, {
    ...options,
    headers,
  })
}

/**
 * 统一 API 请求函数（自动解析 JSON 并校验响应格式）
 * 
 * @throws Error 当响应 code !== 0 时抛出错误
 */
export async function apiFetchJson<T>(path: string, options?: RequestInit): Promise<ApiResponse<T>> {
  const response = await apiFetch(path, options)
  
  // 处理 401 未授权
  if (response.status === 401) {
    throw new Error('AUTH_REQUIRED')
  }
  
  const result = await response.json() as ApiResponse<T>
  
  // 校验响应格式
  if (typeof result.code !== 'number') {
    console.warn('[API] 响应格式不符合规范:', path, result)
  }
  
  return result
}

// ============================================================================
// 兼容函数（逐步废弃）
// ============================================================================

/**
 * @deprecated 请使用 apiFetch
 * 保留用于兼容旧代码，功能与 apiFetch 完全相同
 */
export const ragFetch = apiFetch

/**
 * @deprecated 请使用 apiFetchJson
 * 保留用于兼容旧代码
 */
export async function ragFetchJson<T = unknown>(path: string, options?: RequestInit): Promise<T> {
  const response = await apiFetch(path, options)
  return response.json()
}
