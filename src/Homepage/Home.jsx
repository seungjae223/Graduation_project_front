import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Home.css";

import searchIcon from "../img/검색.png";
import { getTripsApi } from "../api/tripApi";
import { getHomeRankingsApi } from "../api/homeRankingsApi";
import { getDestinationHero } from "../Destinations/destinationHeroPhotos";
import PlacePhoto from "../components/PlacePhoto";
import { withPlaceImage } from "../utils/placeImageResolver";
import useReadQuery from "../utils/useReadQuery";
import useSessionKey from "../utils/useSessionKey";
import { getAuthSnapshot } from "../utils/authState";
import useHomeCarousel from "./useHomeCarousel";
import { previewCities, previewHotPlaces } from "./homePreviewData";

// Inline SVG keeps the two primary actions clear without additional assets.
function CompassIcon() {
  return <svg className="home-quick-symbol" width="27" height="27" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="m15.9 8.1-2.2 5.6-5.6 2.2 2.2-5.6 5.6-2.2Z" />
  </svg>;
}

function CalendarPlusIcon() {
  return <svg className="home-quick-symbol" width="27" height="27" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M7 3v4M17 3v4M3 10h18M12 13v5M9.5 15.5h5" />
  </svg>;
}

function RailScrollbar({ carousel, label, count }) {
  if (count <= 1) return null;
  return <div className="home-rail-slider">
    <input type="range" min="0" max="100" step="1" value={carousel.progress}
      aria-label={label} onChange={event => carousel.setProgress(Number(event.target.value))}
      onPointerDown={carousel.beginScrub} onPointerUp={carousel.endScrub}
      onPointerCancel={carousel.endScrub} onBlur={carousel.endScrub}
      onKeyDown={carousel.pauseAutoplay} />
  </div>;
}

const toDate = value => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))
  ? new Date(`${value}T00:00:00`) : null;
const displayDate = date => date ? String(date).slice(5).replace("-", ".") : "미정";
const upcomingTrips = (trips, now = new Date()) => {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return trips.filter(trip => {
    const end = toDate(trip.endDate);
    // Unknown end dates are not proof that a trip is over.
    return !end || end >= today;
  });
};
const tripSort = (a, b) => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tier = trip => {
    const end = toDate(trip.endDate);
    if (end && end < today) return 2;
    return toDate(trip.startDate) ? 0 : 1;
  };
  const difference = tier(a) - tier(b);
  if (difference) return difference;
  const aDate = toDate(a.startDate), bDate = toDate(b.startDate);
  if (aDate && bDate) return aDate - bDate;
  // Trip does not supply a last-edited timestamp; use stable ID order instead.
  return Number(b.id) - Number(a.id);
};

