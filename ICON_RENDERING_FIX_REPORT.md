# Icon Rendering Fix Report

## 1. 점검 범위

- 작업 위치: `C:/Users/hanbe/Desktop/Graduation_project_front`, 브랜치 `dev`.
- 라우터, Header/Footer, 이미지 import, SVG/currentColor, 페이지별 CSS를 조사했다. PNG, SVG 파일/React SVG, inline SVG, CSS 도형과 문자 아이콘이 혼재한다. 확인한 코드에서 별도의 아이콘 폰트 로드 문제는 발견하지 못했다.
- 실제 화면: 홈, 서비스 소개, 일정 생성, 검색, 추천(네트워크 오류 상태 포함), 로그인, 회원가입/약관 모달/아코디언, 비밀번호 찾기, 상세 페이지의 데이터 없는 오류 상태.
- 일정 생성의 수정 아이콘은 320×568, 390×844, 768×1024, 1366×768, 1920×1080 뷰포트에서 확인했다. 모든 페이지를 이 다섯 크기로 전수 검사한 것은 아니다.
- 로그인 후 마이페이지/설정/문의/관리자, 실제 데이터가 있는 상세/지도/여행 결과, 즐겨찾기 저장 전후, PDF/다운로드, 모든 토스트·필터 상태는 미검증이다. 인증을 우회하거나 실제 계정 데이터를 변경하지 않았다.

## 2. 발견 및 수정 내역

### 일정 생성 검색 아이콘

- `/route-create` 검색 입력의 PNG. 원본 `검색.png`는 30×18이며 오른쪽에 투명 여백이 있다. 기존 18×18 강제 지정과 기본 object-fit:fill이 보이는 돋보기를 가로로 압축했다.
- `src/RouteCreate/RouteCreate.css`의 `.route-search-icon`: width:auto, height:18px, max-width:none, object-fit:contain, display:block. 기존 left:16px, top:50%, translateY(-50%), 투명도 및 입력/클릭 영역은 유지했다.
- 수정 후 요소 30×18, 보이는 돋보기는 원본 비율을 유지한다. 홈에서 같은 원본을 쓰는 방식도 확인했으며 공용 asset은 변경하지 않았다.
- 다섯 뷰포트에서 요소 30×18, 문서 가로 넘침 없음. production 직접 진입/새로고침 후에도 동일.
- [수정 전](C:/Users/hanbe/.codex/visualizations/2026/09/28/01a0e958-d70c-70e0-9d4c-8270f264039b/icon-search-before.png) / [수정 후](C:/Users/hanbe/.codex/visualizations/2026/09/28/01a0e958-d70c-70e0-9d4c-8270f264039b/icon-search-after.png)

### 비밀번호 찾기 안내 아이콘

- `/find-password` 스팸 메일 안내의 `주의.png`: 원본 12×14를 13×13에 fill로 표시해 원본 비율이 변했다.
- `src/Login/FindPassword.css`의 `.find-password-help img`에 object-fit:contain만 추가했다. 13×13 표시 영역, flex-shrink:0, 문구와 간격은 그대로다.
- 320px 화면에서 수정 전후 비교 및 computed style 확인. 원본도 직접 열어 확인했고 교체/재생성하지 않았다.
- [수정 전](C:/Users/hanbe/.codex/visualizations/2026/09/28/01a0e958-d70c-70e0-9d4c-8270f264039b/icon-help-before.png) / [수정 후](C:/Users/hanbe/.codex/visualizations/2026/09/28/01a0e958-d70c-70e0-9d4c-8270f264039b/icon-help-after.png)

## 3. GNB 검증

현재 순서는 홈/검색/추천/일정/마이페이지이며 변경하지 않았다. 선택 여부와 관계없이 같은 SVG 컴포넌트와 path를 사용한다. 공통 영역 22×22, 개별 아이콘은 다음과 같다.

| 메뉴 | SVG 표시 크기 | 선택 방식 |
|---|---|---|
| 홈 | 16×18 | 동일 SVG의 currentColor |
| 검색 | 18×18 | 동일 SVG의 currentColor |
| 추천 | 22×22 | 동일 SVG의 currentColor |
| 일정 | 18×20 | 동일 SVG의 currentColor |
| 마이페이지 | 16×16 | 동일 SVG의 currentColor |

