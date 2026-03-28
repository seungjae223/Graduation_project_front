import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSavedPlaces } from "../Context/SavedPlacesContext";
import "./PopularAll.css";

import tokyoImg from "../img/도쿄.png";
import kyotoImg from "../img/교토.png";
import beachImg from "../img/서비스 소개 .png";

const HeartIcon = ({ active }) => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
    <path
      d="M12 21s-6.8-4.35-9.4-8.1C.3 9.55 1.1 5.2 5.4 4.3c2.3-.5 4.3.5 5.6 2.1 1.3-1.6 3.3-2.6 5.6-2.1 4.3.9 5.1 5.25 2.8 8.6C18.8 16.65 12 21 12 21z"
      fill={active ? "#ffffff" : "none"}
      stroke="#ffffff"
      strokeWidth="2"
      strokeLinejoin="round"
    />
  </svg>
);

const BookmarkIcon = ({ active }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
    <path
      d="M7 4.5C7 3.67 7.67 3 8.5 3H15.5C16.33 3 17 3.67 17 4.5V21L12 17.7L7 21V4.5Z"
      fill={active ? "#1DA1F2" : "none"}
      stroke={active ? "#1DA1F2" : "#A6B3C2"}
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
  </svg>
);

const filterList = ["전체", "일본", "한국", "동남아"];

const hotPlaces = [
  {
    id: 801,
    region: "일본",
    title: "도쿄, 일본",
    subtitle: "도심 속의 화려한 미식 여행",
    image: tokyoImg,
    tags: ["#야경", "#도시", "#미식"],
    rating: 4.8,
    address: "도쿄, 일본",
  },
  {
    id: 802,
    region: "일본",
    title: "교토, 일본",
    subtitle: "전통미가 살아있는 고요한 산책",
    image: kyotoImg,
    tags: ["#전통", "#단풍", "#산책"],
    rating: 4.9,
    address: "교토, 일본",
  },
  {
    id: 803,
    region: "한국",
    title: "서울, 한국",
    subtitle: "24시간이 모자란 트렌디한 서울",
    image: tokyoImg,
    tags: ["#도시여행", "#카페", "#야경"],
    rating: 4.7,
    address: "서울, 한국",
  },
  {
    id: 804,
    region: "한국",
    title: "제주, 한국",
    subtitle: "푸른 바다와 자연이 주는 위로",
    image: beachImg,
    tags: ["#오션뷰", "#힐링", "#자연"],
    rating: 4.9,
    address: "제주, 한국",
  },
];

const monthlyPlaces = [
  {
    id: 901,
    region: "동남아",
    title: "발리, 인도네시아",
    desc: "어디를 봐도 바다와 휴양의 천국, 발리에서 즐기는 완벽한 휴식",
    image: beachImg,
    tags: ["#인생샷", "#신혼여행"],
    rating: 4.8,
    address: "발리, 인도네시아",
  },
  {
    id: 902,
    region: "동남아",
    title: "다낭, 베트남",
    desc: "가성비 넘치는 해변 리조트와 환상적인 야경의 조화",
    image: kyotoImg,
    tags: ["#가족여행", "#맛집탐방"],
    rating: 4.7,
    address: "다낭, 베트남",
  },
];

function PopularAll() {
  const navigate = useNavigate();
  const { isSaved, toggleSavedPlace } = useSavedPlaces();
  const [selectedFilter, setSelectedFilter] = useState("전체");

  const filteredHotPlaces = useMemo(() => {
    if (selectedFilter === "전체") return hotPlaces;
    return hotPlaces.filter((place) => place.region === selectedFilter);
  }, [selectedFilter]);

  const filteredMonthlyPlaces = useMemo(() => {
    if (selectedFilter === "전체") return monthlyPlaces;
    return monthlyPlaces.filter((place) => place.region === selectedFilter);
  }, [selectedFilter]);

  const handleCardClick = (place) => {
    navigate(`/detail?id=${place.id}`, {
      state: { place },
    });
  };

  return (
    <div className="popular-all-page">
      <div className="popular-filter-row">
        {filterList.map((filter) => (
          <button
            key={filter}
            type="button"
            className={`popular-filter-btn ${
              selectedFilter === filter ? "active" : ""
            }`}
            onClick={() => setSelectedFilter(filter)}
          >
            {filter}
            {filter !== "전체" && <span>⌄</span>}
          </button>
        ))}
      </div>

      <section className="popular-grid">
        {filteredHotPlaces.map((place) => {
          const saved = isSaved(place.id);

          return (
            <article
              key={place.id}
              className="popular-grid-card"
              onClick={() => handleCardClick(place)}
            >
              <img
                src={place.image}
                alt={place.title}
                className="popular-grid-image"
              />

              <button
                type="button"
                className="popular-like-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSavedPlace(place);
                }}
                aria-label={saved ? "저장 취소" : "저장"}
              >
                <HeartIcon active={saved} />
              </button>

              <div className="popular-grid-overlay" />

              <div className="popular-grid-text">
                <h3>{place.title}</h3>
                <p>{place.subtitle}</p>
              </div>
            </article>
          );
        })}
      </section>

      <section className="popular-month-section">
        <h2>이달의 추천지</h2>

        <div className="popular-month-list">
          {filteredMonthlyPlaces.map((place) => {
            const saved = isSaved(place.id);

            return (
              <article
                key={place.id}
                className="popular-month-card"
                onClick={() => handleCardClick(place)}
              >
                <img
                  src={place.image}
                  alt={place.title}
                  className="popular-month-thumb"
                />

                <div className="popular-month-body">
                  <div className="popular-month-top">
                    <h3>{place.title}</h3>

                    <button
                      type="button"
                      className="popular-bookmark-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSavedPlace(place);
                      }}
                      aria-label={saved ? "저장 취소" : "저장"}
                    >
                      <BookmarkIcon active={saved} />
                    </button>
                  </div>

                  <p>{place.desc}</p>

                  <div className="popular-month-tags">
                    {place.tags.map((tag) => (
                      <span key={tag}>{tag}</span>
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

export default PopularAll;