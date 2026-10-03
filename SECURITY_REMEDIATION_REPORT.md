# Security Remediation Report

작성일: 2026-09-30. 대상: 로컬 Graduation_project_front / noman-go.
**로컬 코드 수정 및 테스트 완료, 운영 배포 준비는 미완료입니다.**
사용자 최종 지시에 따라 커밋·푸시·PR·병합·배포를 하지 않았습니다.

## 1. 전체 결과

| 구분 | Critical | High | Medium | Low |
|---|---:|---:|---:|---:|
| 기존 점검 | 0 | 1 | 4 | 3 |
| 로컬 수정 후 잔여 위험 범주 | 0 | 1 | 2 | 1 |

위 숫자는 아래 기존 위험 범주 단위의 정적 재평가이며 npm 패키지 취약점 개수와 다릅니다.
아직 배포하지 않았으므로 **운영 사이트의 기존 판정을 개선 완료로 낮출 수 없습니다.**
OAuth 브라우저 연결 검증은 기존 의심 항목에 대한 추가 방어로 별도 표시합니다.

| 항목 | 로컬 상태 | 남은 조건 |
|---|---|---|
| 운영 HTTP API (High) | MANUAL ACTION REQUIRED | 검증된 TLS API, DNS/서버 설정 필요 |
| JS 접근 가능한 장기 토큰 (Medium) | MITIGATED / REQUIRES BACKEND | 저장 중복 제거. XSS 탈취·서버 revoke 부재는 남음 |
| 인증/개인정보 로그 (Medium) | FIXED | 배포 후 브라우저 로그 재검증 |
| CSP/보안 헤더 (Medium) | MITIGATED | 전체 CSP는 Report-Only, 실제 서비스 검증·배포 필요 |
| production 소스맵 (Medium) | FIXED (로컬 build) | 현재 운영 배포 및 과거 배포의 공개 소스맵 정리 필요 |
| 로그아웃 개인정보 잔류 (Low) | FIXED | 공통 cleanup 단위 테스트 통과 |
| 입력 제한/오류 노출 (Low) | FIXED (점검 대상) | 프론트·백엔드 함께 배포 필요, 모든 API에 대한 침투시험은 아님 |
| 의존성 경고 (Low, 앱 공격면 기준) | MITIGATED | CRA 개발·빌드·테스트 취약점 잔존, 위험 수용 승인한 것은 아님 |
| OAuth state 브라우저 연결 | FIXED (로컬 코드) | 양 provider 모의 콜백 테스트 통과, 실제 계정 E2E 미실행 |

## 2. 수정 완료

- [api.js](C:/Users/hanbe/Desktop/Graduation_project_front/src/api/api.js): 전체 Axios 오류 출력 제거, 안전한 status 메시지 매핑, Authorization 대소문자 정리, 다른 origin으로 API 토큰 전송 금지. localhost fallback은 개발환경만 사용.
- [safeLog.js](C:/Users/hanbe/Desktop/Graduation_project_front/src/utils/safeLog.js): 정적인 context와 HTTP status만 기록. 관련 페이지의 raw error/response와 디버그 로그 제거.
- [Login.jsx](C:/Users/hanbe/Desktop/Graduation_project_front/src/Login/Login.jsx), [OAuthCallback.jsx](C:/Users/hanbe/Desktop/Graduation_project_front/src/Login/OAuthCallback.jsx), [oauthSecurity.js](C:/Users/hanbe/Desktop/Graduation_project_front/src/utils/oauthSecurity.js): state 저장/검증/소비, URL 검증 및 query 제거. UI 구조 유지.
- [authStorage.js](C:/Users/hanbe/Desktop/Graduation_project_front/src/utils/authStorage.js), [authApi.js](C:/Users/hanbe/Desktop/Graduation_project_front/src/api/authApi.js), [MyPage.jsx](C:/Users/hanbe/Desktop/Graduation_project_front/src/Mypage/MyPage.jsx): canonical token 저장 및 공통 로그아웃.
- [public/_headers](C:/Users/hanbe/Desktop/Graduation_project_front/public/_headers), [theme-init.js](C:/Users/hanbe/Desktop/Graduation_project_front/public/theme-init.js), [index.html](C:/Users/hanbe/Desktop/Graduation_project_front/public/index.html): 헤더 파일과 동기 theme 초기화 외부 스크립트.
- [build-production.cjs](C:/Users/hanbe/Desktop/Graduation_project_front/scripts/build-production.cjs): production source map 생성 차단.
- [check-release-security.cjs](C:/Users/hanbe/Desktop/Graduation_project_front/scripts/check-release-security.cjs): HTTPS URL 및 잔류 HTTP bundle/map 검사. 현재 의도대로 배포 불가 판정.
- 입력 제한: 문의 제목/내용 255, 회원가입 닉네임 20·이메일 255·비밀번호 72, 검색 100, 관리자 답변 255. 기존 메모 500 유지. DB 스키마나 화면 배치는 변경하지 않음.
- 백엔드 DTO/controller validation과 오류 handler 변경 및 회귀 테스트: 10절 참조.
- 검증: 프론트 37개, 백엔드 74개 테스트 통과. 각 의존성 업데이트 뒤 테스트 및 빌드 성공.

