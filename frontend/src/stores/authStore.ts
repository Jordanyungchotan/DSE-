import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { apiFetch } from '../config/api'

/**
 * 用户信息接口
 */
interface User {
  id: string
  name: string
  email: string
  phone?: string
  avatar?: string
  createdAt: string
}

/**
 * 认证状态接口
 */
interface AuthState {
  // 状态
  isAuthenticated: boolean
  user: User | null
  token: string | null
  loading: boolean
  
  // 操作
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
  updateUser: (user: Partial<User>) => void
  setLoading: (loading: boolean) => void
}

/**
 * 认证状态管理Store
 * 使用zustand管理全局认证状态，并持久化到localStorage
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // 初始状态
      isAuthenticated: false,
      user: null,
      token: null,
      loading: false,

      /**
       * 用户登录
       * @param email 邮箱
       * @param password 密码
       */
      login: async (email: string, password: string) => {
        set({ loading: true })
        try {
          const response = await apiFetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          })
          
          if (!response.ok) {
            let errorMessage = '登录失败'
            try {
              const errorData = await response.json()
              errorMessage = errorData.error || errorData.message || '登录失败'
            } catch {
              errorMessage = `登录失败 (${response.status})`
            }
            throw new Error(errorMessage)
          }
          
          const responseData = await response.json()
          // 后端返回格式: { success: true, data: { token, user } }
          const { token, user } = responseData.data || responseData
          set({
            isAuthenticated: true,
            user: user,
            token: token,
            loading: false,
          })
        } catch (error) {
          set({ loading: false })
          if (error instanceof Error) {
            // 网络错误
            if (error.message === 'Failed to fetch' || error.message.includes('NetworkError')) {
              throw new Error('网络连接失败，请检查网络后重试')
            }
            throw error
          }
          throw new Error('登录失败，请稍后重试')
        }
      },

      /**
       * 用户注册
       * @param name 姓名
       * @param email 邮箱
       * @param password 密码
       */
      register: async (name: string, email: string, password: string) => {
        set({ loading: true })
        try {
          const response = await apiFetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password }),
          })
          
          if (!response.ok) {
            let errorMessage = '注册失败'
            try {
              const errorData = await response.json()
              errorMessage = errorData.error || errorData.message || '注册失败'
            } catch {
              errorMessage = `注册失败 (${response.status})`
            }
            throw new Error(errorMessage)
          }
          
          const responseData = await response.json()
          // 后端返回格式: { success: true, data: { token, user } }
          const { token, user } = responseData.data || responseData
          set({
            isAuthenticated: true,
            user: user,
            token: token,
            loading: false,
          })
        } catch (error) {
          set({ loading: false })
          if (error instanceof Error) {
            // 网络错误
            if (error.message === 'Failed to fetch' || error.message.includes('NetworkError')) {
              throw new Error('网络连接失败，请检查网络后重试')
            }
            throw error
          }
          throw new Error('注册失败，请稍后重试')
        }
      },

      /**
       * 用户登出
       */
      logout: () => {
        set({
          isAuthenticated: false,
          user: null,
          token: null,
        })
      },

      /**
       * 更新用户信息
       * @param userData 用户数据
       */
      updateUser: (userData: Partial<User>) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null,
        }))
      },

      /**
       * 设置加载状态
       * @param loading 是否加载中
       */
      setLoading: (loading: boolean) => {
        set({ loading })
      },
    }),
    {
      name: 'dse-auth-storage', // localStorage key
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        token: state.token,
      }),
    }
  )
)

