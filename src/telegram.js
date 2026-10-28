/* 텔레그램 알림 – 봇 토큰과 받는 사람은 관리자 화면에서 설정합니다 (settings 표) */

const API = 'https://api.telegram.org';
export const TOKEN_RE = /^\d{5,15}:[A-Za-z0-9_-]{30,60}$/;

function base(env) {
  // 점검용으로만 바꿀 수 있습니다 (평소에는 텔레그램 공식 주소)
  return (env && env.TELEGRAM_API) || API;
}

export async function tgCall(env, token, method, payload) {
  const res = await fetch(base(env) + '/bot' + token + '/' + method, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {})
  });
  let data = null;
  try { data = await res.json(); } catch (e) { data = null; }
  if (!data || data.ok !== true) {
    const desc = data && data.description ? data.description : 'HTTP ' + res.status;
    throw new Error(desc);
  }
  return data.result;
}

export async function getSetting(db, key) {
  const row = await db.prepare('SELECT value FROM settings WHERE key = ?').bind(key).first();
  return row ? row.value : '';
}

export async function setSetting(db, key, value, by) {
  if (value === null) {
    await db.prepare('DELETE FROM settings WHERE key = ?').bind(key).run();
    return;
  }
  await db
    .prepare(
      "INSERT INTO settings (key, value, updated_by, updated_at) VALUES (?, ?, ?, datetime('now')) " +
        'ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_by = excluded.updated_by, updated_at = excluded.updated_at'
    )
    .bind(key, value, by || null)
    .run();
}

// 받는 사람 목록: [{id, name}]
export async function getChats(db) {
  try {
    const v = JSON.parse((await getSetting(db, 'tg_chats')) || '[]');
    return Array.isArray(v) ? v : [];
  } catch (e) {
    return [];
  }
}

export async function sendToAll(env, text) {
  const token = await getSetting(env.DB, 'tg_token');
  const chats = await getChats(env.DB);
  if (!token || !chats.length) return { sent: 0, failed: 0, skipped: true };
  let sent = 0;
  let failed = 0;
  for (const c of chats) {
    try {
      await tgCall(env, token, 'sendMessage', { chat_id: c.id, text, disable_web_page_preview: true });
      sent += 1;
    } catch (e) {
      failed += 1;
      console.log('telegram send failed:', c.id, e && e.message);
    }
  }
  return { sent, failed };
}

export function inquiryText(inq, labels, adminUrl) {
  const p = inq.phone || '';
  const phone = p.length === 11 ? p.slice(0, 3) + '-' + p.slice(3, 7) + '-' + p.slice(7) : p;
  const want = [];
  want.push(inq.room_type && inq.room_type !== 'any' ? labels.roomTypes[inq.room_type] : '타입 상관없음');
  if (inq.move_date) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(inq.move_date);
    if (m) want.push(Number(m[2]) + '/' + Number(m[3]) + ' 입실 희망');
  }
  if (inq.period && labels.periods[inq.period]) want.push(labels.periods[inq.period]);
  const lines = [
    (inq.merged ? '🔁 같은 분이 다시 남김' : '🏠 새 상담 신청') + (inq.was_full ? ' (만실 때 대기)' : ''),
    '이름: ' + inq.name,
    '연락처: ' + phone,
    '희망: ' + want.join(' · ')
  ];
  if (inq.message) lines.push('문의: ' + inq.message);
  lines.push('', '신청함: ' + adminUrl);
  return lines.join('\n');
}
