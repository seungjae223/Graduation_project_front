# 일정·공통 포커스 담당 결과

2026-10-12. 기존 작업 변경을 보존했다. 서버·브라우저·사용자 데이터에 쓰기 요청을 실행하지 않았다. 아래 완료는 코드와 로컬 DOM/단위 테스트 수준이며, 실 SDK·운영 API·실 PDF·모바일 실화면 검증은 root 담당이다.

| 번호 | 상태 | 확인한 원인과 수정 | 수행한 검증 | 남은 제한 |
| --- | --- | --- | --- | --- |
| 22 | 수정·코드/DOM 검증 완료 | Header 삭제 진입점이 서버 삭제 대신 localStorage 예시 일정을 지웠다. Header.jsx:106,246에서 deleteTripApi와 공통 쓰기 훅으로 연결했다. 확인된 성공 뒤에만 내 일정으로 이동하고 응답 유실은 목록 확인만 제공한다. 이동/계정 변경 뒤 늦은 응답은 새 페이지를 이동시키지 않는다. | scheduleActions.test.jsx: 취소 0회, 연속 확인 1회, 서버 완료 전 이동 없음, 성공 뒤 목록, 응답 유실 재전송 없음, 늦은 응답 이동 없음. | 실제 서버 삭제 성공/권한 오류 실화면은 별도. |
| 23 | 수정·코드/DOM 검증 완료 | RouteCreate에 검색 실패 시 예시 장소가 렌더링되고, trip를 먼저 만든 뒤 각 placeId를 확인했다. 예시 목록을 제거하고 RouteCreate.jsx:1325의 validateRoutePlaces에서 모든 날짜/장소를 현재 GET /api/places/{id} 응답의 실제 ID·이름과 대조한 후 :1644에서 첫 trip POST를 수행한다. 숫자 ID만으로 유효성을 인정하지 않는다. | invalid/예시/현재 응답 이름 불일치/두 번째 장소 불일치/조회 실패에서 쓰기 0회. 실제 첫 검색 응답 전·실패 후 Enter로 장소 추가나 쓰기 없음. 기존 고정시간 PATCH와 중복 방문 매핑 테스트 통과. | 운영 GET 장소 응답은 실 API로 별도 확인. 기존 응답 계약 외 필드/새 API를 발명하지 않았다. |
| 24 | 수정·코드/DOM 검증 완료 | 일정 검색 수동 효과에 취소/조회 소유권이 없어 늦은 요청이 새 검색을 덮을 수 있었다. useRoutePlaceSearch.js는 계정+검색어 키, AbortSignal, 공통 조회 훅을 사용한다. 검색창 닫기/재개도 이전 응답을 무효화한다. | A 후 B, B 완료 후 늦은 A 성공·오류, 닫기/다시 열기, 정상 결과 선택 테스트. | 실 네트워크 경쟁은 별도. |
| 25 | 수정·코드/DOM 검증 완료 | 예시/저장장소 배열을 두 가짜 폴더로 잘라 표시하여 실제 폴더명·전체 장소·부분 실패가 사라졌다. useFavoriteFolders.js와 RouteCreate.jsx:1808은 실제 폴더 API와 각 폴더 장소 API를 사용하며 개수 제한 없이 표시한다. 실패와 빈 결과를 구분하고 같은 계정의 확인된 장소를 보존한다. | 실제 폴더명과 9개 장소, 빈 배열, 일부 실패/재조회 때 확인된 장소 보존. 폴더 간 같은 장소를 중복 추가하지 않는 기존 선택 처리 확인. | 운영 계정의 폴더 읽기·부분 실패 실화면은 별도. |
| 26 | 수정했으나 서버 계약 확인 필요 | 출발 장소의 FIX 시각이 저장/조회되지 않고 조회는 10:00을 사용한다. 확인된 start API에는 지속 출발 시각 저장 본문 계약이 없다. StartPlaceModal.jsx:245에서 10시 제한을 알리고 고정 시간이 설정된 장소는 출발지 선택을 막는다(:293). 저장 전 동일 조건을 재검증한다. | FIX 출발지 비활성, 다른 출발지 선택, 지원하지 않는 FIX 출발지로 저장 시 쓰기 0회. 다른 장소의 기존 고정시간 저장 테스트 유지. | 임의 출발 시각 지원에는 canonical startTime 필드, 저장/수정/조회 계약과 optimize·timeline 연계가 필요하다. 현재 제공되는 10시 시작은 유지한다. |
| 27 | 수정·코드/DOM 검증 완료 | 일정 검색/관심/선택/출발지 카드가 누락 사진을 picsum으로 채웠다. 관련 fallback을 제거하고 기존 PlacePhoto를 사용한다. 실제 사진 URL 또는 공통 대체 영역을 렌더링한다. | 실제 서버 결과만 선택, 사진 누락 시 공통 placeholder. PlacePhoto 자체 오류 테스트는 root 통합 검사 담당. | 사진 로딩 실패/모바일 이미지 실화면은 별도. |
| 28 | 수정·코드/DOM 검증 완료 | 클릭 가능한 일정 카드가 의미 없는 div이고 포커스 outline을 지웠다. RouteResult.jsx:1566 제목에 독립 native 지도 버튼을 제공하고 RouteResult.css:418,430에 기존 디자인과 focus-visible을 유지했다. 드래그 손잡이/메모 이벤트와 구분한다. | Enter와 Space 각 지도 1회, 기존 keyboardOrder와 editing 테스트에서 드래그 포커스·되돌리기·메모 연결 유지. | 실 모바일 터치/스크린리더는 별도. |
| 29 | 수정·코드/DOM 검증 완료 | 설정·레이어 아이콘 두 버튼이 같은 외부 지도 동작을 수행했다. RouteResult.jsx:1839,2038의 한 개 외부 지도 아이콘과 실제 provider 이름으로 정리했다. | 실제 RouteResult DOM에 '카카오맵에서 경로 열기' 액션 1개. | 실 외부 앱 실행은 별도. |
| 46 | 수정·DOM 검증 완료 | Header Skip이 실제 홈 대신 온보딩 최종 단계로 이동했다. 세 온보딩 Header Skip을 /home으로 변경했다. | /, /onboarding, /onboarding2 각각 /home 목적지 확인. | 온보딩 본문 CTA와 로그인 흐름은 auth/root 담당. |
| C7 | 수정·DOM 검증 완료 | 직접 /onboarding3 접근 시 history가 없어 뒤로가기가 앱을 벗어날 수 있다. Header.jsx:161에서 유효 history idx가 있으면 기존 -1, 없으면 /onboarding2로 기존 전환 함수를 사용한다. | history 없는 직접 진입의 목적지/방향 확인. | 실제 native/fallback 애니메이션은 root 담당. |
| C8 | 수정·단위 검증 완료 | Kakao 외부 지도 한 장소 분기가 좌표를 전달하지 않고 이름 검색으로 변환했다. RouteResult.jsx:676에서 실제 placeInfo 좌표를 유지한다. | 동명 장소 둘의 다른 서버 좌표가 다른 URL의 정확 좌표로 유지됨. | provider 앱의 실제 표시 확인은 별도. |
| C9 | 수정·DOM 및 실제 Kakao 검증 완료, 실 PDF 최종 확인 진행 | SDK geocoding 좌표가 MapBox 내부에만 남았다. 모든 날짜 프리로드도 장소명+주소를 addressSearch에 넘겨 위치를 확인하지 못했고 이름 STATIC 좌표 fallback으로 지도만 보였다. useResolvedMapCoordinates.js는 계정·trip·날짜/일차·visit·주소 키로 화면/PDF 좌표를 공유한다. RouteResult.jsx:821은 실제 주소 단독 geocoding, :2189는 공유 좌표로 거리 재계산, :2281은 미방문 일차까지 준비한다. 미확인 장소는 STATIC 이름 좌표로 대신 확인하지 않고 export를 차단한다. | 5 suites/21 tests PASS: 실제 RouteResult의 모든 날짜 주소 조회, 일부 준비 중 export 차단, 완료 후 PDF payload·외부 링크 동일 SDK 좌표, 메모/순서/늦은 응답 보호. root 실제 localhost:3000/route-result?id=1에서 서버 좌표만 null인 조건으로 SDK의 네 좌표가 STATIC과 다른 값으로 hidden PDF에 공유되고 exportReady=true, 거리904m, attribution1개 확인. | 실 PDF 생성/렌더 최종 결과는 root 진행 중이다. Google 실제 SDK는 별도. 서버 좌표/구분 주소/provider place ID가 모두 없는 동명 장소는 geocoder 첫 응답만으로 정확성을 보증할 수 없어 위치 계약이 필요하다. |
| C10 | 수정·단위/DOM 검증 완료 | 여러 단계 일정 생성은 화면 이탈/계정 변경 뒤 후속 요청을 계속할 수 있었다. generationRequest.js는 시작 인증 snapshot과 credentialVersion, AbortSignal, 작업 current 여부를 각 요청 전후 확인한다. useGenerationTask.js는 unmount/계정 변경에 작업을 취소하고 늦은 상태/이동을 차단한다. useTripResult.js에도 계정별 응답·timeline 가드를 보완했다. | 전송이 abort를 무시해도 trip POST 완료 후 추가 place POST 없음, credential 변경 후 후속 쓰기 없음, 같은 trip ID의 이전 계정 timeline이 새 계정에 연결되지 않음. | 취소 전에 보낸 요청의 서버 저장은 롤백되지 않는다. 서버 idempotency/진행 상태 조회 계약은 새로 만들지 않았으며 목록 확인이 필요하다. |
| 30 (추가 검증) | root 수정·DOM 검증 완료 | root FolderSelectModal의 생성 취소 포커스 복귀 구현을 실제 모달에서 확인했다. | 생성 input → 취소 → 새 폴더 버튼 포커스, 다음 Tab은 모달 취소 버튼. 취소 쓰기 0회. | 실 모바일/스크린리더는 별도. |
| 58 (추가 검증) | root 수정·DOM 검증 완료 | root가 실제 390px 긴 Total 목록에서 body+html 동시 잠금이 height:100%인 body의 긴 콘텐츠를 잘라 scrollHeight를 뷰포트 높이로 줄이고 scrollY를 0으로 이동시키는 결함을 재현했다. root useModalFocus는 실제 document.scrollingElement만 잠그고 그 요소의 기존 overflowY·top·left를 복원한다. body의 원래 overflow는 유지한다. | 수정된 구현에서 StrictMode, 중첩 Tab/ShiftTab, top Escape만 실행, canClose=false에서 부모 Escape도 실행 없음, 외부 focus 차단, 자식 닫아도 lock 유지, 마지막 닫기/unmount 뒤 원래 overflowY와 스크롤 속성 복원. 3 suites/19 tests PASS(schedule-focus-tests.log). | 실제 문서 배경 스크롤과 원래 위치 복원 재확인은 root 브라우저 검증이 필요하며 DOM 속성만으로 완료 처리하지 않는다. |
| 59 (추가 수정·검증) | 수정·DOM 검증 완료 | 모달을 연 키보드 PUSH에서 대기 observer가 모달 취소 후 제목 포커스를 뒤늦게 빼앗는 것을 테스트로 재현했다. useKeyboardRouteFocus.js:24는 모달이 감지된 해당 진입의 observer를 종료한다. | 키보드 PUSH 제목 1회, 지연 lazy 준비 후 제목, 이전 entry 취소, POP/REPLACE/query/pointer/onboarding/landing 유지, 모달 오픈/취소 복귀 유지. | 실제 브라우저 스크롤/SPA 통합 경로는 root 담당. |

