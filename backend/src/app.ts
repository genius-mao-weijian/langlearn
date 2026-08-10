/**
 * 应用入口文件
 *
 * 职责：
 * 1. 加载环境变量（必须在导入其他模块前执行，确保 config 能读取到 .env）
 * 2. 创建 Express 应用并注册全局中间件（CORS、JSON 解析）
 * 3. 挂载健康检查路由与各业务模块路由
 * 4. 启动 HTTP 服务并监听端口
 *
 * 注意：由于项目采用 ESM（package.json 中 "type": "module"），
 * 相对路径导入需显式带上 .js 扩展名，以兼容 Node 的 ESM 解析规则。
 */
import express, { Request, Response } from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import identityRoutes from './modules/identity/routes.js';
import courseRoutes from './modules/course/routes.js';
import learningRoutes from './modules/learning/routes.js';
import progressRoutes from './modules/progress/routes.js';
import achievementRoutes from './modules/achievement/routes.js';

// 创建 Express 应用实例
const app = express();

// ===== 全局中间件 =====

// CORS 中间件：允许来自前端的跨域请求
// CLIENT_ORIGIN 指定允许的来源（开发环境通常为 http://localhost:5173）
app.use(
  cors({
    origin: env.CLIENT_ORIGIN,
    credentials: true,
  })
);

// JSON 解析中间件：解析请求体中的 JSON 数据，限制大小为 1MB 以防御大请求体攻击
app.use(express.json({ limit: '1mb' }));

// ===== 健康检查路由 =====
// 用于负载均衡器 / 容器编排系统探活，无需鉴权
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'langlearn-backend',
    timestamp: new Date().toISOString(),
  });
});

// ===== 业务模块路由挂载 =====
// 每个模块对应一个限界上下文（Bounded Context），路由前缀遵循 RESTful 风格
app.use('/api/auth', identityRoutes);      // 身份认证模块：注册 / 登录 / 刷新 token
app.use('/api/courses', courseRoutes);     // 分级课程模块：课程 / 课时
app.use('/api/learning', learningRoutes);  // 互动学习模块：练习 / 单词 / 听力
app.use('/api/progress', progressRoutes);  // 进度追踪模块：学习进度
app.use('/api/achievements', achievementRoutes); // 成就激励模块：勋章

// 注册事件订阅：progress 与 achievement 模块订阅 EXERCISE_COMPLETED 事件
// import 该模块会触发 routes.ts 中的 eventBus.on() 调用
import './modules/progress/routes.js';
import './modules/achievement/routes.js';

// ===== 启动 HTTP 服务 =====
app.listen(env.PORT, () => {
  console.log(`[langlearn] 后端服务已启动，监听端口 ${env.PORT}`);
  console.log(`[langlearn] CORS 允许来源：${env.CLIENT_ORIGIN}`);
});

// 导出 app 供集成测试使用
export { app };
