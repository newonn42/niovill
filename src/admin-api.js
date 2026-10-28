/* 관리자 API (/api/admin/...) – 모두 JSON으로 주고받습니다 */
import {
  hashPassword, verifyPassword, createSession, currentAdmin, deleteSession,
  sessionCookie, clearCookie, lockKey, lockedMinutes, recordFail, clearFails
} from './auth.js';
import { isFull } from './home.js';
import { ROOM_TYPES, PERIODS } from './apply-api.js';
import { TOKEN_RE, tgCall, getSetting, setSetting, getChats, sendToAll } from './telegram.js';

const KEEP_DAYS = 90; // 완료 후 보관 기간

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
  if (!admin) return json({ ok: true, needSetup: false, admin: null });
  // 관리자가 쓰는 주소를 기억해 알림 링크에 사용 (로그인한 관리자 요청만 믿음)
  try {
    const url = new URL(request.url);
    const fh = request.headers.get('X-Forwarded-Host');
    const origin = fh && /^[a-z0-9.-]+(:\d+)?$/i.test(fh) ? url.protocol + '//' + fh : url.origin;
    if ((await getSetting(env.DB, 'site_url')) !== origin) await setSetting(env.DB, 'site_url', origin, admin.name);
  } catch (e) {
    console.log('site_url save failed:', e && e.message);
  }
  return json({ ok: true, needSetup: false, admin: { name: admin.name, username: admin.username }, newCount: await newCount(env) });
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

/* ── 로그인 후: 신청함 ── */

async function purgeOld(db) {
  // 완료 후 90일 지난 신청은 자동 삭제
  await db.prepare("DELETE FROM inquiries WHERE status = 'done' AND done_at < datetime('now', ?)").bind('-' + KEEP_DAYS + ' days').run();
}

async function inquiriesGet(env, url) {
  await purgeOld(env.DB);
  const filter = url.searchParams.get('filter') || 'new';
  const where = { new: "status = 'new'", contacted: "status = 'contacted'", done: "status = 'done'", all: '1 = 1' }[filter];
  if (!where) return fail('목록 구분을 확인해 주세요');
  const { results } = await env.DB
    .prepare(
      "SELECT id, name, phone, room_type, move_date, period, message, was_full, status, memo, updated_by, " +
        "strftime('%m/%d %H:%M', created_at, '+9 hours') AS created, " +
        "CAST(ROUND(julianday(COALESCE(done_at, 'now')) + " + KEEP_DAYS + " - julianday('now')) AS INTEGER) AS days_left " +
        'FROM inquiries WHERE ' + where + ' ORDER BY id DESC LIMIT 200'
    )
    .all();
  const counts = await env.DB
    .prepare("SELECT SUM(status = 'new') AS new, SUM(status = 'contacted') AS contacted, SUM(status = 'done') AS done, COUNT(*) AS total FROM inquiries")
    .first();
  return json({
    ok: true,
    filter,
    roomTypes: ROOM_TYPES,
    periods: PERIODS,
    keepDays: KEEP_DAYS,
    counts: { new: counts.new || 0, contacted: counts.contacted || 0, done: counts.done || 0, total: counts.total || 0 },
    items: results || []
  });
}

async function inquiryUpdate(env, admin, body) {
  const id = Number(body.id);
  if (!Number.isInteger(id)) return fail('신청을 확인해 주세요');
  const sets = [];
  const binds = [];
  if (body.status !== undefined) {
    if (!['new', 'contacted', 'done'].includes(body.status)) return fail('상태를 확인해 주세요');
    sets.push('status = ?', "done_at = CASE WHEN ? = 'done' THEN COALESCE(done_at, datetime('now')) ELSE NULL END");
    binds.push(body.status, body.status);
  }
  if (body.memo !== undefined) {
    if (typeof body.memo !== 'string') return fail('메모를 확인해 주세요');
    sets.push('memo = ?');
    binds.push(body.memo.trim().slice(0, 300) || null);
  }
  if (!sets.length) return fail('바꿀 내용이 없습니다');
  sets.push('updated_by = ?', "updated_at = datetime('now')");
  binds.push(admin.name, id);
  const res = await env.DB.prepare('UPDATE inquiries SET ' + sets.join(', ') + ' WHERE id = ?').bind(...binds).run();
  if (!res.meta || res.meta.changes !== 1) return fail('없는 신청입니다', 404);
  return json({ ok: true });
}

async function inquiryDelete(env, body) {
  const id = Number(body.id);
  if (!Number.isInteger(id)) return fail('신청을 확인해 주세요');
  const res = await env.DB.prepare('DELETE FROM inquiries WHERE id = ?').bind(id).run();
  if (!res.meta || res.meta.changes !== 1) return fail('없는 신청입니다', 404);
  return json({ ok: true });
}

