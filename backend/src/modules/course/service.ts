/**
 * 分级课程模块业务逻辑（course service）
 *
 * 职责：课程列表查询（支持语言 / 等级筛选）、课程详情、课时列表查询。
 * 课程与课时为公开内容，无需鉴权即可访问。
 *
 * 本层将数据库 snake_case 列名映射为对外的 camelCase DTO。
 */
import { query, queryOne } from '../shared/db.js';
import type { CourseDTO, LessonDTO } from '../shared/types.js';

/**
 * courses 表的数据库行类型（snake_case 列名）
 */
interface CourseRow {
  id: string;
  title: string;
  description: string | null;
  language: string;
  level: string;
  cover_image_url: string | null;
  sort_order: number;
}

/**
 * lessons 表的数据库行类型（snake_case 列名）
 */
interface LessonRow {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  sort_order: number;
}

/**
 * 将课程行映射为 CourseDTO（snake_case -> camelCase）
 */
function mapToCourseDTO(row: CourseRow): CourseDTO {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    language: row.language,
    level: row.level,
    coverImageUrl: row.cover_image_url,
    sortOrder: row.sort_order,
  };
}

/**
 * 将课时行映射为 LessonDTO（snake_case -> camelCase）
 */
function mapToLessonDTO(row: LessonRow): LessonDTO {
  return {
    id: row.id,
    courseId: row.course_id,
    title: row.title,
    description: row.description,
    sortOrder: row.sort_order,
  };
}

/**
 * 查询课程列表
 * 支持按语言（language）和难度等级（level）筛选，结果按 sort_order 升序排列。
 *
 * @param language 可选语言筛选（如 'en'、'ja'）
 * @param level    可选难度筛选（如 'A1'、'A2'）
 * @returns 课程列表
 */
export async function getCourses(
  language?: string,
  level?: string
): Promise<CourseDTO[]> {
  // 动态拼接 WHERE 条件与参数，避免无效的 AND 1=1 噪音
  const conditions: string[] = [];
  const params: (string | number | boolean | null)[] = [];

  if (language) {
    params.push(language);
    conditions.push(`language = $${params.length}`);
  }
  if (level) {
    params.push(level);
    conditions.push(`level = $${params.length}`);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const rows = await query<CourseRow>(
    `SELECT id, title, description, language, level, cover_image_url, sort_order
     FROM courses
     ${whereClause}
     ORDER BY sort_order ASC`,
    params
  );

  return rows.map(mapToCourseDTO);
}

/**
 * 根据 ID 查询课程详情
 * @param id 课程 ID
 * @returns CourseDTO 或 null（课程不存在）
 */
export async function getCourseById(id: string): Promise<CourseDTO | null> {
  const row = await queryOne<CourseRow>(
    `SELECT id, title, description, language, level, cover_image_url, sort_order
     FROM courses
     WHERE id = $1`,
    [id]
  );
  return row ? mapToCourseDTO(row) : null;
}

/**
 * 查询某课程下的所有课时
 * 结果按 sort_order 升序排列，供前端按学习顺序展示。
 *
 * @param courseId 课程 ID
 * @returns 课时列表（按顺序）
 */
export async function getLessonsByCourseId(
  courseId: string
): Promise<LessonDTO[]> {
  const rows = await query<LessonRow>(
    `SELECT id, course_id, title, description, sort_order
     FROM lessons
     WHERE course_id = $1
     ORDER BY sort_order ASC`,
    [courseId]
  );

  return rows.map(mapToLessonDTO);
}
