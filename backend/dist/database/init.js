/**
 * 数据库初始化模块
 * 使用SQLite作为轻量级数据库存储
 */
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// 数据库文件路径
const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../../data/dse_consulting.db');
let db;
/**
 * 获取数据库实例
 */
export const getDatabase = () => {
    if (!db) {
        throw new Error('数据库未初始化');
    }
    return db;
};
/**
 * 初始化数据库
 * 创建必要的表结构
 */
export const initDatabase = async () => {
    // 确保数据目录存在
    const dataDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    // 创建数据库连接
    db = new Database(DB_PATH);
    // 启用外键约束
    db.pragma('foreign_keys = ON');
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
  `);
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
  `);
    // 创建错题本表
    db.exec(`
    CREATE TABLE IF NOT EXISTS wrong_questions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      question_text TEXT NOT NULL,
      question_type TEXT DEFAULT 'multiple_choice',
      subject TEXT NOT NULL,
      topic TEXT,
      user_answer TEXT,
      correct_answer TEXT,
      explanation TEXT,
      wrong_count INTEGER DEFAULT 1,
      status TEXT DEFAULT 'unreviewed',
      first_attempt_date TEXT DEFAULT CURRENT_TIMESTAMP,
      last_attempt_date TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
    // 创建索引
    db.exec(`
    CREATE INDEX IF NOT EXISTS idx_analysis_user_id ON analysis_records(user_id);
    CREATE INDEX IF NOT EXISTS idx_analysis_created_at ON analysis_records(created_at);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_wrong_questions_user ON wrong_questions(user_id);
    CREATE INDEX IF NOT EXISTS idx_wrong_questions_status ON wrong_questions(status);
    CREATE INDEX IF NOT EXISTS idx_wrong_questions_subject ON wrong_questions(subject);
  `);
    console.log(`📁 数据库路径: ${DB_PATH}`);
};
/**
 * 关闭数据库连接
 */
export const closeDatabase = () => {
    if (db) {
        db.close();
    }
};
//# sourceMappingURL=init.js.map