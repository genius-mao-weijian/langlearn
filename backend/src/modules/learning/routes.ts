/**
 * 互动学习模块路由（learning）
 *
 * 限界上下文：Learning & Practice
 * 职责：练习内容获取、答案提交、单词与听力素材查询
 *
 * 【路由顺序说明】
 * 静态路径（/vocabulary、/listening）必须定义在动态路径（/:exerciseId）之前，
 * 否则 Express 会把 "vocabulary" 误匹配为 exerciseId 参数。
 *
 * 【鉴权策略】
 * - 单词 / 听力列表为公开内容，无需鉴权
 * - 练习详情获取与答案提交需鉴权（记录用户答题行为）
 *
 * 统一响应格式：{ code: 0, message: '成功', data: T }
 */
import { Router, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../shared/authMiddleware.js';
import type { AuthenticatedRequest, ApiResponse } from '../shared/types.js';
import {
  getVocabularyList,
  getListeningList,
  getExerciseById,
  submitExercise,
} from './service.js';

const router = Router();

// 提交答案请求体校验：answer 非空
const submitSchema = z.object({
  answer: z.string().min(1, '答案不能为空'),
});

/**
 * 从 catch 的 unknown 错误中安全读取业务错误 code。
 */
function getErrorCode(err: unknown): string | undefined {
  if (typeof err === 'object' && err !== null && 'code' in err) {
    const code = (err as { code: unknown }).code;
    return typeof code === 'string' ? code : undefined;
  }
  return undefined;
}

/**
 * 从 query 读取分页参数，提供默认值并限制上限避免过大查询。
 */
function parsePagination(req: {
  query: Record<string, unknown>;
}): { limit: number; offset: number } {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const offset = Number(req.query.offset) || 0;
  return { limit, offset };
}

/**
 * GET /vocabulary - 获取单词列表
 * 查询参数：level, limit, offset（均可选）
 */
router.get('/vocabulary', async (req, res: Response) => {
  try {
    const level = req.query.level as string | undefined;
    const { limit, offset } = parsePagination(req);

    const list = await getVocabularyList(level, limit, offset);

    res.json({ code: 0, message: '成功', data: list } satisfies ApiResponse);
  } catch (err) {
    console.error('[learning] 获取单词列表失败：', err);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null,
    } satisfies ApiResponse);
  }
});

/**
 * GET /listening - 获取听力素材列表
 * 查询参数：level, limit, offset（均可选）
 */
router.get('/listening', async (req, res: Response) => {
  try {
    const level = req.query.level as string | undefined;
    const { limit, offset } = parsePagination(req);

    const list = await getListeningList(level, limit, offset);

    res.json({ code: 0, message: '成功', data: list } satisfies ApiResponse);
  } catch (err) {
    console.error('[learning] 获取听力素材列表失败：', err);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null,
    } satisfies ApiResponse);
  }
});

/**
 * GET /:exerciseId - 获取练习内容
 * 需鉴权
 * 注意：返回的 ExerciseDTO 不包含 correctAnswer 与 courseId，防止前端作弊。
 */
router.get('/:exerciseId', authMiddleware, async (req, res: Response) => {
  try {
    const exercise = await getExerciseById(req.params.exerciseId);

    // 练习不存在 -> 404
    if (!exercise) {
      res.status(404).json({
        code: 404,
        message: '练习不存在',
        data: null,
      } satisfies ApiResponse);
      return;
    }

    // 剔除 correctAnswer 与 courseId，仅返回前端展示所需字段
    const { correctAnswer: _correctAnswer, courseId: _courseId, ...exerciseDTO } =
      exercise;

    res.json({
      code: 0,
      message: '成功',
      data: exerciseDTO,
    } satisfies ApiResponse);
  } catch (err) {
    console.error('[learning] 获取练习内容失败：', err);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null,
    } satisfies ApiResponse);
  }
});

/**
 * POST /:exerciseId/submit - 提交练习答案
 * 需鉴权
 * 请求体：{ answer }
 * 返回判分结果（提交后可展示正确答案，故包含 correctAnswer）。
 */
router.post('/:exerciseId/submit', authMiddleware, async (req, res: Response) => {
  try {
    // 1. zod 校验请求体
    const parsed = submitSchema.safeParse(req.body);
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path.join('.') || '_';
        if (!errors[field]) errors[field] = issue.message;
      }
      res.status(400).json({
        code: 400,
        message: '请求参数校验失败',
        data: { errors },
      } satisfies ApiResponse);
      return;
    }

    const userId = (req as AuthenticatedRequest).userId;
    if (!userId) {
      res.status(401).json({
        code: 401,
        message: '未登录',
        data: null,
      } satisfies ApiResponse);
      return;
    }

    // 2. 调用 service 判分并记录
    const result = await submitExercise(
      userId,
      req.params.exerciseId,
      parsed.data.answer
    );

    res.json({ code: 0, message: '成功', data: result } satisfies ApiResponse);
  } catch (err) {
    // 练习不存在 -> 404
    if (getErrorCode(err) === 'EXERCISE_NOT_FOUND') {
      res.status(404).json({
        code: 404,
        message: '练习不存在',
        data: null,
      } satisfies ApiResponse);
      return;
    }
    console.error('[learning] 提交练习答案失败：', err);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null,
    } satisfies ApiResponse);
  }
});

export default router;