function TripSection({ trips, status, retry, isSignedIn }) {
  const slides = useHomeCarousel(trips.length);
  const navigate = useNavigate();
  if (status === "loading") return <section className="home-trip-section" aria-label="내 여행">
    <div className="home-section-heading"><h2>내 여행 불러오는 중...</h2></div>
  </section>;
  if (status === "error" && isSignedIn) return <section className="home-trip-section">
    <h2>이어서 계획하기</h2><p>일정 목록을 불러오지 못했어요.</p>
    <button type="button" className="home-text-action" onClick={retry}>다시 불러오기</button>
  </section>;
  if (!trips.length) return <section className="home-trip-section" aria-labelledby="home-trip-title">
    <div className="home-trip-empty home-ticket">
      <div className="home-ticket-main">
        <div className="home-ticket-topline"><span className="home-trip-kicker">MY NEXT TRIP</span><span className="home-ticket-symbol" aria-hidden="true">✈</span></div>
        <h2 id="home-trip-title">첫 여행 계획을 시작해 볼까요?</h2>
        <p>가고 싶은 도시와 날짜를 정하고 나만의 여행 일정을 만들어 보세요.</p>
        <div className="home-ticket-route" aria-hidden="true"><span>나의 출발</span><span className="home-ticket-flight-line">✈</span><span>새로운 여행</span></div>
      </div>
      <div className="home-ticket-perforation" aria-hidden="true" />
      <div className="home-ticket-bottom"><span className="home-ticket-bottom-label">YOUR NEXT JOURNEY</span>
        <button type="button" className="home-primary-action" onClick={() => navigate("/route-create")}>여행 계획 시작하기 <span aria-hidden="true">→</span></button>
      </div>
    </div>
  </section>;
  return <section className="home-trip-section" aria-labelledby="home-trip-title">
    <div className="home-v12-heading">
      <div><p className="home-v12-eyebrow">MY TRIPS</p><h2 id="home-trip-title">이어서 계획하기</h2></div>
      <Link to="/schedule" className="home-text-action">전체 일정</Link>
    </div>
    <div className="home-rail-wrap"><div className={`home-v12-rail home-trip-rail ${trips.length === 1 ? "home-single-rail" : ""}`}
      aria-label="내 여행 일정 목록" {...slides.railProps}>
      {trips.map(trip => <article className="home-trip-card home-boarding-pass-shadow" key={trip.id}>
        <div className="home-boarding-pass home-boarding-pass-shape">
        <div className="home-pass-main">
          <div className="home-ticket-topline"><span className="home-trip-kicker">BOARDING PASS</span><span className="home-ticket-symbol" aria-hidden="true">✈</span></div>
          <div className="home-trip-info"><span className="home-trip-destination">{trip.destination || "여행지 미정"}</span>
            <h3>{trip.title}</h3>
            <p>{displayDate(trip.startDate)} ~ {displayDate(trip.endDate)}</p></div>
        </div>
        <div className="home-ticket-perforation" aria-hidden="true" />
        <div className="home-pass-bottom"><span className="home-ticket-bottom-label">MY TRAVEL PLAN</span>
          <Link className="home-trip-continue" to={`/route-result?id=${encodeURIComponent(trip.id)}`}
            state={{ routeId: trip.id, tripId: trip.id, scheduleId: trip.id }}>계속하기</Link></div>
        </div>
      </article>)}
    </div><RailScrollbar carousel={slides} count={trips.length} label="내 여행 목록 가로 이동" /></div>
  </section>;
}

function CityTile({ city, rank }) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const photo = getDestinationHero(city.code) || city.previewPhoto;
  return <article className={`home-city-tile ${city.isPreview ? "home-city-demo-tile" : ""}`}>
    <Link to={`/destinations/${encodeURIComponent(city.code)}`} className="home-city-link"
      aria-label={`${rank}위 ${city.name} 여행지`}>
      <div className="home-city-photo">
        {photo?.src && !photoFailed ? <img src={photo.src} alt="" loading="lazy" decoding="async"
          onError={() => setPhotoFailed(true)} /> : <span aria-hidden="true">{city.name.slice(0, 1)}</span>}
        <span className="home-rank-badge">{rank}위</span>
      </div>
      <strong>{city.name}</strong>
      <small>{city.countryName}</small>
    </Link>
    {photo?.src && !photoFailed && <a className="home-city-credit" href={photo.source}
      target="_blank" rel="noopener noreferrer" aria-label={`${city.name} 사진 출처`}>사진 출처</a>}
  </article>;
}