## 최신 검사

- 12 suites / 66 tests PASS: `output/frontend-fixes/schedule-tests-final.log`.
- 이후 root의 실제 문서 스크롤러 잠금 수정에 맞춰 body 원래 스타일 유지와 스크롤 속성 복원을 재검증했다: 3 suites / 19 tests PASS, `output/frontend-fixes/schedule-focus-tests.log`. 이 19개는 위 66개에 포함되는 포커스/폴더 suite다.
- Scoped ESLint 0 errors/0 code warnings: `output/frontend-fixes/schedule-eslint.log`. 기존 Browserslist 자료 오래됨 안내는 남았으며 의존성을 변경하지 않았다.
- `git diff --check` 담당 파일 PASS. Git의 LF→CRLF 안내만 출력됐다.
- `schedule-focus-regression.log`는 수정 전 재현 실패 근거다. 수정 후 동일 테스트는 최종 통합 로그에서 통과했다.
- 검증용 서버를 시작하지 않았으므로 정리 대상 서버가 없다.

## 실화면 점검 중 추가된 SDK 레이어 정리

root는 실제 Kakao 지도 표시 성공 뒤 reorder→reset을 하면 '100m / Kakao 맵으로 이동' attribution이 4번 남는 것을 확인했다. `MapBox`가 `dayData` 객체 변경마다 SDK Map을 새로 생성하면서 cleanup에서는 marker/polyline/listener만 해제하고 SDK DOM은 남긴 것이 원인이다. C9 공유 좌표나 메모가 같은 지도에 추가 초기화를 유발하는 것도 DOM 테스트에서 재현했다.

