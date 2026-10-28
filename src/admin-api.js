/* 관리자 API (/api/admin/...) – 모두 JSON으로 주고받습니다 */
import {
  hashPassword, verifyPassword, createSession, currentAdmin, deleteSession,
  sessionCookie, clearCookie, lockKey, lockedMinutes, recordFail, clearFails
} from './auth.js';
import { TYPES, LABEL, loadView } from './home.js';

const STATUS_LABEL = { occupied: '입실중', empty: '공실', soon: '입실예정', hidden: '숨김' };
const MAX_ADD = 100;

function json(body, status = 200, extraHeaders) {
  const h = new Headers({
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Robots-Tag': 'noindex, nofollow'
  });
  if (extraHeaders) for (const [k, v] of Object.entries(extraHeaders)) h.append(k, v);
  return new Response(JSON.stringify(body), { status, headers: h });
}
const fail = (msg, status = 400) => json({ ok: false, error: msg }, status);

async function readBody(request) {
  const type = request.headers.get('Content-Type') || '';
  // JSON 요청만 받습니다 (다른 사이트에서 몰래 보내는 요청 차단)
  if (!type.includes('application/json')) throw new Error('bad type');
  const text = await request.text();
  if (text.length > 20000) throw new Error('too big');
  const body = JSON.parse(text || '{}');
  if (!body || typeof body !== 'object') throw new Error('bad body');
  return body;
}

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

function checkUsername(u) {
  u = str(u, 40).toLowerCase();
  return /^[a-z0-9_]{3,20}$/.test(u) ? u : '';
}
function checkPassword(p) {
  return typeof p === 'string' && p.length >= 8 && p.length <= 72 ? p : '';
}
function checkName(n) {
  n = str(n, 40);
  return n.length >= 1 && n.length <= 20 ? n : '';
}
function checkDate(d) {
  if (!d) return '';
  if (typeof d !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  const t = new Date(d + 'T00:00:00Z');
  return !isNaN(t) && t.toISOString().slice(0, 10) === d ? d : null;
}
function checkRoomNo(n) {
  n = str(n, 20);
  return n.length >= 1 && n.length <= 10 && !/[,<>"'`]/.test(n) ? n : '';
}
function shortDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  return m ? Number(m[2]) + '/' + Number(m[3]) : '';
}

// "601-618, 사무실, 701" → ['601', ..., '618', '사무실', '701']
export function parseRoomList(text) {
  const out = [];
  for (const raw of String(text || '').split(/[,\n]+/)) {
    const part = raw.trim();
    if (!part) continue;
    const m = /^(\d{1,6})\s*[-~]\s*(\d{1,6})$/.exec(part);
    if (m) {
      const a = Number(m[1]);
      const b = Number(m[2]);
      if (b < a) return { error: '범위가 거꾸로입니다: ' + part };
      if (b - a + 1 > MAX_ADD) return { error: '한 번에 ' + MAX_ADD + '개까지 추가할 수 있습니다' };
      for (let i = a; i <= b; i++) out.push(String(i));
    } else {
      const no = checkRoomNo(part);
      if (!no) return { error: '호실 이름을 확인해 주세요: ' + part };
      out.push(no);
    }
    if (out.length > MAX_ADD) return { error: '한 번에 ' + MAX_ADD + '개까지 추가할 수 있습니다' };
  }
  if (out.length === 0) return { error: '추가할 호실을 입력해 주세요' };
  return { rooms: [...new Set(out)] };
}

async function log(db, admin, roomNo, action, detail) {
  await db
    .prepare('INSERT INTO room_log (room_no, action, detail, admin_name) VALUES (?, ?, ?, ?)')
    .bind(roomNo, action, detail || '', admin.name)
    .run();
}

async function adminCount(db) {
  const r = await db.prepare('SELECT COUNT(*) AS n FROM admins').first();
  return r ? r.n : 0;
}

/* ── 로그인 전 ── */

async function me(env, request) {
  const n = await adminCount(env.DB);
  if (n === 0) return json({ ok: true, needSetup: true, admin: null });
  const admin = await currentAdmin(env.DB, request);
  return json({ ok: true, needSetup: false, admin: admin ? { name: admin.name, username: admin.username } : null });
}

async function setup(env, request, body) {
  const username = checkUsername(body.username);
  const name = checkName(body.name);
  const password = checkPassword(body.password);
  if (!username) return fail('아이디는 영문 소문자·숫자·_ 3~20자로 정해 주세요');
  if (!name) return fail('이름을 입력해 주세요');
  if (!password) return fail('비밀번호는 8자 이상으로 정해 주세요');
  const hash = await hashPassword(password);
  // 관리자가 한 명도 없을 때만 만들어집니다 (동시에 눌러도 한 명만)
  const res = await env.DB
    .prepare('INSERT INTO admins (username, name, pw_hash) SELECT ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM admins)')
    .bind(username, name, hash)
    .run();
  if (!res.meta || res.meta.changes !== 1) return fail('이미 관리자가 만들어져 있습니다. 로그인해 주세요', 409);
  const admin = await env.DB.prepare('SELECT id FROM admins WHERE username = ?').bind(username).first();
  const token = await createSession(env.DB, admin.id);
  return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie(request, token) });
}

