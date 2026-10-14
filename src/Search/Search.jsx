import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  clearRecentSearchesApi,
  deleteRecentSearchApi,
  getRecentSearchesApi,
  getPlacesApi,
  getRecommendationsApi,
} from "../api/placeApi";
import "./Search.css";
import PlacePhoto from "../components/PlacePhoto";
import useServerSearch from "./useServerSearch";
import useReadQuery from "../utils/useReadQuery";
import useMutationTask from "../utils/useMutationTask";
import useSessionKey from "../utils/useSessionKey";
import { getAuthSnapshot } from "../utils/authState";

import { getApiErrorMessage } from "../api/api";
import { getPageNumberGroup } from "../utils/pagination";
import { filterSearchPlaces, getSearchRegions, requireSearchPlaces, SEARCH_PAGE_SIZE } from "./searchCatalog";



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
    <rect
      x="4"
      y="5"
      width="4"
      height="14"
      rx="1.2"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    />
    <rect
      x="10"
      y="3"
      width="4"
      height="16"
      rx="1.2"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    />
    <rect
      x="16"
      y="8"
      width="4"
      height="11"
      rx="1.2"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    />
  </svg>
);

const IslandIcon = () => (
  <svg viewBox="0 0 24 24" className="svg-icon" aria-hidden="true">
    <path
      d="M4 17C6 13 8 10 12 10C16 10 18 13 20 17"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M12 10V6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M10 7.5L12 5L14 7.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M3 19H21"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const HarborIcon = () => (
  <svg viewBox="0 0 24 24" className="svg-icon" aria-hidden="true">
    <path
      d="M4 15H20L18 18H6L4 15Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <path
      d="M8 11L12 8L16 11"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M7 20C8 19 9 19 10 20C11 21 13 21 14 20C15 19 16 19 17 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const MountainIcon = () => (
  <svg viewBox="0 0 24 24" className="svg-icon" aria-hidden="true">
    <path
      d="M4 18L9 12L13 16L17 10L20 18H4Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
  </svg>
);

const TempleIcon = () => (
  <svg viewBox="0 0 24 24" className="svg-icon" aria-hidden="true">
    <path
      d="M4 18H20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M6 18V12H18V18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    />
    <path
      d="M4 12L12 7L20 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <path
      d="M9 18V14M15 18V14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const WavesIcon = () => (
  <svg viewBox="0 0 24 24" className="svg-icon" aria-hidden="true">
    <path
      d="M4 10C5.5 8.5 7 8.5 8.5 10C10 11.5 11.5 11.5 13 10C14.5 8.5 16 8.5 17.5 10C19 11.5 20 11.5 20 11.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M4 15C5.5 13.5 7 13.5 8.5 15C10 16.5 11.5 16.5 13 15C14.5 13.5 16 13.5 17.5 15C19 16.5 20 16.5 20 16.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const SunIcon = () => (
  <svg viewBox="0 0 24 24" className="svg-icon" aria-hidden="true">
    <circle
      cx="12"
      cy="12"
      r="4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    />
    <path
      d="M12 2V5M12 19V22M2 12H5M19 12H22M4.9 4.9L7 7M17 17L19.1 19.1M19.1 4.9L17 7M7 17L4.9 19.1"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

// Icons are display metadata, never a list of supported regions.
const iconsByRegion = new Map([
  ["서울", CityIcon], ["도쿄", CityIcon], ["홍콩", CityIcon], ["뉴욕", CityIcon], ["로스앤젤레스", CityIcon],
  ["제주", IslandIcon], ["부산", HarborIcon], ["마닐라", HarborIcon],
  ["경주", TempleIcon], ["오사카", TempleIcon], ["방콕", TempleIcon],
  ["치앙마이", MountainIcon], ["세부", WavesIcon], ["푸꾸옥", WavesIcon], ["다낭", SunIcon],
]);
const RegionIcon = () => <svg viewBox="0 0 24 24" className="svg-icon" aria-hidden="true">
  <path d="M12 21S5 14 5 9a7 7 0 0 1 14 0c0 5-7 12-7 12Z" fill="none" stroke="currentColor" strokeWidth="2" />
  <circle cx="12" cy="9" r="2" fill="none" stroke="currentColor" strokeWidth="2" />
</svg>;
const EMPTY_PLACES = [];

function Search() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const account = useSessionKey();
  const keywordFromUrl = (searchParams.get("keyword") || "").trim().replace(/\s+/g, " ");
  const regionName = searchParams.get("region") || "";
  const [query, setQuery] = useState(keywordFromUrl);
  const [inputError, setInputError] = useState("");
  const catalog = useReadQuery(account + ":search-catalog", async signal => requireSearchPlaces(await getPlacesApi({ signal })), true, () => getAuthSnapshot().accountKey === account);
  const places = catalog.data || EMPTY_PLACES;
  const regions = useMemo(() => getSearchRegions(places), [places]);
  const selectedRegion = regions.find(region => region.name === regionName);
  const unsupportedRegion = Boolean(catalog.data && regionName && !selectedRegion);
  const regionPlaces = useReadQuery(account + ":search-region:" + JSON.stringify(selectedRegion?.values || []), async signal => {
    const lists = await Promise.all(selectedRegion.values.map(async region => {
      const items = requireSearchPlaces(await getRecommendationsApi({ region }, { signal }));
      if (items.some(place => place.region !== region)) throw new Error("지역별 장소 응답을 확인할 수 없습니다.");
      return items;
    }));
    return [...new Map(lists.flat().map(place => [String(place.id), place])).values()];
  }, Boolean(selectedRegion), () => getAuthSnapshot().accountKey === account);
  const search = useServerSearch();
  const { submit: submitSearch, clear: clearSearch, status: searchStatus, revision: searchRevision } = search;
  const recent = useReadQuery(account + ":recent-searches", signal => getRecentSearchesApi({ signal }), true, () => getAuthSnapshot().accountKey === account);
  const recentSearches = (recent.data || []).slice(0, 10);
  const recentTask = useMutationTask(account + ":recent-searches");
  const retryRecents = recent.retry;
  useEffect(() => {
    if (!searchParams.has("country")) return;
    const params = new URLSearchParams(searchParams);
    params.delete("country");
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

  const selectionKey = JSON.stringify([account, regionName, keywordFromUrl]);
  const [pagination, setPagination] = useState({ key: selectionKey, page: 1 });
  const resultsHeading = useRef(null);
  const scrollRequested = useRef(false);
  const filtersReady = !regionName || Boolean(catalog.data);
  const resultSource = keywordFromUrl ? search : regionName ? regionPlaces : catalog;
  const resultStatus = unsupportedRegion ? "error" : !filtersReady ? catalog.status :
    keywordFromUrl && search.keyword !== keywordFromUrl ? "loading" : resultSource.status;
  const rawResults = keywordFromUrl ? search.items : resultSource.data || EMPTY_PLACES;
  const results = resultStatus === "success" ? filterSearchPlaces(rawResults, selectedRegion) : EMPTY_PLACES;
  const totalPages = Math.ceil(results.length / SEARCH_PAGE_SIZE);
  const currentPage = Math.max(1, Math.min(pagination.key === selectionKey ? pagination.page : 1, totalPages || 1));
  const pagePlaces = results.slice((currentPage - 1) * SEARCH_PAGE_SIZE, currentPage * SEARCH_PAGE_SIZE);
  useEffect(() => {
    if (!scrollRequested.current) return;
    scrollRequested.current = false;
    resultsHeading.current?.focus({ preventScroll: true });
    resultsHeading.current?.scrollIntoView?.({ behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  }, [currentPage, selectionKey]);

  const updateFilters = changes => {
    scrollRequested.current = false;
    const params = new URLSearchParams(searchParams);
    params.delete("country");
    for (const [key, value] of Object.entries(changes)) {
      if (!value) params.delete(key);
      else params.set(key, value);
    }
    setPagination({ key: "", page: 1 });
    setSearchParams(params);
  };
  const runSearch = value => {
    const keyword = String(value || "").trim().replace(/\s+/g, " ");
    setQuery(keyword);
    if (!keyword || keyword.length > 100) {
      setInputError(keyword ? "검색어는 100자 이하로 입력해주세요." : "검색어를 입력해주세요."); return;
    }
    setInputError(""); setPagination({ key: selectionKey, page: 1 });
    if (keyword === keywordFromUrl) void submitSearch(keyword);
    else updateFilters({ keyword });
  };
  const selectRegion = name => {
    setQuery(""); setInputError("");
    updateFilters({ region: name, keyword: "" });
  };
  const changePage = page => {
    if (page === currentPage || page < 1 || page > totalPages) return;
    scrollRequested.current = true; setPagination({ key: selectionKey, page });
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
  const handleResultClick = place => navigate("/detail?id=" + encodeURIComponent(place.id) + "&source=server-search", {
    state: { place: { ...place, placeId: place.id, originalId: place.id, title: place.name, desc: place.address }, source: "server-search" },
  });
  const resultsError = unsupportedRegion ? "선택한 지역의 등록된 장소를 확인할 수 없습니다. 다른 지역을 선택해주세요." :
    !filtersReady ? getApiErrorMessage(catalog.cause, "지역 정보를 불러오지 못했어요. 지역 목록을 다시 조회해주세요.") :
    keywordFromUrl ? search.error : getApiErrorMessage(resultSource.cause, "장소를 불러오지 못했어요. 다시 조회해주세요.");
  const retryResults = () => keywordFromUrl ? submitSearch(keywordFromUrl) : regionName ? regionPlaces.retry() : catalog.retry();
  const resultTitle = keywordFromUrl ? '"' + keywordFromUrl + '" 검색 결과' : regionName ? regionName + " 지역의 장소" : "장소 둘러보기";
  const locationState = location.state || {};
  const hasCoordinates = Number.isFinite(locationState.currentLocation?.lat) && Number.isFinite(locationState.currentLocation?.lng);

  return <div className="search-page">
    <section className="search-hero">
      <h1 className="search-title">어디로 떠나볼까요?</h1>
      <form className="search-input-wrap" onSubmit={event => { event.preventDefault(); runSearch(query); }}>
        <button type="submit" className="search-icon-submit" aria-label="검색" disabled={search.status === "loading" && query.trim() === search.keyword}><SearchIcon /></button>
        <input type="text" value={query} maxLength={100} onChange={event => { setQuery(event.target.value); setInputError(""); }}
          aria-label="장소, 도시 또는 테마 검색" aria-invalid={Boolean(inputError)} aria-describedby={inputError ? "search-input-error" : undefined} placeholder="장소, 도시 또는 테마 검색" />
      </form>
      {inputError && <p id="search-input-error" className="empty-text" role="alert">{inputError}</p>}
    </section>
    {locationState.mode === "nearby" && !keywordFromUrl && <section className="search-section"><h2>내 주변 탐색</h2><p className="empty-text">
      {hasCoordinates ? "주변 장소 조회는 아직 지원되지 않습니다. 검색어로 장소를 찾아주세요." : "위치 정보를 확인하지 못했어요. 홈에서 위치 권한을 확인해 주세요."}
    </p></section>}
    <section className="search-section">
      <div className="section-top"><h2>최근 검색어</h2><button type="button" className="clear-btn recent-clear-btn" onClick={() => void mutateRecent(null)} disabled={recentTask.blocked}>전체 삭제</button></div>
      {recent.status === "loading" && <p role="status">최근 검색어를 불러오는 중...</p>}
      {recent.status === "error" && <div role="alert"><p>최근 검색어를 불러오지 못했어요.</p><button type="button" className="clear-btn" onClick={recent.retry}>최근 검색어 다시 조회</button></div>}
      {recentTask.message && <p role="status">{recentTask.message}</p>}
      {["unknown", "refreshError"].includes(recentTask.status) && <button type="button" className="clear-btn" onClick={recentTask.retryRead}>삭제 결과 확인</button>}
      <div className="recent-tags">
        {recentSearches.map(item => <div className="recent-tag" key={item.id}>
          <button type="button" className="recent-search-action" onClick={() => runSearch(item.keyword)}>{item.keyword}</button>
          <button type="button" className="tag-close" aria-label={item.keyword + " 최근 검색어 삭제"} onClick={() => void mutateRecent(item.id)} disabled={recentTask.blocked}>×</button>
        </div>)}
        {recent.status === "success" && !recentSearches.length && <p className="empty-text">최근 검색어가 없어요.</p>}
      </div>
    </section>
    <section className="search-section" aria-labelledby="search-region-title">
      <div className="section-top"><h2 id="search-region-title">지역별 추천</h2>{regionName && <button type="button" className="clear-btn" onClick={() => updateFilters({ region: "" })}>전체 지역 보기</button>}</div>
      {catalog.status === "loading" && <p className="empty-text" role="status">등록된 지역을 확인하는 중...</p>}
      {catalog.status === "error" && <div className="empty-text" role="alert"><p>지역 목록을 불러오지 못했어요.</p><button type="button" className="clear-btn" onClick={catalog.retry}>지역 목록 다시 조회</button></div>}
      {catalog.status === "success" && !regions.length && <p className="empty-text">등록된 장소가 있는 지역이 없어요.</p>}
      <div className="region-grid">
        {regions.map(region => {
          const Icon = iconsByRegion.get(region.name) || RegionIcon;
          return <button type="button" key={region.name} className="region-card" aria-pressed={regionName === region.name} onClick={() => selectRegion(region.name)}>
            <div className="region-icon-box"><Icon /></div><span>{region.name}</span>
          </button>;
        })}
      </div>
    </section>
    <section className="search-section search-results-section" aria-labelledby="search-results-title" aria-live="polite">
      <h2 id="search-results-title" ref={resultsHeading} tabIndex={-1}>{resultTitle}</h2>
      {resultStatus === "loading" && <p className="empty-text" role="status">장소를 불러오는 중입니다...</p>}
      {resultStatus === "error" && <div className="empty-text" role="alert"><p>{resultsError}</p>
        {!unsupportedRegion && <button type="button" className="clear-btn" onClick={retryResults}>{keywordFromUrl ? "다시 검색" : "장소 다시 조회"}</button>}
        {unsupportedRegion && <button type="button" className="clear-btn" onClick={() => updateFilters({ region: "" })}>지역 선택 초기화</button>}
      </div>}
      {resultStatus === "success" && !results.length && <p className="empty-text">{keywordFromUrl ? "검색 결과가 없어요." : "등록된 장소가 없어요."}</p>}
      {resultStatus === "success" && results.length > 0 && <>
        <p className="search-page-summary" role="status">총 {results.length}개 · {currentPage}/{totalPages} 페이지</p>
        <div className="popular-grid search-results-grid">
          {pagePlaces.map(place => <article key={place.id} className="popular-card search-result-card">
            <div className="search-result-photo"><PlacePhoto place={place} alt={place.name} className="search-result-image" /></div>
            <div className="search-result-copy"><span className="search-result-region">{place.region || place.placeType || "장소"}</span><span className="popular-text">{place.name}</span>
              <span className="search-result-address">{place.address || "주소 정보 없음"}</span></div>
            <button type="button" className="place-photo-card-action" aria-label={`${place.region || place.placeType || "장소"} ${place.name} ${place.address || "주소 정보 없음"}`} onClick={() => handleResultClick(place)} />
          </article>)}
        </div>
        {totalPages > 1 && <nav className="search-pagination" aria-label="장소 목록 페이지">
          <div className="search-pagination-numbers">
            {getPageNumberGroup(currentPage, totalPages).map(page => <button type="button" key={page} aria-label={page + "페이지"} aria-current={page === currentPage ? "page" : undefined} onClick={() => changePage(page)}>{page}</button>)}
          </div>
          <div className="search-pagination-navigation">
            <button type="button" disabled={currentPage === 1} onClick={() => changePage(currentPage - 1)}>이전</button>
            <button type="button" disabled={currentPage === totalPages} onClick={() => changePage(currentPage + 1)}>다음</button>
          </div>
        </nav>}
      </>}
    </section>
  </div>;
}

export default Search;
