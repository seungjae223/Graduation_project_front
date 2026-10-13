# 프론트엔드 수정 필요 항목

현재 작업 코드와 http://localhost:3000의 실행 화면을 기준으로 60개 수정 항목과 11개 추가 확인 후보를 정리했습니다. 먼저 검색·일정·문의에서 사용자에게 잘못된 결과나 완료 상태를 보여 주는 경로를 수정해야 합니다.

프로젝트: C:/Users/joyfu/Desktop/graduation_project/graduation

기준일: 2026년 10월 12일

## 우선순위와 확인 수준

- P1: 핵심 기능이 연결되지 않거나 잘못된 결과·완료 상태를 보여 주는 항목.
- P2: 데이터 정합성, 실패 복구, 접근성 또는 조작 품질 개선 항목.
- P3: 검사 안정성과 미사용 코드 정리.
- 실화면: 현재 앱에서 해당 증상을 재현했습니다. 실화면이 포함된 항목은 10개입니다.
- 코드: 현재 사용 중인 구현에서 경로·표시·기능 누락을 확인했습니다. 모든 실패 응답을 실제로 발생시킨 것은 아닙니다.
- 조건부: 코드 경로는 확인했지만 지연 응답·부분 실패 등 해당 조건의 실제 재현이 필요합니다.
- 계약 확인: 프론트 동작을 확인했으며 올바른 변경을 위해 서버 계약 확인이 필요합니다.

## 먼저 수정할 항목

- 1. 검색 URL과 결과가 양방향으로 연결되지 않음 — 실화면
- 2. 내 주변 탐색이 주변 장소 조회로 이어지지 않음 — 코드
- 10. 추천 검색의 전체보기가 검색어를 무시함 — 실화면
- 11. 카드 안의 저장·삭제 버튼 Enter가 상세 이동으로 전파됨 — 실화면
- 12. Total 저장 취소가 서버 요청 없이 화면에서 성공 처리될 수 있음 — 조건부
- 22. 결과 화면 휴지통이 서버 일정 삭제와 연결되지 않음 — 코드
- 23. 조회 전·실패 상태의 예시 장소를 실제 일정에 추가할 수 있음 — 코드
- 31. 답변 대기 문의에 예시 처리 완료 답변이 표시됨 — 실화면
- 46. 온보딩 Skip이 홈 진입 대신 온보딩을 다시 시작함 — 실화면
- 47. 비밀번호 찾기가 새 비밀번호 설정으로 이어지지 않음 — 계약 확인

## 홈과 검색

### 1 검색 URL과 결과가 양방향으로 연결되지 않음

**P1 · 실화면**

홈에서 서울을 검색하면 /search?keyword=서울에 입력값만 채워지고 결과는 두 번째 Enter 이후에 표시됩니다. 검색 화면에서 부산을 검색해도 URL은 바뀌지 않아 새로고침·공유·재방문 시 검색 상태를 복원할 수 없습니다.

수정 방향: URL 검색어로 조회를 실행하고 이후 검색도 URL과 동기화하되 중복 조회를 막습니다.

파일: [src/Homepage/Home.jsx:212](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Homepage/Home.jsx:212), [src/Search/Search.jsx:258](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Search/Search.jsx:258), [src/Search/Search.jsx:280](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Search/Search.jsx:280)

### 2 내 주변 탐색이 주변 장소 조회로 이어지지 않음

**P1 · 코드**

홈은 좌표와 mode=nearby를 전달하지만 검색 화면은 위치 안내만 표시합니다. 전달된 좌표를 사용한 주변 장소 조회가 없습니다.

수정 방향: 기존 주변 조회 API 계약에 맞춰 좌표를 소비하고 조회·실패·빈 결과를 표시합니다. 위치 권한을 임의로 바꾸지 않습니다.

파일: [src/Homepage/Home.jsx:117](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Homepage/Home.jsx:117), [src/Search/Search.jsx:325](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Search/Search.jsx:325)

### 3 홈 인기 여행지가 운영 여부와 관계없이 고정 예시 목록임

**P2 · 코드**

travelMockData를 항상 사용합니다. 오사카·후쿠오카에는 도쿄 사진, 나라·삿포로에는 교토 사진을 재사용하여 장소명과 사진이 다릅니다.

수정 방향: 실제 인기 여행지 데이터와 정확한 사진을 연결하거나 예시 콘텐츠임을 제품 기준에 맞게 표시합니다.

파일: [src/Homepage/Home.jsx:20](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Homepage/Home.jsx:20)

### 4 홈 주요 카드와 검색 아이콘을 키보드로 사용할 수 없음

**P2 · 코드**

테마 추천·경로 생성은 click만 있는 div입니다. 검색 아이콘도 role만 지정된 img이며 Tab·Enter 동작이 없고 입력에는 연결된 label이 없습니다.

수정 방향: 카드를 실제 버튼 또는 링크로 만들고 검색은 submit 버튼, 입력은 접근 가능한 이름을 사용합니다. 기존 디자인과 클릭 동작을 유지합니다.

파일: [src/Homepage/Home.jsx:287](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Homepage/Home.jsx:287), [src/Homepage/Home.jsx:309](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Homepage/Home.jsx:309)

### 5 최근 검색어 개별 삭제가 키보드로 불가능

**P2 · 코드**

검색 버튼 안의 ×는 click만 있는 span입니다. 키보드로 해당 검색어를 선택하면 삭제 대신 검색을 실행합니다.

수정 방향: 검색과 삭제를 각각 형제 버튼으로 분리하고 삭제 버튼에 검색어를 포함한 이름을 제공합니다.

파일: [src/Search/Search.jsx:386](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Search/Search.jsx:386)

### 6 검색 후 최근 검색어가 현재 화면에서 갱신되지 않음

**P2 · 실화면**

최근 검색어는 최초 마운트에만 조회합니다. 부산 검색 결과가 표시되어도 최근 목록에는 서울·제주만 남고 재진입해야 갱신됩니다.

수정 방향: 성공한 검색 후 최근 목록을 갱신하거나 서버의 갱신 결과를 반영합니다.

파일: [src/Search/Search.jsx:265](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Search/Search.jsx:265), [src/Search/Search.jsx:280](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Search/Search.jsx:280)

### 7 최근 검색어 조회·삭제 실패를 사용자에게 알리지 않음

**P2 · 코드**

조회 실패는 최근 검색어 없음처럼 보이고 개별·전체 삭제 실패는 로그만 남겨 버튼이 반응하지 않는 것처럼 보입니다.

수정 방향: 조회·삭제 오류와 필요한 재시도를 해당 영역에 표시하고 실패 시 기존 목록을 유지합니다.

파일: [src/Search/Search.jsx:273](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Search/Search.jsx:273), [src/Search/Search.jsx:289](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Search/Search.jsx:289), [src/Search/Search.jsx:301](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Search/Search.jsx:301)

### 8 검색의 인기 장소 카드 상세 조작이 키보드로 불가능

**P2 · 코드**

지금 가장 핫한 곳의 article에는 click만 있습니다. 사진 출처 링크는 접근 가능하지만 장소 검색 액션은 키보드 대상이 아닙니다.

