# 고시원 · 원룸텔 홈페이지 (niovill)

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/newonn42/neovill-site)

버튼 한 번으로 내 Cloudflare 계정에 설치됩니다. 데이터베이스도 자동으로 만들어지고 연결됩니다. 비용은 0원(무료 요금제)입니다.

## 설치 (처음 한 번)
1. 위 **Deploy to Cloudflare** 버튼을 누릅니다
2. Cloudflare에 로그인(없으면 무료 가입)하고, GitHub 계정을 연결합니다
3. 이름 칸은 그대로 두거나 원하는 영문 이름으로 바꾸고 **Create and deploy**를 누릅니다
4. 1~2분 뒤 나오는 주소(`이름.계정.workers.dev`)로 들어가면 홈페이지가 열립니다
5. 확인: 주소 뒤에 `/api/health`를 붙였을 때 `"db":true`가 나오면 설치 완료입니다

## 진행 단계
| 단계 | 내용 | 상태 |
|---|---|---|
| 1 | 손님 화면 (고정 데이터) | ✅ |
| 2 | 공실 데이터베이스(D1) 연결 · Workers 이전 · 설치 버튼 | ✅ |
| 3 | 관리자 로그인 + 방 등록 · 공실 관리 | |
| 4 | 신청서 저장 + 신청함 | |
| 5 | 텔레그램 알림 | |
| 6 | 내용 수정 + 사진 + 방 타입 | |
| 7 | 개인정보처리방침 · 자동 삭제 · 내보내기 · 검색 설정 | |
| 8 | 실제 내용 입력 → 오픈 (검색 차단 해제) | |

오픈 전까지 `robots.txt`, `public/_headers`, `src/home.js`로 검색 수집을 막아 둡니다.

## 구조
| 위치 | 내용 |
|---|---|
| `public/` | 화면 파일 (그대로 전송) |
| `src/index.js` | 입구: `/` 홈, `/api/health` 설치 확인 |
| `src/home.js` | 홈 화면에 실제 공실을 채움. 데이터를 못 읽으면 "공실은 문의해 주세요" 안전 화면 |
| `migrations/` | 데이터베이스 표 만들기 (배포할 때 자동 실행) |
| `examples/niovill-rooms.sql` | 니오빌 방 목록 예시 |
| `wrangler.json` | Cloudflare 설정 (데이터베이스 연결 이름 `DB`) |

## 방 상태 값
| 값 | 뜻 |
|---|---|
| occupied | 입실중 |
| empty | 공실 (지금 입실 가능) |
| soon | 입실예정 (퇴실 예정 방) · `avail_date`에 날짜(YYYY-MM-DD), 없으면 "곧 입실 가능" |
| hidden | 화면에 안 보임 (사무실 등) |

방 등록 · 상태 변경은 3단계 관리자 화면에서 합니다.
