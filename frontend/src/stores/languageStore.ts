import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Locale, defaultLocale, createT } from '../i18n'

interface LanguageState {
  locale: Locale
  t: (key: string) => string
  setLocale: (locale: Locale) => void
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      locale: defaultLocale,
      t: createT(defaultLocale),
      setLocale: (locale: Locale) => {
        set({ 
          locale, 
          t: createT(locale) 
        })
        // 更新 HTML lang 属性
        document.documentElement.lang = locale === 'zh-CN' ? 'zh-CN' : locale === 'zh-TW' ? 'zh-TW' : 'en'
      },
    }),
    {
      name: 'language-storage',
      partialize: (state) => ({ locale: state.locale }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // 重新创建翻译函数
          state.t = createT(state.locale)
          document.documentElement.lang = state.locale === 'zh-CN' ? 'zh-CN' : state.locale === 'zh-TW' ? 'zh-TW' : 'en'
        }
      },
    }
  )
)

