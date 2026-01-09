/**
 * DSE插班分析系统 - Cloudflare Workers 后端
 *
 * 适配 Cloudflare Workers 运行环境
 */
export interface Env {
    DB: D1Database;
    DEEPSEEK_API_KEY: string;
    JWT_SECRET: string;
    CORS_ORIGIN: string;
}
declare const _default: {
    fetch(request: Request, env: Env): Promise<Response>;
};
export default _default;
//# sourceMappingURL=worker.d.ts.map