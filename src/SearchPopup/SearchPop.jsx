import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import "./SearchPop.css";
import api from "../api/api";

const RECOMMENDATIONS_API = "/api/recommendations";

const THEME_KEYS = ["healing", "activity", "food", "photo"];

const SearchIcon = () => (
  <svg
    width="28"
    height="28"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <circle cx="11" cy="11" r="6.5" stroke="#1698EC" strokeWidth="2.2" />
    <path
      d="M16 16L20 20"
      stroke="#1698EC"
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
      stroke="#72839B"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="10.5" r="2.2" stroke="#72839B" strokeWidth="2" />
  </svg>
);

const getArrayData = (data) => {
  if (Array.isArray(data)) return data;

  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.places)) return data.places;
  if (Array.isArray(data?.recommendations)) return data.recommendations;
  if (Array.isArray(data?.savedPlaces)) return data.savedPlaces;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.results)) return data.results;

  if (Array.isArray(data?.data?.content)) return data.data.content;
  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.data?.places)) return data.data.places;
  if (Array.isArray(data?.data?.recommendations)) {
    return data.data.recommendations;
  }

  return [];
};

const normalizeSearchText = (value) => {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, "");
};

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

const fetchAllRecommendations = async () => {
  const response = await api.get(RECOMMENDATIONS_API);
  const directPlaces = getArrayData(response.data);

  if (directPlaces.length > 0) {
    return directPlaces;
  }

  const themeResponses = await Promise.all(
    THEME_KEYS.map((theme) =>
      api
        .get(RECOMMENDATIONS_API, {
          params: {
            theme,
          },
        })
        .catch((error) => {
          console.error(`${theme} 검색 데이터 조회 실패:`, error);
          return null;
        })
    )
  );

  return themeResponses.flatMap((themeResponse) => {
    if (!themeResponse) return [];
    return getArrayData(themeResponse.data);
  });
};

const SearchPop = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  const [keyword, setKeyword] = useState("");
  const [places, setPlaces] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const filteredPlaces = useMemo(() => {
    const value = normalizeSearchText(keyword);

    if (!value) {
      return places;
    }

    return places.filter((place) => {
      const searchableText = normalizeSearchText(
        [
          place.name,
          place.title,
          place.address,
          place.description,
          place.region,
          place.theme,
          place.placeType,
        ].join(" ")
      );

      return searchableText.includes(value);
    });
  }, [keyword, places]);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    const fetchSearchPlaces = async () => {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const recommendationData = await fetchAllRecommendations();

        if (!isMounted) return;

        const nextPlaces = mergeUniquePlaces(
          recommendationData.map(normalizePlace)
        );

        setPlaces(nextPlaces);
      } catch (error) {
        console.error("검색 장소 조회 실패:", error);

        if (!isMounted) return;

        setPlaces([]);

        if (error.message?.includes("Network Error")) {
          setErrorMessage("백엔드 서버 연결 또는 CORS 설정을 확인해주세요.");
          return;
        }

        setErrorMessage("검색 데이터를 불러오지 못했습니다.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchSearchPlaces();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

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
      role="dialog"
      aria-modal="true"
      aria-label="검색 팝업"
    >
      <div className="search-pop-sheet">
        <div className="search-pop-inner">
          <div className="search-pop-search-box">
            <SearchIcon />
            <input
              type="text"
              className="search-pop-input"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="검색어를 입력하세요"
              autoFocus
            />
          </div>

          <div className="search-pop-result-header">
            <h2>검색 결과</h2>
            <span>{filteredPlaces.length}개 발견</span>
          </div>

          <div className="search-pop-list">
            {isLoading ? (
              <div className="search-pop-empty">
                <p>검색 데이터를 불러오는 중입니다.</p>
              </div>
            ) : errorMessage ? (
              <div className="search-pop-empty">
                <p>{errorMessage}</p>
              </div>
            ) : (
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

                {filteredPlaces.length === 0 && (
                  <div className="search-pop-empty">
                    <p>검색 결과가 없습니다.</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default SearchPop;