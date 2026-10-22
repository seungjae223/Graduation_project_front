import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { getDestinationApi, getDestinationPlacesApi } from "../api/destinationApi";
import { getPlaceEngagementApi } from "../api/placeEngagementApi";
import { requireSearchPlaces } from "../Search/searchCatalog";
import { getPlaceCategoryLabel } from "../utils/placeCategory";
import { getDestinationHero } from "./destinationHeroPhotos";
import usePlaceSaving from "../utils/usePlaceSaving";
import { PlaceSaveModal } from "../components/PlaceSavingFeedback";
import PlaceExploreCard from "../components/PlaceExploreCard";
import QuickTripAddModal from "./QuickTripAddModal";
import useReadQuery from "../utils/useReadQuery";
import useSessionKey from "../utils/useSessionKey";
import { getAuthSnapshot } from "../utils/authState";
import "./DestinationExplore.css";

const CATEGORIES = ["LANDMARK", "CULTURE", "NATURE", "FOOD", "SHOPPING", "EXPERIENCE", "STAY"];
const PAGE_SIZE = 12;
const SORT_ORDER = ["default", "likes", "reviews"];
const SORT_LABELS = { default: "기본순", likes: "좋아요순", reviews: "리뷰순" };

function SortIcon({ sort }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {sort === "default" && <path d="M4 6h16M4 12h12M4 18h8" />}
    {sort === "likes" && <path d="M20.8 4.8a5.3 5.3 0 0 0-7.5 0L12 6.1l-1.3-1.3a5.3 5.3 0 0 0-7.5 7.5L12 21l8.8-8.7a5.3 5.3 0 0 0 0-7.5Z" />}
    {sort === "reviews" && <path d="M20 11.5a8 8 0 0 1-8 8 9 9 0 0 1-3-.5L4 21l1.5-4.5a8 8 0 1 1 14.5-5Z" />}
  </svg>;
}
const VALID_CODE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function ExploreContent({ destination, places }) {
  const navigate = useNavigate();
  const location = useLocation();
  const saving = usePlaceSaving();
  const [params, setParams] = useSearchParams();
  const category = params.get("category") || "ALL";
  const keyword = params.get("q") || "";
  const requestedSort = params.get("sort") || "default";
  const sort = SORT_ORDER.includes(requestedSort) ? requestedSort : "default";
  const engagementKey = places.map(place => place.id).join(",");
  const engagement = useReadQuery(`destination:${destination.code}:engagement:${engagementKey}`,
    signal => getPlaceEngagementApi(places.map(place => place.id), { signal }),
    places.length > 0);
  useEffect(() => {
    if (saving.favoriteStatus === "success") void engagement.retry();
  }, [saving.favoriteStatus, engagement.retry]);
  const requestedCount = Number(params.get("shown"));
  const visibleCount = Number.isSafeInteger(requestedCount) && requestedCount > PAGE_SIZE
    ? Math.ceil(Math.min(requestedCount, 10000) / PAGE_SIZE) * PAGE_SIZE : PAGE_SIZE;
  const scrollKey = "nomango:destination-return:" + location.key;
  useEffect(() => {
    let y;
    try {
      const value = sessionStorage.getItem(scrollKey);
      y = value === null ? null : Number(value);
    } catch { y = null; }
    if (y === null || !Number.isFinite(y) || y < 0 ||
        (sort !== "default" && !Array.isArray(engagement.data))) return;
    // StrictMode re-runs effects: a ref flag here would cancel the first frame
    // without scheduling another. Restore after data is rendered, across two paints.
    let frame;
    let attempts = 0;
    const restore = () => {
      window.scrollTo(0, y);
      if (++attempts < 2) frame = window.requestAnimationFrame(restore);
      else {
        try { sessionStorage.removeItem(scrollKey); } catch { /* Storage unavailable */ }
      }
    };
    frame = window.requestAnimationFrame(restore);
    return () => window.cancelAnimationFrame(frame);
  }, [scrollKey, sort, engagement.data, engagement.status]);
  const rememberScroll = () => {
    try { sessionStorage.setItem(scrollKey, String(window.scrollY || document.documentElement.scrollTop || 0)); }
    catch { /* Storage unavailable */ }
  };
  const setFilters = (changes) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value == null || value === "" || value === "ALL" || (key === "shown" && Number(value) <= PAGE_SIZE)) next.delete(key);
      else next.set(key, String(value));
    }
    setParams(next, { replace: true });
  };
  const [heroFailed, setHeroFailed] = useState(false);
  const [quickAddPlace, setQuickAddPlace] = useState(null);
  const hero = getDestinationHero(destination.code);
  const availableCategories = CATEGORIES.filter(key => places.some(place => place.placeCategory === key));
  const selectedCategory = availableCategories.includes(category) ? category : "ALL";
  const searchText = keyword.trim().toLocaleLowerCase();
  const filtered = places.filter(place =>
    (selectedCategory === "ALL" || place.placeCategory === selectedCategory) &&
    (!searchText || [place.name, place.address].some(value =>
      String(value || "").toLocaleLowerCase().includes(searchText)))
  );
  // Sort all matching cards before applying pagination; never fake aggregate sorting.
  const counts = new Map((engagement.data || []).map(item => [Number(item.placeId), item]));
  // useReadQuery retains the last verified data while an engagement refresh is loading.
  // Keep rendered cards and their category labels stable during favorite mutations.
  const hasEngagementData = Array.isArray(engagement.data);
  const sorted = sort === "default" || !hasEngagementData
    ? filtered : [...filtered].sort((a, b) => {
      const field = sort === "likes" ? "likeCount" : "reviewCount";
      return (counts.get(Number(b.id))?.[field] ?? 0) - (counts.get(Number(a.id))?.[field] ?? 0);
    });
  const shown = sorted.slice(0, visibleCount);
  const sortingPending = sort !== "default" && places.length > 0 && !hasEngagementData && engagement.status === "loading";
  const sortingFailed = sort !== "default" && places.length > 0 && !hasEngagementData && engagement.status === "error";
  const nextSort = SORT_ORDER[(SORT_ORDER.indexOf(sort) + 1) % SORT_ORDER.length];
  const selectCategory = next => setFilters({ category: next, shown: null });
  const cycleSort = () => setFilters({ sort: nextSort === "default" ? null : nextSort, shown: null });
  const changeKeyword = value => setFilters({ q: value, shown: null });
  const resetFilters = () => setFilters({ category: null, q: null, shown: null });
  const openDetail = place => {
    rememberScroll();
    navigate(`/detail?id=${encodeURIComponent(place.id)}&source=destination`,
      { state: { place, source: "destination" } });
  };

  return <>
    <header className="destination-explore-hero">
      <div className="destination-hero-media">
        {hero && !heroFailed && <img src={hero.src} alt={`${destination.name} 도시 전경`}
          loading="eager" decoding="async" onError={() => setHeroFailed(true)} />}
      </div>
      <div className="destination-hero-copy">
        <p className="destination-explore-country">{destination.countryName}</p>
        <h1>{destination.name}</h1>
        <p>어디부터 둘러볼까요?</p>
      </div>
      {hero && !heroFailed && <a className="destination-hero-credit" href={hero.source}
        target="_blank" rel="noreferrer noopener" title={`${hero.author} · ${hero.license} (가로 크롭 표시)`}>
        사진: {hero.author} · {hero.license}
      </a>}
    </header>

    <section className="destination-explore-section destination-discovery" aria-label="여행지 장소 찾기">
      <label className="destination-place-search">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="m15.5 15.5 5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <span className="destination-visually-hidden">이 여행지 안에서 장소 찾기</span>
        <input type="search" value={keyword} onChange={event => changeKeyword(event.target.value)}
          placeholder={`${destination.name}에서 장소 이름 또는 주소 검색`} maxLength={100} />
      </label>
      <div className="destination-category-chips" role="group" aria-label="장소 카테고리">
        <button type="button" aria-pressed={selectedCategory === "ALL"} onClick={() => selectCategory("ALL")}>전체</button>
        {availableCategories.map(key => <button type="button" key={key} aria-pressed={selectedCategory === key}
          onClick={() => selectCategory(key)}>{getPlaceCategoryLabel(key)}</button>)}
      </div>
    </section>

    <section className="destination-explore-section destination-results" aria-label="장소 탐색 결과">
      {["error", "unknown", "refreshError"].includes(saving.favoriteStatus) && <div role="alert">
        <p>{saving.favoriteMessage}</p>
        {["unknown", "refreshError"].includes(saving.favoriteStatus) &&
          <button type="button" onClick={saving.retryFavoriteRead}>좋아요 상태 다시 확인</button>}
      </div>}
      <div className="destination-results-toolbar">
        {(keyword.trim() || selectedCategory !== "ALL") &&
          <p className="destination-result-summary" role="status">검색 결과 {filtered.length}곳</p>}
        <button type="button" className="destination-sort-button" onClick={cycleSort}
          aria-label={`${SORT_LABELS[sort]} 정렬, 누르면 ${SORT_LABELS[nextSort]}`}
          title={`다음 정렬: ${SORT_LABELS[nextSort]}`}>
          <SortIcon sort={sort} /><span>{SORT_LABELS[sort]}</span>
        </button>
      </div>
      {sortingPending && <p className="destination-sort-status" role="status">{SORT_LABELS[sort]} 정렬 중...</p>}
      {sortingFailed && <div className="destination-sort-status" role="alert">
        정렬 정보를 불러오지 못했어요. <button type="button" onClick={engagement.retry}>다시 조회</button>
      </div>}
      {!sortingPending && !sortingFailed && (filtered.length === 0 ? <div className="destination-explore-empty">
        <p>{places.length === 0 ? "등록된 장소가 없습니다." : "조건에 맞는 장소가 없어요."}</p>
        {(keyword || selectedCategory !== "ALL") && <button type="button" onClick={resetFilters}>조건 초기화</button>}
      </div> : <ul className="destination-place-grid">{shown.map(place => <li key={place.id}>
        <PlaceExploreCard place={place} saving={saving} onDetail={openDetail} onSchedule={setQuickAddPlace}
          likeCount={hasEngagementData ? counts.get(Number(place.id))?.likeCount : undefined} />
      </li>)}</ul>)}
      {!sortingPending && !sortingFailed && filtered.length > visibleCount && <button type="button" className="destination-load-more"
        onClick={() => setFilters({ shown: visibleCount + PAGE_SIZE })}>
        장소 더 보기 ({Math.min(visibleCount, filtered.length)}/{filtered.length})
      </button>}
    </section>
    <PlaceSaveModal saving={saving} />
    <QuickTripAddModal place={quickAddPlace} onClose={() => setQuickAddPlace(null)} />
  </>;
}

