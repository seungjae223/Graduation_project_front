# 마이페이지·문의·관리자 담당 수정 결과

검증 기준: 2026-10-12 현재 작업 코드. 기존 변경사항을 보존했으며 실제 사용자 데이터의 생성·삭제, 브라우저 조작, 서버 실행은 하지 않았다. 실화면·통합 빌드는 루트 작업에서 별도로 검증한다.

## 실행한 검사

- `src/Mypage/profileFlows.test.jsx`, `src/Mypage/inquiryData.test.js`, `src/Mypage/availableActions.test.jsx`: 3 suites / 31 tests 통과. 실제 컴포넌트, 공통 조회·쓰기 훅과 저장 컨텍스트를 사용하고 API 응답만 Mock했다.
- 담당 변경 JS/JSX ESLint: errors 0, warnings 0. 설치된 Browserslist 데이터의 오래된 버전 알림은 남았다.
- 담당 경로 `git diff --check`: 통과.
- 기록: `output/frontend-fixes/profile-tests.log`, `output/frontend-fixes/profile-eslint.log`.

## 번호별 처리

| 번호 | 확인한 원인 및 수정 | 주요 파일 | 실행 검증 / 남은 제한 |
|---|---|---|---|
| 11 | 내부 삭제 버튼의 Enter·Space가 부모 카드 키 처리로 전달됐다. 카드 자체가 이벤트 대상일 때만 상세 이동한다. | `src/Mypage/SavedPlaces.jsx` | 두 키로 실제 삭제 요청은 1회, 상세 이동 없음 확인. |
| 31 | 상세에서 실제 답변이 없어도 기본 처리 완료 답변과 과거 날짜를 생성했다. 예시 답변·날짜를 제거하고 실제 답변/실제 날짜만 렌더링한다. 상태와 본문 불일치는 미확인으로 표시한다. | `src/Mypage/inquiryData.js`, `InquiryDetail.jsx` | 대기 문의 예시 답변 없음, 완료이나 본문 없는 문의 미확인, 실제 답변 필드 유지 확인. |
| 32 | 최근 장소 저장은 로컬 bookmarkedPlaceIds만 변경했다. 기존 공통 `usePlaceSaving`, 폴더 모달, 실제 저장 API와 컨텍스트로 연결했다. | `src/RecentPlacesPage/RecentPlacesPage.jsx` | 폴더 선택 → POST `/api/folders/:folderId/places/:placeId` → 재조회 → 저장 표시 확인. 공통 다중 폴더 삭제 정책을 재사용한다. |
| 33 | imageUrl/thumbnailUrl/placeType이 표시용 값으로 반영되지 않았다. 실제 사진 aliases와 `getPlaceTypeLabel`을 사용하고 `PlacePhoto`로 누락·실패 대체 상태를 제공한다. | `src/RecentPlacesPage/RecentPlacesPage.jsx` | 실제 imageUrl의 img src와 RESTAURANT → 음식점 확인. |
| 34 | 저장 카드에 API 분류 코드가 그대로 표시됐다. 원본 값은 보존하고 공통 분류 라벨을 화면에 사용한다. | `src/Mypage/SavedPlaces.jsx` | ATTRACTION → 관광지 확인. |
| 35 | 저장 장소에 누락 평점 4.8과 무관한 도시·해변 사진을 채웠다. 누락 평점은 null로 유지하고 사진은 실제 값 또는 PlacePhoto 대체 상태로 표시한다. | `src/Mypage/SavedPlaces.jsx` | 누락 평점에 4.8 없음, 사진 정보 없음 표시 확인. |
| 36 | 폴더 장소 실패의 재시도가 폴더 목록만 다시 조회했다. 목록과 선택 폴더 장소 조회를 분리하고 해당 요청의 retry를 연결했다. | `src/Mypage/SavedPlaces.jsx` | 실패한 현재 폴더 재시도로 실제 장소 목록 복구; 실패를 빈 폴더로 표시하지 않음 확인. |
| 37 | 폴더별 개수 조회 중 하나가 실패하면 전체 목록이 실패했다. allSettled로 부분 성공을 보존하고 실패 개수는 미확인·재시도 상태로 제공한다. 이미 count/placeCount가 있으면 추가 장소 조회를 생략한다. | `src/Mypage/SavedPlaces.jsx` | 한 폴더 실패에도 정상 폴더 표시, count 필드 존재 시 불필요한 GET 없음, 미확인 개수를 실제 0으로 표시하지 않음 확인. |
| 38 | 정상 빈 최근 장소 응답을 오래된 로컬 기록으로 대체했고 조회 상태가 구분되지 않았다. 서버 응답을 기준으로 loading/error/success-empty를 분리하고 기존 결과는 같은 범위에서 유지한다. | `src/RecentPlacesPage/RecentPlacesPage.jsx` | 서버 []는 정상 빈 상태; 로컬 기록 부활 없음; 오류는 실패와 retry 표시 확인. |
| 39 | logs 선택 상태에서도 통계만 렌더링했고 실제 로그 화면/API는 없었다. 지원하지 않는 로그 메뉴를 제거하고 `/admin?tab=logs`에서도 실제 통계 상태를 표시한다. | `src/Admin/AdminFooter/AdminFooter.jsx` | 코드 확인. 실화면 선택 상태 검증은 루트 담당. 로그 기능을 새로 가정하지 않았다. |
| 40 | 늦은 GET이 답변 입력을 덮을 수 있었다. 초기 조회 성공 전 편집을 막고 문의/계정 단위 초안을 처음 한 번만 초기화한다. | `src/Admin/AdminInquiryPage/AdminInquiryWrite.jsx` | 초기 GET 지연 중 편집 불가, 작성 후 조회로 초안 덮어쓰기 없음 확인. |
| 41 | location.state가 있으면 최신 GET 실패·권한 오류를 숨겼다. 최신 조회 성공을 편집 조건으로 사용하고 401/403/404를 구분한다. | `src/Admin/AdminInquiryPage/AdminInquiryWrite.jsx`, `src/Mypage/inquiryData.js` | state가 있어도 403이 표시되고 전송 불가 확인. 오래된 ID 응답이 현재 상세를 바꾸지 않음 확인. |
| 42 | 통계 실패를 DEFAULT_STATS의 0으로 표시했다. 미확인은 null, 실제 0은 그대로 유지하고 계정별 조회·실패·retry와 직전 확정 결과를 구분한다. | `src/Mypage/MyPage.jsx` | 실패에 실제 0 표시 없음, 재시도로 실제 0과 양수 정상 표시 확인. |
| 43 | 관리자 경로에서 로그인 여부만 확인했다. 기존 Mock 사용자 역할/JWT/기존 currentUser 메타데이터를 읽는 AdminAccessGuard를 추가했다. anonymous/user/admin/checking/unknown 상태를 구분한다. | `src/Admin/AdminAccessGuard.jsx` | USER 거부, ADMIN 허용, 역할 미확인 상태 확인. App 연결은 루트 소유. 운영용 사용자 역할 조회 API 계약은 확인되지 않아 UI guard의 확인 범위를 기존 메타데이터로 제한한다. 서버 권한 검증을 대체하지 않는다. |
| 44 | 대기 사용자 문의와 완료 관리자 문의의 열람 액션이 막혔다. 모든 상태에서 열람하고 관리자는 완료 답변을 읽기 전용으로 제공한다. | `src/Mypage/Inquiry.jsx`, `InquiryDetail.jsx`, `src/Admin/AdminInquiryPage/AdminInquiryPage.jsx`, `AdminInquiryWrite.jsx` | 대기 사용자 문의·완료 관리자 문의의 열람 액션과 완료 편집 제한 확인. |
| 45 | 최근 장소 상세 이동이 click 전용이고 저장 버튼의 이름·상태가 부족했다. 장소명에 실제 상세 링크를 제공하고 저장 버튼에 장소명, 저장/해제, aria-pressed를 연결했다. | `src/RecentPlacesPage/RecentPlacesPage.jsx`, `.css` | 상세 링크 목적지와 저장 후 aria-pressed=true 확인. 저장과 상세 이동을 독립 조작으로 제공한다. |
| C1 | 사용자/관리자 목록·상세에 분산된 문의 aliases를 공통 normalizeInquiry/readInquiryList로 정리했다. 계약 외 컨테이너는 오류이며 []로 숨기지 않는다. | `src/Mypage/inquiryData.js` 및 문의 컴포넌트 | 기존 Mock array와 기존 목록 계약의 content wrapper, malformed 응답→retry 확인. 실제 운영 답변 필드/권한 응답은 별도 확인 필요. |
| C2 | 정상 JSON인 객체·문자열·null·잘못된 배열 항목이 최근 기록 사용을 깨뜨릴 수 있었다. 배열/레코드/ID/이름/날짜를 검증하고 유효 항목만 보존한다. | `src/utils/recentPlaces.js` | 잘못된 JSON 4종과 혼합 배열, 유효 기록 유지, 다른 localStorage 보존 확인. |
| C3 | reverse를 최신순으로 가정했으나 저장 시각·API 기본 순서 계약이 없다. reverse 제거, 최신순은 비활성 상태와 이유를 제공한다. | `src/Mypage/SavedPlaces.jsx`, `.css` | 코드 확인. 실제 saved timestamp 필드, timezone, API 정렬 계약이 필요하다. |
| C4 | 응답 유실 후 같은 POST를 다시 보낼 수 있었다. 기존 useMutationTask로 unknown 상태를 잠그고 입력을 보존하며 GET으로 결과 확인만 실행한다. | `src/Mypage/InquiryWrite.jsx`, `src/Admin/AdminInquiryPage/AdminInquiryWrite.jsx` | 서버 반영 후 응답 유실 Mock에서 POST 1회 유지. 사용자 문의는 같은 내용만으로 동일 요청 생성 여부를 증명할 수 없어 목록과 새 창 상세 확인을 제공하고 미확정 잠금을 유지한다. 관리자 답변은 최신 본문/완료 상태 일치로 확인한다. 서버 request ID/idempotency 계약 없음. |
| C5 | 긴 제목·이메일·메타 정보의 nowrap/min-width 때문에 좁은 화면 넘침 우려가 있었다. 해당 헤더/메타만 flex-wrap, min-width:0, overflow-wrap을 적용했다. | `src/Admin/AdminInquiryPage/AdminInquiryPage.css`, `AdminInquiryWrite.css`, `src/Mypage/InquiryDetail.css` | 코드 보완. 실제 320px 긴 데이터 넘침 검증은 루트 담당이며 이 파일의 검사 완료 범위에 포함하지 않는다. |
| C6 | 날짜가 없는 일정을 D-Day와 다가오는 일정으로 분류했다. 날짜 미정 상태와 목록으로 분리하고 사진도 실제 값만 사용한다. 갱신 실패는 같은 계정의 직전 확정 일정을 유지한다. | `src/MySchedule/MySchedule.jsx` | 날짜 없는 일정이 날짜 미정에서 표시되고 D-Day 없음 확인. 갱신 실패 후 확정 카드 유지 확인. 서버의 날짜 없는 일정 허용 여부는 미확인. |
| C11 | 상세가 사용하지 않는 location.state에 예시 평점/리뷰 수를 넣었다. 사용하지 않는 전달 payload를 제거하고 URL 이동만 유지한다. | `src/RecentPlacesPage/RecentPlacesPage.jsx` | 현재 Detail 흐름이 URL/API를 사용하는 코드 확인. 가짜 평점을 상세에서 보여 주는 문제로 확대하지 않는다. |

