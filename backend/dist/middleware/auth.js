/**
 * 认证中间件
 * 验证JWT令牌并提取用户信息
 */
import jwt from 'jsonwebtoken';
import { ApiError } from './errorHandler.js';
/**
 * 获取JWT密钥
 */
const getJwtSecret = () => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET 环境变量未设置');
    }
    return secret;
};
/**
 * 认证中间件 - 必须登录
 */
export const requireAuth = (req, _res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new ApiError('未提供认证令牌', 401);
        }
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, getJwtSecret());
        req.userId = decoded.userId;
        req.userEmail = decoded.email;
        next();
    }
    catch (error) {
        if (error instanceof ApiError) {
            next(error);
        }
        else if (error instanceof jwt.JsonWebTokenError) {
            next(new ApiError('无效的认证令牌', 401));
        }
        else if (error instanceof jwt.TokenExpiredError) {
            next(new ApiError('认证令牌已过期', 401));
        }
        else {
            next(error);
        }
    }
};
/**
 * 可选认证中间件 - 如果有令牌则验证
 */
export const optionalAuth = (req, _res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, getJwtSecret());
            req.userId = decoded.userId;
            req.userEmail = decoded.email;
        }
        next();
    }
    catch {
        // 令牌无效时静默忽略
        next();
    }
};
/**
 * 生成JWT令牌
 */
export const generateToken = (userId, email) => {
    const secret = getJwtSecret();
    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
    return jwt.sign({ userId, email }, secret, { expiresIn });
};
//# sourceMappingURL=auth.js.map