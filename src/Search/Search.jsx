import React, { useEffect, useState } from "react";
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

import PlacePhoto from "../components/PlacePhoto";
import { getPlacePhoto } from "../data/placePhotos";



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

const SeoulIcon = () => (
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

const JejuIcon = () => (
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

const BusanIcon = () => (
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

const GangwonIcon = () => (
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

const GyeongjuIcon = () => (
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

const YeosuIcon = () => (
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

const GeojeIcon = () => (
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

const regionItems = [
  { id: 1, name: "서울", Icon: SeoulIcon },
  { id: 2, name: "제주", Icon: JejuIcon },
  { id: 3, name: "부산", Icon: BusanIcon },
  { id: 4, name: "강원", Icon: GangwonIcon },
  { id: 5, name: "경주", Icon: GyeongjuIcon },
  { id: 6, name: "여수", Icon: YeosuIcon },
  { id: 7, name: "거제", Icon: GeojeIcon },
];

const popularKeywords = [
  "경주 불국사",
  "여수 밤바다",
  "남해 독일마을",
  "양양 서피비치",
  "안동 하회마을",
  "속초 중앙시장",
];

const hotPlaces = [
  {
    id: 1,
    title: "서울 시티 나이트 투어",
    subtitle: "화려한 도심의 야경을 한눈에",
    ...getPlacePhoto("서울 시티 나이트 투어"),
    badge: "TRENDING",
  },
  {
    id: 2,
    title: "제주 오설록",
    ...getPlacePhoto("제주 오설록"),
  },
  {
    id: 3,
    title: "부산 광안리",
    ...getPlacePhoto("부산 광안리"),
  },
];

function Search() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const account = useSessionKey();

  const keywordFromUrl = searchParams.get("keyword") || "";
  const locationState = location.state || {};

  const [query, setQuery] = useState(keywordFromUrl);
  const search = useServerSearch();
  const { submit: submitSearch, status: searchStatus, revision: searchRevision } = search;
  const searchedKeyword = search.keyword;
  const recent = useReadQuery(`${account}:recent-searches`, signal => getRecentSearchesApi({ signal }), true, () => getAuthSnapshot().accountKey === account);
  const recentSearches = (recent.data || []).slice(0, 10);
  const recentTask = useMutationTask(`${account}:recent-searches`);
  const retryRecents = recent.retry;
  useEffect(() => {
    const keyword = keywordFromUrl.trim().replace(/\s+/g, " ");
    setQuery(keyword);
    if (keyword) void submitSearch(keyword);
  }, [keywordFromUrl, submitSearch]);
  useEffect(() => {
    if (searchStatus === "success") void retryRecents();
  }, [searchStatus, searchRevision, retryRecents]);

  const runSearch = value => {
    const keyword = String(value || "").trim().replace(/\s+/g, " ");
    setQuery(keyword);
    if (!keyword || keyword.length > 100 || keyword === keywordFromUrl) { void search.submit(keyword); return; }
    setSearchParams({ keyword });
  };
  const handleSearchSubmit = event => { event.preventDefault(); runSearch(query); };
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
  const handleRemoveRecent = (event, item) => { event.stopPropagation(); void mutateRecent(item.id); };
  const handleClearRecent = () => { void mutateRecent(null); };

  const handleRegionClick = (name) => {
    runSearch(name);
  };

  const handleResultClick = (place) => {
    navigate(`/detail?id=${encodeURIComponent(place.id)}&source=server-search`, {
      state: { place: { ...place, placeId: place.id, originalId: place.id,
        title: place.name, desc: place.address }, source: "server-search" },
    });
  };

  const isNearbyMode = locationState.mode === "nearby";
  const coordinates = locationState.currentLocation;
  const hasCoordinates = Number.isFinite(coordinates?.lat) && Number.isFinite(coordinates?.lng);

  return (
    <div className="search-page">
      <section className="search-hero">
        <h1 className="search-title">어디로 떠나볼까요?</h1>

        <form className="search-input-wrap" onSubmit={handleSearchSubmit}>
          <button type="submit" className="search-icon-submit" aria-label="검색" disabled={search.status === "loading" && query.trim() === searchedKeyword}>
            <SearchIcon />
          </button>

          <input
            type="text"
            value={query}
            maxLength={100}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="장소, 도시 또는 테마 검색"
            placeholder="장소, 도시 또는 테마 검색"
          />
        </form>
      </section>

      {isNearbyMode && !searchedKeyword && (
        <section className="search-section">
          <h2>내 주변 탐색</h2>
          <p className="empty-text">
            {hasCoordinates ? `현재 위치: ${locationState.locationLabel || "위치 확인 완료"}. 주변 장소 조회는 아직 지원되지 않습니다. 검색어로 장소를 찾아주세요.` : "위치 정보를 확인하지 못했어요. 홈에서 위치 권한을 확인해 주세요."}
          </p>
        </section>
      )}

      {search.status !== "idle" && (
        <section className="search-section" aria-live="polite">
          <h2>{searchedKeyword ? `"${searchedKeyword}" 검색 결과` : "장소 검색"}</h2>
          {search.status === "loading" && <p className="empty-text" role="status">장소를 검색하는 중입니다...</p>}
          {search.status === "error" && <div className="empty-text" role="alert">
            <p>{search.error}</p>
            <button type="button" className="clear-btn" onClick={() => runSearch(query)}>다시 검색</button>
          </div>}
          {search.items.length > 0 ? (
            <div className="popular-grid">
              {search.items.map(place => (
                <button type="button" key={place.id} className="popular-card" onClick={() => handleResultClick(place)}>
                  <span className="popular-rank">{place.region || place.placeType || "장소"}</span>
                  <span className="popular-text">{place.name}</span>
                  <span className="search-result-address">{place.address || "주소 정보 없음"}</span>
                </button>
              ))}
            </div>
          ) : search.status === "success" && <p className="empty-text">검색 결과가 없어요.</p>}
        </section>
      )}
      <section className="search-section">
        <div className="section-top">
          <h2>최근 검색어</h2>

          <button
            type="button"
            className="clear-btn recent-clear-btn"
            onClick={handleClearRecent}
            disabled={recentTask.blocked}
          >
            전체 삭제
          </button>
        </div>

        {recent.status === "loading" && <p role="status">최근 검색어를 불러오는 중...</p>}
        {recent.status === "error" && <div role="alert"><p>최근 검색어를 불러오지 못했어요.</p><button type="button" className="clear-btn" onClick={recent.retry}>최근 검색어 다시 조회</button></div>}
        {recentTask.message && <p role="status">{recentTask.message}</p>}
        {["unknown", "refreshError"].includes(recentTask.status) && <button type="button" className="clear-btn" onClick={recentTask.retryRead}>삭제 결과 확인</button>}
        <div className="recent-tags">
          {recentSearches.map(item => <div className="recent-tag" key={item.id}>
            <button type="button" className="recent-search-action" onClick={() => runSearch(item.keyword)}>{item.keyword}</button>
            <button type="button" className="tag-close" aria-label={`${item.keyword} 최근 검색어 삭제`} onClick={event => handleRemoveRecent(event, item)} disabled={recentTask.blocked}>×</button>
          </div>)}
          {recent.status === "success" && !recentSearches.length && <p className="empty-text">최근 검색어가 없어요.</p>}
        </div>
      </section>

      <section className="search-section">
        <h2>인기 검색어</h2>

        <div className="popular-grid">
          {popularKeywords.map((keyword, index) => (
            <button
              type="button"
              key={keyword}
              className="popular-card"
              onClick={() => runSearch(keyword)}
            >
              <span className="popular-rank">{index + 1}</span>
              <span className="popular-text">{keyword}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="search-section">
        <h2>지역별 추천</h2>

        <div className="region-grid">
          {regionItems.map(({ id, name, Icon }) => (
            <button
              type="button"
              key={id}
              className="region-card"
              onClick={() => handleRegionClick(name)}
            >
              <div className="region-icon-box">
                <Icon />
              </div>

              <span>{name}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="search-section search-hot-section">
        <h2>지금 가장 핫한 곳</h2>

        <article
          className="hot-main-card"

        >
          <PlacePhoto src={hotPlaces[0].image} alt={hotPlaces[0].title} className="search-hot-main-photo" credit={hotPlaces[0].credit} />

          <div className="hot-main-overlay">
            <span className="hot-badge">{hotPlaces[0].badge}</span>
            <h3><button type="button" className="hot-place-action" onClick={() => runSearch(hotPlaces[0].title)}>{hotPlaces[0].title}</button></h3>
            <p>{hotPlaces[0].subtitle}</p>
          </div>
        </article>

        <div className="hot-sub-grid">
          {hotPlaces.slice(1).map((place) => (
            <article
              key={place.id}
              className="hot-sub-card"

            >
              <PlacePhoto src={place.image} alt={place.title} className="search-hot-sub-photo" credit={place.credit} />

              <div className="hot-sub-overlay">
                <h4><button type="button" className="hot-place-action" onClick={() => runSearch(place.title)}>{place.title}</button></h4>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

export default Search;
