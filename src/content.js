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
      { key: 'smsPhone', label: '문자 받을 휴대폰 번호 (문자 버튼)', type: 'tel', max: 20, emptyOk: true, def: '010-5872-6575', help: '비우면 문자 버튼이 안 보입니다' },
      { key: 'smsText', label: '문자 첫 문장 (손님 문자창에 미리 써짐)', type: 'text', max: 60, emptyOk: true, def: '니오빌원룸텔 문의드립니다.' },
      { key: 'kakaoLink', label: '카카오톡 링크 (오픈채팅 또는 채널)', type: 'url', max: 200, def: 'https://open.kakao.com/o/s2f3yqRi' },
      { key: 'blogUrl', label: '네이버 블로그 주소 (최근 소식 자동 표시)', type: 'url', max: 200, emptyOk: true, def: 'https://m.blog.naver.com/niovill_stay', help: '비워 두면 최근 소식이 안 보입니다' },
      { key: 'applyDone', label: '신청 완료 화면 안내 문구', type: 'text', max: 80, def: '늦은 시간에 접수된 신청은 다음 날 오전에 연락드립니다' },
      { key: 'privacyOfficer', label: '개인정보 보호책임자 (개인정보처리방침에 표시)', type: 'text', max: 20, def: '엄경환' },
      { key: 'bizInfo', label: '사업자 정보 (맨 아래)', type: 'text', max: 120, def: '대표 [이름] · 사업자등록번호 [000-00-00000]', help: '예: 대표 홍길동 · 사업자등록번호 123-45-67890' }
    ]
  },
  {
    title: '맨 위 소개',
    fields: [
      { key: 'hero', label: '대표 사진', type: 'photo', alt: '외관 또는 대표 방' },
      { key: 'introTitle', label: '큰 제목', type: 'text', max: 40, def: '임학역 도보 9분, 계양구청 앞 원룸텔' },
      { key: 'introDesc', label: '설명 한 줄', type: 'text', max: 80, def: '전 객실 개인 화장실 · 혼자 지내기 편한 깔끔한 방' },
      { key: 'introChips', label: '장점 (한 줄에 하나, 최대 6개)', type: 'lines', maxLines: 6, max: 20, def: '쌀·라면·시리얼·커피 무료\n세탁기·건조기 무료\n무료 주차\n세스코 정기 방역' }
    ]
  },
  {
    title: '니오빌원룸텔 소개',
    fields: [
      { key: 'aboutGreeting', label: '인사말 (줄바꿈 그대로 표시)', type: 'lines', maxLines: 8, max: 60, def: '저희 니오빌원룸텔을 찾아주셔서 감사드립니다.\n고객님의 편리하고 쾌적한 생활환경을 위해\n항상 최선을 다하도록 하겠습니다.\n조용한 원룸텔을 찾으신다면, 니오빌원룸텔입니다.' },
      { key: 'aboutPoints', label: '이런 점이 좋습니다 (한 줄에 하나, 최대 12개)', type: 'lines', maxLines: 12, max: 60, def: '풀옵션 (세탁기, 건조기, 에어컨, 냉장고, TV, 책상, 옷장, 화장실)\n철저한 보안 및 소방시설 운영\n계양구청, 계산역, 임학역 인접한 위치\n철저한 시설 및 청결관리 (세스코 방역)\n주변 대비 저렴한 비용\n현관 및 개인실 도어락 출입문 설치\n타 업체 대비 넓은 방과 넓은 복도\n쌀, 라면, 시리얼, 원두커피 무료 제공\n방 개수가 많지 않은 조용한 원룸텔\n무료 주차 가능' },
      { key: 'aboutClosing', label: '마무리 문장', type: 'text', max: 80, def: '상담 문의 주시면 친절하게 상담해 드리겠습니다.' }
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
      { key: 'featCommon', label: '④ 설명', type: 'text', max: 60, def: '공용주방 · 세탁실 · 쌀·라면·시리얼·원두커피' }
    ]
  },
  {
    title: '이용 안내',
    fields: [
      { key: 'infoMin', label: '최소 입실', type: 'text', max: 40, def: '1개월' },
      { key: 'infoRent', label: '월세', type: 'text', max: 40, def: '선불 · 매월 입실일 기준' },
      { key: 'infoDeposit', label: '보증금', type: 'text', max: 40, def: '[보증금 안내]' },
      { key: 'infoFree', label: '무료 제공', type: 'text', max: 40, def: '쌀 · 라면 · 시리얼 · 원두커피' },
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
    title: '주변 생활 안내 (/guide 페이지)',
    fields: [
      { key: 'guideIntro', label: '첫 문장', type: 'text', max: 160, def: '니오빌원룸텔은 계양구청 바로 앞, 인천1호선 임학역과 계산역 사이에 있습니다. 지하철 한 번으로 공항철도·서울 지하철과 이어지고, 마트·공원·계양산이 가까워 혼자 살기 편한 동네입니다.' },
      { key: 'guideFor', label: '이런 분께 좋아요', type: 'lines', maxLines: 8, max: 100, def: '계양구청·관공서 근처 직장인: 걸어서 출퇴근\n공항·항공 일하시는 분: 계양역(공항철도)까지 지하철 3정거장\n서울로 출퇴근하시는 분: 부평구청역(7호선)·부평역(1호선) 환승\n경인여자대학교 학생: 계산역 주변\n차를 가지고 계신 분: 무료 주차, 계양IC 인근' },
      { key: 'guideTransit', label: '지하철 · 자동차', type: 'lines', maxLines: 10, max: 100, def: '임학역 (인천1호선): 도보 약 9분\n계산역 (인천1호선): 도보 약 18분\n계양역 · 공항철도 환승: 임학역에서 3정거장 (김포공항 · 서울역 · 인천공항 방면)\n부평구청역 · 서울 7호선 환승: 임학역에서 5정거장\n부평역 · 서울 1호선 환승: 임학역에서 7정거장\n인천시청역 · 인천2호선 환승: 임학역에서 11정거장\n자동차: 무료 주차 · 수도권제1순환고속도로 계양IC 인근' },
      { key: 'guideOffice', label: '관공서 · 은행', type: 'lines', maxLines: 8, max: 100, def: '계양구청: 바로 앞\n계양경찰서 · 계양우체국: 임학역·계산역 주변\n계산119안전센터: 계산역 주변\n기업은행 · 국민은행: 계산역 주변' },
      { key: 'guideShop', label: '장보기', type: 'lines', maxLines: 8, max: 100, def: '롯데마트 계양점: 계산역 주변\n홈플러스 계산점: 계산역 주변' },
      { key: 'guideMed', label: '병원', type: 'lines', maxLines: 8, max: 100, def: '인천세종병원 (종합병원): 계양구 계양문화로\n임학역 · 계산역 주변: 동네 병·의원 다수\n응급 상황: 119' },
      { key: 'guideWalk', label: '산책 · 운동', type: 'lines', maxLines: 8, max: 100, def: '계양산: 해발 395m, 강화도를 빼면 인천에서 가장 높은 산 · 계산역에서 등산로 입구가 가까움 · 9개 코스 50분~2시간\n계양산성: 계양산 역사 유적 · 임학공원에서 무장애길로 연결\n계양체육관: 임학역 주변\n계산국민체육센터: 계산역 주변' },
      { key: 'guideLife', label: '학교 · 문화', type: 'lines', maxLines: 8, max: 100, def: '경인여자대학교: 계산역 주변\n계양도서관: 계산역 주변\n계양문화회관: 계산역 주변' },
      { key: 'guideMore', label: '생활 편의 (편의점·카페·맛집 등, 선택)', type: 'lines', maxLines: 8, max: 100, def: '', help: '비워 두면 이 묶음은 안 보입니다. 예: CU 편의점: 건물 1층' }
    ]
  },
  {
    title: '구글 검색 · 영어 페이지',
    fields: [
      { key: 'priceRange', label: '가격대 (구글 검색 결과에 표시)', type: 'text', max: 40, def: '월 32만~40만 원' },
      { key: 'seoDesc', label: '검색 결과 설명 (구글·네이버에 보이는 2줄)', type: 'text', max: 160, def: '인천 계양구 계산동 니오빌원룸텔. 임학역 도보 9분, 계양구청 앞. 전 객실 개인 화장실, 쌀·라면·시리얼·원두커피 무료, 무료 주차. 24시간 상담 신청.' },
      { key: 'googleVerify', label: '구글 서치콘솔 확인 코드', type: 'text', max: 100, def: 'VCc-3AiZ5hV0ZCrBDw6s_c5rabNxqXhfld_1xS6u-QQ', help: '서치콘솔 → HTML 태그에서 content="…" 안의 글자만 붙여 넣기' },
      { key: 'naverVerify', label: '네이버 서치어드바이저 확인 코드', type: 'text', max: 100, def: 'c487297204187d448c884b9e8c820e23a6e5e005', help: '서치어드바이저 → HTML 태그에서 content="…" 안의 글자만 붙여 넣기' },
      { key: 'googleMap', label: '구글 지도 링크 (구글 비즈니스 프로필 → 공유)', type: 'url', max: 300, def: '', help: '비워 두면 버튼이 안 보입니다' },
      { key: 'googleReview', label: '구글 리뷰 보기 링크', type: 'url', max: 300, def: '', help: '비워 두면 버튼이 안 보입니다' },
      { key: 'enPricePremium', label: '영어 가격 ① 프리미엄 외창', type: 'text', max: 40, def: 'KRW 400,000~ / month' },
      { key: 'enPriceOuter', label: '영어 가격 ② 외창', type: 'text', max: 40, def: 'KRW 340,000~380,000 / month' },
      { key: 'enPriceInner', label: '영어 가격 ③ 내창', type: 'text', max: 40, def: 'KRW 320,000~340,000 / month' },
      { key: 'enDeposit', label: '영어 보증금 안내', type: 'text', max: 60, def: 'Please ask us' },
      { key: 'enMinStay', label: '영어 최소 입실', type: 'text', max: 40, def: '1 month' },
      { key: 'enPayment', label: '영어 결제', type: 'text', max: 60, def: 'Monthly, in advance' },
      { key: 'enWay', label: '영어 교통 (한 줄에 하나, "이름: 내용")', type: 'lines', maxLines: 6, max: 80, def: 'Imhak Station (Incheon Line 1): 9 min walk\nGyesan Station (Incheon Line 1): 18 min walk\nGyeyang-gu Office: Right in front\nParking: Free' },
      { key: 'enAddress', label: '영어 주소 (구글 비즈니스 프로필 영어 주소와 맞추기)', type: 'text', max: 160, def: '6F, Bldg B, Donggu Plaza (Red Mall 2), 6 Gyesansae-ro 87beon-gil, Gyeyang-gu, Incheon' },
      { key: 'enPoints', label: '영어 장점 목록 (한 줄에 하나)', type: 'lines', maxLines: 12, max: 100, def: 'Fully furnished (washer, dryer, air conditioner, fridge, TV, desk, wardrobe, bathroom)\nStrict security and fire safety systems\nClose to Gyeyang-gu Office, Gyesan Station and Imhak Station\nThorough maintenance and cleaning (regular Cesco pest control)\nAffordable compared to nearby places\nDoor locks on the main entrance and every room\nLarger rooms and wider hallways than most goshiwons\nFree rice, ramen, cereal and coffee\nA quiet house with a small number of rooms\nFree parking' }
    ]
  },
  {
    title: '오시는 길',
    fields: [
      { key: 'building', label: '건물 사진 (선택)', type: 'photo', alt: '건물 외관' },
      { key: 'wayInfo', label: '교통 (한 줄에 하나, "이름: 내용")', type: 'lines', maxLines: 6, max: 60, def: '임학역 (인천1호선): 도보 약 9분\n계산역 (인천1호선): 도보 약 18분\n계양구청: 바로 앞\n주차: 무료 주차 가능' },
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
    // 비워 두면 기본값. 단, '비우면 숨김' 칸(emptyOk)은 비운 그대로 둠
    if (f.emptyOk && v === '') values[f.key] = '';
    else values[f.key] = v === undefined || v === '' || (Array.isArray(v) && !v.length) ? f.def : v;
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
        } else if (k === 'phoneIntl') {
          const d = String(v.phone || '').replace(/[^0-9]/g, '');
          el.setInnerContent(d.startsWith('0') ? '+82-' + d.slice(1).replace(/^(\d{1,2})(\d{3,4})(\d{4})$/, '$1-$2-$3') : String(v.phone || ''));
        } else if (Object.prototype.hasOwnProperty.call(v, k) && typeof v[k] === 'string') {
          el.setInnerContent(v[k]);
        }
      }
    })
    .on('[data-lines]', {
      element(el) {
        const lines = String(v[el.getAttribute('data-lines')] || '').split('\n').filter(Boolean);
        el.setInnerContent(lines.map((t) => '<li>' + esc(t) + '</li>').join(''), { html: true });
      }
    })
    .on('[data-paras]', {
      element(el) {
        const lines = String(v[el.getAttribute('data-paras')] || '').split('\n').filter(Boolean);
        el.setInnerContent(lines.map((t) => esc(t)).join('<br>'), { html: true });
      }
    })
    .on('[data-hide-empty]', {
      element(el) {
        if (!String(v[el.getAttribute('data-hide-empty')] || '').trim()) el.setAttribute('hidden', '');
      }
    })
    .on('meta[data-seo]', {
      element(el) {
        const t = String(v[el.getAttribute('data-seo')] || '').replace(/\{site\}/g, v.siteName || '');
        if (t) el.setAttribute('content', t);
      }
    })
    .on('[data-dl]', {
      element(el) {
        const lines = String(v[el.getAttribute('data-dl')] || '').split('\n').filter(Boolean);
        el.setInnerContent(
          lines
            .map((t) => {
              const i = t.indexOf(':');
              const a = i > 0 ? t.slice(0, i).trim() : t.trim();
              const b = i > 0 ? t.slice(i + 1).trim() : '';
              return '<div><dt>' + esc(a) + '</dt><dd>' + esc(b) + '</dd></div>';
            })
            .join(''),
          { html: true }
        );
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
        if (!ver) {
          // 사진을 안 올린 칸은 숨김 (회색 빈칸이 보이지 않게)
          el.setAttribute('hidden', '');
          return;
        }
        const f = FIELDS[k];
        const alt = [v.siteArea, v.siteName, f && f.alt ? f.alt : ''].filter(Boolean).join(' ');
        el.removeAttribute('hidden');
        el.setInnerContent('<img src="/media/' + esc(k) + '?v=' + esc(ver) + '" alt="' + esc(alt.trim()) + '"' + (k === 'hero' ? '' : ' loading="lazy"') + '>', { html: true });
      }
    })
    .on('[data-href]', {
      element(el) {
        const k = el.getAttribute('data-href');
        if (v[k]) {
          el.setAttribute('href', v[k]);
          if (el.hasAttribute('data-optional')) el.removeAttribute('hidden');
        } else if (el.hasAttribute('data-optional')) {
          el.setAttribute('hidden', '');
        }
      }
    })
    // 제목·설명 글에 상호 넣기: data-tpl="{site} | ..."
    .on('[data-tpl]', {
      element(el) {
        const raw = el.getAttribute('data-tpl')
          .replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
        const t = raw.replace(/\{site\}/g, v.siteName || '');
        if (el.tagName === 'title') el.setInnerContent(t);
        else el.setAttribute('content', t);
      }
    })
    .on('[data-sms]', {
      element(el) {
        const digits = String(v.smsPhone || '').replace(/[^0-9+]/g, '');
        if (!digits) { el.setAttribute('hidden', ''); return; }
        // '?&body=' 는 아이폰·갤럭시 모두에서 첫 문장이 채워지는 형식
        el.setAttribute('href', 'sms:' + digits + (v.smsText ? '?&body=' + encodeURIComponent(v.smsText) : ''));
        el.removeAttribute('hidden');
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

/* ── 검색 정보: 대표 주소 · 구조화 데이터 · 공유 미리보기 ── */
const jsonSafe = (o) => JSON.stringify(o).replace(/</g, '\\u003c');

export function applySeo(rw, values, photos, origin, path) {
  const v = values;
  const url = origin + path;
  const hero = photos.hero ? origin + '/media/hero?v=' + photos.hero : '';
  const biz = {
    '@context': 'https://schema.org',
    '@type': 'LodgingBusiness',
    name: v.siteName,
    url: origin + '/',
    telephone: v.phone,
    priceRange: v.priceRange,
    address: { '@type': 'PostalAddress', streetAddress: [v.addr1, v.addr2].filter(Boolean).join(' '), addressCountry: 'KR' },
    amenityFeature: String(v.introChips || '').split('\n').filter(Boolean).map((n) => ({ '@type': 'LocationFeatureSpecification', name: n, value: true }))
  };
  if (hero) biz.image = [hero];
  const same = [v.googleMap, v.mapLink, v.blogUrl].filter(Boolean);
  if (same.length) biz.sameAs = same;
  const graph = [biz];
  if (path === '/' && Array.isArray(v.faq) && v.faq.length) {
    graph.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: v.faq.map((it) => ({ '@type': 'Question', name: it.q, acceptedAnswer: { '@type': 'Answer', text: it.a } }))
    });
  }
  return rw
    .on('script[data-ld]', { element(el) { el.setInnerContent(jsonSafe(graph.length === 1 ? graph[0] : graph), { html: true }); } })
    .on('meta[data-verify]', {
      element(el) {
        const code = String(v[el.getAttribute('data-verify')] || '').replace(/[^A-Za-z0-9_\-]/g, '');
        if (code) el.setAttribute('content', code);
        else el.remove();
      }
    })
    .on('link[data-canon]', { element(el) { el.setAttribute('href', url); } })
    .on('link[data-alt]', { element(el) { el.setAttribute('href', origin + el.getAttribute('data-alt')); } })
    .on('meta[data-og="url"]', { element(el) { el.setAttribute('content', url); } })
    .on('meta[data-og="image"]', { element(el) { if (hero) el.setAttribute('content', hero); else el.remove(); } });
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
