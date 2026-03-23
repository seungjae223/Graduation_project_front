import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Recommend.css";

import leafIcon from "../img/흰색 나뭇잎.png";
import activityIcon from "../img/검은색 액티비티.png";
import foodIcon from "../img/검은색 맛집.png";
import cameraIcon from "../img/검은색 카메라.png";
import locationIcon from "../img/위치.png";

const themeList = [
  { id: "healing", title: "힐링", icon: leafIcon, type: "leaf" },
  { id: "activity", title: "액티비티", icon: activityIcon, type: "dark" },
  { id: "food", title: "맛집 탐방", icon: foodIcon, type: "dark" },
  { id: "insta", title: "인스타 감성", icon: cameraIcon, type: "dark" },
];

const placeData = {
  healing: [
    {
      id: "healing-1",
      name: "포레스트 하우스",
      location: "강원도 평창군",
      rating: 4.9,
      tags: ["#자연힐링", "#조용한"],
      imageClass: "forest-image",
    },
    {
      id: "healing-2",
      name: "레이크 스테이",
      location: "경기도 가평군",
      rating: 4.8,
      tags: ["#호수뷰", "#감성숙소"],
      imageClass: "museum-image",
    },
  ],
  activity: [
    {
      id: "activity-1",
      name: "서핑 포인트",
      location: "강원도 양양군",
      rating: 4.8,
      tags: ["#서핑", "#액티비티"],
      imageClass: "museum-image",
    },
    {
      id: "activity-2",
      name: "레일 바이크 파크",
      location: "강원도 정선군",
      rating: 4.6,
      tags: ["#야외체험", "#가족추천"],
      imageClass: "forest-image",
    },
  ],
  food: [
    {
      id: "food-1",
      name: "시장 골목 투어",
      location: "전북 전주시",
      rating: 4.9,
      tags: ["#로컬맛집", "#먹방코스"],
      imageClass: "forest-image",
    },
    {
      id: "food-2",
      name: "브런치 로스터리",
      location: "서울 성동구",
      rating: 4.7,
      tags: ["#브런치", "#카페투어"],
      imageClass: "museum-image",
    },
  ],
  insta: [
    {
      id: "insta-1",
      name: "루프탑 갤러리",
      location: "서울 용산구",
      rating: 4.8,
      tags: ["#인생샷", "#도심뷰"],
      imageClass: "museum-image",
    },
    {
      id: "insta-2",
      name: "선셋 포토 스팟",
      location: "제주 서귀포시",
      rating: 4.9,
      tags: ["#노을맛집", "#감성사진"],
      imageClass: "forest-image",
    },
  ],
};

const Recommend = () => {
  const navigate = useNavigate();
  const [selectedTheme, setSelectedTheme] = useState("healing");
  const [likedPlaces, setLikedPlaces] = useState(["healing-1"]);

  const toggleLike = (id) => {
    setLikedPlaces((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectedThemeTitle =
    themeList.find((theme) => theme.id === selectedTheme)?.title || "추천";

  const currentPlaces = placeData[selectedTheme] || [];

  const handleMoreClick = () => {
    navigate(`/total?theme=${selectedTheme}`);
  };

  return (
    <div className="recommend-page">
      <div className="recommend-inner">
        <h1 className="recommend-title">
          어떤 여행을 꿈꾸시나요?
          <br />
          <span>취향에 딱 맞는 장소를</span> 찾아드릴게요.
        </h1>

        <div className="theme-grid">
          {themeList.map((theme) => {
            const isActive = selectedTheme === theme.id;

            return (
              <button
                key={theme.id}
                type="button"
                className={`theme-card ${isActive ? "active" : ""}`}
                onClick={() => setSelectedTheme(theme.id)}
              >
                <div className="theme-icon-circle">
                  <img
                    src={theme.icon}
                    alt={theme.title}
                    className={`theme-icon ${
                      theme.type === "leaf" ? "leaf-icon" : "dark-icon"
                    } ${isActive ? "active" : "inactive"}`}
                  />
                </div>
                <span className="theme-label">{theme.title}</span>
              </button>
            );
          })}
        </div>

        <div className="recommend-section-header">
          <h2>{selectedThemeTitle} 추천 장소</h2>
          <button
            type="button"
            className="more-btn"
            onClick={handleMoreClick}
          >
            전체보기
          </button>
        </div>

        <div className="place-list">
          {currentPlaces.map((place) => {
            const isLiked = likedPlaces.includes(place.id);

            return (
              <article key={place.id} className="place-card">
                <div className={`place-image ${place.imageClass}`}>
                  <button
                    type="button"
                    className={`like-btn ${isLiked ? "liked" : ""}`}
                    onClick={() => toggleLike(place.id)}
                    aria-label={isLiked ? "찜 해제" : "찜하기"}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 0,
                    }}
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden="true"
                      style={{ display: "block" }}
                    >
                      <path
                        d="M12.001 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54l-1.449 1.31z"
                        fill={isLiked ? "#ff4d6d" : "none"}
                        stroke={isLiked ? "#ff4d6d" : "#94A3B8"}
                        strokeWidth="2"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>

                <div className="place-content">
                  <div className="place-top">
                    <h3>{place.name}</h3>
                    <span className="place-rating">★ {place.rating}</span>
                  </div>

                  <div className="place-location">
                    <img src={locationIcon} alt="위치" />
                    <span>{place.location}</span>
                  </div>

                  <div className="place-tags">
                    {place.tags.map((tag) => (
                      <span key={tag} className="place-tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Recommend;