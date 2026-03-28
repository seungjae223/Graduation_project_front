import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Home.css";

// 아이콘
import searchIcon from "../img/검색.png";
import recommendIcon from "../img/파랑색 추천.png";
import routeIcon from "../img/경로.png";

// 이미지 (임시)
import tokyo from "../img/도쿄.png";
import kyoto from "../img/교토.png";

const travelMockData = [
  { id: 1, title: "도쿄", image: tokyo },
  { id: 2, title: "교토", image: kyoto },
  { id: 3, title: "오사카", image: tokyo },
  { id: 4, title: "나라", image: kyoto },
  { id: 5, title: "후쿠오카", image: tokyo },
  { id: 6, title: "삿포로", image: kyoto },
];

const Home = () => {
  const navigate = useNavigate();
  const [selectedMenu, setSelectedMenu] = useState("route");
  const [keyword, setKeyword] = useState("");

  const handleSearch = (e) => {
    if (e.key === "Enter") {
      console.log("검색어:", keyword);
    }
  };

  const handleRecommendClick = () => {
    setSelectedMenu("recommend");
    navigate("/recommend");
  };

  const handleRouteClick = () => {
    setSelectedMenu("route");
    navigate("/route-create");
  };

  const handlePopularAllClick = () => {
    navigate("/popular-all");
  };

  return (
    <div className="home">
      {/* 🔥 상단 그라데이션 영역 */}
      <div className="home-header">
        <h1>어디로든 떠나볼까요?</h1>
        <p className="subtitle">
          당신만을 위한 완벽한 여행 계획을 시작하세요.
        </p>

        {/* 검색창 */}
        <div className="search-box">
          <img src={searchIcon} alt="search" />
          <input
            type="text"
            placeholder="목적지 또는 테마를 검색하세요"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={handleSearch}
          />
        </div>
      </div>

      {/* 카드 2개 */}
      <div className="quick-menu">
        <div
          className={`menu-card ${
            selectedMenu === "recommend" ? "active" : ""
          }`}
          onClick={handleRecommendClick}
        >
          <div
            className={`icon-circle ${
              selectedMenu === "recommend" ? "white" : ""
            }`}
          >
            <img src={recommendIcon} alt="추천" />
          </div>
          <h3>테마 추천</h3>
          <p>맞춤형 장소 찾기</p>
        </div>

        <div
          className={`menu-card ${selectedMenu === "route" ? "active" : ""}`}
          onClick={handleRouteClick}
        >
          <div
            className={`icon-circle ${
              selectedMenu === "route" ? "white" : ""
            }`}
          >
            <img src={routeIcon} alt="경로" />
          </div>
          <h3>경로 생성</h3>
          <p>빠른 일정 짜기</p>
        </div>
      </div>

      {/* 인기 여행지 */}
      <div className="section-header">
        <h2>인기 급상승 여행지</h2>
        <span
          role="button"
          tabIndex={0}
          onClick={handlePopularAllClick}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              handlePopularAllClick();
            }
          }}
          style={{ cursor: "pointer" }}
        >
          전체보기
        </span>
      </div>

      <div className="travel-list">
        {travelMockData.map((place) => (
          <div key={place.id} className="travel-card">
            <img src={place.image} alt={place.title} />
            <div className="travel-overlay">
              <span>{place.title}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Home;