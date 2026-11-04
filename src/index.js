/* 고시원 홈페이지 – Worker 입구
   - "/"      : 홈 화면 (모집 중 / 만실 문구)
   - "/api/health" : 설치 확인용 (데이터베이스 연결 · 만실 여부)
   - "/api/apply" : 손님 상담 신청 저장
   - "/api/admin/..." : 관리자 기능 (화면은 public/admin)
   - 그 밖의 파일은 public 폴더에서 그대로 나갑니다 */
import { handleHome, isFull, PAGE_HEADERS } from './home.js';
import { handleAdminApi } from './admin-api.js';
import { handleApply } from './apply-api.js';
import { ensureSchema } from './schema.js';

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
      'X-Robots-Tag': PAGE_HEADERS['X-Robots-Tag']
    }
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    // 데이터를 쓰는 주소에서만 표 준비 (파일만 보내는 요청은 바로 통과)
    if (url.pathname === '/' || url.pathname.startsWith('/api/')) await ensureSchema(env.DB);
    if (request.method === 'GET' && url.pathname === '/') return handleHome(request, env);
    if (request.method === 'GET' && url.pathname === '/api/health') return health(env);
    if (url.pathname === '/api/apply') return handleApply(request, env, ctx);
    if (url.pathname.startsWith('/api/admin/')) return handleAdminApi(request, env, url.pathname.slice('/api/admin/'.length));
    if (url.pathname.startsWith('/api/')) return new Response('Not found', { status: 404 });
    return env.ASSETS.fetch(request);
  }
};
