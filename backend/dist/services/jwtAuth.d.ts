/**
 * JWT 认证服务模块
 *
 * 适配 Cloudflare Workers 环境，使用 Web Crypto API
 */
/** JWT 载荷接口 */
export interface JwtPayload {
    userId: string;
    email: string;
    iat: number;
    exp: number;
}
/** 认证结果 */
export interface AuthResult {
    success: boolean;
    userId?: string;
    email?: string;
    error?: string;
}
/**
 * 生成 JWT Token
 */
export declare function generateToken(payload: {
    userId: string;
    email: string;
}, secret: string, expiresInDays?: number): Promise<string>;
/**
 * 验证 JWT Token
 */
export declare function verifyToken(token: string, secret: string): Promise<JwtPayload | null>;
/**
 * 从 Authorization header 提取并验证 Token
 */
export declare function authenticateRequest(authHeader: string | null, secret: string): Promise<AuthResult>;
/**
 * 密码哈希（使用 Web Crypto API）
 */
export declare function hashPassword(password: string, salt?: string): Promise<string>;
/**
 * 验证密码
 */
export declare function verifyPassword(password: string, hash: string, salt?: string): Promise<boolean>;
export declare class AuthError extends Error {
    statusCode: number;
    constructor(message: string, statusCode?: number);
}
//# sourceMappingURL=jwtAuth.d.ts.map