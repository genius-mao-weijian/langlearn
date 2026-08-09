/**
 * 互动学习模块路由（learning）
 *
 * 限界上下文：Learning & Practice
 * 职责：练习内容获取、答案提交、单词与听力素材查询
 *
 * 【P0 范围说明】
 * P0 阶段仅实现「单词」与「听力」两种练习类型，
 * 后续阶段将扩展口语、阅读、写作等练习类型。
 *
 * 【路由顺序说明】
 * 静态路径（/vocabulary、/listening）必须定义在动态路径（/:exerciseId）之前，
 * 否则 Express 会把 "vocabulary" 误匹配为 exerciseId 参数。
 */
import { Router, Request, Response } from 'express';

const router = Router();

/**
 * GET /vocabulary - 获取单词列表
 * 查询参数：level - 难度等级（如 A1, A2）
 * 返回：单词及释义、音标、例句等
 * 后续实现逻辑：按等级分页查询单词库
 */
router.get('/vocabulary', (req: Request, res: Response) => {
  res.status(501).json({
    code: 501,
    message: '获取单词列表接口尚未实现（P0 占位）',
    data: { level: req.query.level },
  });
});

/**
 * GET /listening - 获取听力素材列表
 * 查询参数：level - 难度等级
 * 返回：听力素材元信息（音频地址、时长、转写文本等）
 * 后续实现逻辑：按等级分页查询听力素材库
 */
router.get('/listening', (req: Request, res: Response) => {
  res.status(501).json({
    code: 501,
    message: '获取听力素材列表接口尚未实现（P0 占位）',
    data: { level: req.query.level },
  });
});

/**
 * GET /:exerciseId - 获取练习内容
 * 路径参数：exerciseId - 练习 ID
 * 返回：练习类型（单词 / 听力）、题目内容、选项等
 * 后续实现逻辑：根据练习 ID 查询练习详情
 */
router.get('/:exerciseId', (req: Request, res: Response) => {
  res.status(501).json({
    code: 501,
    message: '获取练习内容接口尚未实现（P0 占位）',
    data: { exerciseId: req.params.exerciseId },
  });
});

/**
 * POST /:exerciseId/submit - 提交练习答案
 * 路径参数：exerciseId - 练习 ID
 * 请求体：{ answer }
 * 后续实现逻辑：
 *   1. 校验答案正确性
 *   2. 发布 EXERCISE_COMPLETED 事件（由 progress 模块订阅以更新进度）
 *   3. 返回判分结果
 */
router.post('/:exerciseId/submit', (req: Request, res: Response) => {
  res.status(501).json({
    code: 501,
    message: '提交练习答案接口尚未实现（P0 占位）',
    data: { exerciseId: req.params.exerciseId, answer: req.body?.answer },
  });
});

export default router;
