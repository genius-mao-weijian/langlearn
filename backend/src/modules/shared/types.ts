/**
 * 跨模块共享的类型定义（v2 与前端落地 DTO 对齐）
 * 注意：前后端均以此为准，字段命名以 camelCase 为主，DB 层使用 snake_case。
 */
import type { Request } from 'express';

export type UserId = string & { readonly __brand: 'UserId' };

export interface BaseEvent<T = unknown> {
  readonly name: string;
  readonly timestamp: string;
  readonly payload: T;
}

export interface AuthenticatedRequest extends Request {
  userId?: UserId;
}

// ===== 统一响应 =====
export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}

// ===== 模块间 DTO：Identity =====
export interface UserDTO {
  id: string;
  email: string;
  nickname: string;
  nativeLanguage: string | null;
  targetLanguage: string | null;
  level: string | null;
  createdAt: string;
}

export interface AuthResponseDTO {
  user: UserDTO;
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number; // 秒
}

// ===== 模块间 DTO：Course =====
export interface CourseDTO {
  id: string;
  title: string;
  description: string;
  language: string;
  level: string;
  totalLessons: number;
  estimatedHours: number;
  icon?: string;
}

export interface LessonDTO {
  id: string;
  courseId: string;
  title: string;
  sequence: number;
  description: string;
  exerciseIds: string[];
}

// ===== 模块间 DTO：Learning =====
export interface VocabularyDTO {
  id: string;
  word: string;
  definition: string;
  translation: string;
  phonetic?: string;
  partOfSpeech?: string;
  exampleSentence?: string;
  exampleTranslation?: string;
  level: string;
}

export interface ListeningMaterialDTO {
  id: string;
  title: string;
  description?: string;
  audioUrl: string;
  durationSeconds: number;
  transcript?: string;
  translation?: string;
  level: string;
}

export interface ExerciseDTO {
  id: string;
  lessonId: string;
  type: string;
  prompt: string;
  instructions?: string;
  audioUrl?: string;
  options: string[];
  metadata: Record<string, unknown>;
  sortOrder: number;
}

export interface ExerciseResultDTO {
  exerciseId: string;
  correct: boolean;
  correctAnswer: string;
  score: number; // 0-100
  xpEarned: number;
  masteryDelta: number;
  totalOptions?: number;
}

// ===== 模块间 DTO：Progress =====
export interface UserStatsDTO {
  totalExercises: number; // 去重做过的题目数
  totalXp: number;
  streakDays: number; // 连续学习天数
  studyMinutes: number; // 估算学习时长（分钟）
}

export interface ProgressOverviewDTO {
  courseId: string;
  courseTitle: string;
  totalExercises: number;
  completedExercises: number;
  correctExercises: number;
  completionRate: number; // 0-100
  lastStudiedAt: string | null;
}

export interface ProgressByLevelDTO {
  level: string;
  totalExercises: number;
  completedExercises: number;
  completionRate: number; // 0-100
}

export interface ExerciseAttemptDTO {
  id: string;
  userId: string;
  exerciseId: string;
  correct: boolean;
  score: number;
  xpEarned: number;
  attemptedAt: string;
}

export interface DashboardDTO {
  user: UserDTO;
  stats: UserStatsDTO;
  byLevel: ProgressByLevelDTO[];
  recentExercises: string[]; // 最近做过的去重练习 id
  recentAttempts: ExerciseAttemptDTO[];
  coursesProgress: ProgressOverviewDTO[];
}

// ===== 事件载荷 =====
export interface ExerciseCompletedPayload {
  userId: string;
  exerciseId: string;
  lessonId: string;
  courseId: string;
  // P0 兼容旧字段名（progress 处理器仍可消费）
  correct: boolean;
  /** @deprecated 使用 correct */
  isCorrect?: boolean;
  score?: number;
  xpEarned?: number;
  masteryDelta?: number;
  totalOptions?: number;
}
