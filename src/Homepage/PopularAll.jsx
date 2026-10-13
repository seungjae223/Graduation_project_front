

import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AnimatedHeart from "../AnimatedHeart/AnimatedHeart";
import useReadQuery from "../utils/useReadQuery";
import useSessionKey from "../utils/useSessionKey";
import { getAuthSnapshot } from "../utils/authState";
import { requireList } from "../api/responseContract";
import usePlaceSaving from "../utils/usePlaceSaving";
import PlaceSavingFeedback, { PlaceSaveModal } from "../components/PlaceSavingFeedback";
import api from "../api/api";
import "./PopularAll.css";

import PlacePhoto from "../components/PlacePhoto";


const PLACES_API = "/api/places";
const EMPTY_PLACES = [];

const filterList = ["전체", "일본", "한국", "동남아"];



const getNumberValue = (...values) => {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;

    const numberValue = Number(value);

    if (Number.isFinite(numberValue)) {
      return numberValue;
    }
  }

  return null;
};

const getIdValue = (...values) => {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;

    const textValue = String(value).trim();

    if (/^\d+$/.test(textValue)) {
      return textValue;
    }
  }

  return null;
};







const getPlaceText = (place = {}) =>
  [
    place.region,
    place.name,
    place.placeName,
    place.title,
    place.theme,
    place.description,
    place.address,
    place.placeType,
  ]
    .filter(Boolean)
    .join(" ");

const getPlaceTags = (place = {}) => {
  if (Array.isArray(place.tags) && place.tags.length > 0) {
    return place.tags;
  }

  const tags = [place.theme, place.placeType, place.region]
    .filter(Boolean)
    .flatMap((value) =>
      String(value)
        .split(/[,\s/|]+/)
        .map((tag) => tag.trim())
        .filter(Boolean)
    );

  return [...new Set(tags)].slice(0, 3).map((tag) => {
    if (tag.startsWith("#")) return tag;
    return `#${tag}`;
  });
};

const normalizePlace = (place = {}, index = 0) => {
  const name =
    place.name ||
    place.placeName ||
    place.title ||
    place.destinationName ||
    "이름 없는 장소";

  const placeId =
    getIdValue(place.id, place.placeId, place.destinationId) ||
    place.id ||
    place.placeId ||
    `place-${index}`;

  const latitude = getNumberValue(place.latitude, place.lat, place.y);
  const longitude = getNumberValue(
    place.longitude,
    place.lng,
    place.lon,
    place.x
  );

  return {
    ...place,
    id: placeId,
    region: place.region || "",
    name,
    placeName: name,
    title: name,
    image: place.imageUrl || place.thumbnailUrl || place.image || "",
    tags: getPlaceTags(place),
    address: place.address || "",
    latitude,
    longitude,
    lat: latitude,
    lng: longitude,
    theme: place.theme || "",
    description: place.description || "",
    placeType: place.placeType || "",
  };
};

const regionMatchers = {
  일본:
    /일본|도쿄|교토|오사카|나라|후쿠오카|삿포로|요코하마|나고야|오키나와|japan|jp|jpn|tokyo|kyoto|osaka|nara|fukuoka|sapporo|yokohama|nagoya|okinawa/i,
  한국:
    /한국|대한민국|국내|서울|제주|부산|강원|경주|여수|거제|인천|대구|대전|광주|울산|전주|속초|강릉|남해|안동|양양|korea|kr|kor|seoul|jeju|busan|gangwon|gyeongju|yeosu|geoje/i,
  동남아:
    /동남아|베트남|태국|인도네시아|필리핀|싱가포르|말레이시아|라오스|캄보디아|발리|다낭|방콕|하노이|호치민|세부|vietnam|thailand|indonesia|philippines|singapore|malaysia|bali|danang|bangkok|hanoi|cebu/i,
};

const isMatchedFilter = (place, selectedFilter) => {
  if (selectedFilter === "전체") {
    return true;
  }

  const text = getPlaceText(place);
  const matcher = regionMatchers[selectedFilter];

  if (!matcher) {
    return text.includes(selectedFilter);
  }

  return matcher.test(text);
};



