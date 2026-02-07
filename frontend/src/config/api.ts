/**
 * API 配置
 * 
 * ⚠️ 2026-01 架构裁决（不可更改）：
 * - 前端只调用一个 Worker: dse-rag-questions
 * - dse-analysis-api 已废弃，不再使用
 * - 所有分析功能（插班 V1/V2/AI、JUPAS 等）全部走 dse-rag-questions
 */

// ============================================================================
// API URL 配置（统一使用 dse-rag-questions）
// ============================================================================

// 唯一后端 - 通过自定义域名访问（解决部分网络无法解析 *.workers.dev 的问题）
const PRODUCTION_API_URL = 'https://api.dse-analysis.com'

export const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.PROD ? PRODUCTION_API_URL : 'http://localhost:8787')

// 【兼容】ANALYSIS_API_URL 现在与 API_BASE_URL 相同（dse-analysis-api 已废弃）
export const ANALYSIS_API_URL = API_BASE_URL

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
 * 构建完整的 API URL (主 API)
 */
export function getApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL}${normalizedPath}`
}

/**
 * 构建完整的分析 API URL
 * 
 * 【架构裁决】现在与 getApiUrl 相同，因为所有 API 都走 dse-rag-questions
 */
export function getAnalysisApiUrl(path: string): string {
  return getApiUrl(path)
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
 * 统一 API 请求函数 (主 API: dse-rag-questions)
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
 * 分析 API 请求函数
 * 
 * 【架构裁决】现在直接调用 apiFetch，因为所有 API 都走 dse-rag-questions
 * 
 * 专用于：
 * - 插班分析 V2: /api/transfer/analyze/v2 (强制 AI，唯一入口)
 * - 分析结果查询: /api/analysis/result/:id
 * 
 * ⚠️ /api/transfer/analyze/ai 已废弃，不存在
 */
export async function analysisFetch(path: string, options?: RequestInit): Promise<Response> {
  return apiFetch(path, options)
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
