import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSavedPlaces } from "../Context/SavedPlacesContext";
import AnimatedHeart from "../AnimatedHeart/AnimatedHeart";
import "./Recommend.css";

import forestImg from "../img/도쿄.png";
import museumImg from "../img/교토.png";
import beachImg from "../img/서비스 소개 .png";

const PinIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
    <path
      d="M12 20C12 20 6 14.5 6 10.5C6 7.46 8.46 5 11.5 5C14.54 5 17 7.46 17 10.5C17 14.5 12 20 12 20Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <circle
      cx="11.5"
      cy="10.5"
      r="2"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    />
  </svg>
);

const LeafIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
    <path
      d="M18 6C12 6 7 10 7 15C7 18 9.4 20 12.3 20C17 20 19 15.6 19 11C19 9.2 18.7 7.5 18 6Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <path
      d="M9 17C10.5 14.5 13 12.3 16.5 10.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const ActivityIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
    <circle cx="15.5" cy="5.5" r="2" fill="currentColor" />
    <path
      d="M7 12L11 9L13.5 12L17 10"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M10 12L8 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M13 12L16 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M5 10L8 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const FoodIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
    <path
      d="M7 3V10"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M5 3V6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M9 3V6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M7 10V21"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M16 3C17.7 5 18 7.2 18 9V21"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M14 12H18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const CameraIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
    <rect
      x="4"
      y="7"
      width="16"
      height="12"
      rx="3"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    />
    <path
      d="M9 7L10.5 5H13.5L15 7"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <circle
      cx="12"
      cy="13"
      r="3"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    />
  </svg>
);

const themeCards = [
  { key: "힐링", label: "힐링", icon: <LeafIcon /> },
  { key: "액티비티", label: "액티비티", icon: <ActivityIcon /> },
  { key: "맛집 탐방", label: "맛집 탐방", icon: <FoodIcon /> },
  { key: "인스타 감성", label: "인스타 감성", icon: <CameraIcon /> },
];

const recommendedPlaces = [
  {
    id: 101,
    theme: "힐링",
    title: "포레스트 하우스",
    address: "강원도 평창군",
    rating: 4.9,
    reviewCount: 1240,
    badge: "STAY",
    tabType: "숙소",
    image: forestImg,
    tags: ["#자연힐링", "#조용함"],
  },
  {
    id: 102,
    theme: "힐링",
    title: "뮤지엄 산",
    address: "경기도 원주시",
    rating: 4.7,
    reviewCount: 980,
    badge: "LANDMARK",
    tabType: "명소",
    image: museumImg,
    tags: ["#건축미", "#산책코스"],
  },
  {
    id: 103,
    theme: "맛집 탐방",
    title: "우도 해녀의 집",
    address: "제주 제주시",
    rating: 4.8,
    reviewCount: 1560,
    badge: "RESTAURANT",
    tabType: "맛집",
    image: beachImg,
    tags: ["#제주맛집", "#해산물"],
  },
  {
    id: 104,
    theme: "액티비티",
    title: "평창 패러글라이딩",
    address: "강원도 평창군",
    rating: 4.6,
    reviewCount: 720,
    badge: "ACTIVITY",
    tabType: "명소",
    image: forestImg,
    tags: ["#스릴", "#액티비티"],
  },
  {
    id: 105,
    theme: "인스타 감성",
    title: "무드 스테이",
    address: "서울 성동구",
    rating: 4.8,
    reviewCount: 430,
    badge: "STAY",
    tabType: "숙소",
    image: museumImg,
    tags: ["#감성숙소", "#포토스팟"],
  },
];

function Recommend() {
  const navigate = useNavigate();
  const { isSaved, toggleSavedPlace } = useSavedPlaces();
  const [selectedTheme, setSelectedTheme] = useState("힐링");

  const filteredPlaces = recommendedPlaces.filter(
    (place) => place.theme === selectedTheme
  );

  const handleViewAll = () => {
    const params = new URLSearchParams({
      theme: selectedTheme,
    });
    navigate(`/total?${params.toString()}`);
  };

  const handleDetailClick = (place) => {
    navigate(`/detail?id=${place.id}`, {
      state: { place },
    });
  };

  return (
    <div className="recommend-page">
      <section className="recommend-hero">
        <h1 className="recommend-title">
          어떤 여행을 꿈꾸시나요?
          <br />
          <span className="accent">취향에 딱 맞는 장소</span>를 찾아드릴게요.
        </h1>
      </section>

      <section className="theme-grid">
        {themeCards.map((theme) => (
          <button
            key={theme.key}
            type="button"
            className={`theme-card ${
              selectedTheme === theme.key ? "active" : ""
            }`}
            onClick={() => setSelectedTheme(theme.key)}
          >
            <div className="theme-icon-wrap">{theme.icon}</div>
            <span className="theme-label">{theme.label}</span>
          </button>
        ))}
      </section>

      <section className="recommend-section">
        <div className="recommend-section-header">
          <h2>당신만을 위한 추천 장소</h2>
          <button
            type="button"
            className="view-all-btn"
            onClick={handleViewAll}
          >
            전체보기
          </button>
        </div>

        <div className="recommend-card-list">
          {filteredPlaces.map((place) => {
            const saved = isSaved(place.id);

            return (
              <article
                key={place.id}
                className="recommend-card"
                onClick={() => handleDetailClick(place)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    handleDetailClick(place);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <div className="recommend-card-image-wrap">
                  <img
                    src={place.image}
                    alt={place.title}
                    className="recommend-card-image"
                  />

                  <button
                    type="button"
                    className="recommend-heart-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSavedPlace(place);
                    }}
                    aria-label={saved ? "저장 취소" : "저장"}
                  >
                    <AnimatedHeart active={saved} />
                  </button>
                </div>

                <div className="recommend-card-body">
                  <div className="recommend-title-row">
                    <h3>{place.title}</h3>
                    <div className="recommend-rating">
                      <span className="star">★</span>
                      <span>{place.rating}</span>
                    </div>
                  </div>

                  <div className="recommend-address-row">
                    <PinIcon />
                    <span>{place.address}</span>
                  </div>

                  <div className="recommend-tag-row">
                    {place.tags.map((tag) => (
                      <span key={tag} className="recommend-tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export default Recommend;