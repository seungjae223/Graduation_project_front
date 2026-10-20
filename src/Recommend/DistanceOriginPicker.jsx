import React, { useEffect, useMemo, useRef, useState } from "react";
import { readCoordinates } from "./recommendationSort";
import "./DistanceOriginPicker.css";

function Chevron() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>;
}

export default function DistanceOriginPicker({ places, reference, onChoose, onCancel }) {
  const usable = useMemo(() => places.filter(readCoordinates), [places]);
  const initialPlace = usable.find(place => reference?.type === "place" && String(place.id) === String(reference.placeId));
  const [region, setRegion] = useState(initialPlace?.region || "");
  const [placeId, setPlaceId] = useState(initialPlace ? String(initialPlace.id) : "");
  const [currentLocation, setCurrentLocation] = useState(() => reference?.type === "current" ? readCoordinates(reference) : null);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const request = useRef(0);
  const firstControl = useRef(null);
  const regions = [...new Set(usable.map(place => place.region).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ko"));
  const options = usable.filter(place => !region || place.region === region);
  const selectedPlace = usable.find(place => String(place.id) === placeId);
  const canApply = !locating && Boolean(currentLocation || selectedPlace);

  useEffect(() => {
    firstControl.current?.focus({ preventScroll: true });
    return () => { request.current += 1; };
  }, []);

  const selectPlace = update => {
    request.current += 1;
    setLocating(false);
    setCurrentLocation(null);
    setError("");
    update();
  };
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
        setCurrentLocation(coordinates);
        setPlaceId("");
        setLocating(false);
      }, fail, { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 });
    } catch (error) { fail(error); }
  };
  return <section id="total-origin-panel" className="total-origin-picker"
      aria-labelledby="total-origin-title" aria-describedby="total-origin-description"
      onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); onCancel(); } }}>
      <header className="total-origin-header">
        <h2 id="total-origin-title">거리 기준 선택</h2>
        <p id="total-origin-description">어디를 기준으로 가까운 장소를 찾을까요?</p>
        <button type="button" className="total-origin-close" onClick={onCancel} aria-label="거리 기준 선택 닫기">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
        </button>
      </header>
      <form onSubmit={event => {
        event.preventDefault();
        if (!canApply) return;
        onChoose(currentLocation ? { type: "current", ...currentLocation } : { type: "place", placeId });
      }}>
        <div className="total-origin-fields">
          <label>기준 장소의 지역<span className="total-origin-select">
            <select ref={firstControl} value={region} onChange={event => selectPlace(() => { setRegion(event.target.value); setPlaceId(""); })}>
              <option value="">전체 지역</option>{regions.map(region => <option key={region} value={region}>{region}</option>)}
            </select><Chevron />
          </span></label>
          <div className="total-origin-place-field">
            <label>기준 장소<span className="total-origin-select">
              <select value={placeId} aria-describedby={selectedPlace ? "total-origin-selected-place" : undefined} onChange={event => selectPlace(() => setPlaceId(event.target.value))}>
                <option value="">기준 장소 선택</option>{options.map(place => <option key={place.id} value={place.id}>{place.region ? `${place.region} · ` : ""}{place.title}</option>)}
              </select><Chevron />
            </span></label>
            {selectedPlace && <p id="total-origin-selected-place" className="total-origin-note">선택한 장소: {selectedPlace.title}</p>}
          </div>
          {!usable.length && <p className="total-origin-note">좌표가 확인된 기준 장소가 없어요.</p>}
          <div className="total-origin-geolocation">
            <button type="button" className="total-current-location" onClick={useCurrentLocation} disabled={locating} aria-pressed={Boolean(currentLocation)}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="2" /><path d="M12 2v3m0 14v3M2 12h3m14 0h3" /></svg>
              {locating ? "현재 위치 확인 중…" : "내 현재 위치 사용"}
              {currentLocation && !locating && <svg className="total-origin-check" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>}
            </button>
            <p className="total-origin-note" role="status">{locating ? "브라우저에서 위치 권한을 허용해 주세요."
              : currentLocation ? "현재 위치가 선택됐어요. 적용하면 이 위치로 정렬해요." : "버튼을 누르면 브라우저에서 위치 권한을 요청해요."}</p>
          </div>
          {error && <p className="total-origin-error" role="alert">{error}</p>}
        </div>
        <footer className="total-origin-actions">
          <button type="button" onClick={onCancel}>취소</button>
          <button type="submit" className="total-origin-apply" disabled={!canApply}>이 위치로 정렬</button>
        </footer>
      </form>
    </section>;
}
