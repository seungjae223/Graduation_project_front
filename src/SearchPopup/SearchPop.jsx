import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import useModalFocus from "../utils/useModalFocus";
import "./SearchPop.css";
import api from "../api/api";
import { requireList } from "../api/responseContract";
import { toApiTheme } from "../utils/placeTheme";
import useReadQuery from "../utils/useReadQuery";
import useSessionKey from "../utils/useSessionKey";
import { getAuthSnapshot } from "../utils/authState";

const RECOMMENDATIONS_API = "/api/recommendations";
const PLACE_SEARCH_API = "/api/places/search";

const THEME_KEYS = ["healing", "activity", "food", "photo"];
const EMPTY_PLACES = [];

const SearchIcon = () => (
  <svg
    width="28"
    height="28"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="2.2" />
    <path
      d="M16 16L20 20"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
  </svg>
);

const PinIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M12 21C12 21 18 15.6 18 10.5C18 7.18629 15.3137 4.5 12 4.5C8.68629 4.5 6 7.18629 6 10.5C6 15.6 12 21 12 21Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="10.5" r="2.2" stroke="currentColor" strokeWidth="2" />
  </svg>
);

const normalizePlace = (place) => {
  const name =
    place.name ||
    place.title ||
    place.placeName ||
    place.destinationName ||
    "장소 이름 없음";

  return {
    id: place.id ?? place.placeId ?? place.destinationId,
    name,
    title: name,
    address:
      place.address ||
      place.roadAddress ||
      place.location ||
      place.addr ||
      "주소 정보 없음",
    description: place.description || "",
    region: place.region || "",
    theme: place.theme || "",
    placeType: place.placeType || place.category || "PLACE",
    latitude: Number(place.latitude ?? 0),
    longitude: Number(place.longitude ?? 0),
    originalData: place,
  };
};

const mergeUniquePlaces = (places) => {
  const placeMap = new Map();

  places.forEach((place) => {
    const key =
      place.id !== undefined && place.id !== null
        ? `id-${place.id}`
        : `${place.name}-${place.address}`;

    if (!placeMap.has(key)) {
      placeMap.set(key, place);
    }
  });

  return Array.from(placeMap.values());
};

export async function fetchAllRecommendations(signal, previous) {
  let directFailed = false;
  try {
    const response = await api.get(RECOMMENDATIONS_API, { signal });
    const places = requireList(response.data);
    if (places.length) return { places, partial: false };
  } catch (error) {
    if (signal?.aborted) throw error;
    directFailed = true;
  }
  const responses = await Promise.allSettled(THEME_KEYS.map(async theme => {
    const response = await api.get(RECOMMENDATIONS_API, { signal, params: { theme: toApiTheme(theme) } });
    return requireList(response.data);
  }));
  if (signal?.aborted) throw new DOMException("취소됨", "AbortError");
  if (responses.every(response => response.status === "rejected")) throw new Error("추천 조회 실패");
  const batches = {};
  responses.forEach((response, index) => {
    const theme = THEME_KEYS[index];
    batches[theme] = response.status === "fulfilled" ? response.value : previous?.batches?.[theme] || [];
  });
  return { places: Object.values(batches).flat(), batches, partial: directFailed || responses.some(response => response.status === "rejected") };
}

const waitForSearch = (signal, delay) => new Promise((resolve, reject) => {
  const abort = () => { window.clearTimeout(timer); reject(new DOMException("취소됨", "AbortError")); };
  const timer = window.setTimeout(() => { signal.removeEventListener("abort", abort); resolve(); }, delay);
  if (signal.aborted) abort(); else signal.addEventListener("abort", abort, { once: true });
});

const SearchPop = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const dialogRef = useModalFocus({
    open: isOpen,
    onClose,
    lockScroll: true,
  });

  const [keyword, setKeyword] = useState("");
  const account = useSessionKey();
  const normalizedKeyword = keyword.trim().replace(/\s+/g, " ");
  const scope = `${account}:popup:${normalizedKeyword}`;
  const known = useRef({ scope, data: null });
  if (known.current.scope !== scope) known.current = { scope, data: null };
  const query = useReadQuery(scope, async signal => {
    await waitForSearch(signal, normalizedKeyword ? 250 : 0);
    const result = normalizedKeyword
      ? { places: requireList((await api.get(PLACE_SEARCH_API, { signal, params: { keyword: normalizedKeyword } })).data), partial: false }
      : await fetchAllRecommendations(signal, known.current.data);
    return { ...result, places: mergeUniquePlaces(result.places.map(normalizePlace)) };
  }, isOpen, () => getAuthSnapshot().accountKey === account);
  useEffect(() => { if (query.data) known.current = { scope, data: query.data }; }, [scope, query.data]);
  const places = query.data?.places || EMPTY_PLACES;
  const isLoading = query.status === "loading";
  const errorMessage = query.status === "error" ? "검색 데이터를 불러오지 못했습니다." : "";

  // The server owns keyword matching (including tags); do not discard its
  // confirmed result by running a second, narrower client-side search.
  const filteredPlaces = places;

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose?.();
    }
  };

  const handleDetailClick = (place) => {
    onClose?.();

    navigate(`/detail?id=${place.id}`, {
      state: {
        place: {
          id: place.id,
          title: place.title,
          name: place.name,
          address: place.address,
          description: place.description,
          region: place.region,
          theme: place.theme,
          placeType: place.placeType,
          latitude: place.latitude,
          longitude: place.longitude,
          originalData: place.originalData,
        },
      },
    });
  };

  return createPortal(
    <div
      className="search-pop-overlay"
      onClick={handleBackdropClick}
    >
      <div
        ref={dialogRef}
        className="search-pop-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="search-pop-title"
        tabIndex={-1}
      >
        <div className="search-pop-inner">
          <div className="search-pop-search-box">
            <SearchIcon />
            <input
              type="text"
              className="search-pop-input"
              value={keyword}
              maxLength={100}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="검색어를 입력하세요"
              aria-label="장소 검색어"
              data-modal-initial-focus
            />
          </div>

          <div className="search-pop-result-header">
            <h2 id="search-pop-title">검색 결과</h2>
            <span>{query.data ? `${filteredPlaces.length}개 발견` : isLoading ? "조회 중" : "확인 필요"}</span>
          </div>

          <div className="search-pop-list">
            {isLoading && <div className="search-pop-empty" role="status"><p>검색 데이터를 불러오는 중입니다.</p></div>}
            {(errorMessage || query.data?.partial) && <div className="search-pop-empty" role="alert">
              <p>{errorMessage || "일부 추천을 불러오지 못했어요. 확인된 장소는 계속 볼 수 있습니다."}</p>
              <button type="button" className="search-pop-detail-btn" onClick={query.retry} disabled={isLoading}>다시 조회</button>
            </div>}
              <>
                {filteredPlaces.map((place) => (
                  <div key={place.id || place.name} className="search-pop-card">
                    <div className="search-pop-card-left">
                      <strong>{place.name}</strong>

                      <div className="search-pop-location">
                        <PinIcon />
                        <span>{place.address}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="search-pop-detail-btn"
                      onClick={() => handleDetailClick(place)}
                    >
                      상세보기
                    </button>
                  </div>
                ))}

                {query.status === "success" && !query.data?.partial && filteredPlaces.length === 0 && (
                  <div className="search-pop-empty">
                    <p>검색 결과가 없습니다.</p>
                  </div>
                )}
              </>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default SearchPop;
