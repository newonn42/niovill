/* 데이터베이스 표 자동 준비
   - 배포 방식과 상관없이, 사이트가 처음 열릴 때 필요한 표를 스스로 만듭니다 (이미 있으면 그대로 둠).
   - migrations/ 폴더와 같은 내용입니다. 표를 추가할 때는 두 곳 모두 고칩니다. */
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    pw_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    admin_id INTEGER NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS login_fails (
    k TEXT PRIMARY KEY,
    count INTEGER NOT NULL DEFAULT 0,
    locked_until TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_by TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS inquiries (
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
  )`,
  'CREATE INDEX IF NOT EXISTS idx_inquiries_phone ON inquiries (phone, created_at)',
  'CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries (status, created_at)',
  `CREATE TABLE IF NOT EXISTS push_subs (
    endpoint TEXT PRIMARY KEY,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    admin_id INTEGER NOT NULL,
    device TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_ok TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS photos (
    key TEXT PRIMARY KEY,
    mime TEXT NOT NULL,
    data TEXT NOT NULL,
    updated_by TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`
];

let ready = null;

export function ensureSchema(db) {
  if (!db) return Promise.resolve(false);
  if (!ready) {
    ready = db
      .batch(SCHEMA.map((sql) => db.prepare(sql)))
      .then(() => true)
      .catch((e) => {
        console.log('schema setup failed:', e && e.message);
        ready = null; // 다음 요청에서 다시 시도
        return false;
      });
  }
  return ready;
}
