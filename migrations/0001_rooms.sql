-- 방 목록 (호실 · 타입 · 상태 · 입실 가능일)
CREATE TABLE IF NOT EXISTS rooms (
  no TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'occupied' CHECK (status IN ('occupied', 'empty', 'soon', 'hidden')),
  avail_date TEXT,
  sort INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
