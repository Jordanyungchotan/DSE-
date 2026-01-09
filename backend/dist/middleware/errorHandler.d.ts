/**
 * 全局错误处理中间件
 */
import { Request, Response, NextFunction } from 'express';
/**
 * 自定义API错误类
 */
export declare class ApiError extends Error {
    statusCode: number;
    constructor(message: string, statusCode?: number);
}
/**
 * 错误处理中间件
 */
export declare const errorHandler: (err: Error | ApiError, _req: Request, res: Response, _next: NextFunction) => void;
//# sourceMappingURL=errorHandler.d.ts.map