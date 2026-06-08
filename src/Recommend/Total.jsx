import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "./Total.css";
import api from "../api/api";

const RECOMMENDATIONS_API = "/api/recommendations";
const SAVED_PLACES_API = "/api/saved-places";

const BookmarkIcon = ({ active }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
    <path
      d="M7 4.5C7 3.67 7.67 3 8.5 3H15.5C16.33 3 17 3.67 17 4.5V21L12 17.7L7 21V4.5Z"
      fill={active ? "#1DA1F2" : "rgba(30, 41, 59, 0.45)"}
      stroke={active ? "#1DA1F2" : "rgba(255,255,255,0.9)"}
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
  </svg>
);

const getPlaceArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.places)) return data.places;
  if (Array.isArray(data?.recommendations)) return data.recommendations;
  if (Array.isArray(data?.data?.places)) return data.data.places;
  if (Array.isArray(data?.data?.content)) return data.data.content;
  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.data?.recommendations)) {
    return data.data.recommendations;
  }

  return [];
};

const getIntroText = (data) => {
  return (
    data?.intro ||
    data?.message ||
    data?.description ||
    data?.data?.intro ||
    data?.data?.message ||
    data?.data?.description ||
    ""
  );
};

const normalizeTags = (tags) => {
  if (!Array.isArray(tags)) return [];

  return tags
    .map((tag) => {
      const value =
        typeof tag === "string"
          ? tag
          : tag?.name || tag?.tagName || tag?.title || "";

      if (!value) return "";

      return value.startsWith("#") ? value : `#${value}`;
    })
    .filter(Boolean);
};

const normalizePlace = (place) => {
  const id = place.id || place.placeId || place.destinationId;

  return {
    id,
    title:
      place.title ||
      place.name ||
      place.placeName ||
      place.destinationName ||
      "장소 이름 없음",
    address:
      place.address ||
      place.roadAddress ||
      place.location ||
      place.addr ||
      "주소 정보 없음",
    rating: Number(place.rating || place.score || place.avgRating) || 0,
    distance: Number(
      place.distance || place.distanceKm || place.km || place.range || 0
    ),
    image:
      place.image ||
      place.imageUrl ||
      place.thumbnail ||
      place.thumbnailUrl ||
      place.photoUrl ||
      "",
    tags: normalizeTags(place.tags || place.hashtags),
    originalData: place,
  };
};

const getSavedPlaceArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.places)) return data.places;
  if (Array.isArray(data?.savedPlaces)) return data.savedPlaces;
  if (Array.isArray(data?.data?.savedPlaces)) return data.data.savedPlaces;
  if (Array.isArray(data?.data?.places)) return data.data.places;

  return [];
};

const getSavedPlaceId = (savedPlace) => {
  const placeData = savedPlace.place || savedPlace.destination || savedPlace;

  return (
    placeData.placeId ||
    placeData.id ||
    savedPlace.placeId ||
    savedPlace.destinationId ||
    savedPlace.savedPlaceId ||
    savedPlace.bookmarkId ||
    savedPlace.id
  );
};

const getSavedRecordId = (savedPlace) => {
  return savedPlace.savedPlaceId || savedPlace.bookmarkId || savedPlace.id;
};

const getErrorMessage = (error, fallbackMessage) => {
  const data = error.response?.data;

  if (typeof data === "string" && data.trim()) {
    return data;
  }

  return data?.message || data?.error || fallbackMessage;
};

