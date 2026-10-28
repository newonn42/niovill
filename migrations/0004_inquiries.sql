-- 상담 · 대기 신청
CREATE TABLE IF NOT EXISTS inquiries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  room_type TEXT,
  move_date TEXT,
  period TEXT,
  message TEXT,
  was_full INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'done')),
  memo TEXT,
  updated_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  done_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_inquiries_phone ON inquiries (phone, created_at);
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries (status, created_at);