## 보존 및 검증 제한

- 기존 애니메이션, PDF, API 정책, 인증·Mock 활성화 정책, 공통 다크 모드 수정은 보존했다.
- 새 API, 서버 응답 필드, 로그 기능, 임의 idempotency 키를 추가하지 않았다.
- 운영 API·ADMIN 계정·실제 네트워크 응답 확인과 320px/390px/768px/1366px 실화면, 다크 모드·키보드 전체 흐름은 루트 통합 검증에서 별도 기록해야 한다.
- 직접 시작한 서버나 실제 데이터 쓰기/삭제가 없다.

## 통합 리뷰 추가 수정: 항목 15의 장소 상세 저장 일관성

- 확인한 원인: `src/Recommend/Detail.jsx`의 독립 저장 조회가 여러 폴더 중 첫 매핑만 반환했고, 해당 폴더 DELETE 이후 `toggleSavedPlace`로 공통 저장 상태까지 해제했다. 같은 장소가 다른 폴더에 남아 있을 때 화면 간 저장 표시가 달라질 수 있었다.
- 수정: Detail의 독립 폴더 조회·저장·삭제·컨텍스트 토글을 제거하고 기존 `usePlaceSaving`, `PlaceSavingFeedback`, `PlaceSaveModal`을 재사용한다. 다중 폴더는 제거할 폴더를 선택하고, 한 폴더만 남은 경우 기존 공통 동작대로 직접 제거한다. 조회 후 확인된 전체 매핑으로 공통 저장 상태를 동기화하며 unknown 결과는 GET 확인만 제공한다.
- 범위: `src/Recommend/Detail.jsx`, `src/Recommend/Detail.test.jsx`만 수정했다. 공유 훅·컨텍스트·API·CSS는 변경하지 않았고 기존 PDF `currentTarget`, `requestKey`, 저장 취소 조건과 출력 경로는 보존했다.
- 실행 검증: `src/Recommend/Detail.test.jsx` 및 `src/utils/placeSaving.test.jsx`, **2 suites / 19 tests 통과**. 실제 Detail + SavedPlacesProvider에서 선택한 폴더 DELETE 1회, 다른 폴더 보존과 공통 저장 상태 유지, 응답 유실 후 상태 보존·GET 확인·DELETE 재전송 없음, 부분 조회 실패 시 추정 DELETE 없음 확인. 기존 상세·리뷰·사진·늦은 응답 테스트도 통과했다.
- 검사: 위 두 변경 파일 ESLint errors 0 / warnings 0, `git diff --check` 통과. 로그 `output/frontend-fixes/profile-detail-saving-tests.log`, `output/frontend-fixes/profile-detail-saving-eslint.log`.
- 제한: 실제 브라우저에서 상세 저장 모달과 운영 폴더 응답은 확인하지 않았다. 실제 사용자 데이터는 생성·삭제하지 않았고 서버를 실행하지 않았다.