async function login(env, request, body) {
  const username = str(body.username, 40).toLowerCase();
  const password = typeof body.password === 'string' ? body.password.slice(0, 100) : '';
  if (!username || !password) return fail('아이디와 비밀번호를 입력해 주세요');
  const key = lockKey(username);
  const mins = await lockedMinutes(env.DB, key);
  if (mins) return fail('비밀번호를 여러 번 틀려 잠겼습니다. ' + mins + '분 뒤에 다시 시도해 주세요', 429);

  const admin = await env.DB.prepare('SELECT id, pw_hash FROM admins WHERE username = ?').bind(username).first();
  const ok = admin ? await verifyPassword(password, admin.pw_hash) : false;
  if (!ok) {
    await recordFail(env.DB, key);
    const after = await lockedMinutes(env.DB, key);
    if (after) return fail('비밀번호를 5번 틀려 10분 동안 잠겼습니다', 429);
    return fail('아이디 또는 비밀번호가 맞지 않습니다', 401);
  }
  await clearFails(env.DB, key);
  const token = await createSession(env.DB, admin.id);
  return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie(request, token) });
}

async function logout(env, request) {
  await deleteSession(env.DB, request);
  return json({ ok: true }, 200, { 'Set-Cookie': clearCookie(request) });
}

/* ── 로그인 후: 방 ── */

async function roomsGet(env) {
  const { results } = await env.DB
    .prepare("SELECT no, type, status, avail_date FROM rooms ORDER BY (no GLOB '[0-9]*') DESC, CAST(no AS INTEGER), no")
    .all();
  let preview = null;
  try {
    const v = await loadView(env.DB);
    preview = {
      full: v.full,
      total: v.total,
      byType: TYPES.map((t) => LABEL[t] + ' ' + v.empty[t]).join(' · '),
      soonText: v.soonText
    };
  } catch (e) {
    preview = null; // 보이는 방이 없음
  }
  const last = await env.DB
    .prepare("SELECT admin_name, strftime('%m/%d %H:%M', at, '+9 hours') AS at FROM room_log ORDER BY id DESC LIMIT 1")
    .first();
  const today = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
  return json({
    ok: true,
    today,
    types: TYPES.map((t) => ({ key: t, label: LABEL[t] })),
    rooms: results || [],
    preview,
    last: last || null
  });
}

async function roomStatus(env, admin, body) {
  const no = checkRoomNo(body.no);
  const status = body.status;
  if (!no) return fail('호실을 확인해 주세요');
  if (!['occupied', 'empty', 'soon'].includes(status)) return fail('상태를 확인해 주세요');
  let date = status === 'soon' ? checkDate(body.avail_date) : '';
  if (date === null) return fail('날짜를 확인해 주세요');
  const res = await env.DB
    .prepare("UPDATE rooms SET status = ?, avail_date = ?, updated_at = datetime('now') WHERE no = ?")
    .bind(status, date || null, no)
    .run();
  if (!res.meta || res.meta.changes !== 1) return fail('없는 호실입니다', 404);
  const detail = STATUS_LABEL[status] + (date ? ' ' + shortDate(date) : '');
  await log(env.DB, admin, no, 'status', detail);
  return json({ ok: true });
}

