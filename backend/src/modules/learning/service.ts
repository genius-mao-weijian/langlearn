/**
 * 互动学习模块业务逻辑（learning service）
 *
 * 职责：单词列表查询、听力素材查询、练习详情获取、练习答案提交与判分。
 *
 * 【关键设计】
 * - getExerciseById 查询时 JOIN lessons/courses 获取 lessonId、courseId，
 *   供 submitExercise 发布 EXERCISE_COMPLETED 事件使用；
 *   但对前端返回的 ExerciseDTO 不包含 correctAnswer 与 courseId（防作弊 + 最小暴露）。
 * - submitExercise 在写入 attempt 后发布事件，由 progress 模块订阅以异步更新进度。
 */
import { query, queryOne } from '../shared/db.js';
import { eventBus, EventType } from '../shared/eventBus.js';
import type {
  VocabularyDTO,
  ListeningMaterialDTO,
  ExerciseDTO,
  ExerciseResultDTO,
  ExerciseCompletedPayload,
} from '../shared/types.js';

/**
 * vocabulary 表的数据库行类型（snake_case 列名）
 */
interface VocabularyRow {
  id: string;
  word: string;
  phonetic: string | null;
  part_of_speech: string | null;
  definition: string;
  example_sentence: string | null;
  example_translation: string | null;
  level: string;
}

/**
 * listening_materials 表的数据库行类型（snake_case 列名）
 */
interface ListeningRow {
  id: string;
  title: string;
  audio_url: string;
  duration_seconds: number;
  transcript: string | null;
  level: string;
}

/**
 * 练习详情数据库行类型（含 JOIN 出来的 course_id 与正确答案）
 * - options 是 JSONB 数组，pg 驱动会自动解析为 JS 数组
 * - correct_answer 仅在 service 内部使用，不暴露给前端
 */
interface ExerciseRow {
  id: string;
  lesson_id: string;
  course_id: string;
  type: string;
  question: string;
  options: string[];
  correct_answer: string;
  metadata: Record<string, unknown>;
  sort_order: number;
}

/**
 * 练习详情内部类型（含 lessonId、courseId、correctAnswer）
 * 供 submitExercise 发布事件使用，不直接对前端暴露。
 */
export interface ExerciseWithMeta {
  id: string;
  lessonId: string;
  courseId: string;
  type: string;
  question: string;
  options: string[];
  correctAnswer: string;
  metadata: Record<string, unknown>;
  sortOrder: number;
}

/**
 * 将练习行映射为内部类型 ExerciseWithMeta（snake_case -> camelCase）
 */
function mapToExerciseWithMeta(row: ExerciseRow): ExerciseWithMeta {
  return {
    id: row.id,
    lessonId: row.lesson_id,
    courseId: row.course_id,
    type: row.type,
    question: row.question,
    options: row.options,
    correctAnswer: row.correct_answer,
    metadata: row.metadata,
    sortOrder: row.sort_order,
  };
}

/**
 * 将内部类型转换为对外 ExerciseDTO（剔除 correctAnswer 与 courseId，防止作弊）
 */
function toExerciseDTO(ex: ExerciseWithMeta): ExerciseDTO {
  return {
    id: ex.id,
    lessonId: ex.lessonId,
    type: ex.type,
    question: ex.question,
    options: ex.options,
    metadata: ex.metadata,
    sortOrder: ex.sortOrder,
  };
}

/**
 * 查询单词列表
 * 支持按 level 筛选与分页（limit / offset），默认每页 20 条。
 *
 * @param level  可选难度等级
 * @param limit  每页条数，默认 20
 * @param offset 偏移量，默认 0
 * @returns 单词列表
 */
