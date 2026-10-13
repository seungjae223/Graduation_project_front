import { loadKakaoMapsScript } from "../utils/kakaoMapLoader";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Home.css";

// 아이콘
import searchIcon from "../img/검색.png";
import recommendIcon from "../img/파랑색 추천.png";
import routeIcon from "../img/경로.png";

import { getRecommendationsApi } from "../api/placeApi";
import useReadQuery from "../utils/useReadQuery";
import useSessionKey from "../utils/useSessionKey";
import { getAuthSnapshot } from "../utils/authState";
import PlacePhoto from "../components/PlacePhoto";



const LOCATION_STORAGE_KEY = "currentLocation";
const LOCATION_LABEL_STORAGE_KEY = "currentLocationLabel";

const VISIBLE_TRAVEL_COUNT = 2;


const getAddressLabelFromKakaoMap = async (latitude, longitude) => {
  try {
    const kakao = await loadKakaoMapsScript();
    const geocoder = new kakao.maps.services.Geocoder();

    return await new Promise((resolve) => {
      geocoder.coord2RegionCode(longitude, latitude, (result, status) => {
        if (status !== kakao.maps.services.Status.OK || !result?.length) {
          resolve("주소 확인 실패");
          return;
        }

        const region =
          result.find((item) => item.region_type === "H") || result[0];

        const city = region.region_1depth_name;
        const district = region.region_2depth_name;
        const town = region.region_3depth_name;

        if (district && town) {
          resolve(`${district} ${town}`);
          return;
        }

        if (city && district) {
          resolve(`${city} ${district}`);
          return;
        }

        resolve(city || "현재 위치");
      });
    });
  } catch (error) {
    return "주소 확인 실패";
  }
};

const getLocationErrorMessage = (error) => {
  if (error.code === error.PERMISSION_DENIED) {
    return "위치 권한 필요";
  }

  if (error.code === error.POSITION_UNAVAILABLE) {
    return "위치 확인 불가";
  }

  if (error.code === error.TIMEOUT) {
    return "위치 확인 시간 초과";
  }

  return "위치 확인 실패";
};

