# Frontend Security Remediation Report

2026-09-30 · Graduation_project_front · dev · FRONTEND ONLY

로컬 보안 수정 및 자동 검증 완료. 운영 배포 승인 상태는 아님. 커밋·푸시·PR·배포하지 않음.
이전 작업에서 이미 존재했던 보안 변경은 보존하고 재검증했다. 이번 작업에서 Backend는 수정/빌드하지 않았다.

## 1. 수정 결과

| 기존 위험 범주 기준 | Critical | High | Medium | Low |
|---|---:|---:|---:|---:|
| Before | 0 | 1 | 4 | 3 |
| After: 로컬 정적 재평가 | 0 | 1 | 2 | 2 |

남은 범주: HTTP API(H), JS 저장소 토큰(M), 불완전 CSP(M), 프론트 입력/오류 방어만으로 부족한 서버 검증(L), 의존성 도구 체인(L).
로그·production 소스맵·로그아웃 개인정보 잔류 3개 범주는 로컬에서 개선. 부분 완화 항목도 잔여 개수에 포함했다.
이는 원래 감사 범주 비교이지 침투시험 또는 npm audit 개수가 아니다. 미배포 운영 사이트의 점수를 낮췄다는 의미도 아니다.

## 2. FIXED

| 문제 | 파일 | 수정 내용 | 검증 |
|---|---|---|---|
| raw 오류/개인정보 로그 | src/utils/safeLog.js, src/api/api.js 및 관련 페이지 | 안전한 context/status만 기록, production 불필요 로그 제거 | safeLog/API 테스트 |
| 외부 OAuth 이동 및 state | src/utils/oauthSecurity.js, src/Login/Login.jsx, OAuthCallback.jsx | 정확한 HTTPS host, provider state, 만료/일회성, URL 정리 | 성공/실패/StrictMode 테스트 |
| 로그아웃 개인정보 | src/utils/authStorage.js, src/api/authApi.js, src/Mypage/MyPage.jsx | 토큰 및 개인 cache 정리, 테마 보존 | storage 테스트 |
| 지도 URL 느슨한 부분문자열 검사 | src/utils/mapUrl.js, src/RouteResult/RouteResult.jsx | 정확한 provider host/path 검증 및 window.open 직전 재검증 | 14개 URL 사례 |
| 저장소 쓰기 실패 시 기존 토큰 누락 | src/utils/authStorage.js | 읽은 토큰을 먼저 확보, 기존 canonical 재기록 금지, 이관 실패 시 기존 값 보존 | 추가 2개 테스트 |
| 입력 길이 누락 | Home, Login, FindPassword, SavedPlaces | 검색100/이메일255/폴더명30/설명80, 기존 폼 제한과 일치 | 빌드 |
| production 소스맵 | scripts/build-production.cjs | GENERATE_SOURCEMAP=false | build 전체 .map 0개 |

처음 세 항목 및 소스맵 방어는 시작 시 이미 존재했던 변경을 유지·검증한 것이다. 이번 추가 수정은 지도 URL, 저장소 예외, 입력 제한 누락, 중복 안전로그 제거, 간접 의존성 2개, 회귀 테스트다.

## 3. PARTIALLY MITIGATED

- CSP: frame/object/base만 enforce. 전체 정책은 Report-Only이며 img-src https: 등 임시 넓은 범위가 남음. 완전한 최소 CSP로 완료 처리하지 않음.
- localStorage: 기존 로그인 지속 정책 유지. 중복/로그/로그아웃 노출은 감소했으나 XSS 시 토큰 접근 가능.
- 입력 제한 및 안전 오류: Frontend validation only. 직접 API 호출의 서버 검증/권한/오류 응답 보호를 대체하지 않음.
- 도구 체인: 아래 npm audit 50개 잔존. 강제 major 업데이트나 CRA 교체하지 않음.

## 4. BLOCKED - BACKEND REQUIRED

- **BLOCKED - BACKEND HTTPS REQUIRED**: 현재 API http://3.27.110.86:8080. 검증된 HTTPS 주소가 제공되지 않았고 기존 직접 TLS 확인도 실패했다. 문자열만 https로 바꾸지 않음.
- HttpOnly refresh token, token rotation/revoke, 서버 OAuth state와 브라우저 세션 바인딩, 서버 권한·입력·오류 검증: **BLOCKED - BACKEND REQUIRED**. 프론트 구현으로 해결했다고 판단하지 않음.
- 운영 배포/환경변수/지도 key 도메인 등록: **MANUAL ACTION REQUIRED**.

## 5. OAuth

- authorizationUrl: HTTPS, accounts.google.com / kauth.kakao.com exact match. 사용자정보 및 비표준 포트 거부. backend 생성 URL과 대조.
- provider별 sessionStorage state, 10분 만료, 일회성 소비. 불일치 시 완료 API 호출 안 함.
- callback code/state/error를 변수에 복사한 뒤 query/fragment 즉시 제거, history state 보존.
- 기존 useRef 유지. StrictMode에서 완료 호출 중복 방지 테스트 통과.
- Google/Kakao 버튼으로 실제 provider 로그인 화면까지 진입 확인. 계정 입력/동의/최종 code 교환 및 로그인 후 MyPage는 미검증.
- Backend 검증은 별도로 필요.

