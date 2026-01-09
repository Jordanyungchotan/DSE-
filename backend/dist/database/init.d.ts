/**
 * 数据库初始化模块
 * 使用SQLite作为轻量级数据库存储
 */
import Database from 'better-sqlite3';
/**
 * 获取数据库实例
 */
export declare const getDatabase: () => Database.Database;
/**
 * 初始化数据库
 * 创建必要的表结构
 */
export declare const initDatabase: () => Promise<void>;
/**
 * 关闭数据库连接
 */
export declare const closeDatabase: () => void;
//# sourceMappingURL=init.d.ts.map