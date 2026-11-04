import { loadContent, loadPhotoVersions, applyContent } from './content.js';
/* 홈 화면: '모집 중 / 만실' 스위치에 맞춰 문구를 바꿔 보냅니다.
   - 스위치를 읽지 못하면 기본(모집 중) 화면이 그대로 나갑니다. */

// 검색 차단 · 보안 헤더 (오픈 때 X-Robots-Tag 줄 삭제)
export const PAGE_HEADERS = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex, nofollow',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
};

export async function isFull(db) {
  const row = await db.prepare("SELECT value FROM settings WHERE key = 'full'").first();
  return !!row && row.value === '1';
}

// 홈("/")과 신청서("/apply")에 내용·사진·만실 여부를 채워 보냅니다
export async function handleHome(request, env) {
  const asset = await env.ASSETS.fetch(request);
  const type = asset.headers.get('content-type') || '';
  if (!asset.ok || !type.includes('text/html')) return asset;
  const headers = new Headers(PAGE_HEADERS);

  let full = false;
  let content = null;
  let photos = {};
  if (env.DB) {
    try { full = await isFull(env.DB); } catch (e) { console.log('settings load failed:', e && e.message); }
    try {
      content = (await loadContent(env.DB)).values;
      photos = await loadPhotoVersions(env.DB);
    } catch (e) {
      console.log('content load failed:', e && e.message);
      content = null;
    }
  }
  try {
    let rw = new HTMLRewriter();
    if (full) rw = rw.on('body', { element(el) { el.setAttribute('class', 'is-full'); } });
    if (content) rw = applyContent(rw, content, photos);
    return new Response(rw.transform(asset).body, { status: 200, headers });
  } catch (e) {
    console.log('render failed:', e && e.message);
    return new Response(asset.body, { status: 200, headers });
  }
}
