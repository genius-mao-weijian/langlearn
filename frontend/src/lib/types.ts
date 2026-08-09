// ========== 共享类型定义（与后端 DTO 对齐） ==========

export type Language = 'en' | 'ja' | 'ko' | 'zh';
export type ProficiencyLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export type ExerciseType = 'vocabulary' | 'grammar' | 'listening' | 'speaking';

export interface User {
  id: string;
  email: string;
  nickname: string;
  nativeLanguage: Language | null;
  targetLanguage: Language | null;
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

export interface Course {
  id: string;
  title: string;
  description: string;
  language: Language;
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

export interface VocabularyItem {
  id: string;
  word: string;
  translation: string;
  phonetic?: string;
  example?: string;
  level: ProficiencyLevel;
}

export interface ListeningMaterial {
  id: string;
  title: string;
  transcript: string;
  audioUrl?: string; // P0 暂未提供音频文件
  level: ProficiencyLevel;
}

export interface Exercise {
  id: string;
  type: ExerciseType;
  level: ProficiencyLevel;
  language: Language;
  prompt: string;
  options?: string[]; // 选择题时存在
  instructions?: string;
  // 注：correctAnswer 在 GET /learning/:id 中故意不返回（防作弊），
  // 仅在 submit 后通过 submission.correctAnswer 返回
}

export interface SubmitResult {
  submissionId: string;
  correct: boolean;
  score: number; // 0-100
  correctAnswer?: string;
  explanation?: string;
  masteryDelta: number; // -10 ~ +20
  updatedMastery: number; // 0-100
  xpEarned: number;
}

export interface ProgressOverview {
  userId: string;
  totalExercises: number;
  completedExercises: number;
  completionRate: number; // 0-100
  totalXp: number;
  totalMinutes: number;
  streakDays: number;
  lastActiveAt: string | null;
  byLevel: Array<{
    level: ProficiencyLevel;
    completed: number;
    total: number;
    rate: number;
  }>;
  courses: Array<{
    courseId: string;
    courseTitle: string;
    progress: number; // 0-100
  }>;
}
