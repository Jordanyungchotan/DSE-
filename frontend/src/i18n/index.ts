import { zhCN } from './locales/zh-CN'
import { zhTW } from './locales/zh-TW'
import { en } from './locales/en'

export type Locale = 'zh-CN' | 'zh-TW' | 'en'

export const locales = {
  'zh-CN': zhCN,
  'zh-TW': zhTW,
  'en': en,
}

export type Translations = typeof zhCN

// 默认语言
export const defaultLocale: Locale = 'zh-TW'

// 获取嵌套翻译值
export function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split('.')
  let current: unknown = obj
  
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = (current as Record<string, unknown>)[key]
    } else {
      return path // 找不到则返回原始 key
    }
  }
  
  return typeof current === 'string' ? current : path
}

// 创建翻译函数
export function createT(locale: Locale) {
  const translations = locales[locale] || locales[defaultLocale]
  
  return function t(key: string): string {
    return getNestedValue(translations as unknown as Record<string, unknown>, key)
  }
}

export { zhCN, zhTW, en }