function CityRanking({ cities = [], status, retry, forceDemo = false }) {
  // Preserve genuine API ordering. Fill spare visual slots with editorial city suggestions,
  // never add their example counts to API rankings or claim the suggestions are measured popularity.
  const samples = forceDemo || status !== "loading"
    ? previewCities.filter(sample => !cities.some(city => city.code === sample.code))
        .slice(0, forceDemo ? 10 : Math.max(0, 10 - cities.length)) : [];
  const visibleCities = forceDemo ? previewCities : [...cities, ...samples];
  const hasSamples = visibleCities.some(city => city.isPreview);
  const carousel = useHomeCarousel(visibleCities.length);
  return <section className="home-rank-section" aria-labelledby="home-city-ranking-title">
    <div className="home-v12-heading"><div><p className="home-v12-eyebrow">CITY RANKING</p>
      <h2 id="home-city-ranking-title">{hasSamples ? "여행 도시 TOP 10" : "인기 여행 도시 TOP 10"}</h2></div>
      {status === "error" && <button type="button" className="home-text-action" onClick={retry}>다시 조회</button>}</div>
    {status === "loading" && <p className="home-rank-empty" role="status">도시 순위를 불러오는 중...</p>}
    {visibleCities.length > 0 && <div className="home-rail-wrap">
      <div className="home-v12-rail home-city-rail" aria-label="인기 도시 순위 가로 스크롤" {...carousel.railProps}>
        {visibleCities.map((city, index) => <CityTile city={city} rank={index + 1} key={city.code} />)}
      </div><RailScrollbar carousel={carousel} count={visibleCities.length} label="인기 도시 가로 이동" />
    </div>}
  </section>;
}

function HotPlaceTile({ item, rank, duplicate = false }) {
  const navigate = useNavigate();
  const isPreview = Boolean(item.isPreview);
  const place = isPreview ? item : withPlaceImage({ ...item, id: item.placeId });
  return <article className={`home-hot-card ${isPreview ? "home-hot-demo-card" : ""}`} aria-hidden={duplicate ? true : undefined} inert={duplicate ? true : undefined}>
    <PlacePhoto place={place} src={place.imageUrl} alt={item.name} className="home-hot-photo" />
    <div className="home-hot-shade" aria-hidden="true" />
    <div className="home-hot-caption"><span>{item.region || "여행 장소"}</span><strong>{item.name}</strong>
      {!isPreview && Number.isSafeInteger(item.engagementCount) &&
        <small className="home-hot-count" aria-label={`최근 30일 좋아요 ${item.likeCount}개, 리뷰 ${item.reviewCount}개`}>
          30일 활동 {item.engagementCount} · 좋아요 {item.likeCount} / 리뷰 {item.reviewCount}
        </small>}
    </div>
    <button className="home-hot-open" type="button" tabIndex={duplicate ? -1 : 0}
      aria-label={`${rank}위 ${item.name} ${isPreview ? "검색 결과 보기" : "상세 보기"}`}
      onClick={() => navigate(isPreview
        ? `/search?keyword=${encodeURIComponent(item.name)}`
        : `/detail?id=${encodeURIComponent(item.placeId)}&source=home`)} />
    {isPreview && item.previewPhotoSource && <a className="home-hot-demo-credit" href={item.previewPhotoSource}
      target="_blank" rel="noopener noreferrer" tabIndex={duplicate ? -1 : 0} aria-label={`${item.name} 예시 사진 출처`}>사진 출처</a>}
  </article>;
}

function HotPlaceRanking({ places = [], status, retry, forceDemo = false }) {
  const samples = forceDemo || status !== "loading"
    ? previewHotPlaces.filter(sample => !places.some(place =>
        place.name === sample.name && place.region === sample.region))
        .slice(0, forceDemo ? 7 : Math.max(0, 7 - places.length)) : [];
  const visiblePlaces = forceDemo ? previewHotPlaces : [...places, ...samples];
  const hasSamples = visiblePlaces.some(place => place.isPreview);
  const carousel = useHomeCarousel(visiblePlaces.length, { loop: true, auto: true });
  const isLoop = visiblePlaces.length > 1;
  const repeated = isLoop ? [...visiblePlaces, ...visiblePlaces, ...visiblePlaces] : visiblePlaces;
  return <section className="home-rank-section home-hot-section" aria-labelledby="home-hot-ranking-title">
    <div className="home-v12-heading"><div><p className="home-v12-eyebrow">TRENDING NOW</p>
      <h2 id="home-hot-ranking-title">{hasSamples ? "지금 가볼 만한 장소" : "지금 뜨는 핫한 장소"}</h2></div>
      {status === "error" && <button type="button" className="home-text-action" onClick={retry}>다시 조회</button>}</div>
    {status === "loading" && <p className="home-rank-empty" role="status">인기 장소를 불러오는 중...</p>}
    {visiblePlaces.length > 0 && <div className="home-rail-wrap">
      <div className={`home-v12-rail home-hot-rail ${isLoop ? "home-hot-loop" : "home-single-rail"}`}
        aria-label="최근 인기 장소 자동 순환 가로 스크롤" {...carousel.railProps}>
        {repeated.map((place, index) => <HotPlaceTile key={`${index}-${place.placeId}`}
          item={place} rank={index % visiblePlaces.length + 1}
          duplicate={isLoop && (index < visiblePlaces.length || index >= visiblePlaces.length * 2)} />)}
      </div><RailScrollbar carousel={carousel} count={visiblePlaces.length} label="지금 뜨는 장소 가로 이동" />
    </div>}
  </section>;
}

