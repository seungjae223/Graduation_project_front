💰 여행 경비 기반 장소 추천 시스템

사용자의 여행 경비(예산)를 기준으로 현실적으로 여행 가능한 장소를 추천하는 웹 서비스

📌 프로젝트 개요

본 프로젝트는 사용자가 입력한 여행 예산, 여행 기간, 인원 수를 기반으로
예산 범위 내에서 여행 가능한 장소를 추천하는 경비 중심 여행 추천 시스템이다.

기존 여행 서비스가 목적지 위주의 정보 제공에 초점을 둔다면,
본 프로젝트는 **“이 예산으로 어디까지 갈 수 있는가”**라는 질문에 답하는 것을 목표로 한다.

🎯 프로젝트 목적

여행 계획 시 가장 중요한 요소인 예산 기준 의사결정 지원

예산 초과 없는 현실적인 여행 선택지 제공

여행 경비에 대한 구조적 이해 제공

졸업 프로젝트로서 실무형 웹 서비스 구현 경험 축적

🧠 주요 기능
1. 여행 정보 입력

총 여행 예산 입력

여행 기간(일수)

인원 수

여행 스타일 선택 (선택 사항)

2. 여행 경비 계산

교통비 / 숙박비 / 식비 / 관광비 자동 분배

기간 및 인원 수에 따른 비용 가중치 적용

3. 장소 추천

예산 범위 내 여행 가능 지역 추천

국내 / 해외 여행지 구분

장소별 예상 총 경비 제공

4. 추천 결과 제공

카드 형태의 추천 장소 리스트

예산 대비 사용 비율 표시

항목별 비용 요약 정보 제공

🖥️ 화면 구성

메인 페이지

여행 경비 입력 폼

추천 결과 페이지

예산에 맞는 여행지 목록

예상 경비 요약

상세 페이지

장소별 비용 구성

간단한 여행 일정 예시

🛠️ 기술 스택
Frontend

React

JavaScript (ES6+)

CSS / Tailwind CSS

Axios

Backend

Spring Boot

REST API

JPA / MyBatis

Oracle / MySQL

Tools

Git / GitHub

Figma (UI 설계)

🔗 시스템 아키텍처

Client (React)
→ REST API (JSON)
→ Spring Boot Server
→ Database

📂 프로젝트 폴더 구조

📦 travel-budget-recommend
┣ 📂 frontend
┃ ┣ 📂 src
┃ ┃ ┣ 📂 components
┃ ┃ ┣ 📂 pages
┃ ┃ ┣ 📂 api
┃ ┃ ┗ App.jsx
┃ ┗ package.json
┣ 📂 backend
┃ ┣ 📂 src/main/java
┃ ┃ ┣ 📂 controller
┃ ┃ ┣ 📂 service
┃ ┃ ┣ 📂 repository
┃ ┃ ┗ Application.java
┃ ┗ build.gradle
┣ 📄 README.md
┗ 📄 .gitignore

📊 기대 효과
사용자 측면

예산 초과 없는 여행 계획 가능

현실적인 여행 선택 가능

여행 만족도 향상

기술적 측면

프론트엔드–백엔드 REST API 연동 경험

비즈니스 로직 기반 추천 시스템 구현

졸업 프로젝트 포트폴리오 활용 가능
