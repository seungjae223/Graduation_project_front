

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import AnimatedHeart from "../AnimatedHeart/AnimatedHeart";
import useReadQuery from "../utils/useReadQuery";
import useSessionKey from "../utils/useSessionKey";
import { getAuthSnapshot } from "../utils/authState";
import { getPlacesApi } from "../api/placeApi";
import { getAvailableCountries, getPlaceCountry } from "../utils/placeCountry";
import { getPaginationItems } from "../utils/pagination";
import usePlaceSaving from "../utils/usePlaceSaving";
import PlaceSavingFeedback, { PlaceSaveModal } from "../components/PlaceSavingFeedback";
import "./PopularAll.css";

import PlacePhoto from "../components/PlacePhoto";


const EMPTY_PLACES = [];
const MORE_PLACES_PER_PAGE = 5;



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



function PopularAll() {

  const account = useSessionKey();
  const [selection, setSelection] = useState({ account, filter: "전체", page: 1 });
  const selectedFilter = selection.account === account ? selection.filter : "전체";
  const selectedPage = selection.account === account ? selection.page : 1;
  const moreHeadingRef = useRef(null);
  const filterDragRef = useRef(null);
  const ignoreCountryClick = useRef(false);
  const [isFilterDragging, setIsFilterDragging] = useState(false);
  const scrollRequested = useRef(false);
  const saving = usePlaceSaving();
  const { isSavingId } = saving;
  const listing = useReadQuery(`${account}:popular-all`, async signal => (await getPlacesApi({ signal })).map(normalizePlace)
    .sort((a, b) => Number(a.id) - Number(b.id)), true, () => getAuthSnapshot().accountKey === account);
  const places = listing.data || EMPTY_PLACES;
  const isLoaded = Boolean(listing.data);
  const availableCountries = useMemo(() => getAvailableCountries(places), [places]);
  const selectedUnavailable = selectedFilter !== "전체" && isLoaded && !availableCountries.includes(selectedFilter);
  const filterList = ["전체", ...availableCountries, ...(selectedUnavailable ? [selectedFilter] : [])];
  const unclassifiedCount = useMemo(() => places.filter(place => !getPlaceCountry(place)).length, [places]);

  const startFilterDrag = event => {
    ignoreCountryClick.current = false;
    const row = event.currentTarget;
    // Touch and pen use native scrolling, including vertical page gestures.
    if (event.pointerType !== "mouse" || event.button !== 0 || row.scrollWidth <= row.clientWidth) return;
    filterDragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      scrollLeft: row.scrollLeft,
      moved: false,
    };
  };
  const moveFilterDrag = event => {
    const drag = filterDragRef.current;
    if (!drag || event.pointerId !== drag.pointerId) return;
    const distance = event.clientX - drag.x;
    if (!drag.moved && (Math.abs(distance) < 8 || Math.abs(distance) <= Math.abs(event.clientY - drag.y))) return;
    const row = event.currentTarget;
    if (!drag.moved) {
      drag.moved = true;
      ignoreCountryClick.current = true;
      row.setPointerCapture?.(event.pointerId);
      setIsFilterDragging(true);
    }
    event.preventDefault();
    row.scrollLeft = Math.max(0, Math.min(drag.scrollLeft - distance, row.scrollWidth - row.clientWidth));
  };
  const finishFilterDrag = event => {
    const drag = filterDragRef.current;
    if (!drag || event.pointerId !== drag.pointerId) return;
    filterDragRef.current = null;
    setIsFilterDragging(false);
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const preventDraggedCountryClick = event => {
    // A completed drag must not select its starting button; keyboard activation remains available.
    if (ignoreCountryClick.current && event.detail > 0) {
      event.preventDefault();
      event.stopPropagation();
    }
    ignoreCountryClick.current = false;
  };

  const visiblePlaces = useMemo(() => {
    if (!isLoaded) {
      return [];
    }

    return places;
  }, [places, isLoaded]);

  const filteredPlaces = useMemo(() => {
    return visiblePlaces.filter((place) =>
      selectedFilter === "전체" || getPlaceCountry(place) === selectedFilter
    );
  }, [visiblePlaces, selectedFilter]);

  const hotPlaces = useMemo(() => {
    return filteredPlaces.slice(0, 4);
  }, [filteredPlaces]);

  const monthlyPlaces = useMemo(() => {
    return filteredPlaces.slice(4);
  }, [filteredPlaces]);
  const totalPages = Math.max(1, Math.ceil(monthlyPlaces.length / MORE_PLACES_PER_PAGE));
  const currentPage = Math.max(1, Math.min(selectedPage, totalPages));
  const pagePlaces = monthlyPlaces.slice((currentPage - 1) * MORE_PLACES_PER_PAGE, currentPage * MORE_PLACES_PER_PAGE);
  const pageItems = getPaginationItems(currentPage, totalPages);
  useEffect(() => {
    setSelection(previous => previous.account !== account ? { account, filter: "전체", page: 1 } :
      previous.page !== currentPage ? { ...previous, page: currentPage } : previous);
  }, [account, currentPage]);

  const selectCountry = filter => {
    scrollRequested.current = false;
    setSelection({ account, filter, page: 1 });
  };
  const changePage = page => {
    if (page === currentPage || page < 1 || page > totalPages) return;
    scrollRequested.current = true;
    setSelection({ account, filter: selectedFilter, page });
  };
  useEffect(() => {
    if (!scrollRequested.current) return;
    scrollRequested.current = false;
    moreHeadingRef.current?.focus({ preventScroll: true });
    moreHeadingRef.current?.scrollIntoView?.({
      behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start",
    });
  }, [currentPage]);

  const handleToggleSaved = saving.toggle;

  return (
    <>
      <div className="popular-all-page">
        <PlaceSavingFeedback saving={saving} />
        {listing.status === "loading" && !listing.data && <p role="status">장소를 불러오는 중...</p>}
        {listing.status === "error" && <div role="alert"><p>장소를 불러오지 못했어요.</p><button type="button" onClick={listing.retry}>목록 다시 조회</button></div>}
        <div id="popular-country-filters"
          className={`popular-filter-row${filterList.length > 4 ? " is-scrollable" : ""}${isFilterDragging ? " is-dragging" : ""}`}
          role="group" aria-label="국가별 장소 필터"
          onPointerDown={startFilterDrag} onPointerMove={moveFilterDrag} onPointerUp={finishFilterDrag}
          onPointerCancel={finishFilterDrag} onLostPointerCapture={finishFilterDrag}
          onPointerLeave={event => { if (!filterDragRef.current?.moved) finishFilterDrag(event); }}
          onClickCapture={preventDraggedCountryClick}>
          {filterList.map((filter) => (
            <button
              key={filter}
              type="button"
              className={`popular-filter-btn ${
                selectedFilter === filter ? "active" : ""
              }`}
              onClick={() => selectCountry(filter)}
              aria-pressed={selectedFilter === filter}
              aria-label={filter}
              title={filter}
              disabled={selectedUnavailable && filter === selectedFilter}
            >
              <span className="popular-filter-label">{filter}</span>
            </button>
          ))}
        </div>
        {selectedFilter === "전체" && unclassifiedCount > 0 && <p className="popular-country-notice">국가를 확인할 수 없는 장소는 전체 목록에서 확인할 수 있어요.</p>}
        {listing.status === "success" && !filteredPlaces.length && <div className="popular-empty" role="status">
          <p>{selectedFilter === "전체" ? "등록된 장소가 없어요." : `${selectedFilter}에 해당하는 장소가 없어요.`}</p>
          {selectedFilter !== "전체" && <button type="button" className="popular-filter-btn" onClick={() => selectCountry("전체")}>전체 장소 보기</button>}
        </div>}

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
          <section className="popular-month-section" aria-labelledby="popular-more-title">
            <h2 id="popular-more-title" ref={moreHeadingRef} tabIndex={-1}>더 많은 장소</h2>
            <p className="popular-page-summary" role="status" aria-live="polite">총 {monthlyPlaces.length}개 · {currentPage}/{totalPages} 페이지</p>

            <div className="popular-month-list">
              {pagePlaces.map((place) => {
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
            {totalPages > 1 && <nav className="popular-pagination" aria-label="더 많은 장소 페이지">
              <div className="popular-pagination-numbers">
                {pageItems.map(page => typeof page === "number" ? <button key={page} type="button"
                  className={`popular-page-btn ${page === currentPage ? "active" : ""}`}
                  aria-label={`${page}페이지`} aria-current={page === currentPage ? "page" : undefined}
                  onClick={() => changePage(page)}>{page}</button> : <span key={page} className="popular-page-gap" aria-hidden="true">…</span>)}
              </div>
              <div className="popular-pagination-navigation">
                <button type="button" className="popular-page-btn" disabled={currentPage === 1} onClick={() => changePage(currentPage - 1)}>이전</button>
                <button type="button" className="popular-page-btn" disabled={currentPage === totalPages} onClick={() => changePage(currentPage + 1)}>다음</button>
              </div>
            </nav>}
          </section>
        )}
      </div>

      <PlaceSaveModal saving={saving} />
    </>
  );
}

export default PopularAll;
