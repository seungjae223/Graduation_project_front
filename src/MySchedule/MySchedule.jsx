import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./MySchedule.css";

import tokyoImg from "../img/도쿄.png";
import kyotoImg from "../img/교토.png";
import beachImg from "../img/서비스 소개 .png";

const ChevronRightIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
    <path
      d="M9 6L15 12L9 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const PlusCircleIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
    <circle
      cx="12"
      cy="12"
      r="10"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    />
    <path
      d="M12 8V16M8 12H16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const PinIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
    <path
      d="M12 20C12 20 6.5 14.9 6.5 10.9C6.5 7.7 9.1 5 12.2 5C15.4 5 18 7.7 18 10.9C18 14.9 12.5 20 12.5 20H12Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <circle
      cx="12.2"
      cy="10.8"
      r="2"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    />
  </svg>
);

const createIsoDate = (year, month, day) =>
  new Date(year, month - 1, day, 9, 0, 0).toISOString();

const formatDateKeyFromIso = (isoString) => isoString.slice(0, 10);

const buildSavedRoute = ({
  id,
  title,
  image,
  dateRange,
  dayPlans,
}) => {
  const selectedDates = dateRange.map(([year, month, day]) =>
    createIsoDate(year, month, day)
  );

  const placesByDate = {};

  selectedDates.forEach((isoDate, index) => {
    placesByDate[formatDateKeyFromIso(isoDate)] = dayPlans[index] || [];
  });

  const totalPlaces = dayPlans.reduce((sum, day) => sum + day.length, 0);

  return {
    id,
    title,
    createdAt: new Date().toISOString(),
    thumbnail: image,
    selectedDates,
    placesByDate,
    summary: {
      daysCount: selectedDates.length,
      totalPlaces,
      dateRangeText: `${dateRange[0][1]}/${dateRange[0][2]} ~ ${
        dateRange[dateRange.length - 1][1]
      }/${dateRange[dateRange.length - 1][2]}`,
    },
  };
};

