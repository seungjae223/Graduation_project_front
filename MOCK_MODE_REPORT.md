# 임시 Mock Mode 적용 보고서

## 분석 범위와 구현 방식

실행 프로젝트는 이 디렉터리의 `package.json`과 `src/`를 사용하는 Create React App(react-scripts 5)입니다. 상위 디렉터리의 package.json은 앱 실행 설정이 아니며, `Graduation_project_front/`는 .gitignore에 등록된 별도 로컬 복제본입니다. 복제본은 변경하지 않았습니다.

수정 전에 활성 소스의 API 요청, 인증·저장소, 라우팅, 응답 정규화, 화면 소비 코드와 기존 테스트를 확인했습니다. 백엔드 요청은 모두 `src/api/api.js`의 Axios 인스턴스를 사용합니다. 별도 fetch 클라이언트, 쿠키 인증 처리, WebSocket 연결은 활성 소스에 없습니다. 지도 SDK 로드와 지도 서비스 호출은 외부 기능이며 기존 코드 그대로 유지합니다.

화면에서 직접 Axios를 호출하는 곳이 많아 공통 요청 인터셉터에서 Mock 어댑터로 분기했습니다. 기존 API 함수, URL, Bearer 인증, 응답 정규화와 오류 처리 코드는 유지합니다. Mock에서는 호출자가 별도 adapter를 지정해도 메모리 어댑터를 사용하며, 처리되지 않은 경로 역시 로컬 오류로 종료해 백엔드로 넘어가지 않습니다.

Mock 응답의 필드는 현재 프론트엔드가 실제로 읽는 필드와 검증 함수(requireList/requireTrip)를 기준으로 맞췄습니다. 백엔드 스키마나 서버 응답 샘플은 제공되지 않았으므로 실제 서버의 모든 응답과 동일하다는 의미는 아닙니다.

## API와 사용 파일 조사

| API / 인증 처리 | API 파일 및 실제 소비 화면 |
| --- | --- |
| 이메일 로그인, 회원가입 | api/authApi.js → Login/Login.jsx, Login/SignUp.jsx |
| Google/Kakao authorize 및 login | api/authApi.js → Login/Login.jsx, Login/OAuthCallback.jsx; utils/oauthSecurity.js에서 state 검증 |
| 이메일 인증번호 전송·확인 | api/authApi.js → Login/SignUp.jsx, Login/VerifyCode.jsx; Login/FindPassword.jsx는 클라이언트 직접 호출 |
| 로그인 상태·토큰 확인, 로그아웃 | utils/authStorage.js, utils/authState.js, utils/useSessionKey.js; App.js 접근 제어, Mypage/MyPage.jsx 로그아웃 |
| 현재 사용자 정보 | Mypage/MyPage.jsx는 저장된 사용자 캐시와 JWT payload 사용. 현재 `/api/users/me` 조회 API 호출은 없음 |
| `/api/mypage/stats` | Mypage/MyPage.jsx 직접 호출 |
| `/api/places`, `/api/places/:id` | api/placeApi.js; Homepage/PopularAll.jsx, Recommend/Detail.jsx 직접 조회 |
| `/api/places/search` | api/placeApi.js → Search/useServerSearch.js → Search/Search.jsx; SearchPopup/SearchPop.jsx, Recommend/Recommend.jsx, RouteCreate/RouteCreate.jsx 직접 호출 |
| `/api/recommendations` | api/placeApi.js; Recommend/Recommend.jsx, Recommend/Total.jsx, SearchPopup/SearchPop.jsx 직접 호출 |
| `/api/recent-searches`, `/:id` | api/placeApi.js → Search/Search.jsx |
| `/api/recent-places` | api/placeApi.js → RecentPlacesPage/RecentPlacesPage.jsx; Recommend/Detail.jsx 방문 기록 POST |
| `/api/folders`, `/:folderId/places`, `/:folderId/places/:placeId` | api/placeApi.js; FolderSelectModal/FolderSelectModal.jsx, Mypage/SavedPlaces.jsx, Homepage/PopularAll.jsx, Recommend/Recommend.jsx, Recommend/Total.jsx, Recommend/Detail.jsx |
| `/api/places/:id/reviews` | api/placeApi.js; Recommend/Detail.jsx 목록 조회와 화면 내 더보기 |
| `/api/trips`, `/:id` | api/tripApi.js → MySchedule/MySchedule.jsx, RouteResult/useTripResult.js; RouteCreate/RouteCreate.jsx 생성, RouteResult/RouteResult.jsx 삭제 직접 호출 |
| 여행 장소, 일차별 장소·타임라인 | api/tripApi.js → RouteResult/useTripResult.js; RouteCreate/RouteCreate.jsx 직접 호출 |
| 여행 장소 추가, 출발지, 고정 시간, 메모, 최적화 | api/tripApi.js; RouteCreate/RouteCreate.jsx 순차 저장, RouteResult/RouteResult.jsx 메모 직접 호출 |
| `/api/inquiries` | Mypage/Inquiry.jsx, InquiryWrite.jsx, InquiryDetail.jsx 직접 호출 |
| `/api/inquiries/admin`, `/:id/answer` | Admin/AdminInquiryPage/AdminInquiryPage.jsx, AdminInquiryWrite.jsx 직접 호출 |

