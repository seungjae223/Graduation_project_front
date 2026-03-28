import React, { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSavedPlaces } from "../Context/SavedPlacesContext";
import "./Total.css";

import forestImg from "../img/도쿄.png";
import museumImg from "../img/교토.png";
import beachImg from "../img/서비스 소개 .png";

const BookmarkIcon = ({ active }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
    <path
      d="M7 4.5C7 3.67 7.67 3 8.5 3H15.5C16.33 3 17 3.67 17 4.5V21L12 17.7L7 21V4.5Z"
      fill={active ? "#1DA1F2" : "rgba(30, 41, 59, 0.45)"}
      stroke={active ? "#1DA1F2" : "rgba(255,255,255,0.9)"}
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
  </svg>
);

const totalMockByTheme = {
  힐링: {
    intro: "당신의 지친 몸과 마음을 달래줄 힐링 장소들이에요.",
    places: [
      {
        id: 201,
        title: "담양 죽녹원",
        address: "전라남도 담양군",
        rating: 4.8,
        distance: 3.1,
        image: forestImg,
        tags: ["#자연", "#조용함", "#산책로"],
      },
      {
        id: 202,
        title: "제주 사려니숲길",
        address: "제주특별자치도 제주시",
        rating: 4.9,
        distance: 6.8,
        image: museumImg,
        tags: ["#숲체험", "#힐링", "#인생샷"],
      },
      {
        id: 203,
        title: "강릉 안목해변",
        address: "강원도 강릉시",
        rating: 4.7,
        distance: 8.2,
        image: beachImg,
        tags: ["#바다", "#카페거리", "#힐숨"],
      },
    ],
  },
  액티비티: {
    intro: "몸이 먼저 반응하는 짜릿한 액티비티 장소들이에요.",
    places: [
      {
        id: 301,
        title: "평창 패러글라이딩",
        address: "강원도 평창군",
        rating: 4.6,
        distance: 5.3,
        image: forestImg,
        tags: ["#스릴", "#하늘체험", "#액티비티"],
      },
      {
        id: 302,
        title: "양양 서핑비치",
        address: "강원도 양양군",
        rating: 4.8,
        distance: 9.1,
        image: beachImg,
        tags: ["#서핑", "#바다", "#도전"],
      },
      {
        id: 303,
        title: "제주 카트 체험장",
        address: "제주특별자치도 제주시",
        rating: 4.7,
        distance: 7.2,
        image: museumImg,
        tags: ["#속도감", "#가족체험", "#실외"],
      },
    ],
  },
  "맛집 탐방": {
    intro: "여행의 한 끼를 더 특별하게 만들어줄 맛집들이에요.",
    places: [
      {
        id: 401,
        title: "우도 해녀의 집",
        address: "제주특별자치도 제주시",
        rating: 4.8,
        distance: 2.7,
        image: beachImg,
        tags: ["#제주맛집", "#해산물", "#로컬"],
      },
      {
        id: 402,
        title: "전주 한옥마을 비빔밥집",
        address: "전라북도 전주시",
        rating: 4.7,
        distance: 4.2,
        image: forestImg,
        tags: ["#한식", "#전주", "#필수코스"],
      },
      {
        id: 403,
        title: "부산 해운대 횟집",
        address: "부산광역시 해운대구",
        rating: 4.9,
        distance: 8.9,
        image: museumImg,
        tags: ["#회맛집", "#바다뷰", "#신선함"],
      },
    ],
  },
  "인스타 감성": {
    intro: "사진 한 장만 찍어도 분위기가 살아나는 감성 장소들이에요.",
    places: [
      {
        id: 501,
        title: "무드 스테이",
        address: "서울 성동구",
        rating: 4.8,
        distance: 1.8,
        image: museumImg,
        tags: ["#감성숙소", "#포토스팟", "#무드"],
      },
      {
        id: 502,
        title: "서울 루프탑 카페",
        address: "서울 용산구",
        rating: 4.7,
        distance: 3.6,
        image: beachImg,
        tags: ["#야경", "#카페", "#인생샷"],
      },
      {
        id: 503,
        title: "제주 필름무드 스팟",
        address: "제주특별자치도 서귀포시",
        rating: 4.9,
        distance: 6.4,
        image: forestImg,
        tags: ["#필름감성", "#오션뷰", "#사진명소"],
      },
    ],
  },
};

function Total() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isSaved, toggleSavedPlace } = useSavedPlaces();
  const [sortBy, setSortBy] = useState("인기순");

  const selectedTheme = searchParams.get("theme") || "힐링";
  const themeData =
    totalMockByTheme[selectedTheme] || totalMockByTheme["힐링"];

  const sortedPlaces = useMemo(() => {
    const copied = [...themeData.places];

    if (sortBy === "거리순") {
      return copied.sort((a, b) => a.distance - b.distance);
    }

    if (sortBy === "별점순") {
      return copied.sort((a, b) => b.rating - a.rating);
    }

    return copied;
  }, [themeData.places, sortBy]);

  const handleDetailClick = (place) => {
    navigate(`/detail?id=${place.id}`, {
      state: { place },
    });
  };

  return (
    <div className="total-page">
      <section className="total-intro">
        <h1>{themeData.intro}</h1>
      </section>

      <div className="sort-chip-row">
        <button
          type="button"
          className={`sort-chip ${sortBy === "인기순" ? "active" : ""}`}
          onClick={() => setSortBy("인기순")}
        >
          인기순
          <span>⌄</span>
        </button>

        <button
          type="button"
          className={`sort-chip ${sortBy === "거리순" ? "active" : ""}`}
          onClick={() => setSortBy("거리순")}
        >
          거리순
          <span>⌄</span>
        </button>

        <button
          type="button"
          className={`sort-chip ${sortBy === "별점순" ? "active" : ""}`}
          onClick={() => setSortBy("별점순")}
        >
          별점순
          <span>⌄</span>
        </button>
      </div>

      <section className="theme-total-list">
        {sortedPlaces.map((place) => {
          const saved = isSaved(place.id);

          return (
            <article key={place.id} className="theme-total-card">
              <div className="theme-total-image-wrap">
                <img
                  src={place.image}
                  alt={place.title}
                  className="theme-total-image"
                />

                <button
                  type="button"
                  className="theme-total-save-btn"
                  onClick={() => toggleSavedPlace(place)}
                  aria-label={saved ? "저장 취소" : "저장"}
                >
                  <BookmarkIcon active={saved} />
                </button>
              </div>

              <div className="theme-total-body">
                <div className="theme-total-title-row">
                  <h3>{place.title}</h3>
                  <div className="theme-total-rating">
                    <span>★</span>
                    <span>{place.rating}</span>
                  </div>
                </div>

                <p className="theme-total-address">{place.address}</p>

                <div className="theme-total-tag-row">
                  {place.tags.map((tag) => (
                    <span key={tag} className="theme-total-tag">
                      {tag}
                    </span>
                  ))}
                </div>

                <button
                  type="button"
                  className="theme-total-detail-btn"
                  onClick={() => handleDetailClick(place)}
                >
                  상세보기
                </button>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}

export default Total;