/**
 * API 配置
 * 
 * 在本地开发时使用 Vite 代理 (/api -> localhost:5000)
 * 在生产环境使用 Cloudflare Worker URL
 */

// 获取 API 基础 URL
// 生产环境直接使用后端 Worker URL
const PRODUCTION_API_URL = 'https://dse-analysis-api.jordanyungchotan.workers.dev'

export const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.PROD ? PRODUCTION_API_URL : '')

/**
 * 构建完整的 API URL
 * @param path API 路径 (如 /api/auth/login)
 * @returns 完整的 URL
 */
export function getApiUrl(path: string): string {
  // 确保路径以 / 开头
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL}${normalizedPath}`
}

/**
 * 封装的 fetch 函数，自动添加 API 基础 URL
 */
export async function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  const url = getApiUrl(path)
  return fetch(url, options)
}