function PopularAll() {

  const [selectedFilter, setSelectedFilter] = useState("전체");
  const account = useSessionKey();
  const saving = usePlaceSaving();
  const { isSavingId } = saving;
  const listing = useReadQuery(`${account}:popular-all`, async signal => requireList((await api.get(PLACES_API, { signal })).data).map(normalizePlace), true, () => getAuthSnapshot().accountKey === account);
  const places = listing.data || EMPTY_PLACES;
  const isLoaded = Boolean(listing.data);

  const visiblePlaces = useMemo(() => {
    if (!isLoaded) {
      return [];
    }

    return places;
  }, [places, isLoaded]);

  const filteredPlaces = useMemo(() => {
    return visiblePlaces.filter((place) =>
      isMatchedFilter(place, selectedFilter)
    );
  }, [visiblePlaces, selectedFilter]);

  const hotPlaces = useMemo(() => {
    return filteredPlaces.slice(0, 4);
  }, [filteredPlaces]);

  const monthlyPlaces = useMemo(() => {
    return filteredPlaces.slice(4);
  }, [filteredPlaces]);

  const handleToggleSaved = saving.toggle;

  return (
    <>
      <div className="popular-all-page">
        <PlaceSavingFeedback saving={saving} />
        {listing.status === "loading" && !listing.data && <p role="status">장소를 불러오는 중...</p>}
        {listing.status === "error" && <div role="alert"><p>장소를 불러오지 못했어요.</p><button type="button" onClick={listing.retry}>목록 다시 조회</button></div>}
        {listing.status === "success" && !filteredPlaces.length && <p>조건에 맞는 장소가 없어요.</p>}
        <div className="popular-filter-row">
          {filterList.map((filter) => (
            <button
              key={filter}
              type="button"
              className={`popular-filter-btn ${
                selectedFilter === filter ? "active" : ""
              }`}
              onClick={() => setSelectedFilter(filter)}
            >
              {filter}
              {filter !== "전체" && (
                <span className="popular-filter-chevron" aria-hidden="true" />
              )}
            </button>
          ))}
        </div>

        <section className="popular-grid popular-grid-one-column">
          {hotPlaces.map((place) => {
            const placeId = getIdValue(place.id, place.placeId);
            const saved = saving.isSaved(placeId);

            return (
              <article
                key={place.id}
                className="popular-grid-card"
              >
                <PlacePhoto
                  src={place.image}
                  alt={place.title}
                  className="popular-grid-image"
                />

                <button
                  type="button"
                  className="popular-like-btn"
                  onClick={(e) => handleToggleSaved(e, place, saved)}
                  disabled={saving.blocked || saving.folders.status === "loading" || isSavingId === place.id}
                  aria-pressed={saved}
                  aria-label={saved ? "저장 취소" : "저장"}
                >
                  <AnimatedHeart active={saved} />
                </button>

                <div className="popular-grid-overlay" />

                <div className="popular-grid-text">
                  <h3><Link className="popular-place-link" to={`/detail?id=${encodeURIComponent(place.id)}`}>{place.title}</Link></h3>
                </div>
              </article>
            );
          })}
        </section>

        {monthlyPlaces.length > 0 && (
          <section className="popular-month-section">
            <h2>더 많은 장소</h2>

            <div className="popular-month-list">
              {monthlyPlaces.map((place) => {
                const placeId = getIdValue(place.id, place.placeId);
                const saved = saving.isSaved(placeId);

                return (
                  <article
                    key={place.id}
                    className="popular-month-card"
                      >
                    <PlacePhoto
                      src={place.image}
                      alt={place.title}
                      className="popular-month-thumb"
                    />

                    <div className="popular-month-body">
                      <div className="popular-month-top">
                        <h3><Link className="popular-place-link" to={`/detail?id=${encodeURIComponent(place.id)}`}>{place.title}</Link></h3>

                        <button
                          type="button"
                          className="popular-bookmark-btn popular-heart-btn"
                          onClick={(e) => handleToggleSaved(e, place, saved)}
                          disabled={saving.blocked || saving.folders.status === "loading" || isSavingId === place.id}
                  aria-pressed={saved}
                          aria-label={saved ? "저장 취소" : "저장"}
                        >
                          <AnimatedHeart active={saved} />
                        </button>
                      </div>

                      {place.tags.length > 0 && (
                        <div className="popular-month-tags">
                          {place.tags.map((tag) => (
                            <span key={tag}>{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </div>

      <PlaceSaveModal saving={saving} />
    </>
  );
}

export default PopularAll;
