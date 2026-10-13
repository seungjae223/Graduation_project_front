

import React, { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AnimatedHeart from "../AnimatedHeart/AnimatedHeart";
import useReadQuery from "../utils/useReadQuery";
import useSessionKey from "../utils/useSessionKey";
import { getAuthSnapshot } from "../utils/authState";
import { requireList } from "../api/responseContract";
import { toApiTheme } from "../utils/placeTheme";
import usePlaceSaving from "../utils/usePlaceSaving";
import PlaceSavingFeedback, { PlaceSaveModal } from "../components/PlaceSavingFeedback";
import "./Total.css";
import api from "../api/api";
import PlacePhoto from "../components/PlacePhoto";
import { getPlacePhoto } from "../data/placePhotos";

const RECOMMENDATIONS_API = "/api/recommendations";
const EMPTY_PLACES = [];






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
  const placeType =
    place.placeType ||
    place.category ||
    place.categoryName ||
    place.type ||
    "명소";

  return {
    id,
    title:
      place.title ||
      place.name ||
      place.placeName ||
      place.destinationName ||
      "장소 이름 없음",
    description: place.description || place.intro || place.summary || "",
    address:
      place.address ||
      place.roadAddress ||
      place.location ||
      place.addr ||
      "주소 정보 없음",
    latitude: Number(place.latitude ?? 0),
    longitude: Number(place.longitude ?? 0),
    placeType,
    theme: place.theme || place.themeName || "",
    rating: optionalNumber(place.rating ?? place.score ?? place.avgRating),
    distance: null,
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















const optionalNumber = value => value === undefined || value === null || value === "" ? null : Number.isFinite(Number(value)) ? Number(value) : null;

function Total() {
  const navigate = useNavigate();
  const account = useSessionKey();
  const saving = usePlaceSaving();
  const { isSaved, isSavingId } = saving;
  const [searchParams] = useSearchParams();

  const [sortBy, setSortBy] = useState("인기순");
  const selectedTheme = searchParams.get("theme") || "healing";
  const searchKeyword = (searchParams.get("keyword") || "").trim();
  const listing = useReadQuery(`${account}:total:${searchKeyword ? "search:" + searchKeyword : "theme:" + selectedTheme}`, async signal => {
    const response = await api.get(searchKeyword ? "/api/places/search" : RECOMMENDATIONS_API, { signal, params: searchKeyword ? { keyword: searchKeyword } : { theme: toApiTheme(selectedTheme) } });
    return requireList(response.data).map(normalizePlace);
  }, true, () => getAuthSnapshot().accountKey === account);
  const places = listing.data || EMPTY_PLACES;
  const isLoading = listing.status === "loading" && !listing.data;
  const errorMessage = listing.status === "error" ? "장소 목록을 불러오지 못했어요." : "";

  const sortedPlaces = useMemo(() => {
    const copied = [...places];

    if (sortBy === "거리순") {
      return copied.sort((a, b) => a.distance - b.distance);
    }

    if (sortBy === "별점순") {
      return copied.sort((a, b) => (b.rating ?? -Infinity) - (a.rating ?? -Infinity));
    }

    return copied;
  }, [places, sortBy]);

  const handleDetailClick = (place) => {
    navigate(`/detail?id=${place.id}`, {
      state: { place },
    });
  };

  const handleToggleSaved = saving.toggle;
  const themeLabel = { healing: "힐링", activity: "액티비티", food: "맛집 탐방", photo: "인스타 감성" }[selectedTheme] || selectedTheme;
  const pageTitle = searchKeyword ? `"${searchKeyword}" 검색 결과` : `${themeLabel} 추천 장소`;

  return (
    <>
      <div className="total-page">
      <PlaceSavingFeedback saving={saving} />
      {errorMessage && <div role="alert"><p>{errorMessage}</p><button type="button" onClick={listing.retry}>목록 다시 조회</button></div>}
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
          disabled title="거리 기준 정보가 제공되지 않습니다"
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

      {!isLoading && !errorMessage && sortedPlaces.length === 0 && (
        <p
          style={{
            margin: "0 20px 14px",
            fontSize: "13px",
            color: "var(--color-text-muted)",
          }}
        >
          추천 장소가 없습니다.
        </p>
      )}

      <section className="theme-total-list">
        {sortedPlaces.map((place) => {
          const saved =
            isSaved(place.id);

          return (
            <article key={place.id} className="theme-total-card">
              <div className="theme-total-image-wrap">
                <PlacePhoto
                  src={place.image}
                  alt={place.title}
                  className="theme-total-image"
                  credit={place.image === getPlacePhoto(place.title).image ? getPlacePhoto(place.title).credit : undefined}
                />

                <button
                  type="button"
                  className="theme-total-save-btn"
                  onClick={(event) => handleToggleSaved(event, place, saved)}
                  disabled={saving.blocked || saving.folders.status === "loading" || isSavingId === place.id}
                  aria-pressed={saved}
                  aria-label={saved ? "저장 취소" : "저장"}
                >
                  <AnimatedHeart active={saved} />
                </button>
              </div>

              <div className="theme-total-body">
                <div className="theme-total-title-row">
                  <h3>{place.title}</h3>
                  {place.rating !== null && <div className="theme-total-rating">
                    <span>★</span>
                    <span>{place.rating}</span>
                  </div>}
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

      <PlaceSaveModal saving={saving} />
    </>
  );
}

export default Total;