비선택 rgb(148,163,184), 선택 rgb(13,166,242), 즉 #0DA6F2. 브라우저의 일정 선택 상태에서 모든 SVG 크기/색상을 확인했고 홈·검색·추천 URL 상태도 확인했다. Footer 기존 테스트에서 5개 메뉴의 직접 진입/클릭 후 동일 컴포넌트 유지 검증이 통과했다. 테스트 SVG mock은 실제 실루엣 검증의 대체물이 아니다. 로그인 후 마이페이지 active 실화면, 모든 메뉴 hover/focus/다크모드 전환의 픽셀 비교는 미검증이다.

## 4. 회귀 검증

- 작업 전 src 백업과 파일 해시 비교: 기존 파일 중 달라진 것은 위 CSS 두 개뿐이다. GNB, Header, 서비스 소개 배너 크기/간격/asset, 온보딩 3장 및 AI 지도 contain 수정은 바이트 단위로 유지됐다.
- 전역 img/svg/button, 인증/API/보안, package 파일을 이번 작업에서 수정하지 않았다.
- 로그인 비밀번호 표시 전환, 회원가입 약관 열기/접기/닫기 동작을 확인했다. 원래 상태에 따라 모양이 바뀌는 아이콘은 변경하지 않았다.
- 페이지 전체 전수 회귀나 테마/실제 모바일 기기 검증 완료를 의미하지 않는다.

## 5. 테스트

- `CI=true npm test -- --watchAll=false --runInBand`: 13 suites, 64 tests 통과(새 CSS 회귀 테스트 2개 포함).
- `npm run build`: Compiled successfully. 기존 Browserslist 데이터 노후 경고만 있어 의존성은 변경하지 않았다.
- `git diff --check`: 통과(기존 LF/CRLF 안내는 별도).
- production build를 loopback 전용 서버로 열어 일정 생성 직접 진입/새로고침, 검색 PNG 30×18/contain, 이미지 로딩 실패 0개를 확인했다. [빌드 화면](C:/Users/hanbe/.codex/visualizations/2026/09/28/01a0e958-d70c-70e0-9d4c-8270f264039b/icon-production.png).
- 개발 화면 추천 데이터 요청 실패 로그는 아이콘 로딩 실패와 구분했다. 확인한 production 일정 화면에서 새로운 아이콘 관련 Console 오류는 관찰하지 못했다. 모든 리소스의 HTTP/MIME 및 운영 서버를 전수 검사한 것은 아니다.

## 6. 변경 범위

이번 변경: `src/RouteCreate/RouteCreate.css`, `src/Login/FindPassword.css`.
이번 추가: `src/utils/iconRendering.test.js`, 이 보고서.

기존 dirty/staged/untracked 작업은 보존했다. 작업 전 diff/index patch와 src 백업은 `C:/Users/hanbe/.codex/visualizations/2026/09/28/01a0e958-d70c-70e0-9d4c-8270f264039b/icon-fix-backup`에 있다. 원본 이미지, 디자인, 메뉴 구조, 클릭 영역은 변경하지 않았다. 커밋/푸시/배포하지 않았다.

## 7. 남은 항목

- 환경 접근 필요: 승인된 테스트 계정 및 관리자 권한으로 보호 화면, 설정 테마, 저장/즐겨찾기 등 실제 상태 전환 확인.
- 데이터/외부 리소스: 추천 API 오류 상태 때문에 실제 결과 카드 전체 검증 제한. 지도 SDK 생성 아이콘과 실제 여행 결과/PDF는 미검증이며 인증·지도 설정을 추측해 수정하지 않았다.
- 미검증: 브라우저 125%/150% 확대, 실제 모바일 기기, 모든 페이지×모든 상태×모든 뷰포트 조합, 운영 배포 후 경로/MIME.
- 원본 필요: 이번 두 수정에는 추가 원본이 필요하지 않았다. 재현되지 않은 후보는 새 아이콘으로 대체하지 않았다.

따라서 확인된 두 왜곡은 수정했지만, 서비스 전체의 모든 인증/데이터/테마 상태가 검증 완료된 것은 아니다.
