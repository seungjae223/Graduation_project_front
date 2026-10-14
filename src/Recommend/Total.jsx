

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import AnimatedHeart from "../AnimatedHeart/AnimatedHeart";
import useReadQuery from "../utils/useReadQuery";
import useSessionKey from "../utils/useSessionKey";
import { getAuthSnapshot } from "../utils/authState";
import { requireList } from "../api/responseContract";
import { toApiTheme } from "../utils/placeTheme";
import usePlaceSaving from "../utils/usePlaceSaving";
import PlaceSavingFeedback, { PlaceSaveModal } from "../components/PlaceSavingFeedback";
import "./Total.css";
import api from "../api/api";
import PlacePhoto from "../components/PlacePhoto";
import { getPlacePhoto } from "../data/placePhotos";
import DistanceOriginPicker from "./DistanceOriginPicker";
import { fetchReviewRatings, formatDistance, readCoordinates, sortPlacesByDistance, sortPlacesByRating, validRating } from "./recommendationSort";

const RECOMMENDATIONS_API = "/api/recommendations";
const EMPTY_PLACES = [];
const ITEMS_PER_PAGE = 5;
const defaultSettings = scope => ({ scope, sortBy: "인기순", appliedSort: "인기순", currentPage: 1, reference: null, ratingsRequested: false });
const restoreSettings = (saved, scope) => {
  if (saved?.scope !== scope) return defaultSettings(scope);
  const sorts = ["인기순", "거리순", "별점순"];
  const reference = saved.reference?.type === "place" && Number.isSafeInteger(Number(saved.reference.placeId)) && Number(saved.reference.placeId) > 0
    ? { type: "place", placeId: String(saved.reference.placeId) }
    : saved.reference?.type === "current" && readCoordinates(saved.reference) ? { type: "current", ...readCoordinates(saved.reference) } : null;
  return { ...defaultSettings(scope), sortBy: sorts.includes(saved.sortBy) ? saved.sortBy : "인기순", appliedSort: sorts.includes(saved.appliedSort) ? saved.appliedSort : "인기순",
    currentPage: Number.isSafeInteger(saved.currentPage) && saved.currentPage > 0 ? saved.currentPage : 1, reference, ratingsRequested: Boolean(saved.ratingsRequested || saved.sortBy === "별점순") };
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

const normalizePlace = (place) => {
  const id = place.id || place.placeId || place.destinationId;
  const placeType =
    place.placeType ||
    place.category ||
    place.categoryName ||
    place.type ||
    "명소";

  return {
    id,
    title:
      place.title ||
      place.name ||
      place.placeName ||
      place.destinationName ||
      "장소 이름 없음",
    description: place.description || place.intro || place.summary || "",
    address:
      place.address ||
      place.roadAddress ||
      place.location ||
      place.addr ||
      "주소 정보 없음",
    latitude: readCoordinates(place)?.latitude ?? null,
    longitude: readCoordinates(place)?.longitude ?? null,
    region: String(place.region || ""),
    placeType,
    theme: place.theme || place.themeName || "",
    rating: validRating(place.rating ?? place.score ?? place.avgRating),
    image:
      place.image ||
      place.imageUrl ||
      place.thumbnail ||
      place.thumbnailUrl ||
      place.photoUrl ||
      "",
    tags: normalizeTags(place.tags || place.hashtags),
    originalData: place,
  };
};















function Total() {
  const navigate = useNavigate();
  const location = useLocation();
  const account = useSessionKey();
  const saving = usePlaceSaving();
  const { isSaved, isSavingId } = saving;
  const [searchParams] = useSearchParams();

  const selectedTheme = searchParams.get("theme") || "healing";
  const searchKeyword = (searchParams.get("keyword") || "").trim();
  const scope = `${account}:total:${searchKeyword ? "search:" + searchKeyword : "theme:" + selectedTheme}`;
  const [settings, setSettings] = useState(() => restoreSettings(location.state?.recommendationSort, scope));
  const currentSettings = settings.scope === scope ? settings : defaultSettings(scope);
  const { sortBy, appliedSort, currentPage: requestedPage, reference, ratingsRequested } = currentSettings;
  const updateSettings = useCallback(patch => setSettings(previous => ({ ...(previous.scope === scope ? previous : defaultSettings(scope)), ...patch })), [scope]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const distanceButton = useRef(null);
  const listing = useReadQuery(scope, async signal => {
    const response = await api.get(searchKeyword ? "/api/places/search" : RECOMMENDATIONS_API, { signal, params: searchKeyword ? { keyword: searchKeyword } : { theme: toApiTheme(selectedTheme) } });
    // The documented response is the complete array. Never label a partial page as globally sorted.
    if (!Array.isArray(response.data)) throw new Error("전체 장소 응답을 확인할 수 없습니다.");
    if (response.data.some(place => !Number.isSafeInteger(Number(place?.id)) || Number(place.id) <= 0) ||
      new Set(response.data.map(place => String(place.id))).size !== response.data.length) throw new Error("장소 ID를 확인할 수 없습니다.");
    return requireList(response.data).map(normalizePlace);
  }, true, () => getAuthSnapshot().accountKey === account);
  const places = listing.data || EMPTY_PLACES;
  const isLoading = listing.status === "loading" && !listing.data;
  const errorMessage = listing.status === "error" ? "장소 목록을 불러오지 못했어요." : "";

  const origin = useMemo(() => {
    if (reference?.type === "current" && readCoordinates(reference)) return { ...readCoordinates(reference), label: "현재 위치" };
    const place = reference?.type === "place" && places.find(place => String(place.id) === reference.placeId);
    return place && readCoordinates(place) ? { ...readCoordinates(place), label: place.title } : null;
  }, [reference, places]);
  const reviewRatings = useReadQuery(`${scope}:reviews:${places.map(place => place.id).join(",")}`, signal => fetchReviewRatings(places, async (id, signal) => {
    const response = await api.get(`/api/places/${encodeURIComponent(id)}/reviews`, { signal });
    return response.data;
  }, signal), ratingsRequested && places.length > 0, () => getAuthSnapshot().accountKey === account);
  useEffect(() => {
    if (sortBy === "별점순" && reviewRatings.status === "success" && appliedSort !== "별점순") updateSettings({ appliedSort: "별점순" });
  }, [sortBy, appliedSort, reviewRatings.status, updateSettings]);
  const sortedPlaces = useMemo(() => {
    if (sortBy === "별점순" && reviewRatings.data) return sortPlacesByRating(places, reviewRatings.data);
    if (appliedSort === "거리순" && origin) return sortPlacesByDistance(places, origin);
    if (appliedSort === "별점순" && reviewRatings.data) return sortPlacesByRating(places, reviewRatings.data);
    return [...places];
  }, [places, sortBy, appliedSort, origin, reviewRatings.data]);
  const totalPages = Math.max(1, Math.ceil(sortedPlaces.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(requestedPage, totalPages);
  const pagePlaces = sortedPlaces.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const firstPageNumber = Math.max(1, Math.min(currentPage - 1, totalPages - 2));
  const pageNumbers = Array.from({ length: Math.min(3, totalPages) }, (_, index) => firstPageNumber + index);
  useEffect(() => {
    if (listing.status === "success" && requestedPage > totalPages) updateSettings({ currentPage: totalPages });
  }, [listing.status, requestedPage, totalPages, updateSettings]);
  const persistedSettings = useMemo(() => ({ scope, sortBy, appliedSort, currentPage: requestedPage, reference, ratingsRequested }), [scope, sortBy, appliedSort, requestedPage, reference, ratingsRequested]);
  useEffect(() => {
    // Browser entry state restores sorting after detail/back; GPS never goes in a URL or API parameter.
    if (JSON.stringify(location.state?.recommendationSort) !== JSON.stringify(persistedSettings)) {
      navigate({ pathname: location.pathname, search: location.search }, { replace: true, state: { ...location.state, recommendationSort: persistedSettings } });
    }
  }, [location.pathname, location.search, location.state, navigate, persistedSettings]);
  const chooseSort = value => {
    if (value === "거리순" && !origin) { setPickerOpen(true); return; }
    updateSettings({ sortBy: value, currentPage: 1, ...(value === "별점순" ? { ratingsRequested: true, ...(reviewRatings.data ? { appliedSort: value } : {}) } : { appliedSort: value }) });
  };
  const closePicker = () => { setPickerOpen(false); distanceButton.current?.focus(); };
  const changePage = page => {
    if (page < 1 || page > totalPages) return;
    updateSettings({ currentPage: page });
  };

  const handleDetailClick = (place) => {
    navigate(`/detail?id=${place.id}`, {
      state: { place },
    });
  };

  const handleToggleSaved = saving.toggle;
  const themeLabel = { healing: "힐링", activity: "액티비티", food: "맛집 탐방", photo: "인스타 감성" }[selectedTheme] || selectedTheme;
  const pageTitle = searchKeyword ? `"${searchKeyword}" 검색 결과` : `${themeLabel} 추천 장소`;

  return (
    <>
      <div className="total-page">
      <PlaceSavingFeedback saving={saving} />
      {errorMessage && <div role="alert"><p>{errorMessage}</p><button type="button" onClick={listing.retry}>목록 다시 조회</button></div>}
      <section className="total-intro">
        <h1>{isLoading ? "추천 장소를 불러오는 중입니다." : pageTitle}</h1>
      </section>

      <div className="sort-chip-row">
        <button
          type="button"
          className={`sort-chip ${sortBy === "인기순" ? "active" : ""}`}
          onClick={() => chooseSort("인기순")}
          aria-pressed={sortBy === "인기순"}
        >
          인기순
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
        </button>

        <button
          type="button"
          className={`sort-chip ${sortBy === "거리순" ? "active" : ""}`}
          ref={distanceButton}
          onClick={() => chooseSort("거리순")}
          aria-pressed={sortBy === "거리순"}
          aria-expanded={pickerOpen}
          aria-controls={pickerOpen ? "total-origin-dialog" : undefined}
          aria-haspopup="dialog"
        >
          거리순
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
        </button>

        <button
          type="button"
          className={`sort-chip ${sortBy === "별점순" ? "active" : ""}`}
          onClick={() => chooseSort("별점순")}
          aria-pressed={sortBy === "별점순"}
        >
          별점순
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
        </button>
      </div>

      {pickerOpen && <DistanceOriginPicker key={scope} places={places} reference={reference} anchorRef={distanceButton} onCancel={closePicker} onChoose={reference => {
        updateSettings({ reference, sortBy: "거리순", appliedSort: "거리순", currentPage: 1 });
        closePicker();
      }} />}
      {!isLoading && !errorMessage && <div className="total-sort-summary">
        {sortBy === "거리순" ? <div className="total-distance-summary" aria-hidden={pickerOpen || undefined}>
          <p role="status">{origin ? `${origin.label} 기준 · 직선거리순` : "기준 장소를 다시 선택해 주세요."}</p>
          <button type="button" onClick={() => setPickerOpen(true)} aria-haspopup="dialog">변경</button>
        </div> : <p role="status">{sortBy === "별점순" ? reviewRatings.status === "loading" ? "리뷰 평점을 확인하는 중이에요. 현재 목록을 유지해요."
            : reviewRatings.data && Object.values(reviewRatings.data).some(value => value.rating !== null) ? "등록된 리뷰의 평점순"
              : reviewRatings.status === "error" ? "별점순을 확인하지 못해 이전 정렬을 유지하고 있어요." : "등록된 리뷰 평점이 없어 기본 순서로 표시해요."
          : "인기도 정보가 제공되지 않아 기본 조회 순서로 표시해요."}</p>}
        {sortBy === "별점순" && reviewRatings.status === "error" && <button type="button" onClick={reviewRatings.retry}>별점 다시 조회</button>}
        <p className="total-result-count">총 {sortedPlaces.length}개 · {currentPage}/{totalPages} 페이지</p>
      </div>}

      {!isLoading && !errorMessage && sortedPlaces.length === 0 && (
        <p
          style={{
            margin: "0 20px 14px",
            fontSize: "13px",
            color: "var(--color-text-muted)",
          }}
        >
          추천 장소가 없습니다.
        </p>
      )}

      <section className="theme-total-list">
        {pagePlaces.map((place) => {
          const saved =
            isSaved(place.id);

          return (
            <article key={place.id} className="theme-total-card">
              <div className="theme-total-image-wrap">
                <PlacePhoto place={place}
                  src={place.image}
                  alt={place.title}
                  className="theme-total-image"
                  credit={place.image === getPlacePhoto(place.title).image ? getPlacePhoto(place.title).credit : undefined}
                />

                <button
                  type="button"
                  className="theme-total-save-btn"
                  onClick={(event) => handleToggleSaved(event, place, saved)}
                  disabled={saving.blocked || saving.folders.status === "loading" || isSavingId === place.id}
                  aria-pressed={saved}
                  aria-label={saved ? "저장 취소" : "저장"}
                >
                  <AnimatedHeart active={saved} />
                </button>
              </div>

              <div className="theme-total-body">
                <div className="theme-total-title-row">
                  <h3>{place.title}</h3>
                  {place.rating !== null && <div className="theme-total-rating">
                    <span>★</span>
                    <span>{Number(place.rating.toFixed(1))}</span>
                  </div>}
                </div>

                <p className="theme-total-address">{place.address}</p>
                {sortBy === "거리순" && origin && <p className="total-place-distance">{place.distanceKm === null ? "거리 정보 없음" : `직선거리 ${formatDistance(place.distanceKm)}`}</p>}

                {place.tags.length > 0 && (
                  <div className="theme-total-tag-row">
                    {place.tags.map((tag) => (
                      <span key={tag} className="theme-total-tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

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
      {!isLoading && totalPages > 1 && <nav className="total-pagination" aria-label="추천 전체 목록 페이지">
        <button type="button" onClick={() => changePage(currentPage - 1)} disabled={currentPage === 1}>이전</button>
        {pageNumbers.map(page => <button type="button" key={page} onClick={() => changePage(page)} aria-label={`${page}페이지`} aria-current={page === currentPage ? "page" : undefined} className={page === currentPage ? "active" : ""}>{page}</button>)}
        <button type="button" onClick={() => changePage(currentPage + 1)} disabled={currentPage === totalPages}>다음</button>
      </nav>}
      </div>

      <PlaceSaveModal saving={saving} />
    </>
  );
}

export default Total;
