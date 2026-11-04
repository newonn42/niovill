-- 휴대폰 웹 알림을 받을 기기
CREATE TABLE IF NOT EXISTS push_subs (
  endpoint TEXT PRIMARY KEY,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  admin_id INTEGER NOT NULL,
  device TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_ok TEXT
);