수정 방향: 장소 이동 액션을 링크 또는 버튼으로 제공하고 사진 출처 조작과 분리합니다.

파일: [src/Search/Search.jsx:453](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Search/Search.jsx:453), [src/Search/Search.jsx:468](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Search/Search.jsx:468)

### 9 검색 팝업의 추천 조회 전체 실패가 빈 결과로 표시됨

**P2 · 조건부**

기본 추천이 비었을 때 추가 테마 요청을 실행하지만 실패를 null로 바꿉니다. 추가 요청이 모두 실패해도 정상적인 검색 결과 없음으로 처리됩니다.

수정 방향: 전체 실패·부분 성공·정상 빈 배열을 구분하고 실패 시 재시도를 제공합니다.

파일: [src/SearchPopup/SearchPop.jsx:123](C:/Users/joyfu/Desktop/graduation_project/graduation/src/SearchPopup/SearchPop.jsx:123), [src/SearchPopup/SearchPop.jsx:139](C:/Users/joyfu/Desktop/graduation_project/graduation/src/SearchPopup/SearchPop.jsx:139), [src/SearchPopup/SearchPop.jsx:343](C:/Users/joyfu/Desktop/graduation_project/graduation/src/SearchPopup/SearchPop.jsx:343)

## 추천과 인기 장소

### 10 추천 검색의 전체보기가 검색어를 무시함

**P1 · 실화면**

/recommend?keyword=서울의 전체보기는 /total?keyword=서울로 이동하지만 Total은 theme만 읽고 기본 힐링 추천을 조회합니다. 실제 화면에 제주·부산·일본 장소가 표시되었습니다.

수정 방향: 전체 목록도 검색 모드를 유지하여 동일 검색어로 조회합니다.

파일: [src/Recommend/Recommend.jsx:434](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Recommend/Recommend.jsx:434), [src/Recommend/Total.jsx:172](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Recommend/Total.jsx:172)

### 11 카드 안의 저장·삭제 버튼 Enter가 상세 이동으로 전파됨

**P1 · 실화면**

추천 저장 버튼의 Enter는 /detail?id=10으로 이동했습니다. 저장 장소의 삭제 버튼 Enter도 확인창 대신 /detail?id=1로 이동했습니다. 부모 카드 keydown이 자식 버튼 키를 처리합니다.

수정 방향: 카드 자체가 이벤트 대상일 때만 부모 키를 처리하거나 상세 링크와 내부 액션을 분리합니다. 마우스·Enter·Space를 각각 검증합니다.

파일: [src/Recommend/Recommend.jsx:719](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Recommend/Recommend.jsx:719), [src/Mypage/SavedPlaces.jsx:516](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Mypage/SavedPlaces.jsx:516), [src/Mypage/SavedPlaces.jsx:558](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Mypage/SavedPlaces.jsx:558)

### 12 Total 저장 취소가 서버 요청 없이 화면에서 성공 처리될 수 있음

**P1 · 조건부**

공통 상태에서는 저장됨이지만 폴더 매핑 조회가 아직 끝나지 않았거나 실패하면 savedInfo가 없습니다. DELETE는 생략하고 저장 ID와 공통 상태는 지웁니다.

수정 방향: 삭제 대상을 확보하지 못하면 재조회하거나 오류를 표시합니다. 확인된 서버 삭제 성공 후 저장 상태를 변경합니다.

파일: [src/Recommend/Total.jsx:324](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Recommend/Total.jsx:324)

### 13 추천·전체 목록의 이전 응답이 새 테마 결과를 덮을 수 있음

**P2 · 조건부**

테마나 검색어 변경 시 진행 중 요청의 취소·요청 식별 가드가 없어 늦게 도착한 이전 결과가 현재 제목 아래 표시될 수 있습니다.

수정 방향: 요청 단위 취소 또는 세대 검사를 결과·오류·로딩 종료에 적용합니다.

파일: [src/Recommend/Recommend.jsx:268](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Recommend/Recommend.jsx:268), [src/Recommend/Total.jsx:177](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Recommend/Total.jsx:177)

### 14 저장 여부 조회 실패를 저장하지 않은 상태로 취급함

**P2 · 조건부**

폴더 조회 실패 시 저장 ID를 비우고 일부 폴더 요청 실패도 누락된 상태로 반영합니다. 이미 저장한 장소의 하트가 꺼지거나 저장 취소 대상이 사라질 수 있습니다.

수정 방향: 저장 여부의 미확인 상태와 미저장을 구분하고 부분 실패를 보존·재시도합니다.

파일: [src/Recommend/Recommend.jsx:335](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Recommend/Recommend.jsx:335), [src/Recommend/Recommend.jsx:380](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Recommend/Recommend.jsx:380), [src/Recommend/Total.jsx:227](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Recommend/Total.jsx:227), [src/Homepage/PopularAll.jsx:232](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Homepage/PopularAll.jsx:232)

### 15 여러 폴더에 저장한 장소를 하나의 폴더로만 관리함

**P2 · 조건부**

Total과 PopularAll의 장소별 매핑은 폴더 하나로 덮어씁니다. 한 폴더에서만 삭제한 후 하트를 꺼도 다른 폴더에는 저장된 상태가 남습니다.

수정 방향: Recommend처럼 폴더 ID 목록을 보존하고 저장 취소 의미에 맞는 삭제·상태 재조회를 수행합니다.

파일: [src/Recommend/Total.jsx:249](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Recommend/Total.jsx:249), [src/Homepage/PopularAll.jsx:218](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Homepage/PopularAll.jsx:218), [src/Homepage/PopularAll.jsx:349](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Homepage/PopularAll.jsx:349)

### 16 거리 미제공 장소를 0으로 바꿔 거리순 정렬을 제공함

**P2 · 코드**

거리가 없으면 0으로 정규화합니다. 현재 Mock 응답처럼 거리가 없는 목록에서는 거리순이 사실상 정렬하지 못하고 미확인 값이 가장 가까운 값이 됩니다.

수정 방향: 조회 기준 위치와 실제 거리 계약을 확인합니다. 거리 미제공 항목은 구분하고 유효한 값만 기준으로 정렬합니다.

파일: [src/Recommend/Total.jsx:91](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Recommend/Total.jsx:91), [src/Recommend/Total.jsx:267](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Recommend/Total.jsx:267)

### 17 추천에서 평점 미제공을 실제 0점처럼 표시함

**P2 · 코드**

Recommend와 Total은 미제공 평점을 0으로 채워 별점 UI에 표시합니다. 평가가 없는 장소와 실제 0점이 구분되지 않습니다.

수정 방향: 실제 평점 존재 여부를 유지하고 미제공 상태를 생략 또는 명확하게 표시합니다.

파일: [src/Recommend/Recommend.jsx:194](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Recommend/Recommend.jsx:194), [src/Recommend/Total.jsx:90](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Recommend/Total.jsx:90)

### 18 인기 장소 전체보기에서 9번째 이후 항목이 숨겨짐

**P2 · 코드**

전체 응답 중 처음 4개와 다음 4개만 렌더링하고 추가 목록·페이지 이동이 없습니다.

