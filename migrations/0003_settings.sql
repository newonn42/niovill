-- 방별 공실 관리 대신 '모집 중 / 만실' 스위치 하나로 단순화
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_by TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
DROP TABLE IF EXISTS room_log;
DROP TABLE IF EXISTS rooms;
