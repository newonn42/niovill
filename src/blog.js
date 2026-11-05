/* 네이버 블로그 최근 글 → 홈 '최근 소식'
   - 블로그의 공개 글 목록(RSS)을 1시간마다 새로 읽어 settings 표에 보관합니다.
   - 못 읽으면 보관해 둔 글을 쓰고, 그것도 없으면 '최근 소식'을 숨깁니다. */
import { getSetting, setSetting } from './telegram.js';

const FRESH_MS = 60 * 60 * 1000; // 1시간
const MAX_POSTS = 3;

export function blogId(url) {
  const m = /^https:\/\/(?:m\.)?blog\.naver\.com\/([A-Za-z0-9_-]{3,40})(?:[/?#]|$)/.exec(String(url || ''));
  return m ? m[1] : '';
}

function decode(s) {
  return String(s || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, '&');
}
function tag(item, name) {
  const m = new RegExp('<' + name + '(?:\\s[^>]*)?>([\\s\\S]*?)</' + name + '>', 'i').exec(item);
  return m ? m[1] : '';
}

export function parseRss(xml) {
  const items = [];
  const re = /<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = re.exec(xml)) && items.length < MAX_POSTS) {
    const it = m[1];
    const title = decode(tag(it, 'title')).replace(/<[^>]*>/g, '').trim();
    const link = decode(tag(it, 'link')).trim();
    const html = decode(tag(it, 'description'));
    const date = new Date(decode(tag(it, 'pubDate')).trim());
    const img = /<img[^>]+src=["']?([^"' >]+)/i.exec(html);
    const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!title || !/^https:\/\/(m\.)?blog\.naver\.com\//.test(link)) continue;
    const imgUrl = img && /^https:\/\/[a-z0-9.-]+\.(pstatic\.net|naver\.net|naver\.com)\//i.test(img[1]) ? img[1] : '';
    items.push({
      title: title.slice(0, 80),
      link: link.replace(/[?&](fromRss|trackingCode)=[^&]*/g, '').replace(/\?$/, ''),
      date: isNaN(date) ? '' : new Date(date.getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10),
      excerpt: text.slice(0, 90) + (text.length > 90 ? '…' : ''),
      img: imgUrl
    });
  }
  return items;
}

async function refresh(env, id) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4000);
  try {
    const res = await fetch('https://rss.blog.naver.com/' + id + '.xml', { signal: ctrl.signal, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; site-blog-feed)' } });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const xml = await res.text();
    const items = parseRss(xml);
    await setSetting(env.DB, 'blog_cache', JSON.stringify({ id, at: Date.now(), items }));
    return items;
  } finally {
    clearTimeout(timer);
  }
}

// 홈에서 부름: 새 글이면 바로, 오래됐으면 일단 보관본을 보여 주고 뒤에서 새로 읽음
export async function getBlogPosts(env, ctx, url) {
  const id = blogId(url);
  if (!id || !env.DB) return [];
  let cache = null;
  try { cache = JSON.parse((await getSetting(env.DB, 'blog_cache')) || 'null'); } catch (e) { cache = null; }
  const same = cache && cache.id === id && Array.isArray(cache.items);
  if (same && Date.now() - cache.at < FRESH_MS) return cache.items;
  if (same) {
    const job = refresh(env, id).catch((e) => console.log('blog refresh failed:', e && e.message));
    if (ctx && ctx.waitUntil) ctx.waitUntil(job);
    return cache.items;
  }
  try {
    return await refresh(env, id);
  } catch (e) {
    console.log('blog load failed:', e && e.message);
    // 실패도 잠시 기억해 매번 기다리지 않게 함
    try { await setSetting(env.DB, 'blog_cache', JSON.stringify({ id, at: Date.now() - FRESH_MS + 10 * 60 * 1000, items: [] })); } catch (e2) { /* 무시 */ }
    return [];
  }
}
