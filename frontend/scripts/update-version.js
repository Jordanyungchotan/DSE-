/**
 * 构建时自动更新版本信息
 * 每次构建时会更新 public/version.json
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const versionPath = path.join(__dirname, '../public/version.json')

// 生成新版本号（使用时间戳）
const version = `1.0.${Date.now()}`
const buildTime = new Date().toISOString()

const versionData = {
  version,
  buildTime
}

fs.writeFileSync(versionPath, JSON.stringify(versionData, null, 2))

console.log(`✅ 版本已更新: ${version}`)
console.log(`📅 构建时间: ${buildTime}`)
