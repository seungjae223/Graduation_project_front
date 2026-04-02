🚀 Travel Route Optimization Frontend

여행 예산과 일정에 맞춰 최적의 여행 동선을 추천해주는 웹 서비스의 프론트엔드입니다.
사용자는 간단한 입력만으로 효율적인 여행 계획을 자동으로 생성할 수 있습니다.

📌 프로젝트 소개

이 프로젝트는 사용자의 예산, 여행 기간, 인원 수 등을 기반으로
최적의 여행 경로와 장소를 추천해주는 서비스입니다.

기존 여행 서비스의 문제점인
👉 "여러 사이트를 비교해야 하는 번거로움"
👉 "예산 대비 현실적인 여행 계획 수립 어려움"

을 해결하는 것을 목표로 합니다.

🎯 주요 기능
1. 온보딩 & 사용자 입력
여행 스타일 선택
예산, 기간, 인원 입력
2. 로그인
기본 로그인 UI
소셜 로그인 UI (카카오 / 네이버)
3. 홈 화면
추천 여행지 카드
빠른 메뉴 (경로 생성 / 테마 추천)
4. 여행 경로 생성
날짜 선택 (연속 날짜 선택)
장소 검색 및 추가
DAY별 일정 자동 생성
5. 테마 추천
힐링 / 액티비티 / 맛집 등 카테고리 제공
좋아요(❤️) 기능
6. 마이페이지
저장한 장소 확인
사용자 정보 관리
🛠️ 기술 스택
Frontend
React
JavaScript (JSX)
React Router
Axios
Styling
CSS (Figma 기반 디자인 적용)
모바일 퍼스트 UI (max-width: 390px)
📂 프로젝트 구조
src/
 ├── Header/
 ├── Footer/
 ├── Landingpage/
 ├── OnBoarding/
 ├── Login/
 ├── Homepage/
 ├── Recommend/
 ├── Calendar/
 ├── Mypage/
 ├── img/
 ├── App.js
 └── index.js
📱 화면 구성
Landing (시작 화면)
OnBoarding (사용자 입력)
Login (로그인)
Home (메인)
Search (검색)
Recommend (추천)
Calendar (일정 생성)
MyPage (마이페이지)
🔄 동작 흐름
Landing → OnBoarding → Login → Home
   ↓
경로 생성 → 일정 생성 → 결과 확인
   ↓
마이페이지 저장
✨ 주요 특징
📱 모바일 UI 기반 (앱처럼 사용 가능)
🧭 여행 동선 자동 최적화 구조 설계
❤️ 사용자 인터랙션 (좋아요, 저장)
🔍 실시간 검색 기반 UX
🧩 컴포넌트 기반 구조 (재사용성 ↑)
🔗 API 연동

현재는 Mock 데이터 기반으로 구현되어 있으며,
향후 Spring Boot 백엔드와 연동 예정입니다.

REST API 기반 통신
Axios 활용
⚙️ 실행 방법
# 프로젝트 클론
git clone https://github.com/your-repo.git

# 폴더 이동
cd project-name

# 패키지 설치
npm install

# 실행
npm start
🚧 향후 개선 사항
지도 API 연동 (경로 시각화)
실제 데이터 기반 추천 시스템
로그인 기능 백엔드 연동
성능 최적화 및 코드 리팩토링
👨‍💻 개발자
Frontend: 또치
📌 참고

이 프로젝트는 졸업 프로젝트로 진행되었으며,
사용자의 여행 계획을 더욱 쉽고 효율적으로 만들어주는 것을 목표로 합니다.

🔥 한 줄 요약

👉 "예산만 입력하면 여행 계획이 자동으로 완성되는 서비스"

원하면 다음도 만들어줄게👇

백엔드 README
전체 프로젝트 README (FE+BE 합친 버전)
깃허브에 올릴 때 더 있어보이게 꾸미기 (배지, 이미지, GIF)
마크다운 

좋아 👍 바로 GitHub에 복붙 가능한 순수 Markdown(.md) 형태로 정리해줄게.

# 🚀 Travel Route Optimization Frontend

여행 예산과 일정에 맞춰 **최적의 여행 동선을 추천해주는 웹 서비스**의 프론트엔드입니다.  
사용자는 간단한 입력만으로 효율적인 여행 계획을 자동으로 생성할 수 있습니다.

---

## 📌 프로젝트 소개

이 프로젝트는 사용자의 **예산, 여행 기간, 인원 수** 등을 기반으로  
최적의 여행 경로와 장소를 추천해주는 서비스입니다.

기존 여행 서비스의 문제점인  
👉 여러 사이트를 비교해야 하는 번거로움  
👉 예산 대비 현실적인 여행 계획 수립 어려움  

을 해결하는 것을 목표로 합니다.

---

## 🎯 주요 기능

### 1. 온보딩 & 사용자 입력
- 여행 스타일 선택
- 예산, 기간, 인원 입력

### 2. 로그인
- 기본 로그인 UI
- 소셜 로그인 UI (카카오 / 네이버)

### 3. 홈 화면
- 추천 여행지 카드
- 빠른 메뉴 (경로 생성 / 테마 추천)

### 4. 여행 경로 생성
- 날짜 선택 (연속 날짜 선택)
- 장소 검색 및 추가
- DAY별 일정 자동 생성

### 5. 테마 추천
- 힐링 / 액티비티 / 맛집 탐방
- 좋아요(❤️) 기능

### 6. 마이페이지
- 저장한 장소 확인
- 사용자 정보 관리

---

## 🛠️ 기술 스택

### Frontend
- React
- JavaScript (JSX)
- React Router
- Axios

### Styling
- CSS (Figma 기반 디자인)
- Mobile First UI (max-width: 390px)

---

## 📂 프로젝트 구조


src/
├── Header/
├── Footer/
├── Landingpage/
├── OnBoarding/
├── Login/
├── Homepage/
├── Recommend/
├── Calendar/
├── Mypage/
├── img/
├── App.js
└── index.js


---

## 📱 화면 구성

- Landing (시작 화면)
- OnBoarding (사용자 입력)
- Login (로그인)
- Home (메인)
- Search (검색)
- Recommend (추천)
- Calendar (일정 생성)
- MyPage (마이페이지)

---

## 🔄 동작 흐름


Landing → OnBoarding → Login → Home
↓
경로 생성 → 일정 생성 → 결과 확인
↓
마이페이지 저장


---

## ✨ 주요 특징

- 📱 모바일 UI 기반 (앱처럼 사용 가능)
- 🧭 여행 동선 자동 최적화 구조 설계
- ❤️ 사용자 인터랙션 (좋아요, 저장)
- 🔍 실시간 검색 UX
- 🧩 컴포넌트 기반 구조 (재사용성 ↑)

---

## 🔗 API 연동

현재는 **Mock 데이터 기반으로 구현**되어 있으며,  
향후 Spring Boot 백엔드와 연동 예정입니다.

- REST API 기반 통신
- Axios 활용

---

## ⚙️ 실행 방법

```bash
# 프로젝트 클론
git clone https://github.com/your-repo.git

# 폴더 이동
cd project-name

# 패키지 설치
npm install

# 실행
npm start
🚧 향후 개선 사항
지도 API 연동 (경로 시각화)
실제 데이터 기반 추천 시스템
로그인 기능 백엔드 연동
성능 최적화 및 코드 리팩토링
👨‍💻 개발자
Frontend: 또치
📌 프로젝트 목적

이 프로젝트는 졸업 프로젝트로,
사용자의 여행 계획을 더 쉽고 효율적으로 만들어주는 것을 목표로 합니다.