export default function Home() {
  const navigate = useNavigate();
  const account = useSessionKey();
  const authenticated = account !== "anonymous";
  const tripsQuery = useReadQuery(`${account}:home-trips`, signal => getTripsApi({ signal }), authenticated,
    () => getAuthSnapshot().accountKey === account);
  const rankingsQuery = useReadQuery("home-public-rankings", signal => getHomeRankingsApi({ signal }));
  const trips = upcomingTrips(tripsQuery.data || []).sort(tripSort);
  // Explicit opt-in, development-only previews never alter real activity data.
  const rankingsDemo = process.env.NODE_ENV === "development" &&
    process.env.REACT_APP_RANKINGS_DEMO === "true";
  const rankData = rankingsDemo ? { cities: [], hotPlaces: [] } :
    rankingsQuery.data || { cities: [], hotPlaces: [] };
  const rankingStatus = rankingsDemo ? "success" : rankingsQuery.status;
  const [keyword, setKeyword] = useState("");

  const handleSearchSubmit = event => {
    event.preventDefault();
    if (keyword.trim()) navigate(`/search?keyword=${encodeURIComponent(keyword.trim())}`);
  };
  return <div className="home home-v12">
    <header className="home-header"><h1>다음 여행, 어디로 갈까요?</h1>
      <p className="subtitle">당신만을 위한 여행을 계획해 보세요.</p>
      <form className="search-box" onSubmit={handleSearchSubmit}>
        <button type="submit" className="search-icon-frame" aria-label="검색"><img src={searchIcon} alt="" /></button>
        <input type="search" aria-label="목적지 또는 테마 검색" placeholder="목적지 또는 테마를 검색하세요"
          maxLength={100} value={keyword} onChange={event => setKeyword(event.target.value)} />
      </form>
    </header>
    <TripSection trips={trips} status={tripsQuery.status} retry={tripsQuery.retry} isSignedIn={authenticated} />
    <section className="home-quick-section" aria-labelledby="home-quick-title">
      <div className="home-section-heading"><p className="home-v12-eyebrow">PLAN YOUR TRIP</p><h2 id="home-quick-title">여행 계획하기</h2></div>
      <div className="quick-menu">
        <button type="button" className="menu-card" onClick={() => navigate("/recommend")}>
          <div className="icon-circle"><CompassIcon /></div><h3>테마 추천</h3><p>취향에 맞는 여행 아이디어</p>
        </button>
        <button type="button" className="menu-card" onClick={() => navigate("/route-create")}>
          <div className="icon-circle"><CalendarPlusIcon /></div><h3>일정 만들기</h3><p>날짜와 장소로 여행 일정 시작</p>
        </button>
      </div>
    </section>
    <CityRanking cities={rankData.cities} status={rankingStatus} retry={rankingsQuery.retry} forceDemo={rankingsDemo} />
    <HotPlaceRanking places={rankData.hotPlaces} status={rankingStatus} retry={rankingsQuery.retry} forceDemo={rankingsDemo} />
  </div>;
}
