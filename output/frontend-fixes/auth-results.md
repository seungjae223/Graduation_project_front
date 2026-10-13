# 인증·온보딩 46–57 / C7 결과

이번 담당 작업은 기존 변경을 보존하고 `src/Login/**`, `src/api/authApi.js` 및 인증 테스트를 수정했다. Header 변경은 일정 담당에게 전달되어 현재 코드에 반영되어 있다. App, Mock 활성화 정책, OAuth 검증, API 시간 제한, 애니메이션 구현은 변경하지 않았다. 검증 서버나 브라우저는 직접 시작하지 않았다.

| 번호 | 상태 | 확인 원인 / 변경 | 수행 검증 | 제한 / 필요한 자료 |
|---|---|---|---|---|
| 46 | 수정했으나 검증 제한 | Header Skip이 `/` 첫 온보딩으로 이동하던 문제. Header 담당이 `/home`으로 변경. | 현재 Header 코드 확인. | 각 화면 실제 Skip·홈 이동은 통합 브라우저 검증 대상. |
| 47 | 계약·자료 확인 필요 | 기존 VerifyCode는 이메일 인증 200 후 로그인으로 이동했지만 비밀번호 변경 요청은 없었음. 확인된 API는 `/api/email/send`, `/api/email/verify`뿐. 인증 후 비밀번호 미변경을 명시하고 자동 로그인 이동·가짜 복구 완료를 제거. | 이메일 인증 성공 후 확인 화면 유지, 실제 비밀번호 변경 완료로 표시하지 않음, returnTo 로그인 링크 테스트 통과. | 복구 시작/인증/실제 변경 저장 API의 method·path·payload·응답, 일회용 복구 권한, 목적·계정 바인딩·만료, 변경 완료 기준 필요. 임의 API·복구 토큰을 만들지 않음. |
| 48 | 수정·검증 완료 (자동화) | Login/FindPassword/VerifyCode/OAuth에 이탈 가드 부족; authApi는 늦은 응답도 토큰/닉네임 저장. `useAuthRequest`가 화면 단위 취소·동기 잠금·응답 소유권을 관리. authApi가 AbortSignal 및 현재 인증 credentialVersion을 저장 직전에 확인. Signup의 입력 세대 가드 보존. | 늦은 로그인·메일·인증·재발송·OAuth 성공이 떠난 화면으로 이동하지 않음; 취소된 로그인/가입/OAuth가 토큰·캐시를 저장하지 않음; 새 계정 토큰 보호; StrictMode OAuth 1회 시작·종료 검증. | 요청 취소는 서버 반영 취소/롤백을 보장하지 않음. 실제 네트워크·브라우저 통합은 별도. |
| 49 | 수정·검증 완료 (자동화) | 인증 하위 링크가 `/signup`, `/find-password`, `/login`만 생성하여 원 목적지 유실. 기존 안전 경로 검증을 재사용하는 `authPaths`로 전체 흐름에 query 유지. | Login→Signup→Login→Find→Verify→Login 및 가입 완료→Login 목적지 유지. 외부 URL·프로토콜 상대 URL·잘못된 값은 `/home` 처리. | 실앱 목적지 및 실제 OAuth 리다이렉트는 통합 검증 대상. |
| 50 | 수정·검증 완료 (자동화) | VerifyCode 확인/재발송이 별도 상태로 병행 가능. 공유 요청 잠금과 응답 식별로 상호 배제하고 현재 요청만 코드·완료 상태 수정. 재발송 실패는 코드 유지, 성공은 잠금 해제 렌더 후 첫 입력 포커스. | 확인 중 재발송 금지, 재발송 중 확인 금지, 실패 후 정상 재시도, 재발송 성공 초기화·포커스, 이전 이메일 늦은 응답이 새 이메일 코드를 지우지 않음. | 실제 이메일 발송·서버 처리 시간은 테스트 데이터만 사용. |
| 51 | 계약·자료 확인 필요 | 300초를 모든 진입에서 새로 설정하고 interval 횟수만 차감하던 표시. 발송/인증 응답에는 확인된 만료 메타데이터가 없어 가짜 시간 표시와 임의 클라이언트 만료 판단을 제거하고 서버 검증을 유지. | 재진입에서 05:00을 새로 표시하지 않음, 재발송 실패 후 코드 유지, 현재 서버 검증 요청 유지. | 실제 expiresAt 형식·시간대 또는 TTL 단위와 서버 sentAt 기준 필요. 계약 없는 카운트다운을 새로 만들지 않았으며 실제 만료/백그라운드 복귀 일치 검증은 미완료. |
| 52 | 수정·검증 완료 (자동화) | Signup의 click-only span을 실제 Link로 변경하고 returnTo 보존. | 링크 의미·href 및 실제 MemoryRouter 이동, 가입 완료 로그인 복귀 테스트. | 실제 키보드·스크린리더 장비는 미사용. |
| 53 | 수정·검증 완료 (자동화) | FindPassword label에 htmlFor 없고 input에 id 없음. `find-password-email` 연결 및 email autocomplete 적용. | getByLabelText와 id 확인, 발송 흐름 테스트 통과. | 실제 스크린리더 장비는 미사용. |
| 54 | 수정·검증 완료 (자동화) | 전체 동의 영역이 모달 열기 버튼이며 체크박스는 readOnly라 취소 불가. 실제 checkbox/label과 별도 문서 보기 버튼으로 분리. 모달 닫기·Escape는 동의 변경하지 않음. | 동의·취소 양방향, 필수 동의 취소 시 가입 비활성화, 모달 닫기 후 동의 유지 및 문서 버튼 포커스 복귀. | 기존 필수 동의/가입 API 정책을 보존; 승인문서 부재로 새로운 가입 차단 정책은 추가하지 않음. |
| 55 | 계약·자료 확인 필요 | 개인정보 모달 안에 위치기반서비스 약관 15개 조항이 있었으나 승인 문서 없음. 잘못된 본문과 허위 ‘확인하고 동의하기’를 제거하고 기존 동의 대상의 문서 미확인을 표시. | 모달 제목이 기존 동의 대상과 일치, 위치기반서비스 본문 및 문서 확인 완료 액션 없음, 닫기·Escape 검증. | 승인된 이용약관·개인정보 처리방침의 실제 본문/공식 URL, 제목, 적용 범위와 동의 대상 필요. 새 약관 내용을 작성하지 않음. |
| 56 | 계약·자료 확인 필요 | 접속 날짜를 `new Date()`로 공시일자로 표시. 가짜 게시일 제거. | 공시일자/현재 날짜를 표시하지 않음을 모달 실제 렌더 테스트로 확인. | 승인된 각 문서의 게시일·시행일·버전 메타데이터 필요. 임의 날짜를 지정하지 않음. |
| 57 | 수정했으나 검증 제한 | placeholder의 불특정 ‘특수문자’와 실제 regex의 필수 문자군 불일치; disabled 버튼만으로 실패 이유 모름. 기존 regex를 보존하고 정확한 문자군·길이·조합 설명 및 부족 조건/불일치 설명을 input 주변에 연결. | 기존 허용 비밀번호 5개·거부 6개 정책 회귀, 부족 이유 및 aria-invalid/describedby 검증. | 서버 공식 비밀번호 정책 자료가 없어 서버 정책 일치까지 확정할 수 없음. 기존 규칙을 완화하지 않음. |
| C7 | 수정했으나 검증 제한 | 기록 없는 onboarding3에서 Header가 `navigate(-1)`을 전환에 전달하면 도착 commit이 없어 fallback이 남을 수 있음. Header 담당이 기록 없을 때 `/onboarding2` 안전 목적지로 변경. | onboarding3 직접 진입→onboarding2 fallback 도착·스냅샷 제거·HTML 클래스 제거 회귀 테스트 통과. 기존 native/fallback/빠른 클릭/늦은 callback 회귀 9개 통과. | 실제 새 탭 브라우저·모바일 및 네이티브 전환은 root 통합 검증 대상. 애니메이션 전체 재작성하지 않음. |

