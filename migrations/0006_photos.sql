-- 홈페이지 사진 (관리자 '내용' 탭에서 올림, 휴대폰에서 줄여서 저장)
CREATE TABLE IF NOT EXISTS photos (
  key TEXT PRIMARY KEY,
  mime TEXT NOT NULL,
  data TEXT NOT NULL,
  updated_by TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