## 3. HTTPS

- Frontend API URL: 현재 로컬 production 환경값은 기존 HTTP API를 유지합니다. 작동하지 않는 HTTPS 문자열로 임의 교체하지 않았습니다.
- Backend HTTPS: **MANUAL ACTION REQUIRED**. 현재 IP의 443 HTTPS 요청은 timeout, 8080 HTTPS는 TLS handshake 실패.
- 저장소에서 실제 운영 reverse proxy/TLS/DNS 구성을 확인하지 못했고 서버 접근 정보도 제공되지 않았습니다.
- Mixed Content: **미해결**. 최종 build에 기존 HTTP API 문자열이 남아 있습니다.
- `npm run security:release-check`: **exit 1 (예상된 배포 차단)**. 인증된 HTTPS API 주소를 설정하고 다시 build한 뒤 통과해야 합니다.
- 이 스크립트는 정적 검사일 뿐이며 TLS 인증서·실제 API GET/POST·CORS·로그인 검증을 대신하지 않습니다.
- 프론트 proxy로 HTTP 문제를 숨기거나 API 기능을 제거하지 않았습니다.

## 4. OAuth

- Google/Kakao 모두 provider별 sessionStorage에 state + 10분 만료 시각 저장.
- URL state 불일치/만료/누락 시 완료 API 호출 금지. state는 비교 시 먼저 제거하여 재사용 차단.
- Backend OAuthStateService의 random state, provider 검증, 10분 만료, 일회성 소비는 변경하지 않음.
- code/state/error를 메모리에 확보한 직후 주소창 query/fragment 제거. Router history state 보존.
- 기존 useRef 중복 방지 유지. StrictMode 완료 API 1회, 재마운트 재사용 차단 테스트 통과.
- authorizationUrl은 HTTPS + accounts.google.com 또는 kauth.kakao.com의 정확한 hostname만 허용. URL 내 사용자정보/비정상 포트와 state 불일치 거부.
- 기존 same-origin returnTo 검사 유지.
- 실제 Google/Kakao 사용자 계정으로 로그인·provider code 교환을 끝까지 실행한 것은 아닙니다.

## 5. Token

- 저장 위치: 기존 정책 유지. 일반 로그인은 keepLogin에 따라 localStorage/sessionStorage 선택, 소셜은 기존 localStorage 유지.
- canonical key: accessToken. token/jakdang_access_token/petapp_session_v1의 기존 값은 같은 저장소에서 이관하고 중복 alias 제거.
- 서버 기본 access token 유효기간: 24시간. 운영 환경변수 override는 서버 접근 없이 확정할 수 없습니다.
- 현재 backend에는 refresh/rotation/revoke/logout API가 없습니다. memory access + HttpOnly refresh 구조로 무작정 전환하지 않았습니다.
- logout 시 양쪽 저장소의 토큰, currentUser, 사용자 이름·이메일, nickname cache, 위치, OAuth state, 최근 장소/저장 일정/임시 일정·문의 등의 개인 데이터를 정리합니다.
- site-theme 같은 계정 무관 설정은 유지합니다.
- 기존 다중 탭 localStorage 공유 정책 유지. 별도의 탭 동기화 프로토콜이나 인증 시스템 재설계는 하지 않았습니다.
- **잔여 위험:** XSS가 발생하면 JS 저장소 토큰에 접근 가능하며, 로그아웃해도 탈취된 서버 JWT는 즉시 폐기되지 않습니다.