수정 방향: 전체보기의 나머지 항목에 접근할 수 있도록 기존 디자인에 맞는 목록 또는 페이지 이동을 제공합니다.

파일: [src/Homepage/PopularAll.jsx:318](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Homepage/PopularAll.jsx:318), [src/Homepage/PopularAll.jsx:322](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Homepage/PopularAll.jsx:322), [src/Homepage/PopularAll.jsx:507](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Homepage/PopularAll.jsx:507)

### 19 인기 장소의 사진 누락을 무관한 도시·해변 사진으로 대체함

**P2 · 코드**

사진이 없으면 이름 문자열에 따라 교토·해변·도쿄 이미지를 배정합니다. img의 로드 실패 대체 처리도 없습니다.

수정 방향: 실제 사진 또는 기존 PlacePhoto의 명확한 대체 영역을 사용합니다.

파일: [src/Homepage/PopularAll.jsx:106](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Homepage/PopularAll.jsx:106), [src/Homepage/PopularAll.jsx:173](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Homepage/PopularAll.jsx:173), [src/Homepage/PopularAll.jsx:517](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Homepage/PopularAll.jsx:517)

### 20 인기 장소의 로딩·조회 실패·정상 빈 상태가 모두 빈 화면임

**P2 · 코드**

isLoaded는 목록 계산에만 사용하고 조회 실패 시 places=[]를 넣습니다. 화면에는 해당 상태의 안내·재시도가 없습니다.

수정 방향: 요청 상태를 분리하고 각 상태에 필요한 표시를 제공합니다.

파일: [src/Homepage/PopularAll.jsx:257](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Homepage/PopularAll.jsx:257), [src/Homepage/PopularAll.jsx:302](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Homepage/PopularAll.jsx:302), [src/Homepage/PopularAll.jsx:487](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Homepage/PopularAll.jsx:487)

### 21 인기 장소 카드의 상세 이동이 키보드로 불가능

**P2 · 코드**

두 목록의 article에는 click만 있고 포커스·키보드 동작이 없습니다. 내부 저장 버튼과 상세 이동을 구분해야 합니다.

수정 방향: 별도 상세 링크를 제공하고 각 저장 버튼은 독립적으로 사용할 수 있게 합니다.

파일: [src/Homepage/PopularAll.jsx:512](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Homepage/PopularAll.jsx:512), [src/Homepage/PopularAll.jsx:553](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Homepage/PopularAll.jsx:553)

## 일정 생성과 결과

### 22 결과 화면 휴지통이 서버 일정 삭제와 연결되지 않음

**P1 · 코드**

Header는 mock_saved_route_results 로컬 항목만 삭제합니다. RouteResult의 서버 삭제 리스너는 route-result-delete-schedule인데 Header의 이벤트는 다릅니다. 로컬 성공과 서버 상태가 어긋날 수 있습니다.

수정 방향: 기존 RouteResult의 서버 삭제 흐름과 연결하고 성공 응답 후 이동합니다. 실제 삭제 요청은 감사 중 실행하지 않았습니다.

파일: [src/Header/Header.jsx:96](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Header/Header.jsx:96), [src/Header/Header.jsx:277](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Header/Header.jsx:277), [src/RouteResult/RouteResult.jsx:2295](C:/Users/joyfu/Desktop/graduation_project/graduation/src/RouteResult/RouteResult.jsx:2295)

### 23 조회 전·실패 상태의 예시 장소를 실제 일정에 추가할 수 있음

**P1 · 코드**

filteredSearchResults는 완료 전·실패 시 운영/Mock 구분 없이 예시 장소를 반환합니다. 초기 지연과 Enter 경로에서 선택 가능하고 서버 장소 ID 검증은 여행 생성 이후입니다.

수정 방향: 조회 상태와 예시 데이터를 분리하고 첫 쓰기 요청 전에 모든 장소 ID를 검증합니다. 여행 생성·저장은 감사 중 실행하지 않았습니다.

파일: [src/RouteCreate/RouteCreate.jsx:2200](C:/Users/joyfu/Desktop/graduation_project/graduation/src/RouteCreate/RouteCreate.jsx:2200), [src/RouteCreate/RouteCreate.jsx:2347](C:/Users/joyfu/Desktop/graduation_project/graduation/src/RouteCreate/RouteCreate.jsx:2347), [src/RouteCreate/RouteCreate.jsx:1884](C:/Users/joyfu/Desktop/graduation_project/graduation/src/RouteCreate/RouteCreate.jsx:1884), [src/RouteCreate/RouteCreate.jsx:1660](C:/Users/joyfu/Desktop/graduation_project/graduation/src/RouteCreate/RouteCreate.jsx:1660)

### 24 일정 생성 검색의 이전 응답이 현재 결과를 덮음

**P2 · 조건부**

검색어 A 요청 후 B로 변경해 A가 늦게 도착하면 A 목록·오류·로딩 종료가 B 상태에 반영될 수 있습니다. 모달을 닫아도 요청은 남고 타이머만 정리합니다.

수정 방향: 현재 검색 식별자와 요청 취소를 응답·오류·finally에 적용합니다.

파일: [src/RouteCreate/RouteCreate.jsx:2149](C:/Users/joyfu/Desktop/graduation_project/graduation/src/RouteCreate/RouteCreate.jsx:2149), [src/RouteCreate/RouteCreate.jsx:2197](C:/Users/joyfu/Desktop/graduation_project/graduation/src/RouteCreate/RouteCreate.jsx:2197)

### 25 일정 생성 관심장소가 실제 폴더 소속과 전체 목록을 무시함

**P2 · 코드**

빈 메모리 목록은 예시 관심장소로 바뀝니다. 실제 장소도 나홀로 여행·가족 휴가 두 가상 폴더에 3개와 5개로 잘라 넣어 9번째 이후 장소가 사라집니다.

수정 방향: 기존 폴더·관심장소 조회 경로를 사용하고 실제 폴더와 정상 빈 상태를 표시합니다.

파일: [src/RouteCreate/RouteCreate.jsx:2084](C:/Users/joyfu/Desktop/graduation_project/graduation/src/RouteCreate/RouteCreate.jsx:2084), [src/RouteCreate/RouteCreate.jsx:2133](C:/Users/joyfu/Desktop/graduation_project/graduation/src/RouteCreate/RouteCreate.jsx:2133), [src/Context/SavedPlacesContext.jsx:17](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Context/SavedPlacesContext.jsx:17)

### 26 출발지의 고정 시간 입력이 저장에서 제외되고 10시로 계산됨

**P2 · 계약 확인**

모든 장소에 FIX를 지정할 수 있지만 출발지로 선택한 장소는 고정 시간 PATCH에서 제외합니다. 최적화와 타임라인은 10:00을 사용합니다.

수정 방향: 서버 출발 시간 계약에 맞춰 입력을 반영하거나 지원하지 않는 설정을 제한합니다. 서버의 의도된 계약 확인이 필요합니다.

파일: [src/RouteCreate/RouteCreate.jsx:1760](C:/Users/joyfu/Desktop/graduation_project/graduation/src/RouteCreate/RouteCreate.jsx:1760), [src/RouteCreate/RouteCreate.jsx:1797](C:/Users/joyfu/Desktop/graduation_project/graduation/src/RouteCreate/RouteCreate.jsx:1797), [src/RouteResult/useTripResult.js:25](C:/Users/joyfu/Desktop/graduation_project/graduation/src/RouteResult/useTripResult.js:25)

