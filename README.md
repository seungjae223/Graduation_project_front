<div align="center">

<img src="src/img/너만 오면 go 블랙.png" alt="너만 오면 GO" width="260" />

# 너만 오면 GO

### 장소를 고르고, 동선을 만들고, 여행을 시작하세요.

**여행 경로 최적화 · 모바일 중심 웹 · 졸업 프로젝트**

<img src="https://img.shields.io/badge/React-19-149ECA?style=flat-square&amp;logo=react&amp;logoColor=white" alt="React 19" />
<img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&amp;logo=javascript&amp;logoColor=222222" alt="JavaScript" />
<img src="https://img.shields.io/badge/React_Router-7-CA4245?style=flat-square&amp;logo=reactrouter&amp;logoColor=white" alt="React Router 7" />
<img src="https://img.shields.io/badge/Axios-5A29E4?style=flat-square" alt="Axios" />
<img src="https://img.shields.io/badge/Jest-C21325?style=flat-square&amp;logo=jest&amp;logoColor=white" alt="Jest" />

<br />
<br />

[주요 기능](#주요-기능) &nbsp; · &nbsp; [빠른 시작](#로컬-실행) &nbsp; · &nbsp; [프로젝트 구조](#프로젝트-구조) &nbsp; · &nbsp; [개선 과제](#현재-제한-사항과-개선-과제)

</div>

---

> **여행 계획을 하나의 흐름으로.**  
> 장소 탐색부터 날짜별 일정 구성, 경로 최적화와 지도 확인까지 연결합니다.


여행 장소를 날짜별로 구성하고, 출발지와 고정 방문 시간을 반영해 여행 동선을 만드는 졸업 프로젝트입니다. 장소 탐색부터 일정 생성, 지도 확인, 저장한 여행 관리까지 하나의 흐름으로 연결하는 것을 목표로 합니다.

React 기반의 모바일 중심 웹 애플리케이션이며, REST API를 통해 인증·장소·추천·여행·문의 기능을 연동합니다. 일부 화면에는 정적 데이터 또는 브라우저 저장소 기반 구현이 남아 있습니다.

<details>
<summary><strong>📑 목차 펼치기</strong></summary>


- [주요 기능](#주요-기능)
- [사용 흐름](#사용-흐름)
- [기술 스택](#기술-스택)
- [로컬 실행](#로컬-실행)
- [환경 변수](#환경-변수)
- [개발 명령어](#개발-명령어)
- [주요 페이지](#주요-페이지)
- [프로젝트 구조](#프로젝트-구조)
- [API 연동 구조](#api-연동-구조)
- [배포](#배포)
- [테스트](#테스트)
- [현재 제한 사항과 개선 과제](#현재-제한-사항과-개선-과제)

</details>

---

<a id="주요-기능"></a>

## ✨ 주요 기능

| 영역 | 구현 내용 |
| --- | --- |
| 👋 시작 화면 | 서비스 소개, 온보딩, 화면 전환 애니메이션 |
| 🔐 인증 | 이메일·비밀번호 로그인, 회원가입, 이메일 인증, 카카오·Google OAuth 연동 코드 |
| 🔎 장소 탐색 | 홈 화면, 테마 추천, 장소 상세, 검색 화면과 검색 팝업 |
| 📁 장소 관리 | 폴더 생성, 폴더에 장소 저장·제거, 최근 본 장소 |
| 🧭 여행 생성 | 날짜 선택, 날짜별 장소 추가, 출발지 지정, 고정 방문 시간 설정, 서버 최적화 요청 |
| 🗺️ 여행 결과 | 날짜별 일정, 지도 표시, 메모 수정, 공유 링크 복사, PDF 저장 |
| 👤 마이페이지 | 사용자 정보, 내 일정, 테마 설정, 위치 권한 관리 |
| 💬 문의 관리 | 사용자 문의 작성·조회, 관리자 문의 조회·답변 |

위 표는 프론트엔드에 구현된 화면과 연동 코드를 설명합니다. 실제 API 기능, OAuth, 지도 표시는 백엔드와 외부 서비스 설정에 따라 동작합니다. 미완성 항목은 문서 하단에 별도로 정리했습니다.

---

<a id="사용-흐름"></a>

## 🧭 사용 흐름

```mermaid
flowchart LR
    A[온보딩] --> B[장소 탐색]
    B --> C[날짜별 일정 구성]
    C --> D[출발지 · 방문 시간 설정]
    D --> E[경로 최적화]
    E --> F[지도 · 일정 확인]
    F --> G[내 일정 관리]
```
1. 온보딩에서 서비스를 확인하고 홈으로 이동합니다.
2. 홈·추천·검색 화면에서 여행 장소를 탐색합니다.
3. 경로 생성 화면에서 여행 날짜와 날짜별 방문 장소를 선택합니다.
4. 출발지와 고정 방문 시간을 지정한 뒤 경로 생성을 요청합니다.
5. 결과 화면에서 일정과 지도를 확인하고 메모·공유·PDF 기능을 사용합니다.
6. 마이페이지의 **내 일정**에서 서버에 저장된 여행을 다시 확인합니다.

인증이 필요한 기능은 로그인 후 사용합니다. 하단 **일정** 탭과 마이페이지의 **내 일정**은 현재 서로 다른 저장 방식을 사용하므로, 아래 제한 사항을 참고하세요.

---

<a id="기술-스택"></a>

## 🛠️ 기술 스택

| 구분 | 사용 기술 |
| --- | --- |
| UI | React 19, JavaScript, CSS |
| 라우팅 | React Router 7 |
| API 통신 | Axios |
| 드래그 앤 드롭 | dnd-kit |
| 지도 | Kakao Maps JavaScript SDK, Google Maps JavaScript API |
| PDF 내보내기 | html2pdf.js |
| 빌드 | react-scripts 5, 별도 프로덕션 빌드 스크립트 |
| 테스트 | Jest, React Testing Library, jest-dom |

정확한 의존성 범위와 고정 설치 버전은 각각 `package.json`과 `package-lock.json`에서 확인할 수 있습니다.

---

<a id="로컬-실행"></a>

## 🚀 로컬 실행

### 준비 사항

- Node.js와 npm이 설치된 환경
- API 기능을 확인할 수 있는 백엔드 서버
- 지도 기능을 사용할 경우 각 서비스의 브라우저용 API 키

### 설치 및 실행

저장소 루트에서 다음 명령을 실행합니다.

```powershell
npm ci
Copy-Item .env.example .env.development.local
npm start
```

`.env.development.local`의 API 주소와 지도 키를 실행 환경에 맞게 입력하세요. 개발 서버의 기본 접속 주소는 `http://localhost:3000`입니다. 환경 변수를 바꾼 뒤에는 개발 서버를 다시 시작해야 합니다.

백엔드 없이도 일부 화면은 확인할 수 있지만, 로그인·여행 저장·문의 등 서버 의존 기능은 정상 동작하지 않습니다.

---

<a id="환경-변수"></a>

## ⚙️ 환경 변수

| 변수 | 용도 | 설정 |
| --- | --- | --- |
| `REACT_APP_API_BASE_URL` | 백엔드 API 기본 주소 | 개발 예시: `http://localhost:8080`. 배포 환경에는 실제 HTTPS 주소를 지정합니다. |
| `REACT_APP_GOOGLE_MAPS_BROWSER_KEY` | Google 지도 표시 | Google Maps 브라우저용 키 |
| `REACT_APP_KAKAO_MAP_JS_KEY` | 카카오 지도 표시 | Kakao Maps JavaScript 키 |

설정 예시는 `.env.example`에 있습니다. 개발 환경에서 API 주소를 생략하면 `http://localhost:8080`을 사용하며, 프로덕션 환경에는 별도로 지정해야 합니다.

`REACT_APP_*` 값은 빌드된 브라우저 코드에 포함됩니다. 지도에는 공개 사용을 전제로 한 브라우저용 키를 설정하고, 서비스 콘솔에서 허용 도메인과 API를 제한하세요. 서버 비밀 키와 OAuth client secret은 프론트엔드 환경 변수에 넣지 않습니다.

---

<a id="개발-명령어"></a>

## ⌨️ 개발 명령어

| 명령어 | 설명 |
| --- | --- |
| `npm start` | 로컬 개발 서버 실행 |
| `npm test` | 변경을 감시하는 테스트 실행 |
| `npm test -- --watchAll=false --runInBand` | 전체 테스트를 한 번 실행 |
| `npm run build` | `build/`에 배포용 파일 생성, 소스맵 생성 비활성화 |
| `npm run security:release-check` | 빌드 결과와 API 주소에 대한 정적 배포 검사 |

---

<a id="주요-페이지"></a>

## 🗺️ 주요 페이지

| 경로 | 화면 | 접근 조건 |
| --- | --- | --- |
| `/`, `/onboarding`, `/onboarding2`, `/onboarding3` | 온보딩 | 공개 |
| `/landing` | 서비스 소개 | 공개 |
| `/login`, `/signup` | 로그인·회원가입 | 공개 |
| `/find-password`, `/verify-code` | 비밀번호 찾기·이메일 인증 관련 화면 | 공개 |
| `/oauth/:provider/callback` | 소셜 로그인 콜백 | OAuth 흐름에서 사용 |
| `/home`, `/search` | 홈·검색 | 공개 |
| `/recommend`, `/total`, `/detail`, `/popular-all` | 추천·전체 목록·장소 상세·인기 목록 | 공개, 저장 등 일부 동작은 인증 필요 |
| `/route-create`, `/route-result` | 경로 생성·결과 | 페이지는 공개, 서버 작업에는 인증 필요 |
| `/schedule` | 하단 일정 탭 | 브라우저 저장 데이터 조회 |
| `/mypage`, `/saved-places`, `/mypage/recent-places`, `/my-schedule` | 마이페이지·저장 장소·최근 장소·내 일정 | 로그인 필요 |
| `/inquiry`, `/inquiry/write`, `/inquiry/:id` | 문의 목록·작성·상세 | 로그인 필요 |
| `/admin`, `/admin/inquiry`, `/admin/inquiry/write` | 관리자 화면 | 현재 라우트는 로그인 여부만 확인, API 권한 검증 필요 |

등록되지 않은 주소에는 404 화면을 표시합니다.

---

<a id="프로젝트-구조"></a>

## 📂 프로젝트 구조

```text
Graduation_project_front/
├── public/                 # HTML, 테마 초기화, 배포 리다이렉트·헤더 설정
├── scripts/                # 프로덕션 빌드 및 배포 검사
├── src/
│   ├── api/                # 공통 Axios, 인증·장소·여행 API
│   ├── Context/            # 저장 장소 공유 상태
│   ├── utils/              # 인증·OAuth·저장소·지도·모달 유틸리티
│   ├── components/         # 공통 장소 카드
│   ├── OnBoarding/          # 온보딩 화면과 전환
│   ├── Landingpage/         # 서비스 소개
│   ├── Login/               # 로그인·회원가입·이메일 인증·OAuth
│   ├── Homepage/            # 홈과 인기 장소
│   ├── Search/              # 검색 페이지
│   ├── SearchPopup/         # 검색 팝업
│   ├── Recommend/           # 테마 추천과 장소 상세
│   ├── RouteCreate/         # 날짜·장소 입력과 경로 생성
│   ├── RouteResult/         # 일정 결과·지도·메모
│   ├── Schedule/            # 브라우저 저장 데이터 기반 일정 탭
│   ├── MySchedule/          # 서버 기반 내 일정 목록
│   ├── Mypage/              # 사용자 정보·폴더·문의
│   ├── Admin/               # 관리자 화면
│   ├── Header/, Footer/     # 공통 내비게이션
│   ├── ShareModal/          # 공유와 PDF 저장 UI
│   ├── img/                 # 이미지와 SVG 자산
│   ├── App.js               # 라우팅과 공통 레이아웃
│   ├── index.js             # 애플리케이션 진입점
│   └── responsive.css       # 반응형 스타일
├── .env.example            # 환경 변수 예시
├── package.json            # 의존성과 실행 명령
└── package-lock.json       # 재현 가능한 설치를 위한 잠금 파일
```

화면별 JSX와 CSS를 함께 관리하며, 테스트는 관련 코드 주변의 `*.test.js` 파일에 배치합니다. 위 트리는 주요 디렉터리를 중심으로 요약했습니다.

---

<a id="api-연동-구조"></a>

## 🔗 API 연동 구조

- `src/api/api.js`: API 기본 주소, 인증 헤더, 공통 오류 메시지와 인증 만료 처리
- `src/api/authApi.js`: 로그인·회원가입·소셜 인증·이메일 인증
- `src/api/placeApi.js`: 장소 검색·추천·최근 검색·최근 장소·폴더 관리
- `src/api/tripApi.js`: 여행 생성·조회·수정·장소·출발지·시간·메모·최적화 관련 API와 데이터 정규화

인증이 필요한 요청에는 Bearer 토큰을 전달합니다. 공통 클라이언트는 신뢰한 API origin으로 요청을 제한하고, 비공개 API의 401 응답에는 인증 정보를 정리한 뒤 로그인 화면으로 이동합니다.

일부 화면은 공통 클라이언트를 직접 호출하며 화면 내부에서 응답 데이터를 변환합니다. 여행 생성은 여러 API 요청을 순차적으로 수행하므로, 중간 실패 복구와 중복 생성 방지가 개선 과제입니다.

---

<a id="배포"></a>

## 📦 배포

1. 배포 환경에 실제 HTTPS 백엔드 주소와 지도 키를 설정합니다.
2. `npm run build`로 정적 파일을 생성합니다.
3. `npm run security:release-check`를 실행합니다.
4. `build/` 디렉터리를 정적 호스팅 서비스에 배포합니다.
5. 실제 배포 주소에서 API 통신, OAuth 콜백, 지도 표시, 페이지 직접 접속과 새로고침을 확인합니다.

`public/_redirects`와 `public/_headers`에는 Netlify 형식의 설정이 있습니다. 다른 호스팅을 사용한다면 해당 서비스의 SPA fallback과 응답 헤더 설정으로 옮겨야 합니다. 백엔드 CORS 허용 origin과 OAuth 리다이렉트 주소도 배포 주소에 맞게 설정하세요.

정적 배포 검사는 HTTPS API 주소, 소스맵 포함 여부, 특정 기존 HTTP API 주소의 잔존 여부를 검사합니다. 실제 HTTPS 연결, CORS, OAuth, 응답 헤더 동작은 배포 환경에서 별도로 확인해야 합니다.

---

<a id="테스트"></a>

## 🧪 테스트

현재 테스트는 인증 저장소, OAuth 처리, API 오류 처리, 로그인 복귀 경로, 로그 정리, 배포 자산, 아이콘, 반응형 CSS 규칙, 내비게이션 및 404 라우팅 등을 다룹니다.

2026년 10월 3일 기준 다음 명령으로 **14개 테스트 묶음, 67개 테스트가 모두 통과**했습니다.

```powershell
npm test -- --watchAll=false --runInBand
```

이 결과는 실제 백엔드·지도·OAuth 연동이나 모든 화면의 시각적 품질을 검증한 결과는 아닙니다. 핵심 흐름인 **로그인 → 경로 생성 → 저장 → 새로고침 → 내 일정 조회**와 실패 후 재시도에 대한 통합 테스트가 추가로 필요합니다.

---

<a id="현재-제한-사항과-개선-과제"></a>

## 📌 현재 제한 사항과 개선 과제

| 우선순위 | 항목 | 현재 상태와 개선 방향 |
| --- | --- | --- |
| 높음 | 일정 데이터 일관성 | `/schedule`은 Mock 브라우저 저장소를 읽고 `/my-schedule`은 서버를 조회합니다. 생성한 여행을 일관되게 볼 수 있도록 서버 기반 조회로 통일해야 합니다. |
| 높음 | 생성 실패 복구 | 여러 저장·최적화 요청 중 일부가 실패하면 부분 데이터가 남을 수 있습니다. 재개·정리·중복 방지 방식이 필요합니다. |
| 높음 | 결과 조회 오류 | 조회 실패를 로그 또는 빈 데이터로 처리하는 부분이 있습니다. 실패·빈 일정·부분 조회 상태를 구분하고 재시도를 제공해야 합니다. |
| 중간 | 폴더 편집 | 이름 변경과 폴더 삭제는 현재 API 미지원 안내를 표시합니다. 백엔드 연결 또는 UI 상태 정리가 필요합니다. |
| 중간 | 친구 초대 | 마이페이지의 친구 초대 배너에는 실제 동작이 연결되어 있지 않습니다. |
| 중간 | 검색 데이터 | 검색 페이지에는 정적 목록 기반 필터링이 남아 있습니다. 서버 장소 검색과 통일해야 합니다. |
| 중간 | 관리자 접근 | 프론트엔드 라우트에 역할 확인을 추가하고 서버의 관리자 권한 검증을 확인해야 합니다. |
| 중간 | 요청·알림 처리 | 공통 요청 시간 제한을 설정하고, 화면별 `alert()` 중심 안내를 일관된 메시지 UI로 정리할 필요가 있습니다. |
| 유지보수 | 화면 파일 분리 | 경로 생성·결과 화면의 API 처리, 데이터 변환, 지도, 모달을 분리하고 API 계층 사용을 통일할 필요가 있습니다. |
| 검증 | 통합 테스트 | 일정 생성·저장·재조회와 중간 실패 후 재시도를 검증하는 테스트가 필요합니다. |


---

<div align="center">

**너만 오면 GO** · 여행 경로 최적화 프론트엔드

[맨 위로 돌아가기](#너만-오면-go)

</div>

