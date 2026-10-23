import React, { useState } from "react";
import { Link } from "react-router-dom";
import { getDestinationsApi } from "../api/destinationApi";
import { requireSearchDestinations } from "../Search/destinationSearch";
import { getDestinationHero } from "../Destinations/destinationHeroPhotos";
import useReadQuery from "../utils/useReadQuery";
import { filterDestinationCatalog, getDestinationTagline } from "../data/destinationPresentation";
import "./Recommend.css";

function DestinationCard({ destination, initial = false, priority = false }) {
  const [imageFailed, setImageFailed] = useState(false);
  const hero = getDestinationHero(destination.code);
  const showPhoto = Boolean(hero?.src && !imageFailed);
  return <li className="recommend-destination-card">
    <Link className="recommend-destination-link"
      to={`/destinations/${encodeURIComponent(destination.code)}?from=recommend`}
      aria-label={`${destination.name} 여행지 보기`}>
      <div className="recommend-destination-photo">
        {showPhoto
          ? <img src={hero.src} srcSet={hero.srcSet} sizes="(max-width: 600px) calc(100vw - 36px), 540px"
              alt="" loading={initial ? "eager" : "lazy"} fetchPriority={priority ? "high" : "auto"} decoding="async" style={{ objectPosition: hero.position }}
              onError={() => setImageFailed(true)} />
          : <span className="recommend-destination-photo-fallback" aria-hidden="true" />}
      </div>
      <div className="recommend-destination-info">
        <strong>{destination.name}</strong>
        <small>{getDestinationTagline(destination)}</small>
        <span className="recommend-destination-arrow" aria-hidden="true">↗</span>
      </div>
    </Link>
    {showPhoto && <a className="recommend-destination-credit" href={hero.source}
      target="_blank" rel="noopener noreferrer"
      aria-label={`${destination.name} 대표 사진 출처`} title={`${hero.author} · ${hero.license} (가로 크롭 표시)`}>사진 출처</a>}
  </li>;
}

export default function Recommend() {
  const catalog = useReadQuery("recommend-destinations",
    async signal => requireSearchDestinations(await getDestinationsApi({ signal })), true, undefined, 60_000);
  const destinations = catalog.data || [];
  const [scope, setScope] = useState("OVERSEAS");
  const [group, setGroup] = useState("all");
  const { visible, groups } = filterDestinationCatalog(destinations, scope, group);
  const chooseScope = value => { setScope(value); setGroup("all"); };

  return <div className="recommend-page recommend-destination-page">
    <header className="recommend-destination-heading"><h1>어디로 떠나볼까요?</h1></header>
    <div className="recommend-scope-tabs" role="group" aria-label="국내 해외 선택">
      <button type="button" aria-pressed={scope === "OVERSEAS"} onClick={() => chooseScope("OVERSEAS")}>해외</button>
      <button type="button" aria-pressed={scope === "DOMESTIC"} onClick={() => chooseScope("DOMESTIC")}>국내</button>
    </div>
    <div className="recommend-region-chips" role="group" aria-label="여행 지역">
      {groups.map(item => <button type="button" key={item.key}
        aria-pressed={group === item.key} onClick={() => setGroup(item.key)}>{item.label}</button>)}
    </div>
    {catalog.status === "loading" && <p role="status" className="recommend-destination-state">여행지를 불러오는 중...</p>}
    {catalog.status === "error" && <div role="alert" className="recommend-destination-state">
      여행지를 불러오지 못했어요.
      <button type="button" onClick={catalog.retry}>다시 조회</button>
    </div>}
    {catalog.status === "success" && visible.length === 0 &&
      <p className="recommend-destination-state">이 지역에 등록된 여행지가 아직 없어요.</p>}
    {visible.length > 0 && <ul className="recommend-destination-grid">
      {visible.map((destination, index) => <DestinationCard key={destination.code} destination={destination}
        initial={index < 2} priority={index === 0} />)}
    </ul>}
  </div>;
}