### 27 일정 생성의 사진 누락을 임의 사진으로 대체함

**P2 · 코드**

검색·관심장소 이미지가 없으면 picsum.photos를 사용하며 해당 사진이 출발지·선택 카드까지 이어집니다.

수정 방향: 실제 장소 사진 또는 기존 PlacePhoto의 명확한 대체 영역을 사용합니다.

파일: [src/RouteCreate/RouteCreate.jsx:342](C:/Users/joyfu/Desktop/graduation_project/graduation/src/RouteCreate/RouteCreate.jsx:342), [src/RouteCreate/RouteCreate.jsx:1536](C:/Users/joyfu/Desktop/graduation_project/graduation/src/RouteCreate/RouteCreate.jsx:1536), [src/RouteCreate/RouteCreate.jsx:2123](C:/Users/joyfu/Desktop/graduation_project/graduation/src/RouteCreate/RouteCreate.jsx:2123)

### 28 일정 결과 카드의 키보드 포커스 표시와 조작 의미가 부족함

**P2 · 코드**

카드 전체에 Tab·Enter·Space 동작이 있지만 outline:none이고 카드용 focus-visible이 없습니다. role=group도 지도 열기 동작을 설명하지 않습니다.

수정 방향: 지도 액션에 적절한 의미와 명확한 포커스 스타일을 제공합니다. 이미 구현된 드래그 손잡이 조작과 구분합니다.

파일: [src/RouteResult/RouteResult.jsx:1528](C:/Users/joyfu/Desktop/graduation_project/graduation/src/RouteResult/RouteResult.jsx:1528), [src/RouteResult/RouteResult.jsx:1711](C:/Users/joyfu/Desktop/graduation_project/graduation/src/RouteResult/RouteResult.jsx:1711), [src/RouteResult/RouteResult.css:413](C:/Users/joyfu/Desktop/graduation_project/graduation/src/RouteResult/RouteResult.css:413)

### 29 지도 설정·레이어처럼 보이는 버튼이 같은 지도 열기 동작임

**P2 · 코드**

두 아이콘 모두 onOpenMap을 실행합니다. 내부 SVG는 숨겨져 있고 버튼의 접근 가능한 이름도 없습니다.

수정 방향: 실제 제공 기능에 맞는 아이콘·버튼 이름으로 정리하고 중복 액션을 제품 기준에 맞게 줄입니다.

파일: [src/RouteResult/RouteResult.jsx:1908](C:/Users/joyfu/Desktop/graduation_project/graduation/src/RouteResult/RouteResult.jsx:1908), [src/RouteResult/RouteResult.jsx:2104](C:/Users/joyfu/Desktop/graduation_project/graduation/src/RouteResult/RouteResult.jsx:2104)

### 30 폴더 만들기 취소 후 모달 내부 포커스 복귀가 없음

**P2 · 코드**

취소하면 포커스된 패널이 제거되지만 open은 유지되어 초기 포커스 처리가 다시 실행되지 않습니다. 공통 trap은 첫·마지막 요소에 포커스가 있을 때만 처리합니다.

수정 방향: 취소 후 새 폴더 버튼으로 포커스를 돌리고 모달 밖으로 벗어난 포커스를 회수합니다.

파일: [src/FolderSelectModal/FolderSelectModal.jsx:241](C:/Users/joyfu/Desktop/graduation_project/graduation/src/FolderSelectModal/FolderSelectModal.jsx:241), [src/FolderSelectModal/FolderSelectModal.jsx:285](C:/Users/joyfu/Desktop/graduation_project/graduation/src/FolderSelectModal/FolderSelectModal.jsx:285), [src/utils/useModalFocus.js:70](C:/Users/joyfu/Desktop/graduation_project/graduation/src/utils/useModalFocus.js:70)

## 마이페이지와 문의 및 관리자

### 31 답변 대기 문의에 예시 처리 완료 답변이 표시됨

**P1 · 실화면**

/inquiry/2는 답변 대기인데 2024년 답변과 조치 완료 내용이 표시됩니다. 답변 미제공 시 기본 답변을 생성하고 답변 영역을 항상 렌더링합니다.

수정 방향: 실제 답변 존재 여부로 분기하고 미제공 답변·날짜·처리 완료 문장을 생성하지 않습니다.

파일: [src/Mypage/InquiryDetail.jsx:11](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Mypage/InquiryDetail.jsx:11), [src/Mypage/InquiryDetail.jsx:69](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Mypage/InquiryDetail.jsx:69), [src/Mypage/InquiryDetail.jsx:270](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Mypage/InquiryDetail.jsx:270)

### 32 최근 본 장소 북마크가 실제 저장 장소와 연결되지 않음

**P2 · 코드**

bookmarkedPlaceIds만 로컬에서 바꾸고 폴더 저장 API나 공통 저장 상태를 사용하지 않습니다. 다른 화면의 저장 여부와 일치하지 않습니다.

수정 방향: 기존 폴더 선택·저장 흐름과 동일한 상태를 사용합니다.

파일: [src/RecentPlacesPage/RecentPlacesPage.jsx:124](C:/Users/joyfu/Desktop/graduation_project/graduation/src/RecentPlacesPage/RecentPlacesPage.jsx:124)

### 33 최근 본 장소의 제공된 사진과 분류가 누락됨

**P2 · 실화면**

현재 Mock의 imageUrl·placeType을 정규화하지 않아 경복궁·사려니숲길·해운대가 대체 그림과 장소 분류로 표시되었습니다.

수정 방향: imageUrl·thumbnailUrl·placeType을 공통 장소 정규화와 분류 라벨에 반영합니다.

파일: [src/RecentPlacesPage/RecentPlacesPage.jsx:51](C:/Users/joyfu/Desktop/graduation_project/graduation/src/RecentPlacesPage/RecentPlacesPage.jsx:51), [src/RecentPlacesPage/RecentPlacesPage.jsx:169](C:/Users/joyfu/Desktop/graduation_project/graduation/src/RecentPlacesPage/RecentPlacesPage.jsx:169), [src/mocks/placeMock.js:31](C:/Users/joyfu/Desktop/graduation_project/graduation/src/mocks/placeMock.js:31)

### 34 저장 장소에 영문 API 분류가 그대로 표시됨

**P2 · 실화면**

저장 폴더 카드에 ATTRACTION이 실제 표시됩니다. placeType을 사용자용 라벨로 변환하지 않습니다.

수정 방향: 이미 있는 공통 분류 변환을 해당 카드에서도 사용합니다.

파일: [src/Mypage/SavedPlaces.jsx:236](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Mypage/SavedPlaces.jsx:236), [src/Mypage/SavedPlaces.jsx:530](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Mypage/SavedPlaces.jsx:530), [src/utils/placeType.js:1](C:/Users/joyfu/Desktop/graduation_project/graduation/src/utils/placeType.js:1)

### 35 저장 장소의 누락된 평점·사진을 실제 정보처럼 채움