## 6. Security Headers

| 헤더 | 로컬 설정 | 현재 운영 재확인 |
|---|---|---|
| CSP | frame-ancestors 'none'; object-src 'none'; base-uri 'self' enforce | 없음 |
| 전체 CSP | Report-Only | 없음 |
| HSTS | Netlify 기본 정책 유지 | max-age=31536000; includeSubDomains; preload |
| nosniff | 추가 | 없음 |
| Referrer-Policy | strict-origin-when-cross-origin | 없음 |
| Permissions-Policy | geolocation self, camera/microphone/payment 차단 | 없음 |
| X-Frame-Options | DENY | 없음 |

전체 CSP는 지도 SDK, 지도 이미지/폰트, PDF 처리와 실제 HTTPS API origin을 운영에서 확인한 후 enforce로 전환해야 합니다.
script-src에 unsafe-inline/unsafe-eval을 추가하지 않았습니다.
style-src의 unsafe-inline과 img-src의 https:는 현재 React 인라인 스타일 및 외부 이미지 호환을 위한 임시 Report-Only 범위이며, 최종 최소 정책으로 확정한 것이 아닙니다.
theme 초기화는 parser-blocking 외부 스크립트로 기존 실행 위치를 유지했으며 dark/light/system 단위 테스트를 통과했습니다. 실제 기기 첫 화면 깜빡임 검증은 미실행입니다.
Netlify 헤더는 build 성공만으로 적용되지 않으며 실제 배포 응답 검증이 필요합니다.

## 7. Dependency

| npm audit 전체 | Critical | High | Moderate | Low | 합계 |
|---|---:|---:|---:|---:|---:|
| Before | 2 | 31 | 12 | 12 | 57 |
| After | 2 | 28 | 10 | 12 | 52 |

업데이트:
- axios 1.16.1 → 1.20.0 (직접 runtime dependency)
- react-router-dom / react-router 7.13.1 → 7.18.4 (직접/연동 dependency)
- dompurify 3.3.3 → 3.4.16 (html2pdf.js/jsPDF가 허용한 semver 범위 내 잠금 파일 업데이트)
- fflate 0.8.2 → 0.8.3 (jsPDF 하위 dependency의 허용 범위 내 업데이트)

html2pdf.js 0.14.0 및 CRA/react-scripts 5.0.1 유지. major migration, force fix, 임의의 직접 하위 dependency 추가나 overrides 없음.
각 업데이트 뒤 전체 Jest 테스트 및 production build 성공.

실제 lockfile 경로 그래프 기준:
- 앱 runtime 루트에 도달 가능한 현재 npm audit 항목: **0**.
- 테스트 루트(jest/testing-library)에 도달 가능한 항목: **18**. 일부는 빌드에서도 공유됨.
- 그 외 개발/빌드 경로 항목: **34**.
- Critical 2개는 shell-quote / websocket-driver 개발 도구 경로에 잔존. 개발 서버를 외부에 공개하지 말고 신뢰할 수 없는 파일을 빌드/테스트 입력으로 실행하지 않아야 합니다.
- 위 분류는 알려진 npm advisory/의존성 경로 판정이며 “서비스 전체 취약점 0” 또는 취약 도구의 안전성 보증이 아닙니다. CRA 정비는 별도 검증 작업으로 남깁니다.

