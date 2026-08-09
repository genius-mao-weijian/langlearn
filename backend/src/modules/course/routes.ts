/**
 * 分级课程模块路由（course）
 *
 * 限界上下文：Course & Content
 * 职责：课程列表、课程详情、课时列表的查询
 *
 * 课程与课时为公开内容，无需鉴权即可访问。
 * 路由层只做参数读取与响应组装，业务逻辑在 service.ts 中实现。
 *
 * 统一响应格式：{ code: 0, message: '成功', data: T }
 */
import { Router, Response } from 'express';
import type { ApiResponse } from '../shared/types.js';
import {
  getCourses,
  getCourseById,
  getLessonsByCourseId,
} from './service.js';

const router = Router();

/**
 * GET / - 获取课程列表
 * 查询参数（均可选）：
 *   - language: 语言筛选（如 en, ja, fr）
 *   - level:    难度等级筛选（如 A1, A2, B1）
 */
router.get('/', async (req, res: Response) => {
  try {
    // 从 query 读取可选筛选条件（统一转为 string）
    const language = req.query.language as string | undefined;
    const level = req.query.level as string | undefined;

    const courses = await getCourses(language, level);

    res.json({ code: 0, message: '成功', data: courses } satisfies ApiResponse);
  } catch (err) {
    console.error('[course] 获取课程列表失败：', err);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null,
    } satisfies ApiResponse);
  }
});

/**
 * GET /:id - 获取课程详情
 * 路径参数：id - 课程 ID
 */
router.get('/:id', async (req, res: Response) => {
  try {
    const course = await getCourseById(req.params.id);

    // 课程不存在 -> 404
    if (!course) {
      res.status(404).json({
        code: 404,
        message: '课程不存在',
        data: null,
      } satisfies ApiResponse);
      return;
    }

    res.json({ code: 0, message: '成功', data: course } satisfies ApiResponse);
  } catch (err) {
    console.error('[course] 获取课程详情失败：', err);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null,
    } satisfies ApiResponse);
  }
});

/**
 * GET /:id/lessons - 获取课程下的课时列表
 * 路径参数：id - 课程 ID
 * 返回该课程下所有课时，按 sort_order 升序排列。
 */
router.get('/:id/lessons', async (req, res: Response) => {
  try {
    const lessons = await getLessonsByCourseId(req.params.id);

    res.json({ code: 0, message: '成功', data: lessons } satisfies ApiResponse);
  } catch (err) {
    console.error('[course] 获取课时列表失败：', err);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null,
    } satisfies ApiResponse);
  }
});

export default router;
