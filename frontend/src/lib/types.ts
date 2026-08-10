// ========== 共享类型定义（与 backend shared/types.ts v2 DTO 对齐） ==========

export type ProficiencyLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export type ExerciseType = 'vocabulary' | 'grammar' | 'listening' | 'speaking';

// ===== Identity =====
export interface User {
  id: string;
  email: string;
  nickname: string;
  nativeLanguage: string | null;
  targetLanguage: string | null;
  level: ProficiencyLevel | null;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number; // access token 剩余秒数
  user: User;
}

// ===== Course =====
export interface Course {
  id: string;
  title: string;
  description: string;
  language: string; // 如 'en' 'ja' 'ko'
  level: ProficiencyLevel;
  totalLessons: number;
  estimatedHours: number;
  icon?: string;
}

export interface Lesson {
  id: string;
  courseId: string;
  title: string;
  sequence: number;
  description: string;
  exerciseIds: string[];
}

// ===== Learning =====
export interface VocabularyItem {
  id: string;
  word: string;
  definition: string;
  translation: string;
  phonetic?: string;
  partOfSpeech?: string;
  exampleSentence?: string;
  exampleTranslation?: string;
  level: ProficiencyLevel;
}

export interface ListeningMaterial {
  id: string;
  title: string;
  description?: string;
  audioUrl: string;
  durationSeconds: number;
  transcript?: string;
  translation?: string;
  level: ProficiencyLevel;
}

export interface Exercise {
  id: string;
  lessonId: string;
  type: ExerciseType;
  prompt: string;
  instructions?: string;
  audioUrl?: string;
  options: string[];
  metadata: Record<string, unknown>;
  sortOrder: number;
  // 注：correctAnswer 在 GET /learning/:id 中故意不返回（防作弊），
  // 仅在 submit 后通过 result.correctAnswer 返回
}

// 对应后端 ExerciseResultDTO
export interface SubmitResult {
  exerciseId: string;
  correct: boolean;
  correctAnswer: string;
  score: number; // 0-100
  xpEarned: number;
  masteryDelta: number; // -5 ~ +10
  totalOptions?: number;
}

// ===== Progress =====
export interface UserStats {
  totalExercises: number;
  totalXp: number;
  streakDays: number;
  studyMinutes: number;
}

export interface ProgressByLevelRow {
  level: ProficiencyLevel;
  totalExercises: number;
  completedExercises: number;
  completionRate: number; // 0-100
}

export interface CoursesProgressRow {
  courseId: string;
  courseTitle: string;
  totalExercises: number;
  completedExercises: number;
  correctExercises: number;
  completionRate: number; // 0-100
  lastStudiedAt: string | null;
}

export interface AttemptRow {
  id: string;
  userId: string;
  exerciseId: string;
  correct: boolean;
  score: number;
  xpEarned: number;
  attemptedAt: string;
}

export interface DashboardDTO {
  user: User;
  stats: UserStats;
  byLevel: ProgressByLevelRow[];
  recentExercises: string[];
  recentAttempts: AttemptRow[];
  coursesProgress: CoursesProgressRow[];
}

// ===== Achievement =====
export interface Achievement {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  unlocked: boolean;
  unlockedAt: string | null;
}