`Schedule/Schedule.jsx`는 현재 MySchedule 컴포넌트를 사용하므로 하단 일정 탭도 같은 Mock 일정 목록을 조회합니다. Homepage/Home.jsx의 도시 카드, 검색 화면의 인기 검색어와 일부 보조 데이터는 원래 정적 데이터이며 변경하지 않았습니다.

## 수정·추가 파일

- `.env` (추가, 기존 .gitignore에 의해 제외)
  - 현재 실행 환경에 `REACT_APP_USE_MOCK=true` 설정.
- `.env.example`
  - CRA Mock 환경 변수 예시 추가.
- `src/config/mockConfig.js` (추가)
  - 단일 Mock 설정. 설정을 생략해도 기본값 ON.
- `src/mocks/authMock.js` (추가)
  - 테스트 사용자, 회원가입 닉네임, Mock 로그인·로그아웃·사용자 캐시.
  - `mock_auth_session` 키에만 세션과 사용자 저장. accessToken/currentUser 등 실제 인증 데이터는 보존.
- `src/mocks/placeMock.js` (추가)
  - 기존 이미지 자산을 재사용하는 국내·일본 장소 23개와 검색·테마 필터 보조 함수.
- `src/mocks/reviewMock.js` (추가)
  - 장소별 6개 리뷰와 기존 상세 화면이 사용하는 필드.
- `src/mocks/scheduleMock.js` (추가)
  - 여행 3개, 여행 장소 11개, 방문 순서·시간·타임라인 생성.
- `src/mocks/inquiryMock.js` (추가)
  - 답변 완료/대기 문의 데이터.
- `src/mocks/mockAdapter.js` (추가)
  - 공통 Axios Mock 어댑터, 메모리 CRUD, 폴더·최근 기록·리뷰·문의·일정 응답 처리.
- `src/api/api.js`
  - Mock일 때만 어댑터 분기와 Authorization 제거. 실제 요청·응답 인터셉터 보존.
- `src/api/authApi.js`
  - Mock 인증일 때 분리된 세션 사용. 실제 로그인·회원가입·OAuth 구현 보존.
- `src/utils/authStorage.js`
  - Mock일 때만 Mock 세션 읽기·삭제. 기존 토큰 마이그레이션과 로그아웃 정리 로직 보존.
- `src/Login/Login.jsx`
  - 서비스가 로그인 완료를 반환하면 기존 returnTo 경로로 이동. 실제 OAuth 이동 코드 보존.
- `src/Mypage/MyPage.jsx`
  - 사용자 캐시 읽기·저장 함수만 Mock 세션으로 분기. 작업 전 존재하던 테마 변경은 유지.
- `src/setupTests.js`
  - 기존 회귀 테스트의 실제 인증/API 계약 고정. Mock 통합 테스트는 자체 설정으로 ON.
- `src/mocks/mockMode.test.jsx` (추가)
  - 실제 Mock 어댑터와 화면을 함께 실행하는 13개 통합 테스트.
- `MOCK_MODE_REPORT.md` (추가)
  - 분석, 변경, 사용법과 검증 결과.

CSS, 이미지, 아이콘, 레이아웃, 라우팅 구조는 수정하지 않았습니다. 작업 전에 있던 미커밋 변경(테마·스타일·라우팅·공유 테스트 등)은 유지했습니다. package.json과 package-lock.json도 변경하지 않았으며 패키지를 설치하지 않았습니다.