**P2 · 코드**

평점이 없으면 4.8을 넣고 사진이 없으면 교토·도쿄·해변 사진을 임의 배정합니다.

수정 방향: 평점 존재 여부를 보존하고 사진은 명확한 대체 영역으로 처리합니다.

파일: [src/Mypage/SavedPlaces.jsx:175](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Mypage/SavedPlaces.jsx:175), [src/Mypage/SavedPlaces.jsx:240](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Mypage/SavedPlaces.jsx:240), [src/Mypage/SavedPlaces.jsx:542](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Mypage/SavedPlaces.jsx:542)

### 36 폴더 장소 조회 실패의 재시도가 다른 요청을 실행함

**P2 · 조건부**

장소 목록 조회 실패도 listError에 넣지만 재시도는 loadFolders만 실행합니다. 오류가 사라져도 openedFolderPlaces는 복구되지 않을 수 있습니다.

수정 방향: 실패한 요청 종류를 구분해 현재 폴더 장소를 재조회합니다.

파일: [src/Mypage/SavedPlaces.jsx:390](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Mypage/SavedPlaces.jsx:390), [src/Mypage/SavedPlaces.jsx:481](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Mypage/SavedPlaces.jsx:481)

### 37 한 폴더 개수 조회 실패가 모든 폴더 표시를 막음

**P2 · 조건부**

모든 폴더 장소를 Promise.all로 조회하여 하나만 실패해도 정상 폴더까지 게시하지 않습니다.

수정 방향: 폴더 목록을 먼저 표시하고 개수 실패를 폴더별로 처리합니다. 전체 장소 조회가 필요한지도 확인합니다.

파일: [src/Mypage/SavedPlaces.jsx:322](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Mypage/SavedPlaces.jsx:322)

### 38 최근 장소의 로딩·실패·정상 빈 결과가 구분되지 않음

**P2 · 코드**

조회 전 빈 상태가 표시되고 실패는 로그만 남깁니다. 서버가 정상 빈 배열을 보내도 오래된 로컬 기록을 다시 표시합니다.

수정 방향: 조회 상태와 정상 빈 응답을 별도로 관리하고 실패 시 재시도를 제공합니다.

파일: [src/RecentPlacesPage/RecentPlacesPage.jsx:19](C:/Users/joyfu/Desktop/graduation_project/graduation/src/RecentPlacesPage/RecentPlacesPage.jsx:19), [src/RecentPlacesPage/RecentPlacesPage.jsx:35](C:/Users/joyfu/Desktop/graduation_project/graduation/src/RecentPlacesPage/RecentPlacesPage.jsx:35)

### 39 관리자 로그 버튼을 눌러도 통계 화면이 표시됨

**P2 · 실화면**

/admin?tab=logs에서 로그 선택 상태만 바뀌고 시스템 통계 화면이 그대로 표시되었습니다. AdminMain이 tab을 읽지 않습니다.

수정 방향: 실제 로그 화면을 연결하거나 제공되지 않는 기능의 조작 상태를 정리합니다.

파일: [src/Admin/AdminFooter/AdminFooter.jsx:68](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Admin/AdminFooter/AdminFooter.jsx:68), [src/Admin/AdminMain/AdminMain.jsx:53](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Admin/AdminMain/AdminMain.jsx:53)

### 40 관리자 답변 조회 응답이 작성 중인 초안을 덮음

**P2 · 조건부**

목록 state로 폼을 즉시 표시하고 조회 중 편집·전송이 가능합니다. 늦은 GET 응답이 setAnswer로 사용자의 초안을 덮습니다.

수정 방향: 최초 조회 완료 전 편집을 보류하거나 편집된 초안을 보호합니다.

파일: [src/Admin/AdminInquiryPage/AdminInquiryWrite.jsx:162](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Admin/AdminInquiryPage/AdminInquiryWrite.jsx:162), [src/Admin/AdminInquiryPage/AdminInquiryWrite.jsx:189](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Admin/AdminInquiryPage/AdminInquiryWrite.jsx:189), [src/Admin/AdminInquiryPage/AdminInquiryWrite.jsx:417](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Admin/AdminInquiryPage/AdminInquiryWrite.jsx:417)

### 41 관리자 답변의 조회 실패·권한 오류가 숨겨짐

**P2 · 조건부**

목록 state가 있으면 errorMessage && !inquiry 조건 때문에 후속 GET 실패·403·대상 없음이 보이지 않고 전송도 가능합니다.

수정 방향: 표시용 캐시 데이터와 최신 조회·권한 검증 상태를 분리하여 오류와 재시도를 제공합니다.

파일: [src/Admin/AdminInquiryPage/AdminInquiryWrite.jsx:182](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Admin/AdminInquiryPage/AdminInquiryWrite.jsx:182), [src/Admin/AdminInquiryPage/AdminInquiryWrite.jsx:321](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Admin/AdminInquiryPage/AdminInquiryWrite.jsx:321)

### 42 마이페이지 통계 조회 실패가 0건으로 표시됨

**P2 · 조건부**

실패 시 모든 통계를 0으로 교체하여 실제 0건과 조회 실패를 구분할 수 없습니다.

수정 방향: 미확인·조회 중·실패 상태를 유지하고 재시도를 제공합니다.

파일: [src/Mypage/MyPage.jsx:728](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Mypage/MyPage.jsx:728), [src/Mypage/MyPage.jsx:1004](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Mypage/MyPage.jsx:1004)

### 43 관리자 직접 URL에 역할 확인이 없음

**P2 · 코드**

관리자 세 경로는 RequireAuth의 로그인 여부만 확인합니다. 메뉴의 ADMIN 검사와 별도로 페이지 역할 가드가 없습니다. 서버의 API 권한 검증이나 데이터 유출을 확인한 것은 아닙니다.

수정 방향: 기존 사용자 역할을 사용하여 관리자 경로 접근과 권한 없음 UI를 처리하고 서버 권한 검증도 별도 확인합니다.

파일: [src/App.js:71](C:/Users/joyfu/Desktop/graduation_project/graduation/src/App.js:71), [src/App.js:220](C:/Users/joyfu/Desktop/graduation_project/graduation/src/App.js:220), [src/Mypage/MyPage.jsx:672](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Mypage/MyPage.jsx:672)

### 44 대기 문의와 완료된 관리자 문의의 전체 내용을 열 수 없음

**P2 · 코드**

사용자의 대기 문의는 비클릭이고 관리자의 완료 문의는 유일한 버튼이 disabled입니다. 긴 본문·완료 답변을 읽을 경로가 없습니다.

수정 방향: 열람은 상태와 관계없이 제공하고 수정·전송만 상태에 맞게 제한합니다.

파일: [src/Mypage/Inquiry.jsx:213](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Mypage/Inquiry.jsx:213), [src/Mypage/Inquiry.css:123](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Mypage/Inquiry.css:123), [src/Admin/AdminInquiryPage/AdminInquiryPage.jsx:162](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Admin/AdminInquiryPage/AdminInquiryPage.jsx:162)

### 45 최근 장소 카드 상세 이동과 저장 상태의 접근성이 부족함

**P2 · 코드**