export async function getVocabularyList(
  level?: string,
  limit = 20,
  offset = 0
): Promise<VocabularyDTO[]> {
  // 有 level 时附加 WHERE 条件
  if (level) {
    const rows = await query<VocabularyRow>(
      `SELECT id, word, phonetic, part_of_speech, definition, example_sentence, example_translation, level
       FROM vocabulary
       WHERE level = $1
       ORDER BY id ASC
       LIMIT $2 OFFSET $3`,
      [level, limit, offset]
    );
    return rows.map((r) => ({
      id: r.id,
      word: r.word,
      phonetic: r.phonetic,
      partOfSpeech: r.part_of_speech,
      definition: r.definition,
      exampleSentence: r.example_sentence,
      exampleTranslation: r.example_translation,
      level: r.level,
    }));
  }

  // 无 level 筛选时直接分页查询
  const rows = await query<VocabularyRow>(
    `SELECT id, word, phonetic, part_of_speech, definition, example_sentence, example_translation, level
     FROM vocabulary
     ORDER BY id ASC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return rows.map((r) => ({
    id: r.id,
    word: r.word,
    phonetic: r.phonetic,
    partOfSpeech: r.part_of_speech,
    definition: r.definition,
    exampleSentence: r.example_sentence,
    exampleTranslation: r.example_translation,
    level: r.level,
  }));
}

/**
 * 查询听力素材列表
 * 支持按 level 筛选与分页（limit / offset），默认每页 20 条。
 *
 * @param level  可选难度等级
 * @param limit  每页条数，默认 20
 * @param offset 偏移量，默认 0
 * @returns 听力素材列表
 */
export async function getListeningList(
  level?: string,
  limit = 20,
  offset = 0
): Promise<ListeningMaterialDTO[]> {
  if (level) {
    const rows = await query<ListeningRow>(
      `SELECT id, title, audio_url, duration_seconds, transcript, level
       FROM listening_materials
       WHERE level = $1
       ORDER BY id ASC
       LIMIT $2 OFFSET $3`,
      [level, limit, offset]
    );
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      audioUrl: r.audio_url,
      durationSeconds: r.duration_seconds,
      transcript: r.transcript,
      level: r.level,
    }));
  }

  const rows = await query<ListeningRow>(
    `SELECT id, title, audio_url, duration_seconds, transcript, level
     FROM listening_materials
     ORDER BY id ASC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    audioUrl: r.audio_url,
    durationSeconds: r.duration_seconds,
    transcript: r.transcript,
    level: r.level,
  }));
}

/**
 * 根据 ID 查询练习详情（内部使用，含 correctAnswer / courseId）
 * 通过 JOIN lessons、courses 获取 lessonId 与 courseId，
 * 供 submitExercise 发布事件使用。
 *
 * 注意：返回类型为 ExerciseWithMeta（内部类型），
 * 路由层需调用 toExerciseDTO 剔除 correctAnswer / courseId 后再返回前端。
 *
 * @param exerciseId 练习 ID
 * @returns 练习详情（内部类型）或 null
 */
export async function getExerciseById(
  exerciseId: string
): Promise<ExerciseWithMeta | null> {
  const row = await queryOne<ExerciseRow>(
    `SELECT e.id, e.lesson_id, l.course_id, e.type, e.question, e.options,
            e.correct_answer, e.metadata, e.sort_order
     FROM exercises e
     JOIN lessons l ON e.lesson_id = l.id
     WHERE e.id = $1`,
    [exerciseId]
  );
  return row ? mapToExerciseWithMeta(row) : null;
}

/**
 * 提交练习答案并判分
 * 流程：
 *   1. 查询练习的正确答案（复用 getExerciseById，同时拿到 lessonId / courseId）
 *   2. 比对用户答案是否正确
 *   3. 写入 exercise_attempts 记录
 *   4. 发布 EXERCISE_COMPLETED 事件（progress 模块订阅后异步更新进度）
 *   5. 返回判分结果（提交后可展示正确答案，故返回 correctAnswer）
 *
 * @param userId      当前用户 ID
 * @param exerciseId  练习 ID
 * @param userAnswer  用户提交的答案
 * @returns 判分结果（含正确答案）
 * @throws {Error} code='EXERCISE_NOT_FOUND' 练习不存在
 */
export async function submitExercise(
  userId: string,
  exerciseId: string,
  userAnswer: string
): Promise<ExerciseResultDTO> {
  // 1. 查询练习详情（含正确答案与所属 lesson/course）
  const exercise = await getExerciseById(exerciseId);
  if (!exercise) {
    throw Object.assign(new Error('练习不存在'), {
      code: 'EXERCISE_NOT_FOUND',
    });
  }

  // 2. 比对答案（简单字符串相等比较；后续可按练习类型扩展比对逻辑）
  const isCorrect = userAnswer === exercise.correctAnswer;

  // 3. 写入答题记录，便于后续统计分析与进度统计
  await query(
    `INSERT INTO exercise_attempts (user_id, exercise_id, user_answer, is_correct)
     VALUES ($1, $2, $3, $4)`,
    [userId, exerciseId, userAnswer, isCorrect]
  );

  // 4. 发布练习完成事件，触发 progress 模块异步更新进度
  const payload: ExerciseCompletedPayload = {
    userId,
    exerciseId,
    lessonId: exercise.lessonId,
    courseId: exercise.courseId,
    isCorrect,
  };
  eventBus.emit(EventType.EXERCISE_COMPLETED, payload);

  // 5. 返回判分结果（提交后展示正确答案，便于用户即时学习）
  return {
    exerciseId,
    isCorrect,
    correctAnswer: exercise.correctAnswer,
  };
}
