/**
 * 认证路由
 * 处理用户登录、注册等认证相关请求
 */
import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database/init.js';
import { generateToken, requireAuth } from '../middleware/auth.js';
import { ApiError } from '../middleware/errorHandler.js';
export const authRouter = Router();
// ===== 请求验证Schema =====
const registerSchema = z.object({
    name: z.string().min(2, '姓名至少2个字符'),
    email: z.string().email('请输入有效的邮箱地址'),
    password: z.string().min(6, '密码至少6个字符'),
    phone: z.string().optional(),
});
const loginSchema = z.object({
    email: z.string().email('请输入有效的邮箱地址'),
    password: z.string().min(1, '请输入密码'),
});
// ===== 路由处理 =====
/**
 * 用户注册
 * POST /api/auth/register
 */
authRouter.post('/register', async (req, res, next) => {
    try {
        // 验证请求数据
        const data = registerSchema.parse(req.body);
        const db = getDatabase();
        // 检查邮箱是否已注册
        const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(data.email);
        if (existingUser) {
            throw new ApiError('该邮箱已被注册', 400);
        }
        // 密码加密
        const passwordHash = await bcrypt.hash(data.password, 10);
        // 创建用户
        const userId = uuidv4();
        const now = new Date().toISOString();
        db.prepare(`
      INSERT INTO users (id, name, email, password_hash, phone, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(userId, data.name, data.email, passwordHash, data.phone || null, now, now);
        // 生成JWT令牌
        const token = generateToken(userId, data.email);
        res.status(201).json({
            message: '注册成功',
            user: {
                id: userId,
                name: data.name,
                email: data.email,
                phone: data.phone,
                createdAt: now,
            },
            token,
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * 用户登录
 * POST /api/auth/login
 */
authRouter.post('/login', async (req, res, next) => {
    try {
        // 验证请求数据
        const data = loginSchema.parse(req.body);
        const db = getDatabase();
        // 查找用户
        const user = db.prepare(`
      SELECT id, name, email, password_hash, phone, created_at
      FROM users WHERE email = ?
    `).get(data.email);
        if (!user) {
            throw new ApiError('邮箱或密码错误', 401);
        }
        // 验证密码
        const isValidPassword = await bcrypt.compare(data.password, user.password_hash);
        if (!isValidPassword) {
            throw new ApiError('邮箱或密码错误', 401);
        }
        // 生成JWT令牌
        const token = generateToken(user.id, user.email);
        res.json({
            message: '登录成功',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                createdAt: user.created_at,
            },
            token,
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * 获取当前用户信息
 * GET /api/auth/me
 */
authRouter.get('/me', requireAuth, (req, res, next) => {
    try {
        const db = getDatabase();
        const user = db.prepare(`
      SELECT id, name, email, phone, created_at
      FROM users WHERE id = ?
    `).get(req.userId);
        if (!user) {
            throw new ApiError('用户不存在', 404);
        }
        res.json({
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                createdAt: user.created_at,
            },
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * 更新用户信息
 * PUT /api/auth/me
 */
authRouter.put('/me', requireAuth, (req, res, next) => {
    try {
        const updateSchema = z.object({
            name: z.string().min(2).optional(),
            phone: z.string().optional(),
        });
        const data = updateSchema.parse(req.body);
        const db = getDatabase();
        const updates = [];
        const values = [];
        if (data.name) {
            updates.push('name = ?');
            values.push(data.name);
        }
        if (data.phone !== undefined) {
            updates.push('phone = ?');
            values.push(data.phone || null);
        }
        if (updates.length > 0) {
            updates.push('updated_at = ?');
            values.push(new Date().toISOString());
            values.push(req.userId);
            db.prepare(`
        UPDATE users SET ${updates.join(', ')} WHERE id = ?
      `).run(...values);
        }
        // 返回更新后的用户信息
        const user = db.prepare(`
      SELECT id, name, email, phone, created_at
      FROM users WHERE id = ?
    `).get(req.userId);
        res.json({
            message: '更新成功',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                createdAt: user.created_at,
            },
        });
    }
    catch (error) {
        next(error);
    }
});
//# sourceMappingURL=auth.js.map