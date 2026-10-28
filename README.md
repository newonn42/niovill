# 고시원 · 원룸텔 홈페이지 (niovill)

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/newonn42/neovill-site)

버튼 한 번으로 내 Cloudflare 계정에 설치됩니다. 데이터베이스도 자동으로 만들어지고 연결됩니다. 비용은 0원(무료 요금제)입니다.

## 설치 (처음 한 번)
1. 위 **Deploy to Cloudflare** 버튼을 누릅니다
2. Cloudflare에 로그인(없으면 무료 가입)하고, GitHub 계정을 연결합니다
3. 이름 칸은 그대로 두거나 원하는 영문 이름으로 바꾸고 **Create and deploy**를 누릅니다
4. 1~2분 뒤 나오는 주소(`이름.계정.workers.dev`)로 들어가면 홈페이지가 열립니다
5. 확인: 주소 뒤에 `/api/health`를 붙였을 때 `"db":true`가 나오면 설치 완료입니다
6. 주소 뒤에 `/admin`을 붙여 들어가 **관리자 만들기**를 합니다 (설치 직후 바로)

## 진행 단계
| 단계 | 내용 | 상태 |
|---|---|---|
| 1 | 손님 화면 | ✅ |
| 2 | 데이터베이스(D1) · Workers · 설치 버튼 | ✅ |
| 3 | 관리자 로그인 · 계정 | ✅ |
| 3' | 상담형 홈 + 모집 중 / 만실 스위치 | ✅ |
| 4 | 상담 신청 저장 + 신청함 | |
| 5 | 텔레그램 알림 | |
| 6 | 내용 · 사진 수정 | |
| 7 | 외국인(영어) 페이지 + 지역 페이지 3개 | |
| 8 | 개인정보처리방침 · 검색 등록 → 오픈 | |

오픈 전까지 `robots.txt`, `public/_headers`, `src/home.js`로 검색 수집을 막아 둡니다.

## 구조
| 위치 | 내용 |
|---|---|
| `public/` | 화면 파일 (그대로 전송) |
| `src/index.js` | 입구: `/` 홈, `/api/health` 설치 확인, `/api/admin/...` 관리자 기능 |
| `src/admin-api.js` · `src/auth.js` | 관리자 기능 · 로그인(30일 유지, 5번 틀리면 계정 10분 잠금) |
| `public/admin/` | 관리자 화면 |
| `src/home.js` | 홈 화면 문구: 모집 중(기본) / 만실. 스위치를 못 읽으면 모집 중 화면 |
| `migrations/` | 데이터베이스 표 만들기 (배포할 때 자동 실행) |
| `wrangler.json` | Cloudflare 설정 (데이터베이스 연결 이름 `DB`) |

## 운영
- 평소: 할 일 없음. 신청은 24시간 접수됩니다
- 오래 만실일 때만: `/admin` → **모집 상태** → **만실** (홈 문구가 "현재 만실 · 대기 신청"으로 바뀜)