function Total() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [sortBy, setSortBy] = useState("인기순");
  const [places, setPlaces] = useState([]);
  const [serverSavedIds, setServerSavedIds] = useState([]);
  const [serverSavedRecordMap, setServerSavedRecordMap] = useState({});
  const [introText, setIntroText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingId, setIsSavingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  const selectedTheme = searchParams.get("theme") || "힐링";

  useEffect(() => {
    const fetchTotalPlaces = async () => {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const response = await api.get(RECOMMENDATIONS_API, {
          params: {
            theme: selectedTheme,
          },
        });

        const nextPlaces = getPlaceArray(response.data)
          .map(normalizePlace)
          .filter((place) => place.id !== undefined && place.id !== null);

        setPlaces(nextPlaces);
        setIntroText(getIntroText(response.data));
      } catch (error) {
        console.error("전체 추천 장소 조회 실패:", error);
        setPlaces([]);
        setIntroText("");

        if (error.message.includes("Network Error")) {
          setErrorMessage("백엔드 서버 연결 또는 CORS 설정을 확인해주세요.");
          return;
        }

        if (error.response?.status === 401 || error.response?.status === 403) {
          setErrorMessage("로그인 정보가 만료되었거나 권한이 없습니다.");
          return;
        }

        setErrorMessage(
          getErrorMessage(
            error,
            "추천 장소를 불러오지 못했습니다. 잠시 후 다시 시도해주세요."
          )
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchTotalPlaces();
  }, [selectedTheme]);

  useEffect(() => {
    const fetchSavedPlaces = async () => {
      try {
        const response = await api.get(SAVED_PLACES_API);
        const savedPlaces = getSavedPlaceArray(response.data);
        const savedIds = [];
        const savedRecordMap = {};

        savedPlaces.forEach((savedPlace) => {
          const placeId = getSavedPlaceId(savedPlace);
          const savedRecordId = getSavedRecordId(savedPlace);

          if (!placeId) return;

          const placeIdText = String(placeId);
          savedIds.push(placeIdText);

          if (savedRecordId) {
            savedRecordMap[placeIdText] = savedRecordId;
          }
        });

        setServerSavedIds([...new Set(savedIds)]);
        setServerSavedRecordMap(savedRecordMap);
      } catch (error) {
        console.error("저장 장소 상태 조회 실패:", error);
        setServerSavedIds([]);
        setServerSavedRecordMap({});
      }
    };

    fetchSavedPlaces();
  }, []);

  const sortedPlaces = useMemo(() => {
    const copied = [...places];

    if (sortBy === "거리순") {
      return copied.sort((a, b) => a.distance - b.distance);
    }

    if (sortBy === "별점순") {
      return copied.sort((a, b) => b.rating - a.rating);
    }

    return copied;
  }, [places, sortBy]);

  const handleDetailClick = (place) => {
    navigate(`/detail?id=${place.id}`, {
      state: { place },
    });
  };

  const handleToggleSaved = async (event, place, saved) => {
    event.stopPropagation();

    if (!place.id || isSavingId === place.id) return;

    try {
      setIsSavingId(place.id);

      if (saved) {
        const deleteId = serverSavedRecordMap[String(place.id)] || place.id;

        await api.delete(`${SAVED_PLACES_API}/${deleteId}`);

        setServerSavedIds((prev) =>
          prev.filter((savedId) => savedId !== String(place.id))
        );

        setServerSavedRecordMap((prev) => {
          const next = { ...prev };
          delete next[String(place.id)];
          return next;
        });

        return;
      }

      const response = await api.post(SAVED_PLACES_API, {
        placeId: place.id,
      });

      const savedData = response.data?.data || response.data;
      const savedRecordId = getSavedRecordId(savedData);

      setServerSavedIds((prev) => {
        const nextId = String(place.id);
        return prev.includes(nextId) ? prev : [...prev, nextId];
      });

      if (savedRecordId) {
        setServerSavedRecordMap((prev) => ({
          ...prev,
          [String(place.id)]: savedRecordId,
        }));
      }
    } catch (error) {
      console.error("관심 장소 변경 실패:", error);

      if (error.message.includes("Network Error")) {
        alert("백엔드 서버 연결 또는 CORS 설정을 확인해주세요.");
        return;
      }

      if (error.response?.status === 401 || error.response?.status === 403) {
        alert("로그인 정보가 만료되었거나 권한이 없습니다.");
        return;
      }

      alert(
        getErrorMessage(
          error,
          "관심 장소 변경에 실패했습니다. 잠시 후 다시 시도해주세요."
        )
      );
    } finally {
      setIsSavingId(null);
    }
  };

  const pageTitle = introText || `${selectedTheme} 추천 장소`;

  return (
    <div className="total-page">
      <section className="total-intro">
        <h1>{isLoading ? "추천 장소를 불러오는 중입니다." : pageTitle}</h1>
      </section>

      <div className="sort-chip-row">
        <button
          type="button"
          className={`sort-chip ${sortBy === "인기순" ? "active" : ""}`}
          onClick={() => setSortBy("인기순")}
        >
          인기순
          <span>⌄</span>
        </button>

        <button
          type="button"
          className={`sort-chip ${sortBy === "거리순" ? "active" : ""}`}
          onClick={() => setSortBy("거리순")}
        >
          거리순
          <span>⌄</span>
        </button>

        <button
          type="button"
          className={`sort-chip ${sortBy === "별점순" ? "active" : ""}`}
          onClick={() => setSortBy("별점순")}
        >
          별점순
          <span>⌄</span>
        </button>
      </div>

      {errorMessage && (
        <p
          style={{
            margin: "0 20px 14px",
            fontSize: "13px",
            color: "#ef4444",
          }}
        >
          {errorMessage}
        </p>
      )}

      {!isLoading && !errorMessage && sortedPlaces.length === 0 && (
        <p
          style={{
            margin: "0 20px 14px",
            fontSize: "13px",
            color: "#6b7280",
          }}
        >
          추천 장소가 없습니다.
        </p>
      )}

      <section className="theme-total-list">
        {sortedPlaces.map((place) => {
          const saved = serverSavedIds.includes(String(place.id));

          return (
            <article key={place.id} className="theme-total-card">
              <div className="theme-total-image-wrap">
                {place.image ? (
                  <img
                    src={place.image}
                    alt={place.title}
                    className="theme-total-image"
                  />
                ) : (
                  <div
                    className="theme-total-image"
                    aria-label={`${place.title} 이미지 없음`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "#e5f4ff",
                      color: "#6b7280",
                      fontSize: "13px",
                    }}
                  >
                    이미지 없음
                  </div>
                )}

                <button
                  type="button"
                  className="theme-total-save-btn"
                  onClick={(event) => handleToggleSaved(event, place, saved)}
                  disabled={isSavingId === place.id}
                  aria-label={saved ? "저장 취소" : "저장"}
                >
                  <BookmarkIcon active={saved} />
                </button>
              </div>

              <div className="theme-total-body">
                <div className="theme-total-title-row">
                  <h3>{place.title}</h3>
                  <div className="theme-total-rating">
                    <span>★</span>
                    <span>{place.rating}</span>
                  </div>
                </div>

                <p className="theme-total-address">{place.address}</p>

                {place.tags.length > 0 && (
                  <div className="theme-total-tag-row">
                    {place.tags.map((tag) => (
                      <span key={tag} className="theme-total-tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  className="theme-total-detail-btn"
                  onClick={() => handleDetailClick(place)}
                >
                  상세보기
                </button>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}

export default Total;