`RouteResult.jsx:1674`는 시간/메모를 제외한 지도 데이터와 좌표 별칭을 정규화한다. `:1753,1894`는 같은 owner의 SDK Map을 유지하고 지도 overlay만 갱신한다. `:1830,2027`은 owner 변경 또는 unmount 시 지도 소유 컨테이너의 SDK 자식을 제거하며 일반 UI나 지도 attribution을 CSS로 숨기지 않는다. `:2019`는 실제 로드한 Kakao SDK 인스턴스에서 click listener를 해제한다. 좌표 공유/내보내기 주요 위치는 현재 `:2186,2279,2383,2435`다.

- 수정 전 두 provider 테스트 FAIL로 반복 Map 생성 확인: `schedule-map-lifecycle-before.log`.
- 지도 수명·좌표/PDF payload·메모·키보드 순서 회귀 4 suites / 15 tests PASS: `schedule-map-lifecycle-after.log`.
- owner 변경·unmount SDK 자식 정리까지 추가한 지도 수명 1 suite / 5 tests PASS: `schedule-map-lifecycle-cleanup.log`.
- Scoped ESLint 0 errors/0 코드 warnings: `schedule-map-lifecycle-eslint.log`.
- 실 SDK attribution 1개 유지 재확인은 root 담당이다.

