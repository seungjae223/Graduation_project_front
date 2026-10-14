import React, { useEffect, useMemo, useRef, useState } from "react";
import { readCoordinates } from "./recommendationSort";

export default function DistanceOriginPicker({ places, reference, onChoose, onCancel }) {
  const usable = useMemo(() => places.filter(readCoordinates), [places]);
  const initialPlace = usable.find(place => reference?.type === "place" && String(place.id) === String(reference.placeId));
  const [region, setRegion] = useState(initialPlace?.region || "");
  const [placeId, setPlaceId] = useState(initialPlace ? String(initialPlace.id) : "");
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const request = useRef(0), firstControl = useRef(null);
  const regions = [...new Set(usable.map(place => place.region).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ko"));
  const options = usable.filter(place => !region || place.region === region);
  useEffect(() => {
    firstControl.current?.focus();
    return () => { request.current += 1; };
  }, []);
  const useCurrentLocation = () => {
    setError("");
    if (!navigator.geolocation) { setError("이 브라우저에서는 현재 위치를 확인할 수 없어요. 기준 장소를 선택해 주세요."); return; }
    setLocating(true);
    const token = ++request.current;
    const fail = error => {
      if (request.current !== token) return;
      setLocating(false);
      setError(error?.code === 1 ? "위치 권한이 거부되었어요. 기준 장소를 선택해 주세요."
        : error?.code === 3 ? "위치 확인 시간이 초과됐어요. 다시 시도하거나 기준 장소를 선택해 주세요."
          : "현재 위치를 확인하지 못했어요. 기준 장소를 선택해 주세요.");
    };
    try {
      navigator.geolocation.getCurrentPosition(position => {
        if (request.current !== token) return;
        const coordinates = readCoordinates(position.coords);
        if (!coordinates) { fail(); return; }
        onChoose({ type: "current", ...coordinates });
      }, fail, { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 });
    } catch (error) { fail(error); }
  };
  return <section className="total-origin-picker" aria-labelledby="total-origin-title"
    onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); onCancel(); } }}>
    <h2 id="total-origin-title">거리 기준 선택</h2>
    <p>여행 지역의 장소를 선택해 주세요.</p>
    <form onSubmit={event => {
      event.preventDefault();
      if (usable.some(place => String(place.id) === placeId)) onChoose({ type: "place", placeId });
    }}>
      <label>기준 장소의 지역<select ref={firstControl} value={region} onChange={event => { setRegion(event.target.value); setPlaceId(""); }}>
        <option value="">전체 지역</option>{regions.map(region => <option key={region} value={region}>{region}</option>)}
      </select></label>
      <label>기준 장소<select value={placeId} onChange={event => setPlaceId(event.target.value)} required>
        <option value="">기준 장소 선택</option>{options.map(place => <option key={place.id} value={place.id}>{place.region ? `${place.region} · ` : ""}{place.title}</option>)}
      </select></label>
      {!usable.length && <p>좌표가 확인된 기준 장소가 없어요.</p>}
      <div className="total-origin-actions"><button type="button" onClick={onCancel}>취소</button><button type="submit" className="total-origin-apply" disabled={!placeId}>이 위치로 정렬</button></div>
    </form>
    <button type="button" className="total-current-location" onClick={useCurrentLocation} disabled={locating}>{locating ? "현재 위치 확인 중…" : "현재 위치 사용"}</button>
    {error && <p role="alert">{error}</p>}
  </section>;
}