## Mock 적용 범위

| 기능 | 적용 결과 |
| --- | --- |
| 이메일 로그인·로그아웃·회원가입 | 적용 |
| Google/Kakao 로그인 | 적용; 실제 OAuth 서버로 이동하지 않고 같은 로그인 성공 경로 사용 |
| 토큰·로그인 상태·저장된 사용자 조회 | 적용; 실제 토큰과 분리 |
| 이메일 인증번호 발송·확인 | 적용; 실제 메일 발송 없음, 비어 있지 않은 인증번호 허용 |
| 마이페이지 통계 | 적용 |
| 장소 조회·상세·검색·추천 | 적용; 검색어와 지역·테마에 따라 필터링 |
| 장소 생성·삭제 API | 적용; 기존 placeApi 함수의 계약 유지 |
| 최근 검색어 조회·개별 삭제·전체 삭제 | 적용 |
| 최근 본 장소 조회·추가 | 적용 |
| 폴더 조회·생성, 장소 저장·해제 | 적용; 중복 저장 방지 |
| 리뷰 목록·더보기, 리뷰 작성 API | 적용; 작성 결과와 리뷰 수 반영 |
| 여행 목록·상세·생성·수정·삭제 API | 적용 |
| 여행 장소 추가·일차별 조회·출발지·고정 시간·메모 | 적용 |
| 여행 최적화·타임라인 | 적용; 출발지를 우선 배치하고 방문 순서·고정 시간·체류 시간을 반영하는 시연용 계산 |
| 문의 목록·상세·작성·관리자 답변 | 적용 |

현재 프로젝트에 리뷰 수정/삭제 API나 별도 리뷰 상세 API는 없습니다. 리뷰 작성은 placeApi에 함수가 있지만 상세 화면에 작성 UI는 연결되어 있지 않습니다. 폴더 이름 변경·삭제는 기존에 API 미지원 안내만 있습니다. 해당 기능을 새로 만들거나 UX를 변경하지 않았습니다. Mock 최적화는 실제 경로 최적화 엔진을 재현하지 않습니다.

일정·장소·리뷰·문의·폴더 변경은 메모리에서 유지하며 페이지 새로고침 시 초기 데이터로 돌아갑니다. 로그인은 기존 로그인 유지 체크박스에 맞춰 localStorage 또는 sessionStorage에 저장됩니다. 체크 해제 시에도 같은 탭의 새로고침에는 로그인 상태가 유지됩니다.

## Mock ON/OFF 및 실행

`graduation/.env`의 아래 한 줄을 변경합니다.

```env
REACT_APP_USE_MOCK=true
```

- `true`: Mock API 사용. 이메일 로그인은 UI에서 유효한 이메일과 비어 있지 않은 비밀번호를 입력하면 됩니다. 기본 시연 계정은 `test@example.com`이며 Google/Kakao 버튼도 테스트 사용자로 로그인합니다.
- `false`: 기존 백엔드 API, 실제 인증 토큰, 기존 OAuth 사용.

변경 후 실행 중인 개발 서버를 재시작하세요. 배포 파일에는 빌드 시 값이 포함되므로 다시 빌드해야 합니다.

```powershell
cd C:\Users\joyfu\Desktop\graduation_project\graduation
npm start
```

CRA 규칙에 따라 `.env.local`, `.env.development.local`, `.env.production.local` 또는 실행 환경에 같은 변수가 설정되어 있으면 `.env`보다 우선합니다. 현재 작업 환경에는 해당 별도 파일이 없었습니다. `.env`는 기존 ignore 규칙 때문에 커밋 대상이 아니며 `.env.example`과 mockConfig의 기본값도 ON으로 맞췄습니다.

실제 모드에는 기존처럼 `REACT_APP_API_BASE_URL`과 필요한 지도 키·OAuth 서버 설정이 있어야 합니다. 이 작업은 실제 서버 URL이나 키를 변경하지 않았습니다. 지도 SDK, 위치 권한, 지도 링크와 PDF 등 외부 기능은 Mock 대상이 아닙니다.

## 기존 API 보존 여부

