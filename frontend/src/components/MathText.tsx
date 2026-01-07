/**
 * MathText 组件 - 渲染包含LaTeX数学公式的文本
 * 
 * 支持行内公式 $...$ 和块级公式 $$...$$
 */

import { useMemo } from 'react'
import 'katex/dist/katex.min.css'
import katex from 'katex'

interface MathTextProps {
  text: string
  className?: string
}

/**
 * 将包含LaTeX的文本渲染为HTML
 */
function renderMathText(text: string): string {
  if (!text) return ''
  
  let result = text
  
  // 首先处理常见的LaTeX转义符号（优先处理，避免被$匹配干扰）
  const escapeMap: Record<string, string> = {
    '\\%': '%',
    '\\$': '$',
    '\\&': '&',
    '\\#': '#',
    '\\_': '_',
    '\\{': '{',
    '\\}': '}',
    '\\textbackslash': '\\',
  }
  
  for (const [latex, char] of Object.entries(escapeMap)) {
    result = result.replace(new RegExp(latex.replace(/[\\${}]/g, '\\$&'), 'g'), char)
  }
  
  // 处理常见的LaTeX数学符号（未被$包裹的情况）
  const symbolMap: Record<string, string> = {
    '\\leq': '≤',
    '\\geq': '≥',
    '\\neq': '≠',
    '\\times': '×',
    '\\div': '÷',
    '\\pm': '±',
    '\\infty': '∞',
    '\\sqrt': '√',
    '\\alpha': 'α',
    '\\beta': 'β',
    '\\gamma': 'γ',
    '\\delta': 'δ',
    '\\theta': 'θ',
    '\\pi': 'π',
    '\\sum': '∑',
    '\\prod': '∏',
    '\\int': '∫',
    '\\rightarrow': '→',
    '\\leftarrow': '←',
    '\\Rightarrow': '⇒',
    '\\Leftarrow': '⇐',
    '\\leftrightarrow': '↔',
    '\\approx': '≈',
    '\\equiv': '≡',
    '\\subset': '⊂',
    '\\supset': '⊃',
    '\\in': '∈',
    '\\notin': '∉',
    '\\cup': '∪',
    '\\cap': '∩',
    '\\emptyset': '∅',
    '\\forall': '∀',
    '\\exists': '∃',
    '\\partial': '∂',
    '\\nabla': '∇',
    '\\cdot': '·',
    '\\ldots': '…',
    '\\cdots': '⋯',
    '\\vdots': '⋮',
    '\\ddots': '⋱',
    '\\le': '≤',
    '\\ge': '≥',
    '\\ne': '≠',
  }
  
  for (const [latex, unicode] of Object.entries(symbolMap)) {
    result = result.replace(new RegExp(latex.replace(/\\/g, '\\\\'), 'g'), unicode)
  }
  
  // 处理块级公式 $$...$$
  result = result.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => {
    try {
      return katex.renderToString(math.trim(), {
        displayMode: true,
        throwOnError: false,
        strict: false,
      })
    } catch {
      return `$$${math}$$`
    }
  })
  
  // 处理行内公式 $...$ (确保$之间有内容，且不是货币符号如 $400)
  result = result.replace(/\$([a-zA-Z][^$\n]*?)\$/g, (match, math) => {
    // 跳过可能是货币的情况（如 $400）
    if (/^\d/.test(math.trim())) {
      return match
    }
    try {
      return katex.renderToString(math.trim(), {
        displayMode: false,
        throwOnError: false,
        strict: false,
      })
    } catch {
      return match
    }
  })
  
  // 清理剩余的单独反斜杠
  result = result.replace(/\\([a-zA-Z]+)/g, (_, cmd) => {
    // 如果是未识别的命令，直接显示内容
    return cmd
  })
  
  return result
}

export default function MathText({ text, className }: MathTextProps) {
  const html = useMemo(() => renderMathText(text), [text])
  
  return (
    <span 
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

/**
 * 渲染选项文本（用于Radio/Checkbox选项）
 */
export function MathOption({ text, className }: MathTextProps) {
  const html = useMemo(() => renderMathText(text), [text])
  
  return (
    <span 
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
