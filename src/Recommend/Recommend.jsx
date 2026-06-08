import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSavedPlaces } from "../Context/SavedPlacesContext";
import AnimatedHeart from "../AnimatedHeart/AnimatedHeart";
import "./Recommend.css";
import api from "../api/api";

import forestImg from "../img/도쿄.png"; // 기본 이미지(Fallback)로 사용됨

const RECOMMENDATIONS_API = "/api/recommendations";
const SAVED_PLACES_API = "/api/saved-places";
const PLACES_API = "/api/places";
const ITEMS_PER_PAGE = 5;
const PAGE_NUMBER_COUNT = 3; // 이전/다음 버튼까지 합쳐서 한 줄에 총 5개만 표시

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

// key는 DB에 저장된 theme 값, label은 화면에 보여줄 한글 값
const themeCards = [
  { key: "healing", label: "힐링", icon: <LeafIcon /> },
  { key: "activity", label: "액티비티", icon: <ActivityIcon /> },
  { key: "food", label: "맛집 탐방", icon: <FoodIcon /> },
  { key: "photo", label: "인스타 감성", icon: <CameraIcon /> },
];

const getArrayData = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.places)) return data.places;
  if (Array.isArray(data?.recommendations)) return data.recommendations;
  if (Array.isArray(data?.savedPlaces)) return data.savedPlaces;

  return [];
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

const getTabType = (place) => {
  const rawType = String(
    place.tabType ||
      place.category ||
      place.categoryName ||
      place.type ||
      place.placeType ||
      ""
  );

  if (rawType.includes("맛") || rawType.toLowerCase().includes("restaurant")) {
    return "맛집";
  }

  if (
    rawType.includes("숙") ||
    rawType.toLowerCase().includes("stay") ||
    rawType.toLowerCase().includes("hotel")
  ) {
    return "숙소";
  }

  return rawType || "명소";
};

const normalizePlace = (place, selectedTheme) => {
  const theme = place.theme || place.themeName || selectedTheme;
  const tabType = getTabType(place);
  const placeType = place.placeType || place.category || tabType;

  return {
    id: place.id ?? place.placeId ?? place.destinationId,
    theme,
    title:
      place.name ||
      place.title ||
      place.placeName ||
      place.destinationName ||
      "장소 이름 없음",
    description: place.description || "",
    address:
      place.address ||
      place.roadAddress ||
      place.location ||
      place.addr ||
      "주소 정보 없음",
    latitude: Number(place.latitude ?? 0),
    longitude: Number(place.longitude ?? 0),
    rating: place.rating || place.score || place.avgRating || 0,
    reviewCount: place.reviewCount || place.reviewsCount || place.reviewCnt || 0,
    badge: place.badge || place.badgeText || placeType || "PLACE",
    placeType,
    tabType,
    image:
      place.image ||
      place.imageUrl ||
      place.thumbnail ||
      place.thumbnailUrl ||
      place.photoUrl ||
      forestImg,
    tags: normalizeTags(
      place.tags || place.hashtags || [theme, placeType].filter(Boolean)
    ),
    originalData: place,
  };
};