const Home = () => {
  const navigate = useNavigate();
  const account = useSessionKey();
  const travel = useReadQuery(`${account}:home-recommendations`, signal => getRecommendationsApi({}, { signal }), true, () => getAuthSnapshot().accountKey === account);
  const travelData = travel.data || [];
  const locationRequest = useRef(0);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    ++locationRequest.current;
    return () => { mounted.current = false; };
  }, []);

  const [selectedMenu, setSelectedMenu] = useState("route");
  const [keyword, setKeyword] = useState("");
  const [travelStartIndex, setTravelStartIndex] = useState(0);

  const [locationLabel, setLocationLabel] = useState("위치 확인 필요");
  const [isLocationLoading, setIsLocationLoading] = useState(false);

  const requestCurrentLocation = useCallback(
    ({ shouldNavigate = false } = {}) => {
      if (!navigator.geolocation) {
        setLocationLabel("위치 기능 미지원");
        return;
      }

      const request = ++locationRequest.current;
      setIsLocationLoading(true);

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          if (!mounted.current || request !== locationRequest.current) return;
          const { latitude, longitude } = position.coords;

          const currentLocation = {
            lat: latitude,
            lng: longitude,
          };

          const nextLocationLabel = await getAddressLabelFromKakaoMap(
            latitude,
            longitude
          );

          if (!mounted.current || request !== locationRequest.current) return;
          localStorage.setItem(
            LOCATION_STORAGE_KEY,
            JSON.stringify(currentLocation)
          );
          localStorage.setItem(LOCATION_LABEL_STORAGE_KEY, nextLocationLabel);

          setLocationLabel(nextLocationLabel);
          setIsLocationLoading(false);

          if (shouldNavigate) {
            navigate("/search", {
              state: {
                mode: "nearby",
                currentLocation,
                locationLabel: nextLocationLabel,
              },
            });
          }
        },
        (error) => {
          if (!mounted.current || request !== locationRequest.current) return;

          const errorMessage = getLocationErrorMessage(error);

          setLocationLabel(errorMessage);
          setIsLocationLoading(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    },
    [navigate]
  );

  useEffect(() => {
    if (travelData.length <= VISIBLE_TRAVEL_COUNT) return undefined;

    const timer = setInterval(() => {
      setTravelStartIndex((prev) => (prev + 1) % travelData.length);
    }, 3000);

    return () => clearInterval(timer);
  }, [travelData.length]);

  useEffect(() => {
    let isMounted = true;
    let locationEnabled = false;

    try {
      locationEnabled =
        localStorage.getItem("locationPermissionAllowed") === "true";
    } catch (error) {
    }

    if (!locationEnabled || !navigator.permissions) return undefined;

    const request = locationRequest.current;
    navigator.permissions
      .query({ name: "geolocation" })
      .then((status) => {
        if (isMounted && request === locationRequest.current && status.state === "granted") {
          requestCurrentLocation();
        }
      })
      .catch((error) => {
      });

    return () => {
      isMounted = false;
    };
  }, [requestCurrentLocation]);

  const visibleTravelData = Array.from(
    {
      length: Math.min(VISIBLE_TRAVEL_COUNT, travelData.length),
    },
    (_, index) => {
      const dataIndex = (travelStartIndex + index) % travelData.length;
      return travelData[dataIndex];
    }
  );

  const handleSearchSubmit = (e) => {
    e.preventDefault();

    const trimmedKeyword = keyword.trim();

    if (!trimmedKeyword) {
      return;
    }

    navigate(`/search?keyword=${encodeURIComponent(trimmedKeyword)}`);
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

  const handleNearbyClick = async () => {
    let locationEnabled = false;

    try {
      locationEnabled =
        localStorage.getItem("locationPermissionAllowed") === "true";
    } catch (error) {
    }

    if (!locationEnabled) {
      alert("마이페이지 설정에서 위치 사용을 켜주세요.");
      return;
    }

    if (!navigator.permissions) {
      alert("브라우저의 위치 권한 상태를 확인할 수 없습니다.");
      return;
    }

    try {
      const status = await navigator.permissions.query({ name: "geolocation" });
      if (!mounted.current) return;

      if (status.state !== "granted") {
        localStorage.setItem("locationPermissionAllowed", "false");
        alert("마이페이지 설정에서 위치 사용을 다시 켜주세요.");
        return;
      }

      requestCurrentLocation({ shouldNavigate: true });
    } catch (error) {
      if (!mounted.current) return;
      alert("위치 권한 상태를 확인하지 못했습니다.");
    }
  };

  return (
    <div className="home">
      {/* 상단 그라데이션 영역 */}
      <div className="home-header">
        <h1>어디로든 떠나볼까요?</h1>
        <p className="subtitle">
          당신만을 위한 완벽한 여행 계획을 시작하세요.
        </p>

        <form className="search-box" onSubmit={handleSearchSubmit}>
          <button type="submit" className="search-icon-frame" aria-label="검색">
            <img
              src={searchIcon}
              alt=""
            />
          </button>

          <input
            type="text"
            aria-label="목적지 또는 테마 검색"
            placeholder="목적지 또는 테마를 검색하세요"
            value={keyword}
            maxLength={100}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </form>
      </div>

      {/* 카드 2개 */}
      <div className="quick-menu">
        <button type="button"
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
        </button>

        <button type="button"
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
        </button>
      </div>

      {/* 인기 여행지 */}
      <div className="home-popular-header">
        <h2>추천 여행지</h2>

        <button
          type="button"
          className="home-popular-more-button"
          onClick={handlePopularAllClick}
        >
          전체보기
        </button>
      </div>

      {travel.status === "loading" && <p role="status">추천 여행지를 불러오는 중...</p>}
      {travel.status === "error" && <div role="alert"><p>추천 여행지를 불러오지 못했어요.</p><button type="button" onClick={travel.retry}>다시 조회</button></div>}
      {travel.status === "success" && !travelData.length && <p>추천 여행지가 없어요.</p>}
      <div className="travel-list">
        {visibleTravelData.map((place) => (
          <button type="button" key={place.id} className="travel-card" onClick={() => navigate(`/detail?id=${encodeURIComponent(place.id)}`)}>
            <PlacePhoto src={place.imageUrl || place.thumbnailUrl || place.image} alt={place.name || place.title} />

            <div className="travel-overlay">
              <span>{place.name || place.title}</span>
            </div>
          </button>
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
