import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Locale, defaultLocale, createT } from '../i18n'
import { LanguageCode } from '@/shared/domain'

interface LanguageState {
  /** 当前语言 */
  locale: Locale
  /** 翻译函数（用于 i18n locale 文件） */
  t: (key: string) => string
  /** 当前语言代码（与 shared/domain 对齐） */
  currentLanguage: LanguageCode
  /** 设置语言 */
  setLocale: (locale: Locale) => void
}

/**
 * 获取 HTML lang 属性值
 */
function getHtmlLang(locale: Locale): string {
  switch (locale) {
    case 'zh-HK': return 'zh-HK'
    case 'zh-CN': return 'zh-CN'
    case 'en': return 'en'
    default: return 'zh-HK'
  }
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      locale: defaultLocale,
      currentLanguage: defaultLocale,
      t: createT(defaultLocale),
      setLocale: (locale: Locale) => {
        set({ 
          locale, 
          currentLanguage: locale,
          t: createT(locale) 
        })
        // 更新 HTML lang 属性
        document.documentElement.lang = getHtmlLang(locale)
      },
    }),
    {
      name: 'language-storage',
      partialize: (state) => ({ locale: state.locale }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // 重新创建翻译函数
          state.t = createT(state.locale)
          state.currentLanguage = state.locale
          document.documentElement.lang = getHtmlLang(state.locale)
        }
      },
    }
  )
)
