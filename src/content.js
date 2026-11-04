/* 홈페이지 내용(문구 · 사진) – 관리자 '내용' 탭에서 수정
   - 값이 없는 항목은 아래 기본값(=화면 파일에 적힌 글)이 그대로 나갑니다.
   - 글은 settings 표의 'content'에, 사진은 photos 표에 저장합니다. */

// 수정할 수 있는 항목 (관리자 화면도 이 목록으로 그려집니다)
export const GROUPS = [
  {
    title: '기본 정보',
    fields: [
      { key: 'siteName', label: '상호 (화면 위·아래에 표시)', type: 'text', max: 30, def: '니오빌원룸텔' },
      { key: 'siteArea', label: '상호 아래 작은 글씨', type: 'text', max: 30, def: '인천 계양구 계산동' },
      { key: 'phone', label: '전화번호 (전화 버튼)', type: 'tel', max: 20, def: '032-542-0066' },
      { key: 'kakaoLink', label: '카카오톡 링크 (오픈채팅 또는 채널)', type: 'url', max: 200, def: 'https://open.kakao.com/o/s2f3yqRi' },
      { key: 'bizInfo', label: '사업자 정보 (맨 아래)', type: 'text', max: 120, def: '대표 [이름] · 사업자등록번호 [000-00-00000]', help: '예: 대표 홍길동 · 사업자등록번호 123-45-67890' }
    ]
  },
  {
    title: '맨 위 소개',
    fields: [
      { key: 'hero', label: '대표 사진', type: 'photo', alt: '외관 또는 대표 방' },
      { key: 'introTitle', label: '큰 제목', type: 'text', max: 40, def: '임학역 도보 9분, 계양구청 앞 원룸텔' },
      { key: 'introDesc', label: '설명 한 줄', type: 'text', max: 80, def: '전 객실 개인 화장실 · 혼자 지내기 편한 깔끔한 방' },
      { key: 'introChips', label: '장점 (한 줄에 하나, 최대 6개)', type: 'lines', maxLines: 6, max: 20, def: '쌀·라면·커피 무료\n세탁기·건조기 무료\n무료 주차\n세스코 정기 방역' }
    ]
  },
  {
    title: '방 타입',
    fields: [
      { key: 'premium', label: '① 사진', type: 'photo', alt: '프리미엄 외창 방' },
      { key: 'namePremium', label: '① 이름', type: 'text', max: 20, def: '프리미엄 외창' },
      { key: 'pricePremium', label: '① 가격', type: 'text', max: 30, def: '월 40만 원~' },
      { key: 'featPremium', label: '① 설명', type: 'text', max: 60, def: '가장 넓은 외창 방 · 채광·환기' },
      { key: 'outer', label: '② 사진', type: 'photo', alt: '외창 방' },
      { key: 'nameOuter', label: '② 이름', type: 'text', max: 20, def: '외창' },
      { key: 'priceOuter', label: '② 가격', type: 'text', max: 30, def: '월 34~38만 원' },
      { key: 'featOuter', label: '② 설명', type: 'text', max: 60, def: '바깥 창문 · 밝고 환기가 잘 되는 방' },
      { key: 'inner', label: '③ 사진', type: 'photo', alt: '내창 방' },
      { key: 'nameInner', label: '③ 이름', type: 'text', max: 20, def: '내창' },
      { key: 'priceInner', label: '③ 가격', type: 'text', max: 30, def: '월 32~34만 원' },
      { key: 'featInner', label: '③ 설명', type: 'text', max: 60, def: '복도 쪽 창 · 합리적인 가격' },
      { key: 'common', label: '④ 사진', type: 'photo', alt: '공용공간' },
      { key: 'nameCommon', label: '④ 이름', type: 'text', max: 20, def: '공용공간' },
      { key: 'priceCommon', label: '④ 가격', type: 'text', max: 30, def: '무료' },
      { key: 'featCommon', label: '④ 설명', type: 'text', max: 60, def: '공용주방 · 밥·라면·커피 · 세탁실' }
    ]
  },
  {
    title: '이용 안내',
    fields: [
      { key: 'infoMin', label: '최소 입실', type: 'text', max: 40, def: '1개월' },
      { key: 'infoRent', label: '월세', type: 'text', max: 40, def: '선불 · 매월 입실일 기준' },
      { key: 'infoDeposit', label: '보증금', type: 'text', max: 40, def: '[보증금 안내]' },
      { key: 'infoFree', label: '무료 제공', type: 'text', max: 40, def: '밥 · 라면 · 커피' },
      { key: 'infoSecurity', label: '보안', type: 'text', max: 40, def: '모든 방 개별 도어락' }
    ]
  },
  {
    title: '자주 묻는 질문',
    fields: [
      {
        key: 'faq', label: '질문과 답 (최대 8개)', type: 'faq', maxItems: 8,
        def: [
          { q: '최소 얼마나 살아야 하나요?', a: '1개월부터 입실할 수 있습니다. 연장은 언제든 가능합니다.' },
          { q: '방을 먼저 볼 수 있나요?', a: '상담 신청서에 방보기 희망일을 남겨주시면 가능한 시간을 맞춰 연락드립니다.' },
          { q: '만실이면 어떻게 하나요?', a: '대기 신청을 남겨주시면 공실이 생겼을 때 먼저 연락드립니다.' },
          { q: '외국인도 입실할 수 있나요?', a: '가능합니다. 신분 확인 후 입실하실 수 있습니다.' }
        ]
      }
    ]
  },
  {
    title: '오시는 길',
    fields: [
      { key: 'building', label: '건물 사진 (선택)', type: 'photo', alt: '건물 외관' },
      { key: 'addr1', label: '주소', type: 'text', max: 60, def: '인천 계양구 계산새로87번길 6' },
      { key: 'addr2', label: '상세 주소', type: 'text', max: 60, def: '동구프라자(레드몰2차) B동 6층' },
      { key: 'mapLink', label: '네이버 지도 링크', type: 'url', max: 500, def: 'https://map.naver.com/p/search/%EC%9D%B8%EC%B2%9C%20%EA%B3%84%EC%96%91%EA%B5%AC%20%EA%B3%84%EC%82%B0%EC%83%88%EB%A1%9C87%EB%B2%88%EA%B8%B8%206' }
    ]
  }
];

