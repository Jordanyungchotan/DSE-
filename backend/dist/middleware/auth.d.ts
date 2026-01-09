/**
 * 认证中间件
 * 验证JWT令牌并提取用户信息
 */
import { Request, Response, NextFunction } from 'express';
declare global {
    namespace Express {
        interface Request {
            userId?: string;
            userEmail?: string;
        }
    }
}
/**
 * 认证中间件 - 必须登录
 */
export declare const requireAuth: (req: Request, _res: Response, next: NextFunction) => void;
/**
 * 可选认证中间件 - 如果有令牌则验证
 */
export declare const optionalAuth: (req: Request, _res: Response, next: NextFunction) => void;
/**
 * 生成JWT令牌
 */
export declare const generateToken: (userId: string, email: string) => string;
//# sourceMappingURL=auth.d.ts.map