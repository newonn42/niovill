import { loadContent, loadPhotoVersions, applyContent, applySeo } from './content.js';
import { getSetting } from './telegram.js';
import { getBlogPosts } from './blog.js';

// 서버가 채워 보내는 손님 화면 주소
export const PAGES = ['/', '/apply', '/en', '/guide', '/privacy'];
/* 홈 화면: '모집 중 / 만실' 스위치에 맞춰 문구를 바꿔 보냅니다.
   - 스위치를 읽지 못하면 기본(모집 중) 화면이 그대로 나갑니다. */

// 보안 헤더 (검색 공개 · 관리자 화면은 따로 차단)
export const PAGE_HEADERS = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'no-store',
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
export async function handleHome(request, env, ctx) {
  const asset = await env.ASSETS.fetch(request);
  const type = asset.headers.get('content-type') || '';
  if (!asset.ok || !type.includes('text/html')) return asset;
  const headers = new Headers(PAGE_HEADERS);

  let full = false;
  let content = null;
  let photos = {};
  const path = new URL(request.url).pathname;
  let origin = new URL(request.url).origin;
  // 짧은 주소 중계로 들어온 경우 그 주소 (응답은 저장되지 않으므로 이 값은 이 응답에만 쓰임)
  const fh = request.headers.get('X-Forwarded-Host');
  if (fh && /^[a-z0-9.-]+\.pages\.dev$/i.test(fh)) origin = 'https://' + fh;
  if (env.DB) {
    try {
      const site = await getSetting(env.DB, 'site_url');
      if (site && site.startsWith('https://')) origin = site; // 대표 주소(짧은 주소)로 통일
    } catch (e) { /* 요청 주소 사용 */ }
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
    if (content) {
      rw = applyContent(rw, content, photos);
      rw = applySeo(rw, content, photos, origin, path);
      if (path === '/') {
        let posts = [];
        try { posts = await getBlogPosts(env, ctx, content.blogUrl); } catch (e) { posts = []; }
        rw = applyBlog(rw, posts);
      }
    }
    return new Response(rw.transform(asset).body, { status: 200, headers });
  } catch (e) {
    console.log('render failed:', e && e.message);
    return new Response(asset.body, { status: 200, headers });
  }
}

const escH = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function applyBlog(rw, posts) {
  if (!posts.length) return rw;
  return rw
    .on('[data-blog-sec]', { element(el) { el.removeAttribute('hidden'); } })
    .on('[data-blog]', {
      element(el) {
        el.setInnerContent(
          posts
            .map((p) => {
              const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(p.date || '');
              return '<a class="post" href="' + escH(p.link) + '" target="_blank" rel="noopener">' +
                (p.img ? '<img src="' + escH(p.img) + '" alt="" loading="lazy" referrerpolicy="no-referrer" data-blogimg>' : '') +
                '<div><b>' + escH(p.title) + '</b>' + (d ? '<small>' + d[1] + '.' + Number(d[2]) + '.' + Number(d[3]) + '</small>' : '') +
                (p.excerpt ? '<p>' + escH(p.excerpt) + '</p>' : '') + '</div></a>';
            })
            .join(''),
          { html: true }
        );
      }
    });
}
