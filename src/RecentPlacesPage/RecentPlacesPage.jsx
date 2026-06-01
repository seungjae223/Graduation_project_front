import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getRecentPlaces } from "../utils/recentPlaces";
import "./RecentPlacesPage.css";

function RecentPlacesPage() {
  const navigate = useNavigate();

  const [bookmarkedIds, setBookmarkedIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("bookmarkedPlaceIds")) || [];
    } catch {
      return [];
    }
  });

  const recentPlaces = useMemo(() => {
    return getRecentPlaces()
      .map((place) => ({
        ...place,

        // Detail에서 title로 저장된 경우도 있어서 name으로 맞춰줌
        name: place.name || place.title || "이름 없는 장소",
        title: place.title || place.name || "이름 없는 장소",

        // RouteCreate에서 desc/thumb을 쓰는 경우도 있어서 같이 맞춰줌
        desc: place.desc || place.address || "주소 정보 없음",
        address: place.address || place.desc || "주소 정보 없음",
        image: place.image || place.thumb || "",
        thumb: place.thumb || place.image || "",

        viewedAt: place.viewedAt || new Date().toISOString(),
      }))
      .sort((a, b) => new Date(b.viewedAt) - new Date(a.viewedAt));
  }, []);

  const groupedPlaces = useMemo(() => {
    return groupPlacesByDate(recentPlaces);
  }, [recentPlaces]);

  const handlePlaceClick = (place) => {
    if (!place?.id) {
      return;
    }

    const detailPlace = {
      id: place.id,
      title: place.title || place.name || "이름 없는 장소",
      name: place.name || place.title || "이름 없는 장소",
      address: place.address || place.desc || "주소 정보 없음",
      image: place.image || place.thumb || "",
      rating: place.rating || 4.8,
      tags: place.tags || [],
      reviewCount: place.reviewCount || 980,
      category: place.category || place.type || "장소",
      type: place.type || place.category || "장소",
      latitude: place.latitude || place.lat || null,
      longitude: place.longitude || place.lng || null,
    };

    navigate(`/detail?id=${detailPlace.id}`, {
      state: {
        place: detailPlace,
      },
    });
  };

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
      rating: place.rating || null,
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

  const handleBookmark = (e, placeId) => {
    e.stopPropagation();

    setBookmarkedIds((prev) => {
      const isAlreadyBookmarked = prev.some(
        (id) => String(id) === String(placeId)
      );

      const next = isAlreadyBookmarked
        ? prev.filter((id) => String(id) !== String(placeId))
        : [...prev, placeId];

      localStorage.setItem("bookmarkedPlaceIds", JSON.stringify(next));
      return next;
    });
  };

  return (
    <main className="recent-places-page">
      {groupedPlaces.length === 0 ? (
        <div className="recent-places-empty">
          <p>최근 본 장소가 없어요.</p>
        </div>
      ) : (
        groupedPlaces.map((group) => (
          <section className="recent-places-section" key={group.label}>
            <h2 className="recent-places-title">{group.label}</h2>

            <div className="recent-places-list">
              {group.items.map((place) => {
                const isBookmarked = bookmarkedIds.some(
                  (id) => String(id) === String(place.id)
                );

                return (
                  <article
                    className="recent-place-item"
                    key={place.id}
                    onClick={() => handlePlaceClick(place)}
                  >
                    <PlaceThumb src={place.image} name={place.name} />

                    <div className="recent-place-info">
                      <h3 className="recent-place-name">{place.name}</h3>

                      <p className="recent-place-category">
                        {place.category || place.type || "장소"}
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
                          onClick={(e) => handleBookmark(e, place.id)}
                          aria-label="북마크"
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
    const label = getDateLabel(viewedDate, today, yesterday);

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

function PlaceThumb({ src, name }) {
  const [hasError, setHasError] = useState(false);

  if (src && !hasError) {
    return (
      <img
        className="recent-place-thumb"
        src={src}
        alt={name}
        onError={() => setHasError(true)}
      />
    );
  }

  return (
    <div className="recent-place-thumb recent-place-thumb-fallback">
      <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
        <path
          d="M24.8 42.6C24.8 42.6 23.9 28.5 29.7 19.4"
          stroke="#A6B38D"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M30.2 20.4C38.1 13.7 45.7 14.9 45.7 14.9C45.7 14.9 44.8 24.3 37.7 29C32.2 32.6 28.9 29.9 28.9 29.9C28.9 29.9 25.6 24.3 30.2 20.4Z"
          fill="#9CAB82"
        />
        <path
          d="M23.3 27.5C15.1 20.9 7.5 22.1 7.5 22.1C7.5 22.1 8.4 31.4 15.5 36.1C21 39.7 24.3 37.1 24.3 37.1C24.3 37.1 27.6 30.9 23.3 27.5Z"
          fill="#B9C2A3"
        />
      </svg>
    </div>
  );
}

function RouteIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M6.8 2.1C4.7 2.4 3.2 4.2 3.2 6.3C3.2 8.8 5.2 10.8 7.7 10.8H8.5C10.3 10.8 11.8 12.3 11.8 14.1"
        stroke="white"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M11.2 1.9V6.1"
        stroke="white"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M9.1 4H13.3"
        stroke="white"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="7.7" cy="10.8" r="1.3" fill="white" />
    </svg>
  );
}

function BookmarkIcon({ active }) {
  return (
    <svg width="18" height="22" viewBox="0 0 18 22" fill="none">
      <path
        d="M3.2 2.2H14.8C15.5 2.2 16.1 2.8 16.1 3.5V19.1L9 15.1L1.9 19.1V3.5C1.9 2.8 2.5 2.2 3.2 2.2Z"
        fill={active ? "#16A9F5" : "transparent"}
        stroke={active ? "#16A9F5" : "#9FB0C5"}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default RecentPlacesPage;