export default function DestinationExplore() {
  const { code = "" } = useParams();
  const account = useSessionKey();
  const validCode = VALID_CODE.test(code);
  const destinationQuery = useReadQuery(`${account}:destination:${code}`, async signal => {
    const [destination, response] = await Promise.all([
      getDestinationApi(code, { signal }),
      getDestinationPlacesApi(code, { signal }),
    ]);
    const places = requireSearchPlaces(response);
    if (!destination || destination.code !== code || typeof destination.name !== "string" || !destination.name.trim() ||
        typeof destination.countryName !== "string" || !["DOMESTIC", "OVERSEAS"].includes(destination.scope) ||
        places.some(place => place.region !== destination.name)) {
      throw new Error("여행지와 장소 응답의 연결을 확인할 수 없습니다.");
    }
    return { destination, places };
  }, validCode, () => getAuthSnapshot().accountKey === account);
  const { status, data, retry } = destinationQuery;

  return <div className="destination-explore-page">
    {!validCode && <p role="alert">올바르지 않은 여행지 주소입니다.</p>}
    {validCode && status === "loading" && <p role="status">여행지 정보를 불러오는 중...</p>}
    {validCode && status === "error" && <div role="alert">
      <p>여행지 정보를 확인하지 못했어요. 다시 시도해 주세요.</p>
      <button type="button" onClick={retry}>다시 조회</button>
    </div>}
    {validCode && status === "success" && data && <ExploreContent key={code} destination={data.destination} places={data.places} />}
  </div>;
}