## 6. Token / Storage

- canonical key: accessToken. token/jakdang_access_token/petapp_session_v1 호환 이관.
- 일반 로그인 keepLogin에 따른 local/session 선택 및 소셜 localStorage 정책 유지.
- 읽기 가능한 저장소에서 쓰기만 실패해도 기존 토큰 사용 유지. 이관 성공 전 legacy 값 제거하지 않음.
- 로그아웃 시 양쪽 저장소의 토큰·사용자/이메일/역할·nickname cache·위치·일정/최근장소 등 개인 cache·OAuth state 정리.
- theme 같은 UI 선호는 보존. HttpOnly 방식으로 임의 전환하지 않음.

## 7. Logging

- Axios config/response/request 전체, OAuth 값, 위치/여행/사용자/통계 debug 출력 제거.
- 안전한 정적 context 및 status만 개발 오류 진단용으로 유지. 인증/API 오류를 사용자에게 전달할 때 고정된 안전 문구 사용.
- SDK 자체 오류 메시지까지 모두 제거한 것은 아님. 테스트에서 Google Maps의 도메인 허용 오류가 출력됨.

## 8. Netlify Security

- CSP enforce: frame-ancestors 'none'; object-src 'none'; base-uri 'self'.
- 전체 CSP Report-Only: default-src self 기반 Google/Kakao SDK origins. unsafe-eval 및 script unsafe-inline 추가 없음. 이미지 https:와 style unsafe-inline은 검증 전 임시 범위.
- X-Frame-Options DENY, nosniff, strict-origin-when-cross-origin, geolocation self 및 camera/microphone/payment 차단.
- public/theme-init.js 외부 동기 스크립트로 테마 초기화 순서 유지.
- 독립 로컬 production preview 응답에서 위 헤더 확인. Netlify 실제 배포 적용은 미확인.
- 지도/PDF 검증이 끝나지 않아 전체 CSP 강제 전환하지 않음. HSTS는 기존 호스팅 정책 유지.

## 9. Source Map

