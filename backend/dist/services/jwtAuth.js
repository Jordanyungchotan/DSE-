/**
 * JWT 认证服务模块
 *
 * 适配 Cloudflare Workers 环境，使用 Web Crypto API
 */
// ============================================================
// 核心函数
// ============================================================
/**
 * 生成 JWT Token
 */
export async function generateToken(payload, secret, expiresInDays = 7) {
    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const fullPayload = {
        ...payload,
        iat: now,
        exp: now + expiresInDays * 24 * 60 * 60,
    };
    const encoder = new TextEncoder();
    const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '');
    const payloadB64 = btoa(JSON.stringify(fullPayload)).replace(/=/g, '');
    const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(`${headerB64}.${payloadB64}`));
    const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g, '');
    return `${headerB64}.${payloadB64}.${signatureB64}`;
}
/**
 * 验证 JWT Token
 */
export async function verifyToken(token, secret) {
    try {
        const parts = token.split('.');
        if (parts.length !== 3)
            return null;
        const [headerB64, payloadB64, signatureB64] = parts;
        // 验证签名
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
        // 还原 base64 padding
        const signature = Uint8Array.from(atob(signatureB64.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
        const valid = await crypto.subtle.verify('HMAC', key, signature, encoder.encode(`${headerB64}.${payloadB64}`));
        if (!valid)
            return null;
        // 解析 payload
        const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));
        // 检查过期
        if (payload.exp < Math.floor(Date.now() / 1000)) {
            return null;
        }
        return payload;
    }
    catch {
        return null;
    }
}
/**
 * 从 Authorization header 提取并验证 Token
 */
export async function authenticateRequest(authHeader, secret) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { success: false, error: '未提供认证令牌' };
    }
    const token = authHeader.slice(7);
    const payload = await verifyToken(token, secret);
    if (!payload) {
        return { success: false, error: '无效或过期的认证令牌' };
    }
    return {
        success: true,
        userId: payload.userId,
        email: payload.email,
    };
}
/**
 * 密码哈希（使用 Web Crypto API）
 */
export async function hashPassword(password, salt = 'dse-salt-2024') {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + salt);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
/**
 * 验证密码
 */
export async function verifyPassword(password, hash, salt = 'dse-salt-2024') {
    const inputHash = await hashPassword(password, salt);
    return inputHash === hash;
}
// ============================================================
// HTTP 错误类
// ============================================================
export class AuthError extends Error {
    statusCode;
    constructor(message, statusCode = 401) {
        super(message);
        this.name = 'AuthError';
        this.statusCode = statusCode;
    }
}
//# sourceMappingURL=jwtAuth.js.map