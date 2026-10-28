/* 홈 화면에 실제 공실을 채워 보내기
   - 데이터베이스(D1, 이름 DB)에서 방 상태를 읽어 화면 숫자를 채웁니다.
   - 읽기에 실패하면 "카톡·전화로 문의" 안전 화면이 그대로 나갑니다. */

const TYPES = ['premium', 'outer', 'inner'];
const LABEL = { premium: '프리미엄 외창', outer: '외창', inner: '내창' };
const BADGE_KEY = { premium: 'badgePremium', outer: 'badgeOuter', inner: 'badgeInner' };

// 검색 차단 · 보안 헤더 (8단계 오픈 때 X-Robots-Tag 줄 삭제)
export const PAGE_HEADERS = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex, nofollow',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
};

function todayKST() {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

function shortDate(iso) {
  // '2026-10-30' → '10/30'
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  return m ? Number(m[2]) + '/' + Number(m[3]) : '';
}

export async function loadView(db) {
  const { results } = await db
    .prepare("SELECT no, type, status, avail_date FROM rooms WHERE status != 'hidden' ORDER BY sort, no")
    .all();
  const rooms = Array.isArray(results) ? results : [];
  if (rooms.length === 0) throw new Error('no rooms');

  const today = todayKST();
  const empty = { premium: 0, outer: 0, inner: 0 };
  const soonByType = { premium: [], outer: [], inner: [] };
  const soon = [];

  for (const r of rooms) {
    if (!TYPES.includes(r.type)) continue;
    if (r.status === 'empty') empty[r.type] += 1;
    if (r.status === 'soon') {
      // 날짜가 없거나 이미 지난 날짜면 '곧 입실 가능'으로 취급
      const date = r.avail_date && r.avail_date > today ? r.avail_date : '';
      soon.push({ type: r.type, date });
      soonByType[r.type].push(date);
    }
  }

  const total = empty.premium + empty.outer + empty.inner;

  // 가장 빠른 입실 예정 묶음: 날짜 없는 방('곧')을 먼저, 그다음 날짜순
  let soonText = '';
  if (soon.length > 0) {
    soon.sort((a, b) => (a.date === b.date ? 0 : a.date === '' ? -1 : b.date === '' ? 1 : a.date < b.date ? -1 : 1));
    const first = soon[0].date;
    const group = soon.filter((s) => s.date === first);
    const parts = TYPES.map((t) => {
      const n = group.filter((s) => s.type === t).length;
      return n ? LABEL[t] + ' ' + n + '실' : '';
    }).filter(Boolean);
    soonText = (first ? shortDate(first) + '부터 입실 가능' : '곧 입실 가능') + ' · ' + parts.join(' · ');
  }

  const badges = {};
  for (const t of TYPES) {
    if (empty[t] > 0) {
      badges[t] = { cls: 'badge on', text: empty[t] + '실 입실 가능' };
    } else if (soonByType[t].length > 0) {
      const dates = soonByType[t].slice().sort();
      const d = dates[0]; // '' 가 먼저 정렬됨
      badges[t] = { cls: 'badge soon-b', text: d ? shortDate(d) + ' 입실 예정' : '곧 입실 가능' };
    } else {
      badges[t] = { cls: 'badge', text: '만실' };
    }
  }

  return { full: total === 0, total, empty, soonText, badges };
}

// 주의: 핸들러 객체에 text / comments / element 이름의 값을 두면 안 됩니다 (HTMLRewriter 예약어)
function setText(value) {
  return { element(el) { el.setInnerContent(value); } };
}
function soonLine(value) {
  return {
    element(el) {
      if (value) {
        el.removeAttribute('hidden');
        el.setInnerContent(value);
      } else {
        el.setAttribute('hidden', '');
      }
    }
  };
}

export function render(response, view) {
  let rw = new HTMLRewriter();
  if (view) {
    rw = rw
      .on('body', { element(el) { if (view.full) el.setAttribute('class', 'is-full'); } })
      .on('[data-sec="open"]', { element(el) { el.removeAttribute('hidden'); } })
      .on('[data-sec="unknown"]', { element(el) { el.setAttribute('hidden', ''); } })
      .on('[data-v="emptyTotal"]', setText(String(view.total)))
      .on('[data-v="soonText"]', soonLine(view.soonText))
      .on('[data-v="soonTextFull"]', soonLine(view.soonText))
      .on('[data-v-on]', {
        element(el) {
          const t = el.getAttribute('data-v-on');
          if (TYPES.includes(t)) el.setAttribute('class', view.empty[t] > 0 ? 'count on' : 'count');
        }
      });
    for (const t of TYPES) {
      rw = rw.on('[data-v="' + t + '"]', setText(String(view.empty[t])));
      rw = rw.on('[data-v="' + BADGE_KEY[t] + '"]', {
        element(el) {
          el.setAttribute('class', view.badges[t].cls);
          el.setInnerContent(view.badges[t].text);
        }
      });
    }
  }
  const out = rw.transform(response);
  const headers = new Headers(PAGE_HEADERS);
  return new Response(out.body, { status: 200, headers });
}

export async function handleHome(request, env) {
  const asset = await env.ASSETS.fetch(request);
  const type = asset.headers.get('content-type') || '';
  if (!asset.ok || !type.includes('text/html')) return asset;

  let view = null;
  try {
    if (env.DB) view = await loadView(env.DB);
  } catch (e) {
    console.log('rooms load failed:', e && e.message);
    view = null;
  }
  try {
    return render(asset, view);
  } catch (e) {
    // 화면 채우기에서 문제가 나도 안전 화면(문의 안내)은 그대로 보냅니다
    console.log('render failed:', e && e.message);
    return new Response(asset.body, { status: 200, headers: new Headers(PAGE_HEADERS) });
  }
}
