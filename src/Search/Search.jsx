import React, { useState } from "react";
import "./Search.css";

import hotMainImg from "../img/도쿄.png";
import hotSubImg1 from "../img/교토.png";
import hotSubImg2 from "../img/서비스 소개 .png";

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" className="svg-icon" aria-hidden="true">
    <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" />
    <path d="M16 16L21 21" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const SeoulIcon = () => (
  <svg viewBox="0 0 24 24" className="svg-icon" aria-hidden="true">
    <rect x="4" y="5" width="4" height="14" rx="1.2" fill="none" stroke="currentColor" strokeWidth="2" />
    <rect x="10" y="3" width="4" height="16" rx="1.2" fill="none" stroke="currentColor" strokeWidth="2" />
    <rect x="16" y="8" width="4" height="11" rx="1.2" fill="none" stroke="currentColor" strokeWidth="2" />
  </svg>
);

const JejuIcon = () => (
  <svg viewBox="0 0 24 24" className="svg-icon" aria-hidden="true">
    <path d="M4 17C6 13 8 10 12 10C16 10 18 13 20 17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M12 10V6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M10 7.5L12 5L14 7.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M3 19H21" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const BusanIcon = () => (
  <svg viewBox="0 0 24 24" className="svg-icon" aria-hidden="true">
    <path d="M4 15H20L18 18H6L4 15Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    <path d="M8 11L12 8L16 11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M7 20C8 19 9 19 10 20C11 21 13 21 14 20C15 19 16 19 17 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const GangwonIcon = () => (
  <svg viewBox="0 0 24 24" className="svg-icon" aria-hidden="true">
    <path d="M4 18L9 12L13 16L17 10L20 18H4Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
  </svg>
);

const GyeongjuIcon = () => (
  <svg viewBox="0 0 24 24" className="svg-icon" aria-hidden="true">
    <path d="M4 18H20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M6 18V12H18V18" fill="none" stroke="currentColor" strokeWidth="2" />
    <path d="M4 12L12 7L20 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    <path d="M9 18V14M15 18V14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const YeosuIcon = () => (
  <svg viewBox="0 0 24 24" className="svg-icon" aria-hidden="true">
    <path d="M4 10C5.5 8.5 7 8.5 8.5 10C10 11.5 11.5 11.5 13 10C14.5 8.5 16 8.5 17.5 10C19 11.5 20 11.5 20 11.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M4 15C5.5 13.5 7 13.5 8.5 15C10 16.5 11.5 16.5 13 15C14.5 13.5 16 13.5 17.5 15C19 16.5 20 16.5 20 16.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const GeojeIcon = () => (
  <svg viewBox="0 0 24 24" className="svg-icon" aria-hidden="true">
    <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
    <path d="M12 2V5M12 19V22M2 12H5M19 12H22M4.9 4.9L7 7M17 17L19.1 19.1M19.1 4.9L17 7M7 17L4.9 19.1" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const MoreIcon = () => (
  <svg viewBox="0 0 24 24" className="svg-icon" aria-hidden="true">
    <circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
    <path d="M12 8L10 12L14 11L12 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const regionItems = [
  { id: 1, name: "서울", Icon: SeoulIcon },
  { id: 2, name: "제주", Icon: JejuIcon },
  { id: 3, name: "부산", Icon: BusanIcon },
  { id: 4, name: "강원", Icon: GangwonIcon },
  { id: 5, name: "경주", Icon: GyeongjuIcon },
  { id: 6, name: "여수", Icon: YeosuIcon },
  { id: 7, name: "거제", Icon: GeojeIcon },
  { id: 8, name: "더보기", Icon: MoreIcon },
];

const popularKeywords = [
  "경주 불국사",
  "여수 밤바다",
  "남해 독일마을",
  "양양 서피비치",
  "안동 하회마을",
  "속초 중앙시장",
];

const hotPlaces = [
  {
    id: 1,
    title: "서울 시티 나이트 투어",
    subtitle: "화려한 도심의 야경을 한눈에",
    image: hotMainImg,
    badge: "TRENDING",
  },
  {
    id: 2,
    title: "제주 오설록",
    image: hotSubImg1,
  },
  {
    id: 3,
    title: "부산 광안리",
    image: hotSubImg2,
  },
];

function Search() {
  const [query, setQuery] = useState("");
  const [recentKeywords, setRecentKeywords] = useState([
    "제주도 벚꽃",
    "부산 광안리",
    "강릉 카페거리",
  ]);

  const handleRemoveRecent = (keyword) => {
    setRecentKeywords((prev) => prev.filter((item) => item !== keyword));
  };

  const handleClearRecent = () => {
    setRecentKeywords([]);
  };

  return (
    <div className="search-page">
      <section className="search-hero">
        <h1 className="search-title">어디로 떠나볼까요?</h1>

        <div className="search-input-wrap">
          <SearchIcon />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="장소, 도시 또는 테마 검색"
          />
        </div>
      </section>

      <section className="search-section">
        <div className="section-top">
          <h2>최근 검색어</h2>
          <button type="button" className="clear-btn" onClick={handleClearRecent}>
            전체 삭제
          </button>
        </div>

        <div className="recent-tags">
          {recentKeywords.length > 0 ? (
            recentKeywords.map((keyword) => (
              <button
                type="button"
                key={keyword}
                className="recent-tag"
                onClick={() => handleRemoveRecent(keyword)}
              >
                <span>{keyword}</span>
                <span className="tag-close">×</span>
              </button>
            ))
          ) : (
            <p className="empty-text">최근 검색어가 없어요.</p>
          )}
        </div>
      </section>

      <section className="search-section">
        <h2>인기 검색어</h2>

        <div className="popular-grid">
          {popularKeywords.map((keyword, index) => (
            <button type="button" key={keyword} className="popular-card">
              <span className="popular-rank">{index + 1}</span>
              <span className="popular-text">{keyword}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="search-section">
        <h2>지역별 추천</h2>

        <div className="region-grid">
          {regionItems.map(({ id, name, Icon }) => (
            <button type="button" key={id} className="region-card">
              <div className="region-icon-box">
                <Icon />
              </div>
              <span>{name}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="search-section search-hot-section">
        <h2>지금 가장 핫한 곳</h2>

        <article className="hot-main-card">
          <img src={hotPlaces[0].image} alt={hotPlaces[0].title} />
          <div className="hot-main-overlay">
            <span className="hot-badge">{hotPlaces[0].badge}</span>
            <h3>{hotPlaces[0].title}</h3>
            <p>{hotPlaces[0].subtitle}</p>
          </div>
        </article>

        <div className="hot-sub-grid">
          {hotPlaces.slice(1).map((place) => (
            <article key={place.id} className="hot-sub-card">
              <img src={place.image} alt={place.title} />
              <div className="hot-sub-overlay">
                <h4>{place.title}</h4>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

export default Search;