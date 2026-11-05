/* 고시원 홈페이지 – Worker 입구
   - "/", "/apply" : 홈 · 신청서 (내용 · 사진 · 만실 문구 채움)
   - "/media/키" : 관리자가 올린 사진
   - "/api/health" : 설치 확인용 (데이터베이스 연결 · 만실 여부)
   - "/api/apply" : 손님 상담 신청 저장
   - "/api/admin/..." : 관리자 기능 (화면은 public/admin)
   - 그 밖의 파일은 public 폴더에서 그대로 나갑니다 */
import { handleHome, isFull, PAGE_HEADERS, PAGES } from './home.js';
import { handleAdminApi } from './admin-api.js';
import { handleApply } from './apply-api.js';
import { ensureSchema } from './schema.js';
import { handleMedia } from './content.js';

async function health(env) {
  const body = { ok: true, db: false, full: false };
  try {
    if (env.DB) {
      body.full = await isFull(env.DB);
      body.db = true;
      const { results } = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all();
      const have = new Set((results || []).map((r) => r.name));
      body.missing = ['admins', 'sessions', 'login_fails', 'settings', 'inquiries', 'push_subs'].filter((t) => !have.has(t));
    }
  } catch (e) {
    body.db = false;
    body.error = 'database not ready';
  }
  return new Response(JSON.stringify(body), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex'
    }
  });
}

// 검색엔진 안내: 관리자·서버 주소는 제외, 사이트 지도 위치 알림
async function robots(request, env) {
  let origin = new URL(request.url).origin;
  try {
    const row = env.DB ? await env.DB.prepare("SELECT value FROM settings WHERE key = 'site_url'").first() : null;
    if (row && row.value.startsWith('https://')) origin = row.value;
  } catch (e) { /* 요청 주소 사용 */ }
  const body = 'User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/\n\nSitemap: ' + origin + '/sitemap.xml\n';
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
}

// 사이트 지도 (검색엔진용)
async function sitemap(request, env) {
  let origin = new URL(request.url).origin;
  try {
    const row = env.DB ? await env.DB.prepare("SELECT value FROM settings WHERE key = 'site_url'").first() : null;
    if (row && row.value.startsWith('https://')) origin = row.value;
  } catch (e) { /* 요청 주소 사용 */ }
  const pages = PAGES.filter((p) => p !== '/apply' && p !== '/privacy');
  let today = new Date().toISOString().slice(0, 10);
  // 블로그 새 글 날짜를 홈 수정일로 (구글이 새 내용을 알아챔)
  try {
    const c = env.DB ? await env.DB.prepare("SELECT value FROM settings WHERE key = 'blog_cache'").first() : null;
    const items = c ? (JSON.parse(c.value).items || []) : [];
    if (items[0] && items[0].date) today = items[0].date;
  } catch (e) { /* 오늘 날짜 */ }
  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    pages.map((p) => '  <url><loc>' + origin + p + '</loc><lastmod>' + today + '</lastmod></url>').join('\n') + '\n</urlset>\n';
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    // 데이터를 쓰는 주소에서만 표 준비 (파일만 보내는 요청은 바로 통과)
    const dynamic = PAGES.includes(url.pathname) || url.pathname === '/sitemap.xml' || url.pathname.startsWith('/api/') || url.pathname.startsWith('/media/');
    if (dynamic || url.pathname === '/robots.txt') await ensureSchema(env.DB);
    if (request.method === 'GET' && PAGES.includes(url.pathname)) return handleHome(request, env, ctx);
    // 예전 지역 페이지 주소 → 홈 '오시는 길'
    if (url.pathname.startsWith('/area/')) return Response.redirect(url.origin + '/#location', 301);
    if (request.method === 'GET' && url.pathname === '/sitemap.xml') return sitemap(request, env);
    if (request.method === 'GET' && url.pathname === '/robots.txt') return robots(request, env);
    if (url.pathname === '/privacy.html') return Response.redirect(url.origin + '/privacy', 301);
    if (request.method === 'GET' && url.pathname.startsWith('/media/')) return handleMedia(env, url.pathname.slice('/media/'.length));
    if (request.method === 'GET' && url.pathname === '/api/health') return health(env);
    if (url.pathname === '/api/apply') return handleApply(request, env, ctx);
    if (url.pathname.startsWith('/api/admin/')) return handleAdminApi(request, env, url.pathname.slice('/api/admin/'.length));
    if (url.pathname.startsWith('/api/')) return new Response('Not found', { status: 404 });
    return env.ASSETS.fetch(request);
  }
};
