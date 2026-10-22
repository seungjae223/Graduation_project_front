import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import useModalFocus from "../utils/useModalFocus";
import { getPlaceCountry } from "../utils/placeCountry";
import useResolvedMapCoordinates from "./useResolvedMapCoordinates";
import { GoogleMapBox, KakaoMapBox, getMapProviderForDay,
  buildGoogleMapsRouteUrl, buildKakaoMapsRouteUrl } from "./RouteResult";
import "./TripMapModal.css";

export function toMapDays(days, destination) {
  return days.map(day => ({ ...day, items: day.places.map(place => ({
    ...place,
    title: place.placeName,
    address: [destination, place.address].filter(Boolean).join(" "),
    lat: place.latitude ?? place.lat,
    lng: place.longitude ?? place.lng,
  })) }));
}

export default function TripMapModal({ trip, days, initialDay, owner, onClose }) {
  const [selectedDay, setSelectedDay] = useState(initialDay);
  const dialogRef = useModalFocus({ open: true, onClose, lockScroll: true });
  const mapDays = useMemo(() => toMapDays(days, trip.destination), [days, trip.destination]);
  const resolved = useResolvedMapCoordinates(owner, mapDays);
  const index = Math.max(0, mapDays.findIndex(day => day.day === selectedDay));
  const day = resolved.days[index];
  const country = getPlaceCountry({ region: trip.destination });
  const provider = getMapProviderForDay(mapDays[index], index,
    country === "한국" ? "kakao" : "google");
  const label = provider === "kakao" ? "카카오맵" : "구글맵";
  const url = provider === "kakao" ? buildKakaoMapsRouteUrl(day) : buildGoogleMapsRouteUrl(day);
  const MapBox = provider === "kakao" ? KakaoMapBox : GoogleMapBox;

  return createPortal(<div className="trip-map-backdrop"
    onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="trip-map-dialog" role="dialog" aria-modal="true"
      aria-label="여행 일정 지도" ref={dialogRef} tabIndex={-1}>
      <header className="trip-map-heading">
        <div><p>{label} · {trip.destination}</p><h2>{trip.title}</h2></div>
        <button type="button" aria-label="지도 닫기" onClick={onClose}
          data-modal-initial-focus>×</button>
      </header>
      <nav className="trip-map-days" aria-label="지도 일차 선택">
        {mapDays.map(item => <button type="button" key={item.day}
          aria-pressed={day.day === item.day} onClick={() => setSelectedDay(item.day)}>
          <strong>{item.label}</strong><span>{item.dateLabel}</span>
        </button>)}
      </nav>
      <div className="trip-map-canvas" role="region" aria-label={label + " 일정 지도"}>
        {day.items.length ? <MapBox key={provider + ":" + day.day}
          dayData={day} dayIndex={index} coordinateOwner={owner}
          onResolvedCoordinates={resolved.publish}/> :
          <p className="trip-map-empty">이 일차에는 등록된 장소가 없어요.</p>}
      </div>
      <div className="trip-map-footer">
        <p>{day.label} · {day.items.length}곳<span>선은 저장된 방문 순서를 연결합니다.</span></p>
        {day.items.length > 0 && url && <a href={url} target="_blank" rel="noopener noreferrer">
          {label}에서 경로 열기 ↗</a>}
      </div>
    </section>
  </div>, document.body);
}
