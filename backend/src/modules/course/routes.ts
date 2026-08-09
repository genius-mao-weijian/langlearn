/**
 * 分级课程模块路由（course）
 *
 * 限界上下文：Course & Content
 * 职责：课程列表、课程详情、课时列表的查询
 *
 * 课程按语言（language）和难度等级（level）分级，
 * 课时是课程的子单元，一个课程包含多个课时，每个课时包含多个练习（exercise）。
 */
import { Router, Request, Response } from 'express';

const router = Router();

/**
 * GET / - 获取课程列表
 * 查询参数：
 *   - language: 语言筛选（如 en, ja, fr）
 *   - level:    难度等级筛选（如 A1, A2, B1）
 * 后续实现逻辑：根据筛选条件分页查询课程
 */
router.get('/', (req: Request, res: Response) => {
  const { language, level } = req.query;
  res.status(501).json({
    code: 501,
    message: '获取课程列表接口尚未实现（P0 占位）',
    data: { filters: { language, level } },
  });
});

/**
 * GET /:id - 获取课程详情
 * 路径参数：id - 课程 ID
 * 后续实现逻辑：查询课程元信息、所属语言、等级、课时数等
 */
router.get('/:id', (req: Request, res: Response) => {
  res.status(501).json({
    code: 501,
    message: '获取课程详情接口尚未实现（P0 占位）',
    data: { courseId: req.params.id },
  });
});

/**
 * GET /:id/lessons - 获取课程下的课时列表
 * 路径参数：id - 课程 ID
 * 后续实现逻辑：返回该课程下所有课时，按顺序排列
 */
router.get('/:id/lessons', (req: Request, res: Response) => {
  res.status(501).json({
    code: 501,
    message: '获取课时列表接口尚未实现（P0 占位）',
    data: { courseId: req.params.id },
  });
});

export default router;