- npm run build 성공, build 전체 .map 0개.
- 존재하지 않는 /static/*는 404, SPA 직접 경로는 index fallback 설정 유지.
- 기존 운영/과거 배포에 남은 소스맵 제거 여부는 배포 관리 작업 필요.

## 10. Dependency

| npm audit 전체 | Critical | High | Moderate | Low | 합계 |
|---|---:|---:|---:|---:|---:|
| 원래 감사 | 2 | 31 | 12 | 12 | 57 |
| 이번 시작 시 | 2 | 28 | 10 | 12 | 52 |
| 최종 재실행 | 0 | 28 | 10 | 12 | 50 |

- 이전 변경 보존: axios 1.20.0, react-router/dom 7.18.4, dompurify 3.4.16, fflate 0.8.3.
- 이번 변경: shell-quote 1.8.3 → 1.11.0, websocket-driver 0.7.4 → 0.7.5. 기존 상위 패키지 허용 범위 내 lockfile 업데이트. 각 단계 test/build 통과.
- 간접 패키지를 direct dependency로 추가하거나 새 overrides를 넣지 않음. audit fix --force/CRA major migration 미실행.
- 잔여 경고는 CRA 개발·빌드·테스트 도구 그래프와 구분해야 한다. react-scripts가 dependencies에 있어 npm의 prod 수치는 실제 브라우저 포함 여부와 같지 않다. 이번 점검의 브라우저 runtime 의존성 경로에서 알려진 감사 항목은 발견되지 않았으나 공급망/빌드 위험은 남는다.

## 11. Environment

- Git index의 env는 .env.example만 남음. .env staged 삭제는 파일 삭제가 아니라 이전 작업의 추적 해제이며 실제 로컬 .env 보존.
- 기존 .env.development/.env.production 및 사용자 설정 보존. 예제에는 공개 설정 이름만 사용.
- Google browser/Kakao JS key는 공개 클라이언트 값이며 secret로 오인하지 않음. 도메인/API 제한은 콘솔에서 별도 확인 필요.
- 소스/public 및 bundle 검사에서 실제 client/JWT/private secret은 발견하지 못함. PASSWORD/ACCESS_TOKEN 같은 식별자는 비밀 값 노출과 구분한다. 전체 비밀 부재를 보증하는 검사는 아님.
- release-check exit 1: HTTPS 설정 필요 및 bundle에 기존 HTTP API 잔류. 예상된 배포 차단 결과.
- Netlify 환경변수 이전/확인은 MANUAL ACTION REQUIRED. 배포 설정을 수정하지 않음.

## 12. Tests

- npm test: **12 suites / 62 tests PASS**. npm run build: PASS. Browserslist 데이터 오래됨 경고 있음.
- OAuth invalid host/state mismatch/success/query cleanup/중복, logout cleanup, safe errors, same-origin returnTo, 보호 경로와404, GNB 클릭/직접 진입 검증 포함.
- 브라우저 Home 및 Login, desktop/mobile 확인. Google/Kakao provider 로그인 시작 화면 확인. 실제 로그인 완료·인증 후 MyPage·새로고침 지속·실계정 logout E2E는 미실행.
- MyPage/문의작성/Admin 비인증 직접 접근은 로그인으로 이동하는 자동 테스트 통과. 로그인 상태의 각 UI는 미검증.
- Kakao 지도: 기존 mock=domestic 경로에서 React HTMLBodyElement 오류 재현. RouteResult.jsx KakaoMapBox의 return (JSX, document.body)는 HEAD에도 존재한다. 보안 diff에서 해당 JSX는 변경하지 않았다. 범위 밖 기존 결함으로 남김.
- Google 지도: mock=overseas에서 SDK 실행, RefererNotAllowedMapError. 로컬 127.0.0.1:4173이 key 허용 도메인에 없음. 키 설정 변경하지 않음.
- PDF: 해외 샘플 일정의 공유 → PDF 저장 클릭. 모달은 닫혔으나 20초 내 다운로드 이벤트 확인 못함. **미검증**, 생성 성공으로 보고하지 않음.
- 이미지/Home 렌더 및 헤더 확인. 지도 타일·외부 이미지·PDF·fonts 전체 CSP 회귀는 미완료. 운영 HTTPS/API/CORS/Netlify 직접 접근 최종 확인 필요.

## 13. UI 영향

- GNB/CSS/SCSS/SVG/이미지/디자인/레이아웃 변경 없음. Footer.jsx 및 App.js diff 없음.
- GNB는 현재 동일 SVG의 색상만 active 파란색으로 바뀌는 구조 보존. 5개 메뉴 순서/경로/아이콘 DOM 유지 테스트 통과.
- 입력 maxlength 외 JSX 디자인 변경하지 않음. 기존 카카오 지도 결함을 보안 작업에 섞어 수정하지 않음.
- 모든 화면/실기기 시각 비교 완료를 의미하지 않음.

## 14. 변경 파일

이번 추가 수정:
- package-lock.json: 허용 범위 간접 패키지 2개 보안 업데이트.
- src/RouteResult/RouteResult.jsx 및 신규 src/utils/mapUrl.js: 지도 외부 URL allowlist.
- src/utils/authStorage.js 및 authStorage.test.js: 저장소 쓰기 실패 호환성.
- src/api/api.js: 중복 안전로그 제거.
- src/Homepage/Home.jsx, src/Login/Login.jsx, src/Login/FindPassword.jsx, src/Mypage/SavedPlaces.jsx: 누락 maxlength.
- 신규 src/utils/mapUrl.test.js, src/routeSecurity.test.js: URL/보호 경로/returnTo/404 회귀.
- 신규 FRONTEND_SECURITY_REMEDIATION_REPORT.md: 이 보고서.

이전 변경 유지:
- .env 추적 해제, .env.example, .gitignore, package.json, public/_redirects/index.html, 신규 _headers/theme-init.js/security-not-found.txt, scripts/.
- api/authApi, Login/OAuthCallback/SignUp/VerifyCode, Mypage/Inquiry 관련, AdminInquiry 관련, Header, Homepage/PopularAll, FolderSelectModal, MySchedule, RecentPlacesPage, Recommend 관련, RouteCreate, Search/SearchPopup, ShareModal, recentPlaces/routeStorage: 안전로그·오류·인증 저장소·입력 제한.
- safeLog/oauthSecurity/authStorage 및 관련 테스트, App.test/setupTests/testSvgMock/Footer.test 등.
- 기존 SECURITY_REMEDIATION_REPORT.md는 과거 백엔드 포함 작업의 기록이며 이번 frontend-only 결과는 이 문서가 기준.

시작 전 diff/index/untracked/env 백업: C:/Users/hanbe/.codex/visualizations/2026/09/28/01a0e958-d70c-70e0-9d4c-8270f264039b/front-security-20260930/.
최종 git status: dev, 기존 수정 및 신규 보안 파일이 uncommitted로 남음. .env staged D 유지. reset/restore/clean 없음.
Backend tracked diff hash는 시작/끝 모두 5387c6aa6c70a6b443e3d72bc6564b54641b667a. 이전 dirty 작업을 그대로 보존했고 이번에는 쓰기 작업을 하지 않았다.

## 15. Backend 작업 필요

1. 유효 TLS API endpoint 제공 및 실제 OAuth/API/CORS 확인.
2. HttpOnly refresh 지원, 회전/폐기/로그아웃 세션 정책 설계.
3. OAuth state의 서버 측 일회성·만료·provider·브라우저 연결 보장.
4. 모든 개인정보/관리자 API의 서버 권한 검사.
5. 서버 입력 검증과 안전 오류 응답의 운영 적용 확인.

위 항목은 이번 작업에서 백엔드를 수정해 처리하지 않았다.