article은 click만 있어 상세 이동을 키보드로 사용할 수 없습니다. 북마크 버튼도 항목명과 aria-pressed 없이 동일한 이름이 반복됩니다.

수정 방향: 상세 링크와 항목별 이름·저장 상태를 제공하고 내부 액션을 독립적으로 유지합니다.

파일: [src/RecentPlacesPage/RecentPlacesPage.jsx:159](C:/Users/joyfu/Desktop/graduation_project/graduation/src/RecentPlacesPage/RecentPlacesPage.jsx:159), [src/RecentPlacesPage/RecentPlacesPage.jsx:189](C:/Users/joyfu/Desktop/graduation_project/graduation/src/RecentPlacesPage/RecentPlacesPage.jsx:189)

## 로그인과 회원가입 및 온보딩

### 46 온보딩 Skip이 홈 진입 대신 온보딩을 다시 시작함

**P1 · 실화면**

온보딩 2의 Skip을 누르면 /로 이동하고 온보딩 1이 표시되었습니다. / 라우트 자체가 온보딩 1입니다.

수정 방향: Skip을 실제 건너뛰기 목적지에 연결합니다. 기존 전환 애니메이션은 유지합니다.

파일: [src/Header/Header.jsx:435](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Header/Header.jsx:435), [src/App.js:180](C:/Users/joyfu/Desktop/graduation_project/graduation/src/App.js:180)

### 47 비밀번호 찾기가 새 비밀번호 설정으로 이어지지 않음

**P1 · 계약 확인**

인증 성공 후 /login으로 이동하며 프론트에 새 비밀번호 입력·저장 단계가 없습니다. 서버가 별도로 복구하는지는 확인되지 않았습니다.

수정 방향: 서버의 복구 계약을 확인하고 해당 단계와 연결합니다. 감사 중 실제 비밀번호 변경은 실행하지 않았습니다.

파일: [src/Login/VerifyCode.jsx:172](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Login/VerifyCode.jsx:172), [src/App.js:188](C:/Users/joyfu/Desktop/graduation_project/graduation/src/App.js:188)

### 48 이미 떠난 인증 화면의 늦은 응답이 다시 이동시킬 수 있음

**P2 · 조건부**

로그인·메일 발송·인증·OAuth 완료 후 navigate에 작업 활성 가드가 없어 요청 중 뒤로 이동한 경우 이전 목적지로 이동할 수 있습니다. SignUp에는 이미 방어가 있어 제외합니다.

수정 방향: 현재 작업의 활성 여부·취소를 완료 처리에 반영합니다.

파일: [src/Login/Login.jsx:70](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Login/Login.jsx:70), [src/Login/FindPassword.jsx:33](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Login/FindPassword.jsx:33), [src/Login/VerifyCode.jsx:162](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Login/VerifyCode.jsx:162), [src/Login/OAuthCallback.jsx:38](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Login/OAuthCallback.jsx:38)

### 49 가입·비밀번호 찾기를 거치면 로그인 원래 목적지를 잃음

**P2 · 코드**

returnTo가 있는 로그인에서 가입·찾기로 이동할 때 전달하지 않고 일반 /login으로 돌아옵니다.

수정 방향: 기존 안전한 내부 경로 검증을 사용하여 returnTo를 전체 인증 흐름에 전달합니다.

파일: [src/Login/Login.jsx:34](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Login/Login.jsx:34), [src/Login/SignUp.jsx:387](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Login/SignUp.jsx:387), [src/Login/FindPassword.jsx:61](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Login/FindPassword.jsx:61)

### 50 인증 확인과 재발송을 동시에 실행할 수 있음

**P2 · 조건부**

각 버튼은 자신의 pending만 확인합니다. 확인 중 재발송하거나 늦은 재발송 응답이 코드를 지울 수 있습니다.

수정 방향: 공유 작업 잠금과 요청 식별로 확인·재발송 간 상태 충돌을 방지합니다.

파일: [src/Login/VerifyCode.jsx:112](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Login/VerifyCode.jsx:112), [src/Login/VerifyCode.jsx:242](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Login/VerifyCode.jsx:242), [src/Login/VerifyCode.jsx:254](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Login/VerifyCode.jsx:254)

### 51 인증 남은 시간이 새로고침마다 5분으로 초기화됨

**P2 · 계약 확인**

매 마운트 300초로 시작하고 interval 횟수로 차감합니다. 새로고침·백그라운드에서 실제 서버 만료 시각과 어긋날 수 있습니다.

수정 방향: 서버 expiresAt 또는 발송 시각에 맞춰 남은 시간을 계산합니다. 서버 TTL은 확인이 필요합니다.

파일: [src/Login/VerifyCode.jsx:25](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Login/VerifyCode.jsx:25), [src/Login/VerifyCode.jsx:37](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Login/VerifyCode.jsx:37)

### 52 회원가입의 로그인으로 돌아가기를 키보드로 사용할 수 없음

**P2 · 코드**

click만 있는 span이며 키보드 대상·처리가 없습니다.

수정 방향: 실제 링크 또는 버튼으로 제공합니다.

파일: [src/Login/SignUp.jsx:613](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Login/SignUp.jsx:613)

### 53 비밀번호 찾기 이메일 필드에 연결된 label이 없음

**P2 · 코드**

label에 htmlFor가 없고 input의 id·aria-label도 연결되지 않습니다.

수정 방향: id와 htmlFor를 연결해 label 클릭과 스크린리더 이름을 제공합니다.

파일: [src/Login/FindPassword.jsx:80](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Login/FindPassword.jsx:80)

### 54 가입 동의를 취소할 수 없고 체크박스 이름이 없음

**P2 · 코드**

체크박스는 readOnly·preventDefault이며 동의 상태를 true로만 설정합니다. 동의 후 다시 클릭해도 취소되지 않고 문서 모달만 열립니다.

수정 방향: 동의 상태 변경과 문서 열기를 분리하고 체크박스에 label을 연결합니다.

파일: [src/Login/SignUp.jsx:312](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Login/SignUp.jsx:312), [src/Login/SignUp.jsx:576](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Login/SignUp.jsx:576)

### 55 개인정보 처리방침 제목과 표시 문서가 다름

**P2 · 코드**

모달 제목은 개인정보 처리방침인데 본문은 위치기반서비스 이용약관입니다. 표시 문서 불일치이며 법적 적합성을 판정한 것은 아닙니다.

수정 방향: 승인된 실제 문서와 제목·동의 대상을 일치시킵니다.

파일: [src/Login/PrivacyPolicyModal.jsx:6](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Login/PrivacyPolicyModal.jsx:6), [src/Login/PrivacyPolicyModal.jsx:145](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Login/PrivacyPolicyModal.jsx:145)

### 56 정책 공시일자가 접속 날짜로 바뀜

**P2 · 코드**

new Date()를 공시일자로 표시하여 같은 문서의 공시일자가 매일 달라집니다.

수정 방향: 문서 버전의 실제 게시일을 메타데이터로 사용합니다.

파일: [src/Login/PrivacyPolicyModal.jsx:101](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Login/PrivacyPolicyModal.jsx:101), [src/Login/PrivacyPolicyModal.jsx:150](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Login/PrivacyPolicyModal.jsx:150)

