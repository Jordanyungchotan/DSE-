/**
 * 数据库初始化模块
 * 使用SQLite作为轻量级数据库存储
 */

import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 数据库文件路径
const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../../data/dse_consulting.db')

let db: Database.Database

/**
 * 获取数据库实例
 */
export const getDatabase = (): Database.Database => {
  if (!db) {
    throw new Error('数据库未初始化')
  }
  return db
}

/**
 * 初始化数据库
 * 创建必要的表结构
 */
export const initDatabase = async (): Promise<void> => {
  // 确保数据目录存在
  const dataDir = path.dirname(DB_PATH)
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }

  // 创建数据库连接
  db = new Database(DB_PATH)
  
  // 启用外键约束
  db.pragma('foreign_keys = ON')

  // 创建用户表
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      phone TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // 创建分析记录表
  db.exec(`
    CREATE TABLE IF NOT EXISTS analysis_records (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      student_info TEXT NOT NULL,
      result TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `)

  // 创建索引
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_analysis_user_id ON analysis_records(user_id);
    CREATE INDEX IF NOT EXISTS idx_analysis_created_at ON analysis_records(created_at);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  `)

  console.log(`📁 数据库路径: ${DB_PATH}`)
}

/**
 * 关闭数据库连接
 */
export const closeDatabase = (): void => {
  if (db) {
    db.close()
  }
}