const upcomingScheduleList = [
  {
    id: "my-schedule-seoul-healing",
    dday: "D-5",
    title: "서울 근교 힐링 여행",
    dateText: "2024.03.15 - 03.16",
    location: "경기 가평군",
    image: tokyoImg,
    route: buildSavedRoute({
      id: "my-schedule-seoul-healing",
      title: "서울 근교 힐링 여행",
      image: tokyoImg,
      dateRange: [
        [2024, 3, 15],
        [2024, 3, 16],
      ],
      dayPlans: [
        [
          {
            name: "가평역 (출발)",
            desc: "기차 도착 후 여행 시작",
            timeLabel: "10:00 AM",
            isFixedTime: false,
            moveTextToNext: "버스 18분 이동 (7.2km)",
            moveTypeToNext: "bus",
          },
          {
            name: "아침고요수목원",
            desc: "정원 산책 및 포토 스팟 관람",
            timeLabel: "10:40 AM",
            isFixedTime: false,
            moveTextToNext: "버스 22분 이동 (12.4km)",
            moveTypeToNext: "bus",
          },
          {
            name: "남이섬",
            desc: "점심 식사 및 자유 산책",
            timeLabel: "01:10 PM",
            isFixedTime: false,
          },
        ],
        [
          {
            name: "잣향기푸른숲",
            desc: "숲길 산책과 힐링 코스",
            timeLabel: "09:30 AM",
            isFixedTime: false,
            moveTextToNext: "버스 16분 이동 (8.1km)",
            moveTypeToNext: "bus",
          },
          {
            name: "청평 카페거리",
            desc: "브런치 및 카페 휴식",
            timeLabel: "11:20 AM",
            isFixedTime: false,
            moveTextToNext: "버스 25분 이동 (19.3km)",
            moveTypeToNext: "bus",
          },
          {
            name: "서울 복귀",
            desc: "기차 탑승",
            timeLabel: "03:00 PM",
            isFixedTime: true,
          },
        ],
      ],
    }),
  },
  {
    id: "my-schedule-jeju-night",
    dday: "D-24",
    title: "제주도 푸른 밤 투어",
    dateText: "2024.04.05 - 04.08",
    location: "제주 서귀포시",
    image: beachImg,
    route: buildSavedRoute({
      id: "my-schedule-jeju-night",
      title: "제주도 푸른 밤 투어",
      image: beachImg,
      dateRange: [
        [2024, 4, 5],
        [2024, 4, 6],
        [2024, 4, 7],
        [2024, 4, 8],
      ],
      dayPlans: [
        [
          {
            name: "제주공항 (출발)",
            desc: "렌터카 수령 후 이동 시작",
            timeLabel: "10:00 AM",
            isFixedTime: false,
            moveTextToNext: "버스 45분 이동 (28.1km)",
            moveTypeToNext: "bus",
          },
          {
            name: "협재해변",
            desc: "오션뷰 산책 및 사진 촬영",
            timeLabel: "11:20 AM",
            isFixedTime: false,
            moveTextToNext: "버스 26분 이동 (14.3km)",
            moveTypeToNext: "bus",
          },
          {
            name: "애월 카페거리",
            desc: "브런치 및 카페 휴식",
            timeLabel: "01:30 PM",
            isFixedTime: false,
          },
        ],
        [
          {
            name: "성산일출봉",
            desc: "대표 자연 명소 관람",
            timeLabel: "09:00 AM",
            isFixedTime: false,
            moveTextToNext: "버스 20분 이동 (8.7km)",
            moveTypeToNext: "bus",
          },
          {
            name: "우도",
            desc: "섬 투어 및 점심 식사",
            timeLabel: "11:40 AM",
            isFixedTime: false,
            moveTextToNext: "버스 24분 이동 (10.9km)",
            moveTypeToNext: "bus",
          },
          {
            name: "섭지코지",
            desc: "해안 절경 감상",
            timeLabel: "03:10 PM",
            isFixedTime: false,
          },
        ],
        [
          {
            name: "사려니숲길",
            desc: "숲 산책 코스",
            timeLabel: "10:10 AM",
            isFixedTime: false,
            moveTextToNext: "버스 42분 이동 (29.4km)",
            moveTypeToNext: "bus",
          },
          {
            name: "서귀포 올레시장",
            desc: "먹거리 탐방",
            timeLabel: "01:00 PM",
            isFixedTime: false,
            moveTextToNext: "버스 18분 이동 (9.8km)",
            moveTypeToNext: "bus",
          },
          {
            name: "중문 야경 포인트",
            desc: "야간 드라이브 코스",
            timeLabel: "07:00 PM",
            isFixedTime: true,
          },
        ],
        [
          {
            name: "용머리해안",
            desc: "자연 절경 산책",
            timeLabel: "09:30 AM",
            isFixedTime: false,
            moveTextToNext: "버스 17분 이동 (7.6km)",
            moveTypeToNext: "bus",
          },
          {
            name: "카멜리아힐",
            desc: "꽃 정원 관람",
            timeLabel: "11:00 AM",
            isFixedTime: false,
            moveTextToNext: "버스 39분 이동 (31.7km)",
            moveTypeToNext: "bus",
          },
          {
            name: "제주공항 복귀",
            desc: "여행 마무리",
            timeLabel: "03:30 PM",
            isFixedTime: true,
          },
        ],
      ],
    }),
  },
  {
    id: "my-schedule-busan-food",
    dday: "D-52",
    title: "부산 먹방 식도락 여행",
    dateText: "2024.05.01 - 05.03",
    location: "부산 수영구",
    image: kyotoImg,
    route: buildSavedRoute({
      id: "my-schedule-busan-food",
      title: "부산 먹방 식도락 여행",
      image: kyotoImg,
      dateRange: [
        [2024, 5, 1],
        [2024, 5, 2],
        [2024, 5, 3],
      ],
      dayPlans: [
        [
          {
            name: "부산역 (출발)",
            desc: "KTX 도착 후 일정 시작",
            timeLabel: "10:00 AM",
            isFixedTime: false,
            moveTextToNext: "버스 14분 이동 (3.6km)",
            moveTypeToNext: "bus",
          },
          {
            name: "자갈치시장",
            desc: "로컬 해산물 맛집 탐방",
            timeLabel: "11:00 AM",
            isFixedTime: false,
            moveTextToNext: "버스 28분 이동 (9.7km)",
            moveTypeToNext: "bus",
          },
          {
            name: "광안리 해변",
            desc: "저녁 산책 및 야경 감상",
            timeLabel: "06:30 PM",
            isFixedTime: true,
          },
        ],
        [
          {
            name: "해운대 블루라인파크",
            desc: "해안열차 체험",
            timeLabel: "09:40 AM",
            isFixedTime: false,
            moveTextToNext: "도보 12분 이동 (850m)",
            moveTypeToNext: "walk",
          },
          {
            name: "해운대 암소갈비",
            desc: "점심 맛집 방문",
            timeLabel: "12:20 PM",
            isFixedTime: true,
            moveTextToNext: "버스 22분 이동 (8.4km)",
            moveTypeToNext: "bus",
          },
          {
            name: "전포 카페거리",
            desc: "디저트 및 카페 휴식",
            timeLabel: "03:20 PM",
            isFixedTime: false,
          },
        ],
        [
          {
            name: "국제시장",
            desc: "먹거리 및 쇼핑",
            timeLabel: "10:10 AM",
            isFixedTime: false,
            moveTextToNext: "버스 18분 이동 (6.9km)",
            moveTypeToNext: "bus",
          },
          {
            name: "흰여울문화마을",
            desc: "산책 및 사진 촬영",
            timeLabel: "01:10 PM",
            isFixedTime: false,
            moveTextToNext: "버스 20분 이동 (7.4km)",
            moveTypeToNext: "bus",
          },
          {
            name: "부산역 복귀",
            desc: "여행 마무리",
            timeLabel: "04:20 PM",
            isFixedTime: true,
          },
        ],
      ],
    }),
  },
];

