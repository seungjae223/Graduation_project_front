import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSavedPlaces } from "../Context/SavedPlacesContext";
import "./Total.css";
import api from "../api/api";

import forestImg from "../img/도쿄.png";
import museumImg from "../img/교토.png";
import beachImg from "../img/서비스 소개 .png";

const RECOMMENDATIONS_API = "/api/recommendations";
const SAVED_PLACES_API = "/api/saved-places";

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

const getPlaceArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.places)) return data.places;
  if (Array.isArray(data?.recommendations)) return data.recommendations;
  if (Array.isArray(data?.data?.places)) return data.data.places;
  if (Array.isArray(data?.data?.content)) return data.data.content;
  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.data?.recommendations)) {
    return data.data.recommendations;
  }

  return [];
};

const getIntroText = (data) => {
  return (
    data?.intro ||
    data?.message ||
    data?.description ||
    data?.data?.intro ||
    data?.data?.message ||
    data?.data?.description ||
    ""
  );
};

const normalizeTags = (tags) => {
  if (!Array.isArray(tags)) return [];

  return tags
    .map((tag) => {
      const value =
        typeof tag === "string"
          ? tag
          : tag?.name || tag?.tagName || tag?.title || "";

      if (!value) return "";

      return value.startsWith("#") ? value : `#${value}`;
    })
    .filter(Boolean);
};

const normalizePlace = (place) => ({
  id: place.id || place.placeId || place.destinationId,
  title:
    place.title ||
    place.name ||
    place.placeName ||
    place.destinationName ||
    "장소 이름 없음",
  address:
    place.address ||
    place.roadAddress ||
    place.location ||
    place.addr ||
    "주소 정보 없음",
  rating: place.rating || place.score || place.avgRating || 0,
  distance:
    Number(place.distance || place.distanceKm || place.km || place.range) || 999,
  image:
    place.image ||
    place.imageUrl ||
    place.thumbnail ||
    place.thumbnailUrl ||
    place.photoUrl ||
    forestImg,
  tags: normalizeTags(place.tags || place.hashtags),
  originalData: place,
});

const getSavedPlaceArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.places)) return data.places;
  if (Array.isArray(data?.savedPlaces)) return data.savedPlaces;
  if (Array.isArray(data?.data?.savedPlaces)) return data.data.savedPlaces;
  if (Array.isArray(data?.data?.places)) return data.data.places;

  return [];
};

const getSavedPlaceId = (savedPlace) => {
  const placeData = savedPlace.place || savedPlace.destination || savedPlace;

  return (
    placeData.id ||
    placeData.placeId ||
    savedPlace.placeId ||
    savedPlace.savedPlaceId ||
    savedPlace.bookmarkId ||
    savedPlace.id
  );
};

const getErrorMessage = (error, fallbackMessage) => {
  const data = error.response?.data;

  if (typeof data === "string") {
    return data;
  }

  return data?.message || data?.error || fallbackMessage;
};

function Total() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isSaved, toggleSavedPlace } = useSavedPlaces();

  const [sortBy, setSortBy] = useState("인기순");
  const [serverPlaces, setServerPlaces] = useState([]);
  const [serverSavedIds, setServerSavedIds] = useState([]);
  const [serverIntro, setServerIntro] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingId, setIsSavingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  const selectedTheme = searchParams.get("theme") || "힐링";
  const themeData = totalMockByTheme[selectedTheme] || totalMockByTheme["힐링"];

  useEffect(() => {
    const fetchTotalPlaces = async () => {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const response = await api.get(RECOMMENDATIONS_API, {
          params: {
            theme: selectedTheme,
          },
        });

        const places = getPlaceArray(response.data).map(normalizePlace);

        setServerPlaces(places);
        setServerIntro(getIntroText(response.data));
      } catch (error) {
        console.error("전체 추천 장소 조회 실패:", error);

        if (error.message.includes("Network Error")) {
          setErrorMessage("백엔드 서버 연결 또는 CORS 설정을 확인해주세요.");
          return;
        }

        setErrorMessage(
          getErrorMessage(
            error,
            "추천 장소를 불러오지 못했습니다. 기본 추천 장소를 표시합니다."
          )
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchTotalPlaces();
  }, [selectedTheme]);

  useEffect(() => {
    const fetchSavedPlaces = async () => {
      try {
        const response = await api.get(SAVED_PLACES_API);
        const savedPlaces = getSavedPlaceArray(response.data);

        setServerSavedIds(
          savedPlaces
            .map(getSavedPlaceId)
            .filter(Boolean)
            .map((id) => String(id))
        );
      } catch (error) {
        console.error("저장 장소 상태 조회 실패:", error);
      }
    };

    fetchSavedPlaces();
  }, []);

  const places = serverPlaces.length > 0 ? serverPlaces : themeData.places;
  const introText = serverIntro || themeData.intro;

  const sortedPlaces = useMemo(() => {
    const copied = [...places];

    if (sortBy === "거리순") {
      return copied.sort((a, b) => a.distance - b.distance);
    }

    if (sortBy === "별점순") {
      return copied.sort((a, b) => b.rating - a.rating);
    }

    return copied;
  }, [places, sortBy]);

  const handleDetailClick = (place) => {
    navigate(`/detail?id=${place.id}`, {
      state: { place },
    });
  };

  const handleToggleSaved = async (event, place, saved) => {
    event.stopPropagation();

    if (isSavingId === place.id) return;

    try {
      setIsSavingId(place.id);

      if (saved) {
        await api.delete(`${SAVED_PLACES_API}/${place.id}`);

        setServerSavedIds((prev) =>
          prev.filter((savedId) => savedId !== String(place.id))
        );

        if (isSaved(place.id)) {
          toggleSavedPlace(place);
        }

        return;
      }

      await api.post(SAVED_PLACES_API, {
        placeId: place.id,
      });

      setServerSavedIds((prev) => {
        const nextId = String(place.id);
        return prev.includes(nextId) ? prev : [...prev, nextId];
      });

      if (!isSaved(place.id)) {
        toggleSavedPlace(place);
      }
    } catch (error) {
      console.error("관심 장소 변경 실패:", error);

      if (error.message.includes("Network Error")) {
        alert("백엔드 서버 연결 또는 CORS 설정을 확인해주세요.");
        return;
      }

      alert(
        getErrorMessage(
          error,
          "관심 장소 변경에 실패했습니다. 잠시 후 다시 시도해주세요."
        )
      );
    } finally {
      setIsSavingId(null);
    }
  };

  return (
    <div className="total-page">
      <section className="total-intro">
        <h1>{isLoading ? "추천 장소를 불러오는 중입니다." : introText}</h1>
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

      {errorMessage && (
        <p
          style={{
            margin: "0 20px 14px",
            fontSize: "13px",
            color: "#ef4444",
          }}
        >
          {errorMessage}
        </p>
      )}

      <section className="theme-total-list">
        {sortedPlaces.map((place) => {
          const saved =
            serverSavedIds.includes(String(place.id)) || isSaved(place.id);

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
                  onClick={(event) => handleToggleSaved(event, place, saved)}
                  disabled={isSavingId === place.id}
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
                  {(place.tags || []).map((tag) => (
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