## 실행 기록

- `output/frontend-fixes/auth-tests.log`: 기존 CRA Jest 실행, 7 suites / 61 tests 통과. Login/Signup/Find/Verify/OAuth, authApi 실응답·Mock 정책, OAuth 보안, 온보딩 전환을 포함.
- `output/frontend-fixes/auth-lint.log`: 담당 Login/Auth/온보딩 테스트 기존 ESLint 검사 통과. Browserslist 데이터 연령 경고만 있음. 라이브러리나 lockfile은 변경하지 않음.
- 담당 파일 `git diff --check` 오류 없음.
- CSS 문자열 검사를 시각 검증으로 보고하지 않음. 실제 브라우저·320/390/768/1366px·라이트/다크·빌드는 root의 통합 검증 결과와 구분해야 함.

## 실제 수정 파일

- `src/Login/Login.jsx`, `Login.css`, `FindPassword.jsx`, `FindPassword.css`, `VerifyCode.jsx`, `VerifyCode.css`, `OAuthCallback.jsx`, `SignUp.jsx`, `SignUp.css`, `PrivacyPolicyModal.jsx`, `PrivacyPolicyModal.css`.
- 신규 `src/Login/useAuthRequest.js`, `authPaths.js`, `passwordValidation.js`, `authFlow.test.jsx`, `passwordValidation.test.js`.
- `src/api/authApi.js`, `authApi.test.js`, 신규 `authApi.mock.test.js`.
- `src/OnBoarding/onboardingTransition.test.js` (C7 회귀 추가; 애니메이션 구현 수정 없음).
- 기존 `src/Login/SignUp.test.jsx` 경쟁 응답 테스트를 그대로 포함하여 통과 확인.
