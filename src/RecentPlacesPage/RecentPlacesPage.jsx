import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import useReadQuery from "../utils/useReadQuery"; import useSessionKey from "../utils/useSessionKey"; import { getAuthSnapshot } from "../utils/authState"; import usePlaceSaving from "../utils/usePlaceSaving"; import PlaceSavingFeedback, { PlaceSaveModal } from "../components/PlaceSavingFeedback"; import PlacePhoto from "../components/PlacePhoto"; import { getPlaceTypeLabel } from "../utils/placeType";
import { getRecentPlacesApi } from "../api/placeApi";
import "./RecentPlacesPage.css";

function RecentPlacesPage() {
  const navigate = useNavigate();

  const account = useSessionKey();
  const query = useReadQuery(account + ":recent-places", signal => getRecentPlacesApi({ signal }), account !== "anonymous", () => getAuthSnapshot().accountKey === account);
  const saving = usePlaceSaving();
  const recentPlaces = useMemo(() => (query.data || []).filter(place => place && typeof place === "object" && (place.id ?? place.placeId) != null).map(place => ({
    ...place, id: place.id ?? place.placeId,
    name: place.name || place.title || place.placeName || "이름 없는 장소",
    title: place.title || place.name || place.placeName || "이름 없는 장소",
    desc: place.desc || place.address || "주소 정보 없음", address: place.address || place.desc || "주소 정보 없음",
    image: place.image || place.imageUrl || place.thumbnailUrl || place.thumbnail || place.thumb || place.photoUrl || "",
    placeType: place.placeType || place.category || place.type || "",
    viewedAt: place.viewedAt && Number.isFinite(Date.parse(place.viewedAt)) ? place.viewedAt : null,
  })), [query.data]);
  const groupedPlaces = useMemo(() => groupPlacesByDate(recentPlaces), [recentPlaces]);
  const handlePlaceClick = place => { if (place?.id) navigate('/detail?id=' + encodeURIComponent(place.id)); };

  const handleAddRoute = (e, place) => {
    e.stopPropagation();

    const routePlace = {
      id: place.id,
      placeId: place.id,
      sourceId: place.sourceId || `recent-${place.id}`,
      name: place.name || place.title || "이름 없는 장소",
      title: place.title || place.name || "이름 없는 장소",
      address: place.address || place.desc || "주소 정보 없음",
      desc: place.desc || place.address || "주소 정보 없음",
      image: place.image || place.thumb || "",
      thumb: place.thumb || place.image || "",
      category: place.category || place.type || "장소",
      type: place.type || place.category || "장소",
      rating: place.rating ?? null,
      tags: place.tags || [],
      latitude: place.latitude || place.lat || null,
      longitude: place.longitude || place.lng || null,
    };

    // 경로 생성 페이지에서 새로고침해도 장소가 남아있도록 임시 저장
    localStorage.setItem("routeSelectedPlace", JSON.stringify(routePlace));
    localStorage.setItem("routeDraftPlaces", JSON.stringify([routePlace]));

    // 네 App.jsx에는 /route-create가 등록되어 있으므로 여기로 이동해야 함
    navigate(`/route-create?placeId=${routePlace.id}`, {
      state: {
        selectedPlace: routePlace,
        routePlaces: [routePlace],
      },
    });
  };

  return (
    <main className="recent-places-page">
      <PlaceSavingFeedback saving={saving} /><PlaceSaveModal saving={saving} />
      {query.status === "loading" && <p role="status">최근 본 장소를 불러오는 중입니다.</p>}
      {query.status === "error" && <div role="alert"><p>최근 본 장소를 불러오지 못했습니다.</p><button type="button" onClick={query.retry}>다시 불러오기</button></div>}
      {query.status === "success" && groupedPlaces.length === 0 ? (
        <div className="recent-places-empty">
          <p>최근 본 장소가 없어요.</p>
        </div>
      ) : (
        groupedPlaces.map((group) => (
          <section className="recent-places-section" key={group.label}>
            <h2 className="recent-places-title">{group.label}</h2>

            <div className="recent-places-list">
              {group.items.map((place) => {
                const isBookmarked = saving.isSaved(place.id);

                return (
                  <article
                    className="recent-place-item"
                    key={place.id}
                    onClick={() => handlePlaceClick(place)}
                  >
                    <PlacePhoto src={place.image} alt={place.name} className="recent-place-thumb" />

                    <div className="recent-place-info">
                      <h3 className="recent-place-name"><Link to={`/detail?id=${encodeURIComponent(place.id)}`} onClick={event => event.stopPropagation()}>{place.name}</Link></h3>

                      <p className="recent-place-category">
                        {getPlaceTypeLabel(place.placeType)}
                      </p>

                      <div className="recent-place-actions">
                        <button
                          type="button"
                          className="recent-route-button"
                          onClick={(e) => handleAddRoute(e, place)}
                        >
                          <RouteIcon />
                          <span>경로 추가</span>
                        </button>

                        <button
                          type="button"
                          className={`recent-bookmark-button ${
                            isBookmarked ? "active" : ""
                          }`}
                          onClick={(e) => saving.toggle(e, place)}
                          aria-label={`${place.name} ${isBookmarked ? "저장 해제" : "저장"}`}
                          aria-pressed={isBookmarked}
                          disabled={saving.blocked || saving.folders.status === "loading"}
                        >
                          <BookmarkIcon active={isBookmarked} />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))
      )}
    </main>
  );
}

function groupPlacesByDate(places) {
  const today = new Date();

  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const groups = {};

  places.forEach((place) => {
    const viewedDate = new Date(place.viewedAt);
    const label = place.viewedAt ? getDateLabel(viewedDate, today, yesterday) : "조회 시각 미제공";

    if (!groups[label]) {
      groups[label] = [];
    }

    groups[label].push(place);
  });

  return Object.entries(groups).map(([label, items]) => ({
    label,
    items,
  }));
}

function getDateLabel(date, today, yesterday) {
  if (isSameDate(date, today)) {
    return "오늘";
  }

  if (isSameDate(date, yesterday)) {
    return "어제";
  }

  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function isSameDate(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function RouteIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M6.8 2.1C4.7 2.4 3.2 4.2 3.2 6.3C3.2 8.8 5.2 10.8 7.7 10.8H8.5C10.3 10.8 11.8 12.3 11.8 14.1"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M11.2 1.9V6.1"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M9.1 4H13.3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="7.7" cy="10.8" r="1.3" fill="currentColor" />
    </svg>
  );
}

function BookmarkIcon({ active }) {
  return (
    <svg width="18" height="22" viewBox="0 0 18 22" fill="none">
      <path
        d="M3.2 2.2H14.8C15.5 2.2 16.1 2.8 16.1 3.5V19.1L9 15.1L1.9 19.1V3.5C1.9 2.8 2.5 2.2 3.2 2.2Z"
        fill={active ? "currentColor" : "transparent"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default RecentPlacesPage;