async function newCount(env) {
  const r = await env.DB.prepare("SELECT COUNT(*) AS n FROM inquiries WHERE status = 'new'").first();
  return r ? r.n : 0;
}

/* ── 로그인 후: 텔레그램 알림 ── */

async function tgGet(env) {
  const token = await getSetting(env.DB, 'tg_token');
  const botName = await getSetting(env.DB, 'tg_bot');
  return json({ ok: true, connected: !!token, bot: botName || '', chats: await getChats(env.DB) });
}

async function tgToken(env, admin, body) {
  const token = typeof body.token === 'string' ? body.token.trim() : '';
  if (!TOKEN_RE.test(token)) return fail('토큰 형식이 맞지 않습니다. BotFather가 준 토큰 전체를 붙여 넣어 주세요');
  let me;
  try {
    me = await tgCall(env, token, 'getMe');
  } catch (e) {
    return fail('텔레그램에서 토큰을 확인하지 못했습니다. 토큰을 다시 확인해 주세요');
  }
  await setSetting(env.DB, 'tg_token', token, admin.name);
  await setSetting(env.DB, 'tg_bot', me.username || '', admin.name);
  await setSetting(env.DB, 'tg_chats', '[]', admin.name);
  return json({ ok: true, bot: me.username || '' });
}

async function tgFind(env, admin) {
  const token = await getSetting(env.DB, 'tg_token');
  if (!token) return fail('먼저 봇 토큰을 저장해 주세요');
  let updates;
  try {
    updates = await tgCall(env, token, 'getUpdates', { limit: 100, allowed_updates: ['message', 'my_chat_member'] });
  } catch (e) {
    return fail('텔레그램에서 대화를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요');
  }
  const chats = await getChats(env.DB);
  const seen = new Set(chats.map((c) => String(c.id)));
  for (const u of updates || []) {
    const chat = (u.message && u.message.chat) || (u.my_chat_member && u.my_chat_member.chat);
    if (!chat || seen.has(String(chat.id))) continue;
    const name = chat.title || [chat.first_name, chat.last_name].filter(Boolean).join(' ') || chat.username || String(chat.id);
    chats.push({ id: chat.id, name: String(name).slice(0, 40) });
    seen.add(String(chat.id));
  }
  if (chats.length > 10) chats.length = 10;
  await setSetting(env.DB, 'tg_chats', JSON.stringify(chats), admin.name);
  return json({ ok: true, chats });
}

async function tgRemove(env, admin, body) {
  const chats = (await getChats(env.DB)).filter((c) => String(c.id) !== String(body.id));
  await setSetting(env.DB, 'tg_chats', JSON.stringify(chats), admin.name);
  return json({ ok: true, chats });
}

async function tgTest(env, admin) {
  const r = await sendToAll(env, '✅ 알림 테스트입니다. 새 상담 신청이 오면 이렇게 알려 드립니다. (' + admin.name + ' 님이 보냄)');
  if (r.skipped) return fail('토큰과 받는 사람을 먼저 설정해 주세요');
  if (!r.sent) return fail('보내지 못했습니다. 받는 사람이 봇을 차단했는지 확인해 주세요');
  return json({ ok: true, sent: r.sent, failed: r.failed });
}

async function tgOff(env, admin) {
  for (const k of ['tg_token', 'tg_bot', 'tg_chats']) await setSetting(env.DB, k, null, admin.name);
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
  const url = new URL(request.url);
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
      if (path === 'inquiries/update') return await inquiryUpdate(env, admin, body);
      if (path === 'inquiries/delete') return await inquiryDelete(env, body);
      if (path === 'telegram/token') return await tgToken(env, admin, body);
      if (path === 'telegram/find') return await tgFind(env, admin);
      if (path === 'telegram/remove') return await tgRemove(env, admin, body);
      if (path === 'telegram/test') return await tgTest(env, admin);
      if (path === 'telegram/off') return await tgOff(env, admin);
      if (path === 'admins/add') return await adminsAdd(env, admin, body);
      if (path === 'admins/delete') return await adminsDelete(env, admin, body);
      if (path === 'password') return await passwordChange(env, request, admin, body);
      return fail('없는 기능입니다', 404);
    }

    if (request.method === 'GET') {
      const admin = await currentAdmin(env.DB, request);
      if (!admin) return fail('다시 로그인해 주세요', 401);
      if (path === 'status') return await statusGet(env);
      if (path === 'inquiries') return await inquiriesGet(env, url);
      if (path === 'telegram') return await tgGet(env);
      if (path === 'admins') return await adminsGet(env, admin);
    }
    return fail('없는 기능입니다', 404);
  } catch (e) {
    console.log('admin api error:', path, e && e.message);
    return fail('잠시 후 다시 시도해 주세요', 500);
  }
}