export const FIELDS = {};
for (const g of GROUPS) for (const f of g.fields) FIELDS[f.key] = f;
export const PHOTO_KEYS = Object.values(FIELDS).filter((f) => f.type === 'photo').map((f) => f.key);

const clean = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max);

// 들어온 값 검사 → { values } 또는 { error }
export function validate(input) {
  const out = {};
  for (const [key, raw] of Object.entries(input || {})) {
    const f = FIELDS[key];
    if (!f || f.type === 'photo') continue;
    if (f.type === 'faq') {
      if (!Array.isArray(raw)) return { error: '자주 묻는 질문 형식이 맞지 않습니다' };
      const items = raw
        .map((it) => ({ q: clean(it && it.q, 60), a: clean(it && it.a, 300) }))
        .filter((it) => it.q && it.a)
        .slice(0, f.maxItems);
      out[key] = items;
      continue;
    }
    if (f.type === 'lines') {
      const lines = String(raw || '').split('\n').map((l) => clean(l, f.max)).filter(Boolean).slice(0, f.maxLines);
      out[key] = lines.join('\n');
      continue;
    }
    const v = clean(raw, f.max);
    if (f.type === 'url' && v && !/^https:\/\/[^\s<>"']+$/.test(v)) return { error: f.label + ': https:// 로 시작하는 주소를 넣어 주세요' };
    if (f.type === 'tel' && v && !/^[0-9+\-\s()]{8,20}$/.test(v)) return { error: '전화번호를 확인해 주세요' };
    out[key] = v;
  }
  return { values: out };
}

export async function loadContent(db) {
  let saved = {};
  try {
    const row = await db.prepare("SELECT value FROM settings WHERE key = 'content'").first();
    if (row) saved = JSON.parse(row.value) || {};
  } catch (e) {
    saved = {};
  }
  const values = {};
  for (const f of Object.values(FIELDS)) {
    if (f.type === 'photo') continue;
    const v = saved[f.key];
    // 비워 두면 기본값
    values[f.key] = v === undefined || v === '' || (Array.isArray(v) && !v.length) ? f.def : v;
  }
  return { values, saved };
}

export async function loadPhotoVersions(db) {
  const out = {};
  try {
    const { results } = await db.prepare("SELECT key, strftime('%s', updated_at) AS v FROM photos").all();
    for (const r of results || []) out[r.key] = r.v;
  } catch (e) { /* 사진 없음 */ }
  return out;
}

/* ── 화면에 채우기 ── */
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function applyContent(rw, values, photos) {
  const v = values;
  rw = rw
    .on('[data-k]', {
      element(el) {
        const k = el.getAttribute('data-k');
        if (k === 'introChips') {
          el.setInnerContent(String(v.introChips || '').split('\n').filter(Boolean).map((t) => '<li>' + esc(t) + '</li>').join(''), { html: true });
        } else if (k === 'phoneText') {
          el.setInnerContent(String(v.phone || ''));
        } else if (Object.prototype.hasOwnProperty.call(v, k) && typeof v[k] === 'string') {
          el.setInnerContent(v[k]);
        }
      }
    })
    .on('[data-list="faq"]', {
      element(el) {
        const items = Array.isArray(v.faq) ? v.faq : [];
        el.setInnerContent(
          items
            .map((it, i) =>
              '<div class="faq"><button type="button" aria-expanded="false" aria-controls="faq' + (i + 1) + '">' + esc(it.q) +
              '</button><p id="faq' + (i + 1) + '" hidden>' + esc(it.a) + '</p></div>'
            )
            .join(''),
          { html: true }
        );
      }
    })
    .on('[data-photo]', {
      element(el) {
        const k = el.getAttribute('data-photo');
        const ver = photos[k];
        if (!ver) return;
        const f = FIELDS[k];
        const alt = (v.siteName || '') + ' ' + (f && f.alt ? f.alt : '');
        el.removeAttribute('hidden');
        el.setInnerContent('<img src="/media/' + esc(k) + '?v=' + esc(ver) + '" alt="' + esc(alt.trim()) + '"' + (k === 'hero' ? '' : ' loading="lazy"') + '>', { html: true });
      }
    })
    .on('[data-href]', {
      element(el) {
        const k = el.getAttribute('data-href');
        if (v[k]) el.setAttribute('href', v[k]);
      }
    })
    .on('[data-tel]', {
      element(el) {
        const digits = String(v.phone || '').replace(/[^0-9+]/g, '');
        if (digits) el.setAttribute('href', 'tel:' + digits);
      }
    });
  return rw;
}

/* ── 사진 보내기 (/media/키) ── */
export async function handleMedia(env, key) {
  if (!PHOTO_KEYS.includes(key) || !env.DB) return new Response('Not found', { status: 404 });
  const row = await env.DB.prepare('SELECT mime, data FROM photos WHERE key = ?').bind(key).first();
  if (!row) return new Response('Not found', { status: 404 });
  const bin = atob(row.data);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Response(bytes, {
    headers: {
      'Content-Type': row.mime,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}