async function roomsAdd(env, admin, body) {
  const parsed = parseRoomList(body.text);
  if (parsed.error) return fail(parsed.error);
  const type = TYPES.includes(body.type) ? body.type : '';
  if (!type) return fail('방 타입을 골라 주세요');
  const status = body.hidden ? 'hidden' : 'occupied';
  const maxRow = await env.DB.prepare('SELECT COALESCE(MAX(sort), 0) AS m FROM rooms').first();
  let sort = maxRow ? maxRow.m : 0;
  const stmts = parsed.rooms.map((no) => {
    sort += 1;
    return env.DB
      .prepare('INSERT OR IGNORE INTO rooms (no, type, status, sort) VALUES (?, ?, ?, ?)')
      .bind(no, type, status, sort);
  });
  const results = await env.DB.batch(stmts);
  const added = [];
  results.forEach((r, i) => { if (r.meta && r.meta.changes === 1) added.push(parsed.rooms[i]); });
  const skipped = parsed.rooms.filter((n) => !added.includes(n));
  if (added.length) {
    const label = added.length > 3 ? added[0] + '~' + added[added.length - 1] + ' (' + added.length + '실)' : added.join(', ');
    await log(env.DB, admin, label, 'add', LABEL[type] + (body.hidden ? ' · 숨김' : ''));
  }
  return json({ ok: true, added, skipped });
}

async function roomEdit(env, admin, body) {
  const no = checkRoomNo(body.no);
  if (!no) return fail('호실을 확인해 주세요');
  const room = await env.DB.prepare('SELECT type, status FROM rooms WHERE no = ?').bind(no).first();
  if (!room) return fail('없는 호실입니다', 404);
  const type = TYPES.includes(body.type) ? body.type : room.type;
  let status = room.status;
  if (body.hidden === true) status = 'hidden';
  if (body.hidden === false && room.status === 'hidden') status = 'occupied';
  await env.DB
    .prepare("UPDATE rooms SET type = ?, status = ?, avail_date = CASE WHEN ? = 'soon' THEN avail_date ELSE NULL END, updated_at = datetime('now') WHERE no = ?")
    .bind(type, status, status, no)
    .run();
  const parts = [];
  if (type !== room.type) parts.push('타입 ' + LABEL[type]);
  if (status !== room.status) parts.push(status === 'hidden' ? '숨김' : '숨김 해제');
  if (parts.length) await log(env.DB, admin, no, 'edit', parts.join(' · '));
  return json({ ok: true });
}

async function roomDelete(env, admin, body) {
  const no = checkRoomNo(body.no);
  if (!no) return fail('호실을 확인해 주세요');
  const res = await env.DB.prepare('DELETE FROM rooms WHERE no = ?').bind(no).run();
  if (!res.meta || res.meta.changes !== 1) return fail('없는 호실입니다', 404);
  await log(env.DB, admin, no, 'delete', '삭제');
  return json({ ok: true });
}

async function logGet(env) {
  const { results } = await env.DB
    .prepare("SELECT room_no, action, detail, admin_name, strftime('%m/%d %H:%M', at, '+9 hours') AS at FROM room_log ORDER BY id DESC LIMIT 30")
    .all();
  return json({ ok: true, log: results || [] });
}

/* ── 로그인 후: 관리자 계정 ── */

async function adminsGet(env, admin) {
  const { results } = await env.DB.prepare('SELECT id, username, name FROM admins ORDER BY id').all();
  return json({ ok: true, me: admin.id, admins: results || [] });
}