- `api/api.js`의 기존 Axios 생성, API URL, 신뢰 origin 제한, Bearer 인증 헤더, 401/403 처리 보존.
- `api/authApi.js`의 로그인 요청·토큰 추출·실제 저장소 처리, 회원가입, Google/Kakao authorize/login, 이메일 API 보존.
- `api/placeApi.js`, `api/tripApi.js`는 수정하지 않음. 기존 함수와 응답 검증·정규화 그대로 실행.
- 화면에 있던 직접 API 호출은 삭제하지 않고 공통 어댑터로 처리.
- OAuthCallback과 oauthSecurity의 state 검증·실제 OAuth 이동 코드 보존.
- Mock 사용자/토큰은 `mock_auth_session`에만 저장. 기존 실제 token/accessToken/currentUser를 덮어쓰거나 Mock 로그아웃으로 제거하지 않음.

## 검증 결과

| 항목 | 결과 |
| --- | --- |
| `npm run build`, Mock ON | 통과 |
| `REACT_APP_USE_MOCK=false`로 실행한 build | 통과; 실제 서버와 통신한 검증은 아님 |
| 변경 JS/JSX의 ESLint | 통과, 오류·lint warning 없음 |
| 전체 Jest 회귀·통합 테스트 | 33개 묶음, 161개 테스트 통과 |
| 새 Mock 통합 테스트 | 13개 통과; 실제 Mock 어댑터 사용 |
| 이메일 로그인·로그아웃 | 실제 App 라우팅과 UI 테스트 통과 |
| Google/Kakao 로그인 | 기존 returnTo 경로 복귀, 외부 OAuth 이동 없는 테스트 통과 |
| 새로고침 시 인증 유지 | 저장된 세션을 유지한 App unmount/remount 테스트 통과; 브라우저 실제 reload는 별도 수동 검증 필요 |
| 화면 | 마이페이지, 내 일정 목록, 검색, 장소 상세·리뷰 더보기 렌더링 통과 |
| 일정 흐름 | 기존 saveRouteToServer로 여러 일차 생성·출발지·고정 시간·저장·재조회 통과 |
| CRUD·응답 계약 | 일정/장소/폴더/리뷰/최근 기록/문의 테스트 통과 |
| 네트워크 요청 차단 | XHR.open 감시와 호출자가 지정한 실제 adapter 미실행 검증 통과; 미지원 경로도 네트워크 fallback 없음 |
| Git whitespace 검사 | `git diff --check` 통과 |

설치된 react-router-dom(7.13.1)은 package.json의 main 경로(dist/main.js)가 실제로 없어서 기존 Jest 버전에서 일반 테스트 명령으로 해석하지 못했습니다. 최신 패키지를 설치하거나 프로젝트 설정을 바꾸지 않고 아래 실행 명령에서 moduleNameMapper를 추가해 전체 테스트를 통과시켰습니다. 최초 실행 중 발생했던 시간 초과도 이 명령으로 전체 재실행했을 때 재현되지 않았습니다.

```powershell
$env:CI='true'
node -e "process.argv = ['node', 'test', '--watchAll=false', '--runInBand', '--moduleNameMapper=' + JSON.stringify({'^react-router-dom$':'<rootDir>/node_modules/react-router-dom/dist/index.js','^react-router/dom$':'<rootDir>/node_modules/react-router/dist/development/dom-export.js','\\.svg$':'<rootDir>/src/testSvgMock.js'})]; require('./node_modules/react-scripts/scripts/test');"
```

Lint 실행 명령:

```powershell
node node_modules/eslint/bin/eslint.js src/config src/mocks src/api/api.js src/api/authApi.js src/utils/authStorage.js src/Login/Login.jsx src/Mypage/MyPage.jsx src/setupTests.js
```

Browserslist의 기존 caniuse-lite 데이터가 오래됐다는 안내는 있었으나 빌드는 정상 완료됐습니다. 기존 오류 처리 테스트 일부는 의도적으로 오류 로그를 출력하며 모든 테스트는 통과했습니다. 새 Mock 테스트에서는 React warning이 발생하지 않았습니다.

실제 브라우저 Network 탭, 실제 OAuth/백엔드 서버, 지도 SDK 및 외부 서비스 연결은 이 테스트에서 검증하지 않았습니다. `security:release-check`는 실제 HTTPS 백엔드 주소를 요구하는 배포 검사이므로 백엔드 주소가 없는 Mock 시연 빌드의 검증 항목으로 사용하지 않았습니다.
