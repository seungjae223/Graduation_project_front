

import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AnimatedHeart from "../AnimatedHeart/AnimatedHeart";
import useReadQuery from "../utils/useReadQuery";
import useSessionKey from "../utils/useSessionKey";
import { getAuthSnapshot } from "../utils/authState";
import { requireList } from "../api/responseContract";
import { toApiTheme } from "../utils/placeTheme";
import usePlaceSaving from "../utils/usePlaceSaving";
import PlaceSavingFeedback, { PlaceSaveModal } from "../components/PlaceSavingFeedback";
import "./Recommend.css";
import api from "../api/api";

import PlacePhoto from "../components/PlacePhoto";
import { getPlacePhoto } from "../data/placePhotos";
import healingThemeIcon from "../img/흰색 나뭇잎.png";
import activityThemeIcon from "../img/검은색 액티비티.png";
import foodThemeIcon from "../img/검은색 맛집.png";
import photoThemeIcon from "../img/검은색 카메라.png";

const RECOMMENDATIONS_API = "/api/recommendations";

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

// key는 UI 상태 값이며 API 요청에서는 현재 서버 테마 값으로 변환합니다.
const themeCards = [
  { key: "healing", label: "힐링", icon: healingThemeIcon, tone: "light" },
  { key: "activity", label: "액티비티", icon: activityThemeIcon },
  { key: "food", label: "맛집 탐방", icon: foodThemeIcon },
  { key: "photo", label: "인스타 감성", icon: photoThemeIcon },
];











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

const normalizePlace = (place, selectedTheme, index = 0) => {
  const theme = place.theme || place.themeName || selectedTheme;
  const tabType = getTabType(place);
  const placeType = place.placeType || place.category || tabType;
  const id = place.id ?? place.placeId ?? place.destinationId ?? `place-${index}`;

  return {
    id,
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
    rating: optionalNumber(place.rating ?? place.score ?? place.avgRating),
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
      "",
    tags: normalizeTags(
      place.tags || place.hashtags || [theme, placeType].filter(Boolean)
    ),
    originalData: place,
  };
};













const optionalNumber = value => value === undefined || value === null || value === "" ? null : Number.isFinite(Number(value)) ? Number(value) : null;

function Recommend() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const account = useSessionKey();
  const saving = usePlaceSaving();
  const { isSaved, isSavingId } = saving;

  const searchKeyword = (searchParams.get("keyword") || "").trim();
  const isSearchMode = searchKeyword.length > 0;

  const [selectedTheme, setSelectedTheme] = useState("healing");
  const [currentPage, setCurrentPage] = useState(1);
  const listing = useReadQuery(`${account}:recommend:${isSearchMode ? "search:" + searchKeyword : "theme:" + selectedTheme}`, async signal => {
    const response = await api.get(isSearchMode ? `${PLACES_API}/search` : RECOMMENDATIONS_API, { signal, params: isSearchMode ? { keyword: searchKeyword } : { theme: toApiTheme(selectedTheme) } });
    return requireList(response.data).map((place, index) => normalizePlace(place, selectedTheme, index));
  }, true, () => getAuthSnapshot().accountKey === account);
  const recommendedPlaces = listing.data || [];
  const isLoading = listing.status === "loading" && !listing.data;
  const errorMessage = listing.status === "error" ? "추천 장소를 불러오지 못했어요." : "";
  useEffect(() => { setCurrentPage(1); }, [selectedTheme, searchKeyword]);

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
    firstVisiblePage = Math.max(1, lastVisiblePage - PAGE_NUMBER_COUNT + 1);
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
    const params = new URLSearchParams();

    if (isSearchMode) {
      params.set("keyword", searchKeyword);
    } else {
      params.set("theme", selectedTheme);
    }

    navigate(`/total?${params.toString()}`);
  };

  const handleDetailClick = (place) => {
    navigate(`/detail?id=${place.id}`, {
      state: { place },
    });
  };

  const handleToggleSaved = saving.toggle;

  return (
    <>
      <div className="recommend-page">
        <PlaceSavingFeedback saving={saving} />
        {errorMessage && <div role="alert"><p>{errorMessage}</p><button type="button" onClick={listing.retry}>추천 다시 조회</button></div>}
        <section className="recommend-hero">
          <h1 className="recommend-title">
            {isSearchMode ? (
              <>
                <span className="accent">"{searchKeyword}"</span> 검색 결과
                <br />
                관련 장소를 찾아드릴게요.
              </>
            ) : (
              <>
                어떤 여행을 꿈꾸시나요?
                <br />
                <span className="accent">취향에 딱 맞는 장소</span>를
                찾아드릴게요.
              </>
            )}
          </h1>
        </section>

        {!isSearchMode && (
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
                <div className="theme-icon-wrap">
                  <img
                    src={theme.icon}
                    alt=""
                    className={`theme-icon ${
                      theme.tone === "light" ? "theme-icon--light" : ""
                    }`}
                  />
                </div>
                <span className="theme-label">{theme.label}</span>
              </button>
            ))}
          </section>
        )}

        <section className="recommend-section">
          <div className="recommend-section-header">
            <h2>
              {isSearchMode
                ? `"${searchKeyword}" 관련 장소`
                : "당신만을 위한 추천 장소"}
            </h2>
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
              <p>
                {isSearchMode
                  ? "검색 결과를 불러오는 중입니다."
                  : "추천 장소를 불러오는 중입니다."}
              </p>
            </div>
          ) : (
            <>
              {recommendedPlaces.length === 0 && !errorMessage ? (
                <div className="recommend-card-list">
                  <p
                    style={{
                      textAlign: "center",
                      color: "var(--color-text-muted)",
                      padding: "20px 0",
                    }}
                  >
                    {isSearchMode
                      ? `"${searchKeyword}" 관련 장소가 없습니다.`
                      : "해당 테마의 추천 장소가 아직 없습니다."}
                  </p>
                </div>
              ) : (
                <>
                  <div className="recommend-card-list">
                    {paginatedPlaces.map((place) => {
                      const saved =
                        isSaved(place.id);

                      return (
                        <article
                          key={place.id}
                          className="recommend-card"
                          onClick={() => handleDetailClick(place)}
                          onKeyDown={(e) => {
                            if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
                              e.preventDefault();
                              handleDetailClick(place);
                            }
                          }}
                          role="button"
                          tabIndex={0}
                        >
                          <div className="recommend-card-image-wrap">
                            <PlacePhoto place={place} src={place.image} alt={place.title} className="recommend-card-image"
                              credit={place.image === getPlacePhoto(place.title).image ? getPlacePhoto(place.title).credit : undefined} />

                            <button
                              type="button"
                              className="recommend-heart-btn"
                              onClick={(e) =>
                                handleToggleSaved(e, place, saved)
                              }
                              disabled={saving.blocked || saving.folders.status === "loading" || isSavingId === place.id}
                              aria-pressed={saved}
                              aria-label={saved ? "저장 취소" : "저장"}
                            >
                              <AnimatedHeart active={saved} />
                            </button>
                          </div>

                          <div className="recommend-card-body">
                            <div className="recommend-title-row">
                              <h3>{place.title}</h3>
                              {place.rating !== null && <div className="recommend-rating">
                                <span className="star">★</span>
                                <span>{place.rating}</span>
                              </div>}
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

      <PlaceSaveModal saving={saving} />
    </>
  );
}

export default Recommend;
