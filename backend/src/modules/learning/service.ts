/**
 * Learning Service（v2 适配前端落地 DTO）：
 *  - VocabularyDTO: translation
 *  - ListeningMaterialDTO: translation / description
 *  - ExerciseDTO: prompt / options / instructions / audioUrl（兼容原 question）
 *  - ExerciseResultDTO: correct / correctAnswer / score / xpEarned / masteryDelta
 *  - 提交后：写入 attempt + 发布事件 + 同步 mastery + 返回新字段
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

interface VocabularyRow {
  id: string;
  word: string;
  phonetic: string | null;
  part_of_speech: string | null;
  definition: string;
  translation: string | null;
  example_sentence: string | null;
  example_translation: string | null;
  level: string;
}

interface ListeningRow {
  id: string;
  title: string;
  audio_url: string;
  duration_seconds: number;
  transcript: string | null;
  translation: string | null;
  level: string;
}

interface ExerciseRow {
  id: string;
  lesson_id: string;
  course_id: string;
  type: string;
  question: string;
  instructions: string | null;
  audio_url: string | null;
  options: string[];
  correct_answer: string;
  metadata: Record<string, unknown>;
  sort_order: number;
}

export interface ExerciseWithMeta {
  id: string;
  lessonId: string;
  courseId: string;
  type: string;
  prompt: string;
  instructions?: string;
  audioUrl?: string;
  options: string[];
  correctAnswer: string;
  metadata: Record<string, unknown>;
  sortOrder: number;
}

function mapVocab(r: VocabularyRow): VocabularyDTO {
  return {
    id: r.id,
    word: r.word,
    phonetic: r.phonetic ?? undefined,
    partOfSpeech: r.part_of_speech ?? undefined,
    definition: r.definition,
    translation: r.translation ?? r.example_translation ?? '',
    exampleSentence: r.example_sentence ?? undefined,
    exampleTranslation: r.example_translation ?? undefined,
    level: r.level,
  };
}

function mapListening(r: ListeningRow): ListeningMaterialDTO {
  return {
    id: r.id,
    title: r.title,
    description: r.translation ?? undefined,
    audioUrl: r.audio_url,
    durationSeconds: r.duration_seconds,
    transcript: r.transcript ?? undefined,
    translation: r.translation ?? undefined,
    level: r.level,
  };
}

function mapToInternal(row: ExerciseRow): ExerciseWithMeta {
  return {
    id: row.id,
    lessonId: row.lesson_id,
    courseId: row.course_id,
    type: row.type,
    // prompt 兼容原 question
    prompt: row.question,
    instructions: row.instructions ?? undefined,
    audioUrl: row.audio_url ?? undefined,
    options: row.options ?? [],
    correctAnswer: row.correct_answer,
    metadata: row.metadata ?? {},
    sortOrder: row.sort_order,
  };
}

export function toExerciseDTO(ex: ExerciseWithMeta): ExerciseDTO {
  return {
    id: ex.id,
    lessonId: ex.lessonId,
    type: ex.type,
    prompt: ex.prompt,
    instructions: ex.instructions,
    audioUrl: ex.audioUrl,
    options: ex.options,
    metadata: ex.metadata,
    sortOrder: ex.sortOrder,
  };
}

export async function getVocabularyList(
  level?: string,
  limit = 20,
  offset = 0,
): Promise<VocabularyDTO[]> {
  const sqlBase = `SELECT id, word, phonetic, part_of_speech, definition, translation,
                          example_sentence, example_translation, level
                   FROM vocabulary`;
  const rows = level
    ? await query<VocabularyRow>(
        `${sqlBase} WHERE level = $1 ORDER BY id ASC LIMIT $2 OFFSET $3`,
        [level, limit, offset],
      )
    : await query<VocabularyRow>(
        `${sqlBase} ORDER BY id ASC LIMIT $1 OFFSET $2`,
        [limit, offset],
      );
  return rows.map(mapVocab);
}

export async function getListeningList(
  level?: string,
  limit = 20,
  offset = 0,
): Promise<ListeningMaterialDTO[]> {
  const sqlBase = `SELECT id, title, audio_url, duration_seconds, transcript, translation, level
                   FROM listening_materials`;
  const rows = level
    ? await query<ListeningRow>(
        `${sqlBase} WHERE level = $1 ORDER BY id ASC LIMIT $2 OFFSET $3`,
        [level, limit, offset],
      )
    : await query<ListeningRow>(
        `${sqlBase} ORDER BY id ASC LIMIT $1 OFFSET $2`,
        [limit, offset],
      );
  return rows.map(mapListening);
}

export async function getExerciseById(
  exerciseId: string,
): Promise<ExerciseWithMeta | null> {
  const row = await queryOne<ExerciseRow>(
    `SELECT e.id, e.lesson_id, l.course_id, e.type, e.question, e.instructions,
            e.audio_url, e.options, e.correct_answer, e.metadata, e.sort_order
     FROM exercises e
     JOIN lessons l ON e.lesson_id = l.id
     WHERE e.id = $1`,
    [exerciseId],
  );
  return row ? mapToInternal(row) : null;
}

/** 根据单词/练习内容获取稳定的 XP 奖励 */
function computeXp(isCorrect: boolean, kind: 'exercise'): number {
  if (!isCorrect) return 0;
  if (kind === 'exercise') return 10;
  return 0;
}

/** 掌握度变化范围 [-5, +10]，答对按正确率给予增长，答错少量下降 */
function computeMasteryDelta(isCorrect: boolean): number {
  if (isCorrect) return 10;
  return -3;
}

export async function submitExercise(
  userId: string,
  exerciseId: string,
  userAnswer: string,
): Promise<ExerciseResultDTO> {
  const exercise = await getExerciseById(exerciseId);
  if (!exercise) {
    throw Object.assign(new Error('练习不存在'), {
      code: 'EXERCISE_NOT_FOUND',
    });
  }
  const correct = userAnswer === exercise.correctAnswer;
  const totalOptions =
    Array.isArray(exercise.options) && exercise.options.length > 0 ? exercise.options.length : 1;
  // score 0~100
  const score = correct ? 100 : 0;
  const xpEarned = computeXp(correct, 'exercise');
  const masteryDelta = computeMasteryDelta(correct);

  // 写入 attempt（包含新增的 score/xp_earned 等字段）
  await query(
    `INSERT INTO exercise_attempts
       (user_id, exercise_id, user_answer, is_correct, score, xp_earned, total_options)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [userId, exerciseId, userAnswer, correct, score, xpEarned, totalOptions],
  );

  // 同步更新 mastery_records（增量 upsert）
  await query(
    `INSERT INTO mastery_records (user_id, exercise_id, mastery, last_attempt_at)
     VALUES ($1, $2, GREATEST(0, LEAST(100, $3::int)), NOW())
     ON CONFLICT (user_id, exercise_id) DO UPDATE
       SET mastery = GREATEST(0, LEAST(100, mastery_records.mastery + EXCLUDED.mastery)),
           last_attempt_at = NOW()`,
    [userId, exerciseId, masteryDelta],
  );

  // 发布事件（progress 模块消费以聚合总览与课程进度）
  const payload: ExerciseCompletedPayload = {
    userId,
    exerciseId,
    lessonId: exercise.lessonId,
    courseId: exercise.courseId,
    correct,
    score,
    xpEarned,
    masteryDelta,
    totalOptions,
  };
  eventBus.emit(EventType.EXERCISE_COMPLETED, payload);

  return {
    exerciseId,
    correct,
    correctAnswer: exercise.correctAnswer,
    score,
    xpEarned,
    masteryDelta,
    totalOptions,
  };
}