참고: [React Router 공급자 advisory](https://github.com/remix-run/react-router/security/advisories/GHSA-wrjc-x8rr-h8h6), [DOMPurify 공식 릴리스](https://github.com/cure53/DOMPurify/releases).

## 8. Source Map

- 최종 로컬 production build의 *.map 파일: **0개**.
- development source map 설정은 변경하지 않았습니다.
- Netlify fallback 앞에 /static/* 404 규칙을 추가했습니다. 기존 정적 파일은 shadowing으로 제공되고, 없는 정적 파일은 SPA index.html 대신 404를 반환하도록 구성했습니다.
- 기존 SPA 규칙 /* /index.html 200은 유지합니다.
- 근거: [Netlify redirect/shadowing 공식 문서](https://docs.netlify.com/manage/routing/redirects/redirect-options/).
- 운영 배포는 하지 않았으므로 실제 *.js.map 404 및 이전 배포 스냅샷의 소스맵 접근 차단은 **MANUAL ACTION REQUIRED**.
- bundle에서 CLIENT_SECRET / PRIVATE_KEY / JWT_SECRET / REFRESH_TOKEN 문자열은 발견되지 않았습니다. PASSWORD/ACCESS_TOKEN 같은 일반 식별자는 실제 비밀값과 구분해야 하며, 단순 키워드 검사만으로 모든 secret 부재를 보증하지 않습니다.
- 기존 HTTP API 문자열은 발견되어 배포 검사에서 실패합니다.

## 9. Logging

- API/Login/OAuthCallback 및 각 페이지의 전체 Axios error, response와 사용자·위치·여행 debug 출력 제거.
- 남긴 공통 로그는 정적인 파일/작업 context와 유효한 HTTP status만 포함.
- Authorization/Cookie/body/password/token/code/state는 출력하지 않음.
- 백엔드는 고정된 오류 분류만 기록하며 exception message/stack trace 전체를 출력하지 않음.
- 안전 로그에 민감 데이터가 포함되지 않는 회귀 테스트 통과.

## 10. Backend

로컬 경로: C:/Users/hanbe/Desktop/noman-go. 브랜치: codex/security-hardening. 커밋 전 상태.

- GlobalExceptionHandler: 고정된 400/403/500 응답, OAuth 설정 오류는 기존 안전한 503 유지.
- application.yml: 기본 error message/stacktrace/exception/binding-errors 노출 금지.
- Inquiry/Signup/Review/Folder/Trip DTO 길이 검증 및 해당 controller의 @Valid.
- 기존 DB 컬럼에 맞춰 문자열 제한. 스키마 변경 없음.
- raw 관리자 답변 255, 검색어 100을 서비스/controller에서 확인.
- 메모 500 제한 기존 구현 유지.
- ADMIN API는 서버 SecurityFilterChain에서 제한, Trip/TripPlace/Folder는 인증 principal의 소유권 검사 유지. 클라이언트 role UI를 보안 경계로 간주하지 않음.
- 기존 CORS allowlist, JWT 서명/만료 검증, OAuth state consume 변경 없음.
- Java 17 Gradle 전체 테스트 **74개, 실패 0**. 시스템 Java 설정은 변경하지 않고 별도 runtime 사용.
- docs/CURRENT_STATE.md에 현재 작업/테스트/외부 차단 사항 기록.
- Backend 운영 설정과 실제 실행 artifact, 인증서, 운영 token lifetime override 확인은 남아 있습니다.

## 11. 외부 수동 작업

**MANUAL ACTION REQUIRED — 이번에는 사용자 지시에 따라 외부 변경을 수행하지 않습니다.**

1. AWS/DNS: 사용할 API 도메인을 정하고 DNS를 서버에 연결. TLS reverse proxy 또는 ALB에서 유효한 인증서를 적용. 직접 8080 인터넷 노출은 reverse proxy 동작 확인 후 제한.
2. HTTPS API의 GET/POST 및 CORS preflight, Google/Kakao authorize/callback, 로그인 후 MyPage 확인. 비밀번호/개인키는 대화나 저장소에 넣지 않기.
3. Netlify: 검증된 HTTPS REACT_APP_API_BASE_URL을 설정하고 build 후 security:release-check 통과 확인. 공개 지도 key는 기존 정확한 환경변수 이름 유지.
4. Google Cloud Console: Maps browser key의 HTTP referrer를 실제 도메인으로 제한, 사용하는 API만 허용, quota 설정. OAuth Web client redirect는 실제 frontend callback과 일치하는지 확인.
5. Kakao Developers: JavaScript key의 Web 플랫폼 도메인과 OAuth redirect 확인. 서비스·개발 도메인 외 허용 범위를 제거할지 검토.
6. 실제 로그인, 지도/PDF, 문의/관리자, 새로고침/다중 탭, desktop/mobile 기능 확인 후 전체 CSP enforce 검토.
7. 배포 후 응답 헤더 및 map 404 확인. 이전 Netlify deploy 스냅샷도 별도로 확인.
8. JS 저장소 토큰 위험을 더 줄이려면 backend refresh/revoke/rotation + cookie/CSRF 정책을 별도 설계·테스트.

## 12. 테스트

| 검증 | 결과 |
|---|---|
| npm test (CI, runInBand) | PASS: 10 suites / 37 tests |
| npm run build | PASS: Compiled successfully |
| Gradle test (Java 17) | PASS: 74 tests, 0 failures |
| Authorization sanitization / 타 origin 금지 | 단위 테스트 PASS |
| Google/Kakao state success/mismatch/expiry/reuse | 단위 및 모의 callback 컴포넌트 테스트 PASS |
| callback query 제거 / StrictMode 1회 요청 | PASS |
| 일반 keepLogin 및 소셜 저장 유지 | 모의 API 테스트 PASS |
| logout 양 저장소 정리 / theme 유지 | PASS |
| same-origin returnTo | PASS |
| GNB 5개 메뉴 직접 경로/클릭/active | MemoryRouter 테스트 PASS |
| GNB SVG DOM 유지 | 테스트 PASS (Jest SVG mock, 실제 픽셀 비교는 아님) |
| production map 파일 | 0 |
| git diff --check (양 프로젝트) | PASS |
| security:release-check | FAIL: 미해결 HTTP API를 정상 검출 |
| 실제 Google/Kakao 로그인·MyPage·새로고침 | 미실행, HTTPS/사용자 세션 필요 |
| 실제 지도·여행 결과·PDF·문의·관리자 화면 | E2E 미실행 |
| 실제 모바일/노트북 시각 회귀 | 미실행 |

CRA Jest의 구형 SVG transformer를 테스트에서만 React 19 호환 mock으로 보완하고 Router subpath 해석을 설정했습니다. 운영 SVG/Router 구현을 mock으로 바꾸지 않았습니다.
Browserslist 데이터가 오래되었다는 경고는 남아 있지만 컴파일 에러는 없습니다.

## 13. UI 영향

- UI/UX 디자인 변경: 없음.
- GNB 구현·active 아이콘·SVG·CSS 변경: 없음.
- Layout/애니메이션/반응형 소스 변경: 없음.
- Header는 로그 처리만 변경.
- 변경된 React 파일 32개의 JSX AST 비교에서 maxLength와 debug 동작 제거를 제외한 디자인 구조 차이 0.
- 폰트/이미지/SCSS/CSS, 기존 App 라우팅 및 GNB 파일의 Git diff 없음.
- 보안에 따른 오류 메시지와 입력 최대 길이는 의도적으로 달라집니다.
- 이는 소스/컴포넌트 검증 결과이며 실제 전 기기 screenshot 비교 완료를 의미하지 않습니다.

## 14. Git 변경

프론트: dev / 기준 HEAD 3a233ef.
백엔드: codex/security-hardening / 기준 HEAD 52eccec.
커밋·푸시·PR·배포 없음. 원격 push 시도 명령은 실행 전 차단되었으며 사용자의 “로컬 파일만” 지시에 따라 재시도하지 않았습니다.

- .env는 **Git 추적만 해제(staged D)**했으며 로컬 파일은 그대로 존재합니다. 실제 파일 삭제 없음.
- .env.development, .env.production, 기존 untracked API 테스트 파일은 보존했습니다.
- .env.production에 production source map 비활성화 값도 있지만, 공유 build 스크립트가 독립적으로 이를 강제합니다.
- .env.example에는 실제 비밀값 없이 정확한 환경변수 이름만 둡니다.
- 기존 Git 이력에서 공개 browser key를 지우는 history rewrite는 하지 않았습니다.
- 백업: C:/Users/hanbe/.codex/visualizations/2026/09/28/01a0e958-d70c-70e0-9d4c-8270f264039b/security-backup-20260930
- 변경 목록의 M은 수정, ??는 미추적, D는 index에서 추적 해제입니다.

### 프론트 변경 파일

- `D ` [.env](C:/Users/hanbe/Desktop/Graduation_project_front/.env)
- ` M` [.env.example](C:/Users/hanbe/Desktop/Graduation_project_front/.env.example)
- ` M` [.gitignore](C:/Users/hanbe/Desktop/Graduation_project_front/.gitignore)
- ` M` [package-lock.json](C:/Users/hanbe/Desktop/Graduation_project_front/package-lock.json)
- ` M` [package.json](C:/Users/hanbe/Desktop/Graduation_project_front/package.json)
- ` M` [public/_redirects](C:/Users/hanbe/Desktop/Graduation_project_front/public/_redirects)
- ` M` [public/index.html](C:/Users/hanbe/Desktop/Graduation_project_front/public/index.html)
- ` M` [src/Admin/AdminInquiryPage/AdminInquiryPage.jsx](C:/Users/hanbe/Desktop/Graduation_project_front/src/Admin/AdminInquiryPage/AdminInquiryPage.jsx)
- ` M` [src/Admin/AdminInquiryPage/AdminInquiryWrite.jsx](C:/Users/hanbe/Desktop/Graduation_project_front/src/Admin/AdminInquiryPage/AdminInquiryWrite.jsx)
- ` M` [src/App.test.js](C:/Users/hanbe/Desktop/Graduation_project_front/src/App.test.js)
- ` M` [src/FolderSelectModal/FolderSelectModal.jsx](C:/Users/hanbe/Desktop/Graduation_project_front/src/FolderSelectModal/FolderSelectModal.jsx)
- ` M` [src/Header/Header.jsx](C:/Users/hanbe/Desktop/Graduation_project_front/src/Header/Header.jsx)
- ` M` [src/Homepage/Home.jsx](C:/Users/hanbe/Desktop/Graduation_project_front/src/Homepage/Home.jsx)
- ` M` [src/Homepage/PopularAll.jsx](C:/Users/hanbe/Desktop/Graduation_project_front/src/Homepage/PopularAll.jsx)
- ` M` [src/Login/FindPassword.jsx](C:/Users/hanbe/Desktop/Graduation_project_front/src/Login/FindPassword.jsx)
- ` M` [src/Login/Login.jsx](C:/Users/hanbe/Desktop/Graduation_project_front/src/Login/Login.jsx)
- ` M` [src/Login/OAuthCallback.jsx](C:/Users/hanbe/Desktop/Graduation_project_front/src/Login/OAuthCallback.jsx)
- ` M` [src/Login/SignUp.jsx](C:/Users/hanbe/Desktop/Graduation_project_front/src/Login/SignUp.jsx)
- ` M` [src/Login/VerifyCode.jsx](C:/Users/hanbe/Desktop/Graduation_project_front/src/Login/VerifyCode.jsx)
- ` M` [src/MySchedule/MySchedule.jsx](C:/Users/hanbe/Desktop/Graduation_project_front/src/MySchedule/MySchedule.jsx)
- ` M` [src/Mypage/Inquiry.jsx](C:/Users/hanbe/Desktop/Graduation_project_front/src/Mypage/Inquiry.jsx)
- ` M` [src/Mypage/InquiryDetail.jsx](C:/Users/hanbe/Desktop/Graduation_project_front/src/Mypage/InquiryDetail.jsx)
- ` M` [src/Mypage/InquiryWrite.jsx](C:/Users/hanbe/Desktop/Graduation_project_front/src/Mypage/InquiryWrite.jsx)
- ` M` [src/Mypage/MyPage.jsx](C:/Users/hanbe/Desktop/Graduation_project_front/src/Mypage/MyPage.jsx)
- ` M` [src/Mypage/SavedPlaces.jsx](C:/Users/hanbe/Desktop/Graduation_project_front/src/Mypage/SavedPlaces.jsx)
- ` M` [src/Mypage/inquiryMockData.js](C:/Users/hanbe/Desktop/Graduation_project_front/src/Mypage/inquiryMockData.js)
- ` M` [src/RecentPlacesPage/RecentPlacesPage.jsx](C:/Users/hanbe/Desktop/Graduation_project_front/src/RecentPlacesPage/RecentPlacesPage.jsx)
- ` M` [src/Recommend/Detail.jsx](C:/Users/hanbe/Desktop/Graduation_project_front/src/Recommend/Detail.jsx)
- ` M` [src/Recommend/Recommend.jsx](C:/Users/hanbe/Desktop/Graduation_project_front/src/Recommend/Recommend.jsx)
- ` M` [src/Recommend/Total.jsx](C:/Users/hanbe/Desktop/Graduation_project_front/src/Recommend/Total.jsx)
- ` M` [src/RouteCreate/RouteCreate.jsx](C:/Users/hanbe/Desktop/Graduation_project_front/src/RouteCreate/RouteCreate.jsx)
- ` M` [src/RouteResult/RouteResult.jsx](C:/Users/hanbe/Desktop/Graduation_project_front/src/RouteResult/RouteResult.jsx)
- ` M` [src/Search/Search.jsx](C:/Users/hanbe/Desktop/Graduation_project_front/src/Search/Search.jsx)
- ` M` [src/SearchPopup/SearchPop.jsx](C:/Users/hanbe/Desktop/Graduation_project_front/src/SearchPopup/SearchPop.jsx)
- ` M` [src/ShareModal/ShareModal.jsx](C:/Users/hanbe/Desktop/Graduation_project_front/src/ShareModal/ShareModal.jsx)
- ` M` [src/api/api.js](C:/Users/hanbe/Desktop/Graduation_project_front/src/api/api.js)
- ` M` [src/api/authApi.js](C:/Users/hanbe/Desktop/Graduation_project_front/src/api/authApi.js)
- ` M` [src/setupTests.js](C:/Users/hanbe/Desktop/Graduation_project_front/src/setupTests.js)
- ` M` [src/utils/recentPlaces.js](C:/Users/hanbe/Desktop/Graduation_project_front/src/utils/recentPlaces.js)
- ` M` [src/utils/routeStorage.js](C:/Users/hanbe/Desktop/Graduation_project_front/src/utils/routeStorage.js)
- `??` [public/_headers](C:/Users/hanbe/Desktop/Graduation_project_front/public/_headers)
- `??` [public/security-not-found.txt](C:/Users/hanbe/Desktop/Graduation_project_front/public/security-not-found.txt)
- `??` [public/theme-init.js](C:/Users/hanbe/Desktop/Graduation_project_front/public/theme-init.js)
- `??` [scripts/build-production.cjs](C:/Users/hanbe/Desktop/Graduation_project_front/scripts/build-production.cjs)
- `??` [scripts/check-release-security.cjs](C:/Users/hanbe/Desktop/Graduation_project_front/scripts/check-release-security.cjs)
- `??` [src/Footer/Footer.test.js](C:/Users/hanbe/Desktop/Graduation_project_front/src/Footer/Footer.test.js)
- `??` [src/Login/OAuthCallback.test.js](C:/Users/hanbe/Desktop/Graduation_project_front/src/Login/OAuthCallback.test.js)
- `??` [src/api/api.test.js](C:/Users/hanbe/Desktop/Graduation_project_front/src/api/api.test.js)
- `??` [src/api/authApi.test.js](C:/Users/hanbe/Desktop/Graduation_project_front/src/api/authApi.test.js)
- `??` [src/api/security.test.js](C:/Users/hanbe/Desktop/Graduation_project_front/src/api/security.test.js)
- `??` [src/testSvgMock.js](C:/Users/hanbe/Desktop/Graduation_project_front/src/testSvgMock.js)
- `??` [src/utils/authStorage.js](C:/Users/hanbe/Desktop/Graduation_project_front/src/utils/authStorage.js)
- `??` [src/utils/authStorage.test.js](C:/Users/hanbe/Desktop/Graduation_project_front/src/utils/authStorage.test.js)
- `??` [src/utils/oauthSecurity.js](C:/Users/hanbe/Desktop/Graduation_project_front/src/utils/oauthSecurity.js)
- `??` [src/utils/oauthSecurity.test.js](C:/Users/hanbe/Desktop/Graduation_project_front/src/utils/oauthSecurity.test.js)
- `??` [src/utils/safeLog.js](C:/Users/hanbe/Desktop/Graduation_project_front/src/utils/safeLog.js)
- `??` [src/utils/safeLog.test.js](C:/Users/hanbe/Desktop/Graduation_project_front/src/utils/safeLog.test.js)
- `??` [src/utils/securityAssets.test.js](C:/Users/hanbe/Desktop/Graduation_project_front/src/utils/securityAssets.test.js)
- `??` [SECURITY_REMEDIATION_REPORT.md](C:/Users/hanbe/Desktop/Graduation_project_front/SECURITY_REMEDIATION_REPORT.md) — 이 보고서

### 백엔드 변경 파일

- ` M` [docs/CURRENT_STATE.md](C:/Users/hanbe/Desktop/noman-go/docs/CURRENT_STATE.md)
- ` M` [src/main/java/com/nomango/nomango/controller/AuthController.java](C:/Users/hanbe/Desktop/noman-go/src/main/java/com/nomango/nomango/controller/AuthController.java)
- ` M` [src/main/java/com/nomango/nomango/controller/FolderController.java](C:/Users/hanbe/Desktop/noman-go/src/main/java/com/nomango/nomango/controller/FolderController.java)
- ` M` [src/main/java/com/nomango/nomango/controller/GlobalExceptionHandler.java](C:/Users/hanbe/Desktop/noman-go/src/main/java/com/nomango/nomango/controller/GlobalExceptionHandler.java)
- ` M` [src/main/java/com/nomango/nomango/controller/InquiryController.java](C:/Users/hanbe/Desktop/noman-go/src/main/java/com/nomango/nomango/controller/InquiryController.java)
- ` M` [src/main/java/com/nomango/nomango/controller/PlaceController.java](C:/Users/hanbe/Desktop/noman-go/src/main/java/com/nomango/nomango/controller/PlaceController.java)
- ` M` [src/main/java/com/nomango/nomango/controller/ReviewController.java](C:/Users/hanbe/Desktop/noman-go/src/main/java/com/nomango/nomango/controller/ReviewController.java)
- ` M` [src/main/java/com/nomango/nomango/controller/TripController.java](C:/Users/hanbe/Desktop/noman-go/src/main/java/com/nomango/nomango/controller/TripController.java)
- ` M` [src/main/java/com/nomango/nomango/dto/FolderRequestDto.java](C:/Users/hanbe/Desktop/noman-go/src/main/java/com/nomango/nomango/dto/FolderRequestDto.java)
- ` M` [src/main/java/com/nomango/nomango/dto/InquiryRequestDto.java](C:/Users/hanbe/Desktop/noman-go/src/main/java/com/nomango/nomango/dto/InquiryRequestDto.java)
- ` M` [src/main/java/com/nomango/nomango/dto/ReviewRequestDto.java](C:/Users/hanbe/Desktop/noman-go/src/main/java/com/nomango/nomango/dto/ReviewRequestDto.java)
- ` M` [src/main/java/com/nomango/nomango/dto/SignupRequestDto.java](C:/Users/hanbe/Desktop/noman-go/src/main/java/com/nomango/nomango/dto/SignupRequestDto.java)
- ` M` [src/main/java/com/nomango/nomango/dto/TripRequestDto.java](C:/Users/hanbe/Desktop/noman-go/src/main/java/com/nomango/nomango/dto/TripRequestDto.java)
- ` M` [src/main/java/com/nomango/nomango/service/InquiryService.java](C:/Users/hanbe/Desktop/noman-go/src/main/java/com/nomango/nomango/service/InquiryService.java)
- ` M` [src/main/resources/application.yml](C:/Users/hanbe/Desktop/noman-go/src/main/resources/application.yml)
- `??` [src/test/java/com/nomango/nomango/controller/InputValidationTest.java](C:/Users/hanbe/Desktop/noman-go/src/test/java/com/nomango/nomango/controller/InputValidationTest.java)
- `??` [src/test/java/com/nomango/nomango/controller/SafeErrorResponseTest.java](C:/Users/hanbe/Desktop/noman-go/src/test/java/com/nomango/nomango/controller/SafeErrorResponseTest.java)
