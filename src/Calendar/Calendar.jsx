import React, { useState } from "react";
import "./Calendar.css";

const upcomingSchedules = [
  {
    id: 1,
    dday: "D-5",
    title: "서울 근교 힐링 여행",
    date: "2024.03.15 - 03.16",
    location: "경기 가평군",
    thumbClass: "thumb-city",
  },
  {
    id: 2,
    dday: "D-24",
    title: "제주도 푸른 밤 투어",
    date: "2024.04.05 - 04.08",
    location: "제주 서귀포시",
    thumbClass: "thumb-sea",
  },
  {
    id: 3,
    dday: "D-52",
    title: "부산 먹방 식도락 여행",
    date: "2024.05.01 - 05.03",
    location: "부산 수영구",
    thumbClass: "thumb-night",
  },
];

const pastSchedules = [
  {
    id: 4,
    title: "교토 감성 산책 여행",
    date: "2024.01.10 - 01.13",
    location: "일본 교토",
    thumbClass: "thumb-kyoto",
  },
  {
    id: 5,
    title: "강릉 바다 드라이브",
    date: "2023.12.20 - 12.21",
    location: "강원 강릉시",
    thumbClass: "thumb-sea",
  },
];

const Calendar = () => {
  const [activeTab, setActiveTab] = useState("upcoming");

  const currentSchedules =
    activeTab === "upcoming" ? upcomingSchedules : pastSchedules;

  return (
    <div className="calendar-page">
      <div className="calendar-tabs">
        <button
          type="button"
          className={`calendar-tab-btn ${
            activeTab === "upcoming" ? "active" : ""
          }`}
          onClick={() => setActiveTab("upcoming")}
        >
          다가오는 일정
        </button>

        <button
          type="button"
          className={`calendar-tab-btn ${
            activeTab === "past" ? "active" : ""
          }`}
          onClick={() => setActiveTab("past")}
        >
          지난 일정
        </button>
      </div>

      <div className="calendar-content">
        <button
          type="button"
          className="calendar-create-box"
          onClick={() => console.log("새 일정 만들기")}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" stroke="#13A5F4" strokeWidth="2" />
            <path
              d="M12 7V17"
              stroke="#13A5F4"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <path
              d="M7 12H17"
              stroke="#13A5F4"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </svg>
          <span>새 일정 만들기</span>
        </button>

        <div className="calendar-section-title">
          <h2>{activeTab === "upcoming" ? "다가오는 일정" : "지난 일정"}</h2>
          <span>{currentSchedules.length}</span>
        </div>

        <div className="calendar-schedule-list">
          {currentSchedules.map((item) => (
            <article key={item.id} className="calendar-card">
              <div className={`calendar-thumb ${item.thumbClass}`} />

              <div className="calendar-card-content">
                {item.dday && <span className="calendar-dday">{item.dday}</span>}

                <h3>{item.title}</h3>
                <p className="calendar-date">{item.date}</p>

                <div className="calendar-location">
                  <svg
                    width="13"
                    height="16"
                    viewBox="0 0 13 16"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M6.5 15C6.5 15 11.5 10.364 11.5 6.5C11.5 3.462 9.038 1 6 1C2.962 1 0.5 3.462 0.5 6.5C0.5 10.364 5.5 15 5.5 15H6.5Z"
                      stroke="#A1AAB8"
                      strokeWidth="1.6"
                    />
                    <circle cx="6" cy="6.5" r="1.8" stroke="#A1AAB8" strokeWidth="1.4" />
                  </svg>
                  <span>{item.location}</span>
                </div>
              </div>

              <button
                type="button"
                className="calendar-arrow-btn"
                onClick={() => console.log(`${item.title} 상세 보기`)}
                aria-label="상세 보기"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M9 6L15 12L9 18"
                    stroke="#C5CFDB"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </article>
          ))}
        </div>

        {activeTab === "upcoming" && (
          <div className="calendar-banner">
            <h3>어디로 떠나볼까요?</h3>
            <p>너만 오면 go가 추천하는 맞춤형 여행 코스</p>
            <button
              type="button"
              className="calendar-banner-btn"
              onClick={() => console.log("추천 받기")}
            >
              추천 받기
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Calendar;