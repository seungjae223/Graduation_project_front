import React, { useEffect, useState } from "react";
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

const VISIBLE_TRAVEL_COUNT = 4;

const Home = () => {
  const navigate = useNavigate();

  const [selectedMenu, setSelectedMenu] = useState("route");
  const [keyword, setKeyword] = useState("");
  const [travelStartIndex, setTravelStartIndex] = useState(0);

  const [locationLabel, setLocationLabel] = useState("서울특별시");
  const [isLocationLoading, setIsLocationLoading] = useState(false);

  useEffect(() => {
    if (travelMockData.length <= VISIBLE_TRAVEL_COUNT) return;

    const timer = setInterval(() => {
      setTravelStartIndex((prev) => (prev + 1) % travelMockData.length);
    }, 3000);

    return () => clearInterval(timer);
  }, []);

  const visibleTravelData = Array.from(
    {
      length: Math.min(VISIBLE_TRAVEL_COUNT, travelMockData.length),
    },
    (_, index) => {
      const dataIndex = (travelStartIndex + index) % travelMockData.length;
      return travelMockData[dataIndex];
    }
  );

  const getLocationLabel = (latitude, longitude) => {
    const isSeoul =
      latitude >= 37.4 &&
      latitude <= 37.75 &&
      longitude >= 126.75 &&
      longitude <= 127.25;

    if (isSeoul) return "서울특별시";

    return "현재 위치 확인 완료";
  };

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
    navigate("/popular-all", {
      state: {
        travelList: travelMockData,
      },
    });
  };

  const handleNearbyClick = () => {
    if (!navigator.geolocation) {
      setLocationLabel("위치 기능 미지원");
      return;
    }

    setIsLocationLoading(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;

        const currentLocation = {
          lat: latitude,
          lng: longitude,
        };

        localStorage.setItem(
          "currentLocation",
          JSON.stringify(currentLocation)
        );

        setLocationLabel(getLocationLabel(latitude, longitude));
        setIsLocationLoading(false);

        navigate("/search", {
          state: {
            mode: "nearby",
            currentLocation,
          },
        });
      },
      (error) => {
        console.log("위치 권한 오류:", error);
        setLocationLabel("위치 권한 필요");
        setIsLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  return (
    <div className="home">
      {/* 상단 그라데이션 영역 */}
      <div className="home-header">
        <h1>어디로든 떠나볼까요?</h1>
        <p className="subtitle">
          당신만을 위한 완벽한 여행 계획을 시작하세요.
        </p>

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
      <div className="home-popular-header">
        <h2>인기 급상승 여행지</h2>

        <button
          type="button"
          className="home-popular-more-button"
          onClick={handlePopularAllClick}
        >
          전체보기
        </button>
      </div>

      <div className="travel-list">
        {visibleTravelData.map((place) => (
          <div key={place.id} className="travel-card">
            <img src={place.image} alt={place.title} />

            <div className="travel-overlay">
              <span>{place.title}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 내 주변 탐색 */}
      <button
        type="button"
        className="nearby-location-card"
        onClick={handleNearbyClick}
      >
        <span className="nearby-location-icon" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            width="28"
            height="28"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 21C12 21 5.5 14.8 5.5 9.8C5.5 6.2 8.4 3.5 12 3.5C15.6 3.5 18.5 6.2 18.5 9.8C18.5 14.8 12 21 12 21Z"
              stroke="white"
              strokeWidth="2.4"
              strokeLinejoin="round"
            />
            <circle
              cx="12"
              cy="9.8"
              r="2.3"
              stroke="white"
              strokeWidth="2.4"
            />
          </svg>
        </span>

        <span className="nearby-location-text">
          <span>내 주변 탐색</span>
          <strong>
            {isLocationLoading
              ? "현재 위치 확인 중..."
              : `현재 위치: ${locationLabel}`}
          </strong>
        </span>

        <span className="nearby-location-arrow" aria-hidden="true">
          ›
        </span>
      </button>
    </div>
  );
};

export default Home;