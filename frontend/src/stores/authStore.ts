import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * 用户信息接口
 */
interface User {
  id: string
  name: string
  email: string
  phone?: string
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
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          })
          
          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.message || '登录失败')
          }
          
          const data = await response.json()
          set({
            isAuthenticated: true,
            user: data.user,
            token: data.token,
            loading: false,
          })
        } catch (error) {
          set({ loading: false })
          throw error
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
          const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password }),
          })
          
          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.message || '注册失败')
          }
          
          const data = await response.json()
          set({
            isAuthenticated: true,
            user: data.user,
            token: data.token,
            loading: false,
          })
        } catch (error) {
          set({ loading: false })
          throw error
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

