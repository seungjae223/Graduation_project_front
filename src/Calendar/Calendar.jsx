import React, { useState } from "react";
import "./Calendar.css";

import seoulImg from "../img/도쿄.png";
import jejuImg from "../img/교토.png";
import busanImg from "../img/서비스 소개 .png";

const PlusIcon = () => (
  <svg viewBox="0 0 24 24" className="calendar-svg" aria-hidden="true">
    <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
    <path d="M12 8V16M8 12H16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const PinIcon = () => (
  <svg viewBox="0 0 24 24" className="small-svg" aria-hidden="true">
    <path
      d="M12 20C12 20 6 14.5 6 10.5C6 7.46 8.46 5 11.5 5C14.54 5 17 7.46 17 10.5C17 14.5 12 20 12 20Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <circle cx="11.5" cy="10.5" r="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
  </svg>
);

const ChevronIcon = () => (
  <svg viewBox="0 0 24 24" className="small-svg chevron" aria-hidden="true">
    <path
      d="M9 6L15 12L9 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const upcomingMock = [
  {
    id: 1,
    dday: "D-5",
    title: "서울 근교 힐링 여행",
    date: "2024.03.15 - 03.16",
    location: "경기 가평군",
    image: seoulImg,
  },
  {
    id: 2,
    dday: "D-24",
    title: "제주도 푸른 밤 투어",
    date: "2024.04.05 - 04.08",
    location: "제주 서귀포시",
    image: jejuImg,
  },
  {
    id: 3,
    dday: "D-52",
    title: "부산 먹방 식도락 여행",
    date: "2024.05.01 - 05.03",
    location: "부산 수영구",
    image: busanImg,
  },
];

const pastMock = [
  {
    id: 4,
    dday: "완료",
    title: "강릉 바다 드라이브",
    date: "2023.12.10 - 12.11",
    location: "강원 강릉시",
    image: jejuImg,
  },
  {
    id: 5,
    dday: "완료",
    title: "전주 한옥마을 산책",
    date: "2023.11.03 - 11.04",
    location: "전북 전주시",
    image: seoulImg,
  },
];

function Calendar() {
  const [tab, setTab] = useState("upcoming");

  const scheduleList = tab === "upcoming" ? upcomingMock : pastMock;

  return (
    <div className="calendar-page">
      <div className="calendar-tab-bar">
        <button
          type="button"
          className={`calendar-tab ${tab === "upcoming" ? "active" : ""}`}
          onClick={() => setTab("upcoming")}
        >
          다가오는 일정
        </button>
        <button
          type="button"
          className={`calendar-tab ${tab === "past" ? "active" : ""}`}
          onClick={() => setTab("past")}
        >
          지난 일정
        </button>
      </div>

      <button type="button" className="create-schedule-btn">
        <PlusIcon />
        <span>새 일정 만들기</span>
      </button>

      <div className="calendar-section-title">
        <h2>{tab === "upcoming" ? "다가오는 일정" : "지난 일정"}</h2>
        <span>{scheduleList.length}</span>
      </div>

      <div className="schedule-list">
        {scheduleList.map((item) => (
          <article key={item.id} className="schedule-card">
            <img src={item.image} alt={item.title} className="schedule-thumb" />

            <div className="schedule-info">
              <span className="dday-badge">{item.dday}</span>
              <h3>{item.title}</h3>
              <p className="schedule-date">{item.date}</p>

              <div className="schedule-location">
                <PinIcon />
                <span>{item.location}</span>
              </div>
            </div>

            <button type="button" className="schedule-arrow-btn" aria-label="상세 보기">
              <ChevronIcon />
            </button>
          </article>
        ))}
      </div>

      <section className="calendar-recommend-box">
        <h3>어디로 떠날까요?</h3>
        <p>너만 오면 go가 추천하는 맞춤형 여행 코스</p>
        <button type="button">추천 받기</button>
      </section>
    </div>
  );
}

export default Calendar;