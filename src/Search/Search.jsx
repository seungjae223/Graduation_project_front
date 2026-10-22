import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  clearRecentSearchesApi,
  deleteRecentSearchApi,
  getRecentSearchesApi,
} from "../api/placeApi";
import "./Search.css";
import useServerSearch from "./useServerSearch";
import useReadQuery from "../utils/useReadQuery";
import useMutationTask from "../utils/useMutationTask";
import useSessionKey from "../utils/useSessionKey";
import { getAuthSnapshot } from "../utils/authState";
import usePlaceSaving from "../utils/usePlaceSaving";
import PlaceSavingFeedback, { PlaceSaveModal } from "../components/PlaceSavingFeedback";
import PlaceExploreCard from "../components/PlaceExploreCard";
import QuickTripAddModal from "../Destinations/QuickTripAddModal";
import { getDestinationsApi } from "../api/destinationApi";
import { getPlaceEngagementApi } from "../api/placeEngagementApi";
import { getDestinationHero } from "../Destinations/destinationHeroPhotos";
import { findDestinationSearchMatches, requireSearchDestinations } from "./destinationSearch";

import { getPageNumberGroup } from "../utils/pagination";
import { SEARCH_PAGE_SIZE } from "./searchCatalog";



const SearchIcon = () => (
  <svg viewBox="0 0 24 24" className="svg-icon" aria-hidden="true">
    <circle
      cx="11"
      cy="11"
      r="6.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    />
    <path
      d="M16 16L21 21"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const CityIcon = () => (
  <svg viewBox="0 0 24 24" className="svg-icon" aria-hidden="true">
    <path d="M4 20V8l6-3v15M10 20V3l10 3v14M3 20h18M14 10h2M14 14h2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
  </svg>
);

const EMPTY_PLACES = [];
const SEARCH_SORTS = ["default", "likes", "reviews"];
const SEARCH_SORT_NAMES = { default:"기본순", likes:"좋아요순", reviews:"리뷰순" };
function SearchSortIcon({ sort }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {sort === "default" && <path d="M4 6h16M4 12h12M4 18h8" />}
    {sort === "likes" && <path d="M20.8 4.8a5.3 5.3 0 0 0-7.5 0L12 6.1l-1.3-1.3a5.3 5.3 0 0 0-7.5 7.5L12 21l8.8-8.7a5.3 5.3 0 0 0 0-7.5Z" />}
    {sort === "reviews" && <path d="M20 11.5a8 8 0 0 1-8 8 9 9 0 0 1-3-.5L4 21l1.5-4.5a8 8 0 1 1 14.5-5Z" />}
  </svg>;
}

function Search() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const returnFolderId = searchParams.get("folderId");
  const canReturnToFolder = /^[1-9]\d*$/.test(returnFolderId || "");
  const account = useSessionKey();
  const saving = usePlaceSaving();
  const [quickAddPlace, setQuickAddPlace] = useState(null);
  const keywordFromUrl = (searchParams.get("keyword") || "").trim().replace(/\s+/g, " ");
  const requestedPage = Number(searchParams.get("page"));
  const requestedSort = searchParams.get("sort") || "default";
  const sort = SEARCH_SORTS.includes(requestedSort) ? requestedSort : "default";
  const nextSort = SEARCH_SORTS[(SEARCH_SORTS.indexOf(sort) + 1) % SEARCH_SORTS.length];
  const pageFromUrl = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const [query, setQuery] = useState(keywordFromUrl);
  const [inputError, setInputError] = useState("");
  const destinationCatalog = useReadQuery(account + ":search-destinations", async signal =>
    requireSearchDestinations(await getDestinationsApi({ signal })), true,
    () => getAuthSnapshot().accountKey === account);
  const matchedDestinations = useMemo(() =>
    findDestinationSearchMatches(destinationCatalog.data || [], keywordFromUrl),
    [destinationCatalog.data, keywordFromUrl]);
  const hasDestinationMatches = matchedDestinations.destinations.length > 0;
  const showPlaceResults = Boolean(keywordFromUrl) &&
    (destinationCatalog.status !== "loading" && !matchedDestinations.isCountrySearch);
  const search = useServerSearch();
  const { submit: submitSearch, clear: clearSearch, status: searchStatus, revision: searchRevision } = search;
  const recent = useReadQuery(account + ":recent-searches", signal => getRecentSearchesApi({ signal }), true, () => getAuthSnapshot().accountKey === account);
  const recentSearches = (recent.data || []).slice(0, 10);
  const recentTask = useMutationTask(account + ":recent-searches");
  const retryRecents = recent.retry;
  useEffect(() => {
    if (!searchParams.has("country") && !searchParams.has("region")) return;
    const params = new URLSearchParams(searchParams);
    if (!params.get("keyword") && params.get("region")) params.set("keyword", params.get("region"));
    params.delete("country");
    params.delete("region");
    params.delete("page");
    setSearchParams(params, { replace: true });
  }, [searchParams, setSearchParams]);
  useEffect(() => {
    setQuery(keywordFromUrl); setInputError("");
    if (keywordFromUrl) void submitSearch(keywordFromUrl);
    else clearSearch();
  }, [keywordFromUrl, submitSearch, clearSearch]);
  useEffect(() => {
    if (searchStatus === "success") void retryRecents();
  }, [searchStatus, searchRevision, retryRecents]);

  const resultsHeading = useRef(null);
  const scrollRequested = useRef(false);
  const resultsReady = keywordFromUrl && search.keyword === keywordFromUrl && search.status !== "loading";
  const resultStatus = !keywordFromUrl ? "idle" : !resultsReady ? "loading" : search.status;
  // A query change is an in-place update, not a new page: preserve completed
  // cards until the next response arrives. This also covers the render before
  // the URL-driven fetch effect runs.
  const previousKeyword = search.status === "success"
    ? search.keyword : (search.displayedKeyword || search.keyword);
  const showingPreviousResults = resultStatus === "loading" &&
    Boolean(previousKeyword) && (search.items || EMPTY_PLACES).length > 0;
  const displayedKeyword = showingPreviousResults ? previousKeyword : keywordFromUrl;
  const canShowCards = resultStatus === "success" || showingPreviousResults;
  const results = canShowCards ? search.items || EMPTY_PLACES : EMPTY_PLACES;
  // Sort the entire verified search set BEFORE pagination, not just the visible cards.
  const resultIds = results.map(place => place.id);
  const engagement = useReadQuery(`${account}:search-engagement:${resultIds.join(",")}`,
    signal => getPlaceEngagementApi(resultIds, { signal }),
    showPlaceResults && resultIds.length > 0,
    () => getAuthSnapshot().accountKey === account);
  const hasEngagement = Array.isArray(engagement.data);
  const engagementCounts = new Map((engagement.data || []).map(item => [Number(item.placeId), item]));
  const sortedResults = sort === "default" || !hasEngagement ? results : [...results].sort((a,b) => {
    const field = sort === "likes" ? "likeCount" : "reviewCount";
    return (engagementCounts.get(Number(b.id))?.[field] ?? -1) -
      (engagementCounts.get(Number(a.id))?.[field] ?? -1);
  });
  const totalPages = Math.ceil(sortedResults.length / SEARCH_PAGE_SIZE);
  const currentPage = Math.max(1, Math.min(pageFromUrl, totalPages || 1));
  const pagePlaces = sortedResults.slice((currentPage - 1) * SEARCH_PAGE_SIZE, currentPage * SEARCH_PAGE_SIZE);
  const sortingUnavailable = sort !== "default" && results.length > 0 && !hasEngagement;
  const likeCounts = new Map((engagement.data || []).map(item => [Number(item.placeId), item.likeCount]));
  useEffect(() => {
    if (saving.favoriteStatus === "success") void engagement.retry();
  }, [saving.favoriteStatus, engagement.retry]);

  // An entry's search query/page live in the URL. Scroll is saved only when
  // leaving for a detail/destination, and consumed after the results return.
  const returnKey = "nomango:search-return:" + account + ":" + location.key;
  const restoreScroll = useRef(null);
  const restoreKey = useRef(null);
  if (restoreKey.current !== returnKey) {
    restoreKey.current = returnKey;
    try {
      const raw = window.sessionStorage.getItem(returnKey);
      const value = raw ? JSON.parse(raw) : null;
      restoreScroll.current = typeof value?.scrollY === "number" && Number.isFinite(value.scrollY) && value.scrollY >= 0 ? value.scrollY : null;
    } catch { restoreScroll.current = null; }
  }
  const saveReturnPosition = () => {
    try {
      window.sessionStorage.setItem(returnKey, JSON.stringify({ scrollY: window.scrollY || document.documentElement.scrollTop || 0 }));
    } catch { /* Storage can be unavailable in private browsing. */ }
  };
  useEffect(() => {
    if (restoreScroll.current === null || destinationCatalog.status === "loading" ||
      (showPlaceResults && resultStatus === "loading")) return;
    const y = restoreScroll.current;
    const frame = window.requestAnimationFrame(() => {
      window.scrollTo(0, y);
      restoreScroll.current = null;
      try { window.sessionStorage.removeItem(returnKey); } catch { /* no storage */ }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [returnKey, destinationCatalog.status, showPlaceResults, resultStatus]);
  useEffect(() => {
    if (!scrollRequested.current || resultStatus !== "success") return;
    scrollRequested.current = false;
    resultsHeading.current?.focus({ preventScroll: true });
    resultsHeading.current?.scrollIntoView?.({ behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  }, [currentPage, resultStatus]);

  const updateFilters = changes => {
    scrollRequested.current = false;
    const params = new URLSearchParams(searchParams);
    params.delete("country");
    params.delete("region");
    params.delete("page");
    for (const [key, value] of Object.entries(changes)) {
      if (!value) params.delete(key);
      else params.set(key, value);
    }
    setSearchParams(params);
  };
  const runSearch = value => {
    const keyword = String(value || "").trim().replace(/\s+/g, " ");
    setQuery(keyword);
    if (!keyword || keyword.length > 100) {
      setInputError(keyword ? "검색어는 100자 이하로 입력해주세요." : "검색어를 입력해주세요."); return;
    }
    setInputError("");
    if (keyword === keywordFromUrl) {
      if (pageFromUrl !== 1) updateFilters({ keyword });
      else void submitSearch(keyword);
    } else updateFilters({ keyword });
  };
  const changePage = page => {
    if (page === currentPage || page < 1 || page > totalPages) return;
    scrollRequested.current = true;
    const params = new URLSearchParams(searchParams);
    if (page === 1) params.delete("page");
    else params.set("page", String(page));
    setSearchParams(params);
  };
  const mutateRecent = async id => {
    if (recentTask.blocked) return;
    await recentTask.run(
      () => id === null ? clearRecentSearchesApi() : deleteRecentSearchApi(id),
      async () => {
        const items = await recent.read();
        if (!Array.isArray(items)) throw new Error("최근 검색어 확인 실패");
        const confirmed = id === null ? items.length === 0 : !items.some(item => String(item.id) === String(id));
        if (!confirmed) throw new Error("삭제 결과를 확인하지 못했습니다.");
        return { confirmed: true };
      }, { failure: "최근 검색어를 삭제하지 못했어요. 목록은 유지됩니다.", success: "최근 검색어를 삭제했습니다.", refreshFailure: "삭제 요청 후 최신 목록을 확인하지 못했어요." }
    );
  };
  const handleResultClick = place => {
    saveReturnPosition();
    navigate("/detail?id=" + encodeURIComponent(place.id) + "&source=server-search", {
    state: { place: { ...place, placeId: place.id, originalId: place.id, title: place.name, desc: place.address }, source: "server-search" },
    });
  };
  const resultsError = search.error;
  const retryResults = () => submitSearch(keywordFromUrl);
  const resultTitle = '"' + displayedKeyword + (!showingPreviousResults && hasDestinationMatches ? '" 장소 검색 결과' : '" 검색 결과');

  return <div className="search-page">
    <PlaceSavingFeedback saving={saving} suppressFavoriteSuccess suppressFolderLoading />
    {canReturnToFolder && <div className="search-folder-return">
      <span>장소를 찾아 저장한 뒤 원래 폴더로 돌아갈 수 있어요.</span>
      <button type="button" onClick={() =>
        navigate(`/saved-places?folderId=${encodeURIComponent(returnFolderId)}`)}>
        폴더로 돌아가기 <span aria-hidden="true">→</span>
      </button>
    </div>}
    <section className="search-hero">
      <h1 className="search-title">무엇을 검색할까요?</h1>
      <form className="search-input-wrap" onSubmit={event => { event.preventDefault(); runSearch(query); }}>
        <button type="submit" className="search-icon-submit" aria-label="검색" disabled={search.status === "loading" && query.trim() === search.keyword}><SearchIcon /></button>
        <input type="text" value={query} maxLength={100} onChange={event => { setQuery(event.target.value); setInputError(""); }}
          aria-label="장소, 도시 또는 테마 검색" aria-invalid={Boolean(inputError)} aria-describedby={inputError ? "search-input-error" : undefined} placeholder="장소, 도시 또는 테마 검색" />
      </form>
      {inputError && <p id="search-input-error" className="empty-text" role="alert">{inputError}</p>}
    </section>
    <section className="search-section">
      <div className="section-top"><h2>최근 검색어</h2><button type="button" className="clear-btn recent-clear-btn" onClick={() => void mutateRecent(null)} disabled={recentTask.blocked}>전체 삭제</button></div>
      {recent.status === "loading" && recent.data === null && <p role="status">최근 검색어를 불러오는 중...</p>}
      {recent.status === "error" && <div role="alert"><p>최근 검색어를 불러오지 못했어요.</p><button type="button" className="clear-btn" onClick={recent.retry}>최근 검색어 다시 조회</button></div>}
      {recentTask.message && <p role="status">{recentTask.message}</p>}
      {["unknown", "refreshError"].includes(recentTask.status) && <button type="button" className="clear-btn" onClick={recentTask.retryRead}>삭제 결과 확인</button>}
      <div className="recent-tags">
        {recentSearches.map(item => <div className="recent-tag" key={item.id}>
          <button type="button" className="recent-search-action" onClick={() => runSearch(item.keyword)}>{item.keyword}</button>
          <button type="button" className="tag-close" aria-label={item.keyword + " 최근 검색어 삭제"} onClick={() => void mutateRecent(item.id)} disabled={recentTask.blocked}>×</button>
        </div>)}
        {recent.status !== "error" && recent.data !== null && !recentSearches.length && <p className="empty-text">최근 검색어가 없어요.</p>}
      </div>
    </section>
    {keywordFromUrl && (hasDestinationMatches || destinationCatalog.status === "loading" || destinationCatalog.status === "error") && <section className="search-section search-destinations-section" aria-labelledby="search-destinations-title">
      <h2 id="search-destinations-title">여행지 검색 결과</h2>
      {destinationCatalog.status === "loading" && <p className="empty-text" role="status">여행지를 검색하는 중이에요.</p>}
      {destinationCatalog.status === "error" && <div role="alert" className="empty-text">
        <p>여행지 검색 결과를 불러오지 못했어요. 장소 검색 결과는 계속 확인할 수 있어요.</p>
        <button type="button" className="clear-btn" onClick={destinationCatalog.retry}>여행지 다시 조회</button>
      </div>}
      {destinationCatalog.status === "success" && !hasDestinationMatches && <p className="empty-text">일치하는 여행지가 없어요.</p>}
      {destinationCatalog.status === "success" && hasDestinationMatches && <>
        {matchedDestinations.isCountrySearch && <p className="search-destinations-caption">{keywordFromUrl}에 등록된 여행지 {matchedDestinations.destinations.length}곳</p>}
        <div className="search-destination-list">
          {matchedDestinations.destinations.map(destination => {
            const hero = getDestinationHero(destination.code);
            return <article className="search-destination-card" key={destination.code}>
              <button type="button" className="search-destination-main" aria-label={`${destination.name} 여행지 보기`}
                onClick={() => { saveReturnPosition(); navigate(`/destinations/${encodeURIComponent(destination.code)}`, { state: { fromSearch: location.pathname + location.search } }); }}>
                <span className="search-destination-photo">
                  {hero ? <img src={hero.src} alt="" loading="lazy" /> : <span className="search-destination-fallback" aria-hidden="true"><CityIcon /></span>}
                </span>
                <span className="search-destination-info">
                  <span className="search-destination-type">여행지 · {destination.countryName}</span>
                  <strong>{destination.name}</strong>
                  <span className="search-destination-link">여행지 둘러보기 <span aria-hidden="true">→</span></span>
                </span>
              </button>
              {hero && <a className="search-destination-credit" href={hero.source} target="_blank" rel="noreferrer noopener"
                aria-label={`${destination.name} 대표 사진 출처: ${hero.author}, ${hero.license}`}>
                사진: {hero.author} · {hero.license}
              </a>}
            </article>;
          })}
        </div>
      </>}
    </section>}
    {showPlaceResults && !(hasDestinationMatches && resultStatus === "success" && !results.length) && <section className="search-section search-results-section" aria-labelledby="search-results-title" aria-live="polite" aria-busy={resultStatus === "loading"}>
      <h2 id="search-results-title" ref={resultsHeading} tabIndex={-1}>{resultTitle}</h2>
      {resultStatus === "loading" && <p className="empty-text" role="status">장소를 검색하는 중이에요...</p>}
      {resultStatus === "error" && <div className="empty-text" role="alert"><p>{resultsError}</p>
        <button type="button" className="clear-btn" onClick={retryResults}>다시 검색</button>
      </div>}
      {resultStatus === "success" && !results.length && !hasDestinationMatches && <p className="empty-text">검색 결과가 없어요.</p>}
      {canShowCards && results.length > 0 && <>
        <div className="search-results-toolbar">
          <p className="search-page-summary" role="status">총 {results.length}개 · {currentPage}/{totalPages} 페이지</p>
          <span className="search-sort-current" aria-live="polite">{SEARCH_SORT_NAMES[sort]}</span>
          <button type="button" className="search-sort-icon-button"
            aria-label={`${SEARCH_SORT_NAMES[sort]} 정렬, 누르면 ${SEARCH_SORT_NAMES[nextSort]}`}
            title={`${SEARCH_SORT_NAMES[sort]} · 다음: ${SEARCH_SORT_NAMES[nextSort]}`}
            onClick={()=>updateFilters({sort:nextSort==="default"?"":nextSort})}>
            <SearchSortIcon sort={sort} />
          </button>
        </div>
        {sortingUnavailable && engagement.status !== "error" &&
          <p role="status" className="search-sort-status">{SEARCH_SORT_NAMES[sort]} 정렬 중...</p>}
        {sortingUnavailable && engagement.status === "error" &&
          <div role="alert" className="search-sort-status">
            정렬 정보를 불러오지 못했어요.
            <button type="button" onClick={engagement.retry}>정렬 정보 다시 조회</button>
          </div>}
        {!sortingUnavailable && <ul className="search-results-list destination-place-grid">
          {pagePlaces.map(place => <li key={place.id}>
            <PlaceExploreCard place={place} saving={saving}
              likeCount={Array.isArray(engagement.data) ? likeCounts.get(Number(place.id)) : undefined}
              onDetail={handleResultClick} onSchedule={setQuickAddPlace} />
          </li>)}
        </ul>}
        {totalPages > 1 && !sortingUnavailable && !showingPreviousResults && <nav className="search-pagination" aria-label="장소 목록 페이지">
          <div className="search-pagination-numbers">
            {getPageNumberGroup(currentPage, totalPages).map(page => <button type="button" key={page} aria-label={page + "페이지"} aria-current={page === currentPage ? "page" : undefined} onClick={() => changePage(page)}>{page}</button>)}
          </div>
          <div className="search-pagination-navigation">
            <button type="button" disabled={currentPage === 1} onClick={() => changePage(currentPage - 1)}>이전</button>
            <button type="button" disabled={currentPage === totalPages} onClick={() => changePage(currentPage + 1)}>다음</button>
          </div>
        </nav>}
      </>}
    </section>}
    <PlaceSaveModal saving={saving} />
    <QuickTripAddModal place={quickAddPlace} onClose={() => setQuickAddPlace(null)} />
  </div>;
}

export default Search;
