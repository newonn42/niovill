/* 손님 상담 신청 저장 (POST /api/apply) */
import { isFull } from './home.js';

export const ROOM_TYPES = { any: '상관없음', premium: '프리미엄 외창', outer: '외창', inner: '내창' };
export const PERIODS = { '': '', '1-2m': '1~2개월', '3-6m': '3~6개월', '6m+': '6개월 이상' };
const DAILY_LIMIT = 200; // 하루 최대 접수 (스팸 폭주 방지)
const MERGE_MINUTES = 10; // 같은 번호로 10분 안에 다시 오면 하나로 합침

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' }
  });
}
const fail = (msg, status = 400) => json({ ok: false, error: msg }, status);
const str = (v, max) => (typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max) : '');

function checkDate(d) {
  if (!d) return '';
  if (typeof d !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  const t = new Date(d + 'T00:00:00Z');
  return !isNaN(t) && t.toISOString().slice(0, 10) === d ? d : null;
}

export async function handleApply(request, env) {
  if (request.method !== 'POST') return fail('잘못된 요청입니다', 405);
  if (!env.DB) return fail('지금은 접수할 수 없습니다. 카톡 또는 전화로 문의해 주세요', 503);
  let body;
  try {
    if (!(request.headers.get('Content-Type') || '').includes('application/json')) throw new Error('type');
    const text = await request.text();
    if (text.length > 5000) throw new Error('size');
    body = JSON.parse(text);
    if (!body || typeof body !== 'object') throw new Error('body');
  } catch (e) {
    return fail('요청 형식이 맞지 않습니다', 415);
  }

  // 함정 칸: 사람에게는 안 보이는 칸이 채워져 있으면 저장하지 않고 성공처럼 응답
  if (str(body.website, 100)) return json({ ok: true });

  const name = str(body.name, 30);
  const phone = str(body.phone, 30).replace(/[^0-9]/g, '');
  const roomType = Object.prototype.hasOwnProperty.call(ROOM_TYPES, body.roomType) ? body.roomType : 'any';
  const period = Object.prototype.hasOwnProperty.call(PERIODS, body.period) ? body.period : '';
  const moveDate = checkDate(body.date);
  const message = str(body.message, 500);

  if (!name) return fail('이름을 입력해 주세요');
  if (!/^01[016789][0-9]{7,8}$/.test(phone)) return fail('연락처를 확인해 주세요');
  if (moveDate === null) return fail('입실 희망일을 확인해 주세요');
  if (body.agree !== true) return fail('개인정보 수집·이용에 동의해 주세요');

  try {
    let full = false;
    try { full = await isFull(env.DB); } catch (e) { full = false; }

    // 같은 번호로 방금 들어온 신청이 있으면 내용을 합칩니다
    const recent = await env.DB
      .prepare("SELECT id, message FROM inquiries WHERE phone = ? AND created_at > datetime('now', ?) ORDER BY id DESC LIMIT 1")
      .bind(phone, '-' + MERGE_MINUTES + ' minutes')
      .first();
    if (recent) {
      const merged = message && message !== recent.message ? ((recent.message ? recent.message + '\n' : '') + message).slice(0, 1000) : recent.message;
      await env.DB
        .prepare(
          "UPDATE inquiries SET name = ?, " +
            "room_type = CASE WHEN ? = 'any' THEN room_type ELSE ? END, " +
            'move_date = COALESCE(?, move_date), period = COALESCE(?, period), message = ?, ' +
            "updated_at = datetime('now') WHERE id = ?"
        )
        .bind(name, roomType, roomType, moveDate || null, period || null, merged || null, recent.id)
        .run();
      return json({ ok: true, id: recent.id, merged: true });
    }

    const today = await env.DB.prepare("SELECT COUNT(*) AS n FROM inquiries WHERE created_at > datetime('now', '-1 day')").first();
    if (today && today.n >= DAILY_LIMIT) return fail('지금은 접수가 많습니다. 카톡 또는 전화로 문의해 주세요', 429);

    const res = await env.DB
      .prepare('INSERT INTO inquiries (name, phone, room_type, move_date, period, message, was_full) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(name, phone, roomType, moveDate || null, period || null, message || null, full ? 1 : 0)
      .run();
    return json({ ok: true, id: res.meta ? res.meta.last_row_id : null });
  } catch (e) {
    console.log('apply save failed:', e && e.message);
    return fail('저장하지 못했습니다. 카톡 또는 전화로 문의해 주세요', 500);
  }
}
