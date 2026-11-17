/* 방문 통계 (2026-11-17부터)
   - 손님 화면(홈·신청서·안내 등)을 열 때마다 '조회수' +1
   - 같은 브라우저는 하루 1번만 '방문자' +1 (오늘 날짜만 적힌 쿠키로 구분, IP 등 개인정보는 저장하지 않음)
   - 검색 로봇·미리 불러오기·관리자 로그인 상태는 세지 않음 */
import { COOKIE as ADMIN_COOKIE } from './auth.js';

const DAY_COOKIE = 'nv_d';
const BOT = /bot|crawl|spider|slurp|yeti|daum|facebookexternalhit|kakaotalk-scrap|preview|headless|lighthouse|pingdom|uptime|monitor|curl|wget|python|axios|node-fetch|go-http|java\/|httpclient|scrapy|semrush|ahrefs|mj12/i;

export function kstDay(d = new Date()) {
  return new Date(d.getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}
function cookieOf(request, name) {
  const m = (request.headers.get('Cookie') || '').match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
  return m ? m[1] : '';
}

// 세야 하면 { day, unique } 를, 아니면 null
export function visitOf(request) {
  if (request.method !== 'GET') return null;
  const ua = request.headers.get('User-Agent') || '';
  if (!ua || BOT.test(ua)) return null;
  const purpose = (request.headers.get('Sec-Purpose') || request.headers.get('Purpose') || '').toLowerCase();
  if (purpose.includes('prefetch') || purpose.includes('prerender')) return null;
  if (cookieOf(request, ADMIN_COOKIE)) return null; // 관리자
  const day = kstDay();
  return { day, unique: cookieOf(request, DAY_COOKIE) !== day };
}

export function recordVisit(db, v) {
  return db
    .prepare('INSERT INTO visits (day, uv, pv) VALUES (?, ?, 1) ON CONFLICT(day) DO UPDATE SET uv = uv + excluded.uv, pv = pv + 1')
    .bind(v.day, v.unique ? 1 : 0)
    .run();
}

// 오늘 자정(한국 시간)까지 유효한 쿠키
export function dayCookie(v, secure) {
  const now = Date.now();
  const kstMidnight = Date.parse(v.day + 'T00:00:00+09:00') + 86400 * 1000;
  const maxAge = Math.max(60, Math.round((kstMidnight - now) / 1000));
  return DAY_COOKIE + '=' + v.day + '; Path=/; HttpOnly; SameSite=Lax; Max-Age=' + maxAge + (secure ? '; Secure' : '');
}

// 관리자 화면용: 오늘 · 어제 · 이번 달 · 누적 · 최근 30일
export async function visitStats(db) {
  const today = kstDay();
  const yesterday = kstDay(new Date(Date.now() - 86400 * 1000));
  const from30 = kstDay(new Date(Date.now() - 29 * 86400 * 1000));
  const r = await db.prepare(
    'SELECT ' +
    "(SELECT COALESCE(SUM(uv),0) FROM visits) AS uv_all, (SELECT COALESCE(SUM(pv),0) FROM visits) AS pv_all, " +
    "(SELECT COALESCE(SUM(uv),0) FROM visits WHERE day >= ?) AS uv_month, (SELECT COALESCE(SUM(pv),0) FROM visits WHERE day >= ?) AS pv_month, " +
    '(SELECT MIN(day) FROM visits) AS since'
  ).bind(today.slice(0, 8) + '01', today.slice(0, 8) + '01').first();
  const { results } = await db.prepare('SELECT day, uv, pv FROM visits WHERE day >= ? ORDER BY day').bind(from30).all();
  const by = {};
  for (const x of results || []) by[x.day] = x;
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = kstDay(new Date(Date.now() - i * 86400 * 1000));
    days.push({ day: d, uv: by[d] ? by[d].uv : 0, pv: by[d] ? by[d].pv : 0 });
  }
  const t = by[today] || { uv: 0, pv: 0 }, y = by[yesterday] || { uv: 0, pv: 0 };
  return { today: { uv: t.uv, pv: t.pv }, yesterday: { uv: y.uv, pv: y.pv }, month: { uv: r.uv_month, pv: r.pv_month }, all: { uv: r.uv_all, pv: r.pv_all }, since: r.since, days };
}
