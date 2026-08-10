-- ========================================
-- 003: 成就激励系统（勋章）
-- 表结构：
--   achievement_definitions  勋章定义（code 唯一，由 seed 写入）
--   user_achievements        用户已解锁勋章（user_id + achievement_code 唯一）
-- ========================================

CREATE TABLE IF NOT EXISTS achievement_definitions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          VARCHAR(64) NOT NULL UNIQUE,        -- 例 first_login / streak_7 / exercises_100 / perfect_streak_10 / xp_500
  name          VARCHAR(128) NOT NULL,              -- 展示名称
  description   TEXT NOT NULL,                       -- 描述
  icon          VARCHAR(32) NOT NULL DEFAULT '🏅',  -- emoji 图标
  category      VARCHAR(32) NOT NULL DEFAULT 'general', -- 分类：general / streak / exercise / xp
  sort_order    INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE achievement_definitions IS '勋章定义表（由 seed 写入 5 条 P1 勋章）';

CREATE TABLE IF NOT EXISTS user_achievements (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_code  VARCHAR(64) NOT NULL,
  unlocked_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, achievement_code)
);
COMMENT ON TABLE user_achievements IS '用户已解锁勋章记录';

CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements (user_id);