const getSavedPlaceId = (savedPlace) => {
  const placeData = savedPlace.place || savedPlace.destination || savedPlace;

  return (
    placeData.id ??
    placeData.placeId ??
    savedPlace.placeId ??
    savedPlace.savedPlaceId ??
    savedPlace.bookmarkId ??
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

function Recommend() {
  const navigate = useNavigate();
  const { isSaved, toggleSavedPlace } = useSavedPlaces();

  const [selectedTheme, setSelectedTheme] = useState("healing");
  const [recommendedPlaces, setRecommendedPlaces] = useState([]);
  const [serverSavedIds, setServerSavedIds] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingId, setIsSavingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedTheme]);

  useEffect(() => {
    const fetchRecommendedPlaces = async () => {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const response = await api.get(RECOMMENDATIONS_API, {
          params: {
            theme: selectedTheme,
          },
        });

        const places = getArrayData(response.data).map((place) =>
          normalizePlace(place, selectedTheme)
        );

        setRecommendedPlaces(places);
      } catch (error) {
        console.error("추천 장소 조회 실패:", error);

        if (error.message.includes("Network Error")) {
          setErrorMessage("백엔드 서버 연결 또는 CORS 설정을 확인해주세요.");
          return;
        }

        setErrorMessage(
          getErrorMessage(
            error,
            "추천 장소를 불러오지 못했습니다. 잠시 후 다시 시도해주세요."
          )
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecommendedPlaces();
  }, [selectedTheme]);

  useEffect(() => {
    const fetchSavedPlaces = async () => {
      try {
        const response = await api.get(SAVED_PLACES_API);
        const savedPlaces = getArrayData(response.data);

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

  const totalPages = Math.max(
    1,
    Math.ceil(recommendedPlaces.length / ITEMS_PER_PAGE)
  );

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedPlaces = recommendedPlaces.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE
  );

  const halfPageNumberCount = Math.floor(PAGE_NUMBER_COUNT / 2);
  let firstVisiblePage = Math.max(1, currentPage - halfPageNumberCount);
  let lastVisiblePage = Math.min(
    totalPages,
    firstVisiblePage + PAGE_NUMBER_COUNT - 1
  );

  if (lastVisiblePage - firstVisiblePage + 1 < PAGE_NUMBER_COUNT) {
    firstVisiblePage = Math.max(
      1,
      lastVisiblePage - PAGE_NUMBER_COUNT + 1
    );
  }

  const visiblePageNumbers = Array.from(
    { length: lastVisiblePage - firstVisiblePage + 1 },
    (_, index) => firstVisiblePage + index
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    setCurrentPage(page);
  };

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

      const numericPlaceId = Number(place.id);

      const placePayload = {
        id: Number.isFinite(numericPlaceId) ? numericPlaceId : 0,
        name: place.title,
        latitude: place.latitude || 0,
        longitude: place.longitude || 0,
        address: place.address,
        placeType: place.placeType || place.tabType,
      };

      const placeResponse = await api.post(PLACES_API, placePayload);
      const registeredPlaceId = placeResponse.data?.id ?? place.id;

      await api.post(SAVED_PLACES_API, {
        placeId: registeredPlaceId,
      });

      setServerSavedIds((prev) => {
        const nextId = String(registeredPlaceId);
        return prev.includes(nextId) ? prev : [...prev, nextId];
      });

      if (!isSaved(registeredPlaceId)) {
        toggleSavedPlace({ ...place, id: registeredPlaceId });
      }
    } catch (error) {
      console.error("관심 장소 연동 실패:", error);

      if (error.message.includes("Network Error")) {
        alert("백엔드 서버 연결 또는 CORS 설정을 확인해주세요.");
        return;
      }

      alert(
        getErrorMessage(
          error,
          "관심 장소 연동에 실패했습니다. 잠시 후 다시 시도해주세요."
        )
      );
    } finally {
      setIsSavingId(null);
    }
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

        {isLoading ? (
          <div className="recommend-card-list">
            <p>추천 장소를 불러오는 중입니다.</p>
          </div>
        ) : (
          <>
            {errorMessage && (
              <p
                style={{
                  margin: "0 0 14px",
                  fontSize: "13px",
                  color: "#ef4444",
                }}
              >
                {errorMessage}
              </p>
            )}

            {recommendedPlaces.length === 0 && !errorMessage ? (
              <div className="recommend-card-list">
                <p
                  style={{
                    textAlign: "center",
                    color: "#94a3b8",
                    padding: "20px 0",
                  }}
                >
                  해당 테마의 추천 장소가 아직 없습니다.
                </p>
              </div>
            ) : (
              <>
                <div className="recommend-card-list">
                  {paginatedPlaces.map((place) => {
                  const saved =
                    serverSavedIds.includes(String(place.id)) ||
                    isSaved(place.id);

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
                          onClick={(e) => handleToggleSaved(e, place, saved)}
                          disabled={isSavingId === place.id}
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

                        {place.description && (
                          <p className="recommend-description">
                            {place.description}
                          </p>
                        )}

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

                {recommendedPlaces.length > ITEMS_PER_PAGE && (
                  <div
                    className="recommend-pagination"
                    aria-label="추천 장소 페이지네이션"
                  >
                    <button
                      type="button"
                      className="recommend-page-btn recommend-page-nav"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      이전
                    </button>

                    {visiblePageNumbers.map((page) => (
                      <button
                        key={page}
                        type="button"
                        className={`recommend-page-btn ${
                          currentPage === page ? "active" : ""
                        }`}
                        onClick={() => handlePageChange(page)}
                        aria-current={
                          currentPage === page ? "page" : undefined
                        }
                      >
                        {page}
                      </button>
                    ))}

                    <button
                      type="button"
                      className="recommend-page-btn recommend-page-nav"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      다음
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </section>
    </div>
  );
}

export default Recommend;