import { zhCN } from './locales/zh-CN'
import { zhTW } from './locales/zh-TW'
import { en } from './locales/en'
import { LanguageCode } from '@/shared/domain'

// 前端 Locale 类型（与 LanguageCode 对齐）
export type Locale = LanguageCode

export const locales = {
  'zh-CN': zhCN,
  'zh-HK': zhTW, // zh-HK 使用繁体中文翻译
  'en': en,
}

export type Translations = typeof zhCN

// 默认语言
export const defaultLocale: Locale = 'zh-HK'

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