const pastScheduleList = [
  {
    id: "past-1",
    dday: "완료",
    title: "교토 감성 여행",
    dateText: "2024.01.10 - 01.13",
    location: "교토, 일본",
    image: kyotoImg,
    route: buildSavedRoute({
      id: "past-1",
      title: "교토 감성 여행",
      image: kyotoImg,
      dateRange: [
        [2024, 1, 10],
        [2024, 1, 11],
        [2024, 1, 12],
        [2024, 1, 13],
      ],
      dayPlans: [
        [
          {
            name: "교토역 (출발)",
            desc: "여행 시작",
            timeLabel: "10:00 AM",
            isFixedTime: false,
            moveTextToNext: "버스 17분 이동 (5.2km)",
            moveTypeToNext: "bus",
          },
          {
            name: "후시미 이나리 신사",
            desc: "대표 명소 관람",
            timeLabel: "11:00 AM",
            isFixedTime: false,
          },
        ],
        [
          {
            name: "기요미즈데라",
            desc: "전통 거리 산책",
            timeLabel: "09:30 AM",
            isFixedTime: false,
          },
        ],
        [
          {
            name: "아라시야마",
            desc: "대나무숲 산책",
            timeLabel: "10:30 AM",
            isFixedTime: false,
          },
        ],
        [
          {
            name: "교토 복귀",
            desc: "마무리 일정",
            timeLabel: "02:00 PM",
            isFixedTime: true,
          },
        ],
      ],
    }),
  },
];

function MySchedule() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("upcoming");

  const currentList = useMemo(() => {
    return activeTab === "upcoming" ? upcomingScheduleList : pastScheduleList;
  }, [activeTab]);

  const handleOpenSchedule = (schedule) => {
    navigate(`/route-result?id=${schedule.route.id}`, {
      state: {
        savedRoute: schedule.route,
      },
    });
  };

  const handleCreateSchedule = () => {
    navigate("/route-create");
  };

  return (
    <div className="my-schedule-page">
      <div className="my-schedule-tabs">
        <button
          type="button"
          className={`my-schedule-tab ${
            activeTab === "upcoming" ? "active" : ""
          }`}
          onClick={() => setActiveTab("upcoming")}
        >
          다가오는 일정
        </button>

        <button
          type="button"
          className={`my-schedule-tab ${
            activeTab === "past" ? "active" : ""
          }`}
          onClick={() => setActiveTab("past")}
        >
          지난 일정
        </button>
      </div>

      <div className="my-schedule-content">
        <button
          type="button"
          className="my-schedule-create-btn"
          onClick={handleCreateSchedule}
        >
          <PlusCircleIcon />
          <span>새 일정 만들기</span>
        </button>

        <div className="my-schedule-section-header">
          <h2>
            {activeTab === "upcoming" ? "다가오는 일정" : "지난 일정"}
            <span>{currentList.length}</span>
          </h2>
        </div>

        <div className="my-schedule-list">
          {currentList.map((schedule) => (
            <article
              key={schedule.id}
              className="my-schedule-card"
              onClick={() => handleOpenSchedule(schedule)}
            >
              <img
                src={schedule.image}
                alt={schedule.title}
                className="my-schedule-thumb"
              />

              <div className="my-schedule-card-body">
                <div className="my-schedule-card-top">
                  <span className="my-schedule-dday">{schedule.dday}</span>
                </div>

                <h3>{schedule.title}</h3>
                <p className="my-schedule-date">{schedule.dateText}</p>

                <div className="my-schedule-location">
                  <PinIcon />
                  <span>{schedule.location}</span>
                </div>
              </div>

              <div className="my-schedule-chevron">
                <ChevronRightIcon />
              </div>
            </article>
          ))}
        </div>

        <div className="my-schedule-recommend-card">
          <h3>어디로 떠나볼까요?</h3>
          <p>너만 오면 go가 추천하는 맞춤형 여행 코스</p>
          <button
            type="button"
            onClick={() => navigate("/recommend")}
          >
            추천 받기
          </button>
        </div>
      </div>
    </div>
  );
}

export default MySchedule;