### 57 비밀번호 조건 설명과 버튼 비활성 이유가 맞지 않음

**P2 · 코드**

특수문자 포함 설명만 있지만 실제 regex는 허용 문자 집합을 제한합니다. 예를 들어 하이픈 포함 입력은 설명을 만족하는 듯 보여도 버튼이 비활성이고 submit 오류 안내에 도달하지 못합니다.

수정 방향: 서버 정책을 유지하면서 허용 문자와 현재 실패 조건을 입력 옆에서 설명합니다.

파일: [src/Login/SignUp.jsx:16](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Login/SignUp.jsx:16), [src/Login/SignUp.jsx:392](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Login/SignUp.jsx:392), [src/Login/SignUp.jsx:605](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Login/SignUp.jsx:605)

## 공통 동작과 검사

### 58 모달의 스크롤 잠금 선언이 공통 CSS에 덮임

**P2 · 실화면과 코드**

열린 공유 모달에서 body 인라인 overflow는 hidden인데 계산된 overflow-y는 visible, html은 auto였습니다. 바깥 휠·PageDown으로 실제 배경 스크롤은 재현하지 못했으므로 그 증상까지 확정하지 않습니다.

수정 방향: 실제 문서 스크롤러에 맞춰 잠금과 중첩 모달 복원을 정리하고 긴 페이지의 휠·모바일 터치를 검증합니다.

파일: [src/utils/useModalFocus.js:39](C:/Users/joyfu/Desktop/graduation_project/graduation/src/utils/useModalFocus.js:39), [src/responsive.css:17](C:/Users/joyfu/Desktop/graduation_project/graduation/src/responsive.css:17)

### 59 일반 페이지 이동 후 새 콘텐츠에 대한 포커스 처리가 없음

**P2 · 코드**

공통 라우팅에 새 제목·본문 포커스 이동이 없습니다. 카드 상세 이동 뒤 activeElement는 BODY였습니다. 이전 스크롤 위치가 유지되는 증상은 이번 재현에서 확인되지 않았습니다.

수정 방향: 키보드 이동 시 새 화면 제목을 인지할 수 있도록 진입 포커스를 관리합니다. 뒤로가기·모달 복귀·드래그 포커스를 보존합니다.

파일: [src/App.js:98](C:/Users/joyfu/Desktop/graduation_project/graduation/src/App.js:98), [src/animations/PageTransition.jsx:1](C:/Users/joyfu/Desktop/graduation_project/graduation/src/animations/PageTransition.jsx:1)

### 60 Mock 로그인 테스트가 오늘 날짜에 따라 실패함

**P3 · 코드와 직전 검사**

소셜 로그인 테스트는 다가오는 일정의 서울 주말 여행 표시를 기대하지만 고정 일정은 2026-10-10~11입니다. 2026-10-12에는 과거 일정이라 기본 탭에서 숨겨집니다. 직전 전체 검사 213개 중 이 두 케이스가 실패했습니다.

수정 방향: 로그인 복귀 목적지를 검증하는 테스트의 시간을 고정하거나 날짜 의존성과 무관한 목적지 검증으로 바꿉니다.

파일: [src/mocks/mockMode.test.jsx:55](C:/Users/joyfu/Desktop/graduation_project/graduation/src/mocks/mockMode.test.jsx:55), [src/mocks/scheduleMock.js:9](C:/Users/joyfu/Desktop/graduation_project/graduation/src/mocks/scheduleMock.js:9)

## 추가 확인이 필요한 후보

다음 항목은 운영 응답 계약이나 특정 환경의 재현이 필요합니다. 재현한 기능 오류와 같은 수준으로 확정하지 않았습니다.

### 1 운영 문의 응답 형태와 상세 정규화 차이

목록은 content/items/inquiries/result/response 배열을 지원하지만 상세 추출기는 같은 형태를 모두 지원하지 않습니다. 해당 운영 응답이면 목록은 보이고 직접 접속·새로고침은 실패할 수 있습니다. 실제 운영 응답 계약 확인이 필요합니다.

파일: [src/Mypage/InquiryDetail.jsx:109](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Mypage/InquiryDetail.jsx:109)

### 2 최근 기록 저장 데이터 형태 검증

문법상 정상인 객체·문자열 JSON이 저장되어 있으면 배열 확인 없이 some/map을 실행해 오류 화면으로 갈 수 있습니다. 실제 저장 데이터 이상은 확인되지 않았습니다.

파일: [src/RecentPlacesPage/RecentPlacesPage.jsx:13](C:/Users/joyfu/Desktop/graduation_project/graduation/src/RecentPlacesPage/RecentPlacesPage.jsx:13), [src/utils/recentPlaces.js:14](C:/Users/joyfu/Desktop/graduation_project/graduation/src/utils/recentPlaces.js:14)

### 3 저장 장소 최신순의 기본 정렬 계약

최신순은 날짜 비교가 아닌 배열 reverse입니다. API 반환 순서가 보장되지 않는 경우 잘못 정렬됩니다. 실제 API 기본 순서·저장 날짜 필드 확인이 필요합니다.

파일: [src/Mypage/SavedPlaces.jsx:267](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Mypage/SavedPlaces.jsx:267)

### 4 문의 전송 후 응답 유실과 재전송

서버 반영 후 응답만 유실되거나 5xx이면 재전송으로 중복 등록할 수 있습니다. 서버 중복 방어와 실제 재현은 확인되지 않았습니다.

파일: [src/Mypage/InquiryWrite.jsx:41](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Mypage/InquiryWrite.jsx:41), [src/Admin/AdminInquiryPage/AdminInquiryWrite.jsx:241](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Admin/AdminInquiryPage/AdminInquiryWrite.jsx:241)

### 5 긴 관리자 데이터의 모바일 줄바꿈

이메일·날짜 한 줄 flex와 nowrap 규칙이 있습니다. 긴 데이터에서 320px 넘침 가능성이 있으나 실제 긴 데이터 화면 재현이 필요합니다.

파일: [src/Admin/AdminInquiryPage/AdminInquiryPage.css:121](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Admin/AdminInquiryPage/AdminInquiryPage.css:121), [src/Admin/AdminInquiryPage/AdminInquiryWrite.css:44](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Admin/AdminInquiryPage/AdminInquiryWrite.css:44)

### 6 날짜 없는 일정의 D-Day 표시

날짜가 전혀 없는 응답도 D-Day·다가오는 일정으로 분류합니다. 실제로 날짜 없는 일정이 허용되는지 서버 계약을 확인해야 합니다.

파일: [src/MySchedule/MySchedule.jsx:236](C:/Users/joyfu/Desktop/graduation_project/graduation/src/MySchedule/MySchedule.jsx:236), [src/MySchedule/MySchedule.jsx:421](C:/Users/joyfu/Desktop/graduation_project/graduation/src/MySchedule/MySchedule.jsx:421)

### 7 기록 없는 온보딩 직접 접속의 뒤로가기

새 탭으로 온보딩 3에 접속한 뒤 navigate(-1)에 이동 기록이 없으면 fallback의 도착 신호가 발생하지 않을 가능성이 있습니다. 새 탭·fallback 환경에서 별도 재현이 필요합니다.

