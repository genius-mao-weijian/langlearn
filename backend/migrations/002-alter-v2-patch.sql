-- ========================================
-- 追加 v2.1 列：补齐 vocabulary.translation、exercises.instructions/audio_url、
-- exercise_attempts.total_options 等 P0 适配字段（幂等）
-- ========================================

ALTER TABLE users ALTER COLUMN nickname DROP NOT NULL;

ALTER TABLE vocabulary
  ADD COLUMN IF NOT EXISTS translation TEXT;
COMMENT ON COLUMN vocabulary.translation IS '单词中文释义（VocabularyDTO.translation）';

ALTER TABLE listening_materials
  ADD COLUMN IF NOT EXISTS translation TEXT;
COMMENT ON COLUMN listening_materials.translation IS '听力文本中文释义 / 简介（ListeningMaterialDTO.translation/description）';

ALTER TABLE exercises
  ADD COLUMN IF NOT EXISTS instructions TEXT;
COMMENT ON COLUMN exercises.instructions IS '题目答题说明（ExerciseDTO.instructions）';

ALTER TABLE exercises
  ADD COLUMN IF NOT EXISTS audio_url VARCHAR(500);
COMMENT ON COLUMN exercises.audio_url IS '题目的音频 URL（ExerciseDTO.audioUrl，听力/口语题用）';

ALTER TABLE exercise_attempts
  ADD COLUMN IF NOT EXISTS total_options INT NOT NULL DEFAULT 0;
COMMENT ON COLUMN exercise_attempts.total_options IS '提交时题目选项总数（用于前端计算结果）';

ALTER TABLE mastery_records
  ADD COLUMN IF NOT EXISTS last_attempt_at TIMESTAMPTZ;
COMMENT ON COLUMN mastery_records.last_attempt_at IS '最近一次答题时间（service upsert 写入）';