## C9 실제 주소 좌표 프리로드 후속 수정

모든 일차 프리로드 자체는 실행됐지만 주소 geocoder에 장소명까지 포함되어 실패했다. `RouteResult.jsx:821`은 keyword 검색 실패 후 **원래 주소만** addressSearch에 전달한다. Google geocoder도 주소가 주어지면 원래 주소를 사용한다. 주소가 있는 장소의 실패를 이름 STATIC 좌표로 채우는 경로를 제거했다. `:1000,1018`은 null 거리의 Number(null)=0 표시와 누락 구간을 0으로 합산하는 동작을 수정하며, `:1028,2189`는 확인된 공유 좌표로 실제 직선거리와 총거리를 갱신한다.

회귀 테스트는 부모가 아직 클릭하지 않은 2일차까지 네 원래 주소가 조회되는지, 1일차만 완료되면 exportReady=false와 2일차 markers[]가 유지되는지, 모든 좌표 완료 후 exportReady=true·정확한 SDK PDF payload·실제 거리 표시가 되는지를 검증한다. 5 suites / 21 tests PASS(`schedule-coordinate-preload-after.log`), Scoped ESLint 0 errors/0 코드 warnings(`schedule-coordinate-preload-eslint.log`), diff --check PASS. 수정 전 재현은 `schedule-coordinate-preload-before.log`에 남겼다.

root는 실제 Kakao SDK에서 네 위치가 STATIC 값과 다른 주소 좌표로 공유되고 거리 904m·exportReady=true·attribution1개를 확인했다. 실제 PDF 생성·렌더 최종 판정은 root가 진행 중이며 이 문서만으로 완료를 선언하지 않는다. 임시 `scheduleMock.makeTripPlace` null 좌표 검증 fixture는 root가 관리/복원하며 이 담당은 수정하지 않았다.

## C9 SDK 경로선 실화면 후속 원인

root는 실제 화면의 SDK marker 위치와 PDF 경로선이 정상인 상태에서도 실 지도 녹색 선이 보이지 않는 조건을 확인했다. 담당이 `App.css`와 `responsive.css`의 전역 media `max-width:100%` 규칙을 추적한 뒤 root가 실제 SDK SVG의 inline width1780px와 달리 computed width/rect width가0, 부모 layer width0임을 확인했다. 전역 반응형 media 규칙이 SDK 투영 SVG를 폭0으로 제한한 CSS 충돌이다.

root가 `RouteResult.css`의 `.route-map-real svg`에만 `max-width:none` 예외를 적용하고 실제 경로선을 재검증한다. JSX/SDK 초기화 소스는 이 원인에 대해 추가 변경하지 않았다. 같은 SDK Map 재사용/overlay 정리의 최신 JavaScript 검사 결과는 위 5 suites/21 tests PASS이며, 실제 CSS/녹색선/PDF 출력 폭 재확인 결과는 root의 최종 검증에 따른다.
