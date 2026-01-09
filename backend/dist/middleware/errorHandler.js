/**
 * 全局错误处理中间件
 */
/**
 * 自定义API错误类
 */
export class ApiError extends Error {
    statusCode;
    constructor(message, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
        this.name = 'ApiError';
    }
}
/**
 * 错误处理中间件
 */
export const errorHandler = (err, _req, res, _next) => {
    console.error('❌ 错误:', err.message);
    console.error(err.stack);
    if (err instanceof ApiError) {
        res.status(err.statusCode).json({
            error: err.message,
            code: err.statusCode,
        });
        return;
    }
    // 处理验证错误
    if (err.name === 'ZodError') {
        res.status(400).json({
            error: '请求数据验证失败',
            details: err.message,
        });
        return;
    }
    // 处理JWT错误
    if (err.name === 'JsonWebTokenError') {
        res.status(401).json({
            error: '无效的认证令牌',
        });
        return;
    }
    if (err.name === 'TokenExpiredError') {
        res.status(401).json({
            error: '认证令牌已过期',
        });
        return;
    }
    // 默认服务器错误
    res.status(500).json({
        error: '服务器内部错误',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
};
//# sourceMappingURL=errorHandler.js.map