async function adminsAdd(env, admin, body) {
  const username = checkUsername(body.username);
  const name = checkName(body.name);
  const password = checkPassword(body.password);
  if (!username) return fail('아이디는 영문 소문자·숫자·_ 3~20자로 정해 주세요');
  if (!name) return fail('이름을 입력해 주세요');
  if (!password) return fail('비밀번호는 8자 이상으로 정해 주세요');
  if ((await adminCount(env.DB)) >= 5) return fail('관리자는 5명까지 만들 수 있습니다');
  const hash = await hashPassword(password);
  const res = await env.DB
    .prepare('INSERT OR IGNORE INTO admins (username, name, pw_hash) VALUES (?, ?, ?)')
    .bind(username, name, hash)
    .run();
  if (!res.meta || res.meta.changes !== 1) return fail('이미 있는 아이디입니다', 409);
  return json({ ok: true });
}

async function adminsDelete(env, admin, body) {
  const id = Number(body.id);
  if (!Number.isInteger(id)) return fail('계정을 확인해 주세요');
  if (id === admin.id) return fail('내 계정은 지울 수 없습니다');
  const res = await env.DB.prepare('DELETE FROM admins WHERE id = ?').bind(id).run();
  if (!res.meta || res.meta.changes !== 1) return fail('없는 계정입니다', 404);
  await env.DB.prepare('DELETE FROM sessions WHERE admin_id = ?').bind(id).run();
  return json({ ok: true });
}

async function passwordChange(env, request, admin, body) {
  const next = checkPassword(body.next);
  if (!next) return fail('새 비밀번호는 8자 이상으로 정해 주세요');
  const row = await env.DB.prepare('SELECT pw_hash FROM admins WHERE id = ?').bind(admin.id).first();
  if (!row || !(await verifyPassword(String(body.current || ''), row.pw_hash))) return fail('지금 비밀번호가 맞지 않습니다', 401);
  await env.DB.prepare('UPDATE admins SET pw_hash = ? WHERE id = ?').bind(await hashPassword(next), admin.id).run();
  // 다른 기기의 로그인은 모두 해제하고, 지금 기기는 새로 로그인
  await env.DB.prepare('DELETE FROM sessions WHERE admin_id = ?').bind(admin.id).run();
  const token = await createSession(env.DB, admin.id);
  return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie(request, token) });
}

/* ── 길 안내 ── */

export async function handleAdminApi(request, env, path) {
  if (!env.DB) return fail('데이터베이스가 연결되지 않았습니다', 503);
  try {
    if (request.method === 'GET' && path === 'me') return await me(env, request);

    if (request.method === 'POST') {
      let body;
      try {
        body = await readBody(request);
      } catch (e) {
        return fail('요청 형식이 맞지 않습니다', 415);
      }
      if (path === 'setup') return await setup(env, request, body);
      if (path === 'login') return await login(env, request, body);
      if (path === 'logout') return await logout(env, request);

      const admin = await currentAdmin(env.DB, request);
      if (!admin) return fail('다시 로그인해 주세요', 401);
      if (path === 'rooms/status') return await roomStatus(env, admin, body);
      if (path === 'rooms/add') return await roomsAdd(env, admin, body);
      if (path === 'rooms/edit') return await roomEdit(env, admin, body);
      if (path === 'rooms/delete') return await roomDelete(env, admin, body);
      if (path === 'admins/add') return await adminsAdd(env, admin, body);
      if (path === 'admins/delete') return await adminsDelete(env, admin, body);
      if (path === 'password') return await passwordChange(env, request, admin, body);
      return fail('없는 기능입니다', 404);
    }

    if (request.method === 'GET') {
      const admin = await currentAdmin(env.DB, request);
      if (!admin) return fail('다시 로그인해 주세요', 401);
      if (path === 'rooms') return await roomsGet(env);
      if (path === 'log') return await logGet(env);
      if (path === 'admins') return await adminsGet(env, admin);
    }
    return fail('없는 기능입니다', 404);
  } catch (e) {
    console.log('admin api error:', path, e && e.message);
    return fail('잠시 후 다시 시도해 주세요', 500);
  }
}
