import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import "./Total.css";

const themeInfo = {
  healing: {
    label: "힐링",
    description: "당신의 지친 몸과 마음을 달래줄 힐링 장소들이에요.",
  },
  activity: {
    label: "액티비티",
    description: "몸이 먼저 반응하는 짜릿한 액티비티 장소들을 모아봤어요.",
  },
  food: {
    label: "맛집 탐방",
    description: "현지의 맛과 분위기를 함께 즐길 수 있는 먹거리 장소들이에요.",
  },
  insta: {
    label: "인스타 감성",
    description: "사진 찍기 좋은 감성 스팟과 분위기 좋은 장소들이에요.",
  },
};

const placeData = {
  healing: [
    {
      id: "healing-1",
      name: "담양 죽녹원",
      location: "전라남도 담양군",
      rating: 4.8,
      distance: 11,
      popularScore: 98,
      tags: ["#자연", "#조용한", "#산책로"],
      imageClass: "image-bamboo",
    },
    {
      id: "healing-2",
      name: "제주 사려니숲길",
      location: "제주특별자치도 제주시",
      rating: 4.9,
      distance: 34,
      popularScore: 96,
      tags: ["#숲체험", "#힐링", "#인생샷"],
      imageClass: "image-forest",
    },
    {
      id: "healing-3",
      name: "강릉 안목해변",
      location: "강원도 강릉시",
      rating: 4.7,
      distance: 29,
      popularScore: 94,
      tags: ["#바다", "#커피거리", "#일출"],
      imageClass: "image-beach",
    },
  ],
  activity: [
    {
      id: "activity-1",
      name: "양양 서핑비치",
      location: "강원도 양양군",
      rating: 4.9,
      distance: 18,
      popularScore: 99,
      tags: ["#서핑", "#도전", "#바다"],
      imageClass: "image-beach",
    },
    {
      id: "activity-2",
      name: "단양 패러글라이딩",
      location: "충청북도 단양군",
      rating: 4.8,
      distance: 31,
      popularScore: 97,
      tags: ["#패러글라이딩", "#전망", "#스릴"],
      imageClass: "image-mountain",
    },
    {
      id: "activity-3",
      name: "무주 레저파크",
      location: "전북 무주군",
      rating: 4.6,
      distance: 24,
      popularScore: 92,
      tags: ["#짚라인", "#체험", "#가족"],
      imageClass: "image-forest",
    },
  ],
  food: [
    {
      id: "food-1",
      name: "전주 한옥마을 맛집 투어",
      location: "전라북도 전주시",
      rating: 4.8,
      distance: 14,
      popularScore: 98,
      tags: ["#비빔밥", "#한옥마을", "#먹방"],
      imageClass: "image-market",
    },
    {
      id: "food-2",
      name: "부산 민락회타운",
      location: "부산 수영구",
      rating: 4.7,
      distance: 27,
      popularScore: 95,
      tags: ["#회", "#오션뷰", "#야경"],
      imageClass: "image-city",
    },
    {
      id: "food-3",
      name: "성수 브런치 로드",
      location: "서울 성동구",
      rating: 4.6,
      distance: 9,
      popularScore: 91,
      tags: ["#브런치", "#카페", "#핫플"],
      imageClass: "image-cafe",
    },
  ],
  insta: [
    {
      id: "insta-1",
      name: "서울 루프탑 갤러리",
      location: "서울 용산구",
      rating: 4.8,
      distance: 8,
      popularScore: 99,
      tags: ["#도심뷰", "#노을", "#인생샷"],
      imageClass: "image-rooftop",
    },
    {
      id: "insta-2",
      name: "춘천 호수 포토스팟",
      location: "강원도 춘천시",
      rating: 4.7,
      distance: 22,
      popularScore: 93,
      tags: ["#호수", "#감성", "#데이트"],
      imageClass: "image-lake",
    },
    {
      id: "insta-3",
      name: "부산 흰여울 포토워크",
      location: "부산 영도구",
      rating: 4.9,
      distance: 28,
      popularScore: 97,
      tags: ["#골목", "#바다", "#스냅"],
      imageClass: "image-beach",
    },
  ],
};

const Total = () => {
  const [searchParams] = useSearchParams();
  const themeKey = searchParams.get("theme") || "healing";
  const currentTheme = themeInfo[themeKey] || themeInfo.healing;

  const [sortType, setSortType] = useState("popular");
  const [bookmarkedIds, setBookmarkedIds] = useState(["healing-1"]);

  useEffect(() => {
    setSortType("popular");
  }, [themeKey]);

  const currentPlaces = useMemo(() => {
    const list = [...(placeData[themeKey] || placeData.healing)];

    if (sortType === "distance") {
      return list.sort((a, b) => a.distance - b.distance);
    }

    if (sortType === "rating") {
      return list.sort((a, b) => b.rating - a.rating);
    }

    return list.sort((a, b) => b.popularScore - a.popularScore);
  }, [themeKey, sortType]);

  const toggleBookmark = (id) => {
    setBookmarkedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="total-page">
      <div className="total-inner">
        <p className="total-description">{currentTheme.description}</p>

        <div className="total-filter-row">
          <button
            type="button"
            className={`total-filter-btn ${sortType === "popular" ? "active" : ""}`}
            onClick={() => setSortType("popular")}
          >
            인기순
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M7 10L12 15L17 10"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <button
            type="button"
            className={`total-filter-btn ${sortType === "distance" ? "active" : ""}`}
            onClick={() => setSortType("distance")}
          >
            거리순
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M7 10L12 15L17 10"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <button
            type="button"
            className={`total-filter-btn ${sortType === "rating" ? "active" : ""}`}
            onClick={() => setSortType("rating")}
          >
            별점순
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M7 10L12 15L17 10"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        <div className="total-card-list">
          {currentPlaces.map((place) => {
            const isBookmarked = bookmarkedIds.includes(place.id);

            return (
              <article key={place.id} className="total-card">
                <div className={`total-card-image ${place.imageClass}`}>
                  <button
                    type="button"
                    className={`total-bookmark-btn ${isBookmarked ? "active" : ""}`}
                    onClick={() => toggleBookmark(place.id)}
                    aria-label={isBookmarked ? "북마크 해제" : "북마크"}
                  >
                    <svg
                      className="bookmark-icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path d="M7 4.5C7 3.94772 7.44772 3.5 8 3.5H16C16.5523 3.5 17 3.94772 17 4.5V20L12 16.8L7 20V4.5Z" />
                    </svg>
                  </button>
                </div>

                <div className="total-card-body">
                  <div className="total-card-top">
                    <h3>{place.name}</h3>
                    <span className="total-rating">★ {place.rating}</span>
                  </div>

                  <div className="total-location">
                    <svg width="14" height="16" viewBox="0 0 14 16" fill="none" aria-hidden="true">
                      <path
                        d="M7 15C7 15 12 10.364 12 6.5C12 3.462 9.538 1 6.5 1C3.462 1 1 3.462 1 6.5C1 10.364 6 15 6 15H7Z"
                        stroke="#9AA5B5"
                        strokeWidth="1.6"
                      />
                      <circle cx="6.5" cy="6.5" r="1.8" stroke="#9AA5B5" strokeWidth="1.4" />
                    </svg>
                    <span>{place.location}</span>
                  </div>

                  <div className="total-tag-list">
                    {place.tags.map((tag) => (
                      <span key={tag} className="total-tag">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <button type="button" className="total-detail-btn">
                    상세보기
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Total;