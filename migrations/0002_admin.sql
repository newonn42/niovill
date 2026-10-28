-- 관리자 계정 · 로그인 유지 · 로그인 실패 잠금 · 방 변경 기록
CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  pw_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  admin_id INTEGER NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS login_fails (
  k TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS room_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_no TEXT NOT NULL,
  action TEXT NOT NULL,
  detail TEXT,
  admin_name TEXT NOT NULL,
  at TEXT NOT NULL DEFAULT (datetime('now'))
);
