/* 관리자 API (/api/admin/...) – 모두 JSON으로 주고받습니다 */
import {
  hashPassword, verifyPassword, createSession, currentAdmin, deleteSession,
  sessionCookie, clearCookie, lockKey, lockedMinutes, recordFail, clearFails
} from './auth.js';
import { isFull } from './home.js';

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

/* ── 로그인 후: 모집 중 / 만실 스위치 ── */

async function statusGet(env) {
  const full = await isFull(env.DB);
  const last = await env.DB
    .prepare("SELECT updated_by, strftime('%m/%d %H:%M', updated_at, '+9 hours') AS at FROM settings WHERE key = 'full'")
    .first();
  return json({ ok: true, full, last: last || null });
}

async function statusSet(env, admin, body) {
  if (typeof body.full !== 'boolean') return fail('상태를 확인해 주세요');
  await env.DB
    .prepare(
      "INSERT INTO settings (key, value, updated_by, updated_at) VALUES ('full', ?, ?, datetime('now')) " +
        "ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_by = excluded.updated_by, updated_at = excluded.updated_at"
    )
    .bind(body.full ? '1' : '0', admin.name)
    .run();
  return json({ ok: true });
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
      if (path === 'status') return await statusSet(env, admin, body);
      if (path === 'admins/add') return await adminsAdd(env, admin, body);
      if (path === 'admins/delete') return await adminsDelete(env, admin, body);
      if (path === 'password') return await passwordChange(env, request, admin, body);
      return fail('없는 기능입니다', 404);
    }

    if (request.method === 'GET') {
      const admin = await currentAdmin(env.DB, request);
      if (!admin) return fail('다시 로그인해 주세요', 401);
      if (path === 'status') return await statusGet(env);
      if (path === 'admins') return await adminsGet(env, admin);
    }
    return fail('없는 기능입니다', 404);
  } catch (e) {
    console.log('admin api error:', path, e && e.message);
    return fail('잠시 후 다시 시도해 주세요', 500);
  }
}
