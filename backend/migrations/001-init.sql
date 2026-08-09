-- ========================================
-- 多语种学习平台 P0 建表脚本
-- ========================================

-- 用户表（Identity 模块）
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  nickname VARCHAR(100) NOT NULL,
  avatar_url VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 课程表（Course 模块）
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  language VARCHAR(10) NOT NULL,  -- en, ja, ko
  level VARCHAR(10) NOT NULL,     -- A1, A2, B1, B2, C1, C2
  cover_image_url VARCHAR(500),
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 课时表（Course 模块）
CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 练习表（Learning 模块）
CREATE TABLE IF NOT EXISTS exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL,  -- vocabulary, listening
  question TEXT NOT NULL,
  -- 选项用 JSONB 存储，格式: ["选项A", "选项B", "选项C", "选项D"]
  options JSONB NOT NULL,
  correct_answer VARCHAR(500) NOT NULL,
  -- 附加数据用 JSONB 存储（如音频 URL、音标等）
  metadata JSONB DEFAULT '{}'::jsonb,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 单词库（Learning 模块 - 单词专项）
CREATE TABLE IF NOT EXISTS vocabulary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word VARCHAR(200) NOT NULL,
  phonetic VARCHAR(200),
  part_of_speech VARCHAR(50),
  definition TEXT NOT NULL,
  example_sentence TEXT,
  example_translation TEXT,
  level VARCHAR(10) NOT NULL,  -- A1, A2, B1...
  language VARCHAR(10) NOT NULL DEFAULT 'en',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 听力素材库（Learning 模块 - 听力专项）
CREATE TABLE IF NOT EXISTS listening_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  audio_url VARCHAR(500) NOT NULL,
  duration_seconds INT NOT NULL,
  transcript TEXT,
  level VARCHAR(10) NOT NULL,
  language VARCHAR(10) NOT NULL DEFAULT 'en',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 练习记录表（Learning 模块 - 答题记录）
CREATE TABLE IF NOT EXISTS exercise_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  user_answer VARCHAR(500) NOT NULL,
  is_correct BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 学习进度表（Progress 模块）
CREATE TABLE IF NOT EXISTS progress_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
  total_exercises INT DEFAULT 0,
  completed_exercises INT DEFAULT 0,
  correct_exercises INT DEFAULT 0,
  last_studied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, course_id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_lessons_course_id ON lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_exercises_lesson_id ON exercises(lesson_id);
CREATE INDEX IF NOT EXISTS idx_vocabulary_level ON vocabulary(level);
CREATE INDEX IF NOT EXISTS idx_listening_level ON listening_materials(level);
CREATE INDEX IF NOT EXISTS idx_attempts_user_id ON exercise_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_attempts_exercise_id ON exercise_attempts(exercise_id);
CREATE INDEX IF NOT EXISTS idx_progress_user_id ON progress_records(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_course_id ON progress_records(course_id);