파일: [src/Header/Header.jsx:180](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Header/Header.jsx:180), [src/OnBoarding/onboardingTransition.js:115](C:/Users/joyfu/Desktop/graduation_project/graduation/src/OnBoarding/onboardingTransition.js:115)

### 8 한 장소만 있는 외부 지도 경로의 좌표 손실

확보한 좌표가 있는데 장소가 하나인 분기에서는 이름만으로 외부 지도 URL을 만듭니다. 동명 장소에서 잘못된 결과를 열 수 있으므로 실제 동명 장소 데이터로 확인해야 합니다.

파일: [src/RouteResult/RouteResult.jsx:797](C:/Users/joyfu/Desktop/graduation_project/graduation/src/RouteResult/RouteResult.jsx:797)

### 9 동적으로 찾은 지도 좌표와 PDF의 좌표 공유

서버 좌표 없는 장소는 화면에서 동적 검색하지만 PDF는 그 결과를 공유하지 않습니다. 해당 조건에서 화면 마커가 PDF에서 빠지는지 실제 데이터·출력 검증이 필요합니다. 기존 좌표가 있는 PDF 이미지 출력 문제와 구분합니다.

파일: [src/RouteResult/RouteResult.jsx:844](C:/Users/joyfu/Desktop/graduation_project/graduation/src/RouteResult/RouteResult.jsx:844), [src/RouteResult/RouteResult.jsx:862](C:/Users/joyfu/Desktop/graduation_project/graduation/src/RouteResult/RouteResult.jsx:862), [src/RouteResult/RouteResult.jsx:2123](C:/Users/joyfu/Desktop/graduation_project/graduation/src/RouteResult/RouteResult.jsx:2123)

### 10 일정 생성 중 이탈·계정 전환의 후속 작업

생성 작업은 실행 잠금만 있고 여러 쓰기 단계의 unmount·세션 세대 검사 경로를 추가 확인해야 합니다. API 인증 스냅샷 방어까지 함께 추적하기 전에는 계정 혼합이나 잘못된 저장을 확정할 수 없습니다.

파일: [src/RouteCreate/useGenerationTask.js:1](C:/Users/joyfu/Desktop/graduation_project/graduation/src/RouteCreate/useGenerationTask.js:1), [src/RouteCreate/RouteCreate.jsx:1875](C:/Users/joyfu/Desktop/graduation_project/graduation/src/RouteCreate/RouteCreate.jsx:1875)

### 11 사용하지 않는 상세 이동 payload 정리

RecentPlaces가 상세 이동 state에 예시 평점 4.8·리뷰 980을 넣지만 현재 Detail은 서버 데이터만 사용합니다. 현재 상세의 가짜 평점 표시 버그로 분류하지 않고 미사용 데이터 정리 대상으로 봅니다.

파일: [src/RecentPlacesPage/RecentPlacesPage.jsx:74](C:/Users/joyfu/Desktop/graduation_project/graduation/src/RecentPlacesPage/RecentPlacesPage.jsx:74), [src/Recommend/Detail.jsx:539](C:/Users/joyfu/Desktop/graduation_project/graduation/src/Recommend/Detail.jsx:539)

## 실제 확인한 범위와 보존한 작업

- 기존 개발 서버가 이 프로젝트의 react-scripts에서 실행 중이며 포트는 3000입니다. 새 서버는 시작하지 않았습니다.
- 이번 실제 화면 점검은 실행 중인 Mock 환경에서 진행했습니다. 홈·검색·추천 검색·전체 목록·장소 상세·저장 장소·마이페이지·최근 본 장소·문의 상세·관리자·온보딩과 공유 모달을 확인했습니다.
- 모바일 390px에서 핵심 조작과 표시를 확인했고 PC 1366px에서 문의 표시를 확인했습니다. 320px·768px 전체 화면과 실제 모바일 터치·스크린리더 전수 검증은 이번 감사에서 완료하지 않았습니다.
- 실제 삭제·문의 전송·회원가입 동의·비밀번호 변경은 실행하지 않았습니다. 운영 API, 네트워크 지연·실패 주입, 계정 전환 중 작업, 후보 조건의 PDF 출력은 추가 검증 대상입니다.
- 직전 변경 기준 프로덕션 빌드는 성공했습니다. 직전 전체 검사는 45개 스위트 중 44개 성공, 213개 테스트 중 211개 성공·2개 실패이며 두 실패는 위 날짜 의존 테스트입니다. 이번 읽기 전용 감사에서는 빌드·테스트를 새로 실행하지 않았습니다.
- 저장 장소 브라우저 뒤로가기는 실제로 정상 동작했습니다. 쿼리별 오류 경계 key가 하위 화면을 재마운트하므로 오래된 폴더 표시 후보는 제외했습니다.
- 페이지 이동에서 이전 스크롤이 유지되는 문제는 재현되지 않았습니다. 포커스 안내 개선과 구분합니다.
- 이미 수정한 다크 모드 홈 사각형 배경, 중복 등장 애니메이션, 기본 PDF 사진 출력, 일정 드래그·키보드 순서 변경·메모 연결을 미해결 문제로 다시 나열하지 않았습니다.
- AdminMain은 샘플 데이터라고 명시하므로 고정 통계 자체를 실제 통계 위장 문제로 분류하지 않았습니다.
- 기존 수정·미추적 파일을 보존했습니다. 이번 감사에서 앱 소스는 수정하지 않았으며 Git pull·reset·stash·commit·push를 실행하지 않았습니다.
- 검증용 Mock 로그인은 로그아웃했고 임시 브라우저 탭과 화면 크기 설정을 정리했습니다. 기존 사용자 서버와 탭은 유지했습니다.

## 재현 화면

- [홈 검색 URL에서 결과 조회가 시작되지 않는 화면](C:/Users/joyfu/Desktop/graduation_project/graduation/output/frontend-audit/home-search-url-no-results.jpg)
- [서울 검색 전체보기에 힐링 목록이 표시되는 화면](C:/Users/joyfu/Desktop/graduation_project/graduation/output/frontend-audit/search-view-all-wrong-theme.jpg)
- [온보딩 Skip 후 첫 화면으로 돌아가는 화면](C:/Users/joyfu/Desktop/graduation_project/graduation/output/frontend-audit/onboarding-skip-restarts.jpg)
- [답변 대기 문의에 처리 완료 답변이 표시되는 화면](C:/Users/joyfu/Desktop/graduation_project/graduation/output/frontend-audit/unanswered-inquiry-fabricated-answer.jpg)
- [PC에서도 같은 답변 불일치가 표시되는 화면](C:/Users/joyfu/Desktop/graduation_project/graduation/output/frontend-audit/unanswered-inquiry-pc.jpg)
- [로그 메뉴에 통계가 표시되는 화면](C:/Users/joyfu/Desktop/graduation_project/graduation/output/frontend-audit/admin-logs-shows-stats.jpg)
- [최근 장소의 사진·분류가 누락되는 화면](C:/Users/joyfu/Desktop/graduation_project/graduation/output/frontend-audit/recent-place-missing-photos.jpg)
