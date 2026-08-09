/**
 * Course Service（v2 适配前端落地 DTO）：
 *  - CourseDTO: totalLessons / estimatedHours（从数据库聚合）
 *  - LessonDTO: exerciseIds（聚合 exercises）
 */
import { query, queryOne } from '../shared/db.js';
import type { CourseDTO, LessonDTO } from '../shared/types.js';

interface CourseRow {
  id: string;
  title: string;
  description: string | null;
  language: string;
  level: string;
  cover_image_url: string | null;
  total_lessons: number;
  total_exercises: number;
}

interface LessonRow {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  sort_order: number;
}
interface LessonExercisesRow {
  lesson_id: string;
  exercise_ids: string[];
}

function toCourseDTO(r: CourseRow): CourseDTO {
  // 估算：每练习平均 3 分钟（P0 简化）
  const estimatedHours =
    r.total_exercises > 0 ? Math.max(1, Math.round((r.total_exercises * 3) / 60)) : 1;
  return {
    id: r.id,
    title: r.title,
    description: r.description ?? '',
    language: r.language,
    level: r.level,
    totalLessons: r.total_lessons,
    estimatedHours,
    icon: r.cover_image_url ?? undefined,
  };
}

export async function getCourses(
  language?: string,
  level?: string,
): Promise<CourseDTO[]> {
  const conditions: string[] = [];
  const params: (string | number | boolean | null)[] = [];
  if (language) {
    params.push(language);
    conditions.push(`c.language = $${params.length}`);
  }
  if (level) {
    params.push(level);
    conditions.push(`c.level = $${params.length}`);
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const sql = `
    SELECT c.id, c.title, c.description, c.language, c.level, c.cover_image_url,
           COUNT(DISTINCT l.id)::int AS total_lessons,
           COUNT(DISTINCT e.id)::int AS total_exercises
    FROM courses c
    LEFT JOIN lessons l ON l.course_id = c.id
    LEFT JOIN exercises e ON e.lesson_id = l.id
    ${where}
    GROUP BY c.id
    ORDER BY c.level, c.id ASC
  `;
  const rows = await query<CourseRow>(sql, params);
  return rows.map(toCourseDTO);
}

export async function getCourseById(id: string): Promise<CourseDTO | null> {
  const row = await queryOne<CourseRow>(
    `SELECT c.id, c.title, c.description, c.language, c.level, c.cover_image_url,
            COUNT(DISTINCT l.id)::int AS total_lessons,
            COUNT(DISTINCT e.id)::int AS total_exercises
     FROM courses c
     LEFT JOIN lessons l ON l.course_id = c.id
     LEFT JOIN exercises e ON e.lesson_id = l.id
     WHERE c.id = $1
     GROUP BY c.id`,
    [id],
  );
  return row ? toCourseDTO(row) : null;
}

export async function getLessonsByCourseId(courseId: string): Promise<LessonDTO[]> {
  const lessons = await query<LessonRow>(
    `SELECT id, course_id, title, description, sort_order
     FROM lessons
     WHERE course_id = $1
     ORDER BY sort_order ASC, id ASC`,
    [courseId],
  );
  if (lessons.length === 0) return [];
  const lessonIds = lessons.map((l) => l.id);
  // 按位置参数展开
  const placeholders = lessonIds.map((_, i) => `$${i + 1}`).join(',');
  const exercises = await query<LessonExercisesRow>(
    `SELECT lesson_id, ARRAY_AGG(id ORDER BY sort_order ASC, id ASC)::text[] AS exercise_ids
     FROM exercises
     WHERE lesson_id IN (${placeholders})
     GROUP BY lesson_id`,
    lessonIds,
  );
  const exMap = new Map<string, string[]>();
  for (const r of exercises) exMap.set(r.lesson_id, r.exercise_ids ?? []);
  return lessons.map(
    (l) =>
      ({
        id: l.id,
        courseId: l.course_id,
        title: l.title,
        sequence: l.sort_order,
        description: l.description ?? '',
        exerciseIds: exMap.get(l.id) ?? [],
      } satisfies LessonDTO),
  );
}
