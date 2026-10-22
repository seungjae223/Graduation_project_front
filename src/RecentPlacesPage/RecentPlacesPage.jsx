import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import useReadQuery from "../utils/useReadQuery";
import useSessionKey from "../utils/useSessionKey";
import { getAuthSnapshot } from "../utils/authState";
import usePlaceSaving from "../utils/usePlaceSaving";
import PlaceSavingFeedback, { PlaceSaveModal } from "../components/PlaceSavingFeedback";
import PlaceExploreCard from "../components/PlaceExploreCard";
import { getRecentPlacesApi } from "../api/placeApi";
import "./RecentPlacesPage.css";

export default function RecentPlacesPage() {
  const navigate = useNavigate();
  const account = useSessionKey();
  const query = useReadQuery(account + ":recent-places",
    signal => getRecentPlacesApi({ signal }), account !== "anonymous",
    () => getAuthSnapshot().accountKey === account);
  const saving = usePlaceSaving();
  // The server supplies most-recent-first; do not invent view dates or re-sort it.
  const recentPlaces = useMemo(() => (query.data || [])
    .filter((place, index, rows) => place && typeof place === "object" &&
      (place.id ?? place.placeId) != null &&
      rows.findIndex(item => String(item?.id ?? item?.placeId) === String(place.id ?? place.placeId)) === index)
    .slice(0, 20)
    .map(place => ({
      ...place, id: place.id ?? place.placeId,
      name: place.name || place.title || place.placeName || "이름 없는 장소",
      image: place.image || place.imageUrl || place.thumbnailUrl || place.thumbnail || place.thumb || place.photoUrl || "",
      placeCategory: place.placeCategory || "",
      placeCategoryLabel: place.placeCategoryLabel || "장소",
    })), [query.data]);
  const handlePlaceClick = place => navigate("/detail?id=" + encodeURIComponent(place.id));
  const handleAddRoute = place => {

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
      latitude: place.latitude ?? place.lat ?? null,
      longitude: place.longitude ?? place.lng ?? null,
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

  return <main className="v14-recent-page">
    <PlaceSavingFeedback saving={saving} suppressFolderLoading />
    <PlaceSaveModal saving={saving} />
    <header className="v14-recent-heading">
      <h1>최근 본 장소</h1>
      <p>최근 조회한 장소 최대 20개</p>
    </header>
    {query.status === "loading" && !query.data &&
      <p role="status" className="v14-recent-status">최근 본 장소를 불러오는 중...</p>}
    {query.status === "error" && <div role="alert" className="v14-recent-status">
      <p>최근 본 장소를 불러오지 못했어요.</p>
      <button type="button" onClick={query.retry}>다시 불러오기</button>
    </div>}
    {query.status === "success" && recentPlaces.length === 0 &&
      <div className="v14-recent-empty">
        <h2>최근 본 장소가 없어요.</h2>
        <p>관심 있는 여행지를 둘러보면 여기에 표시돼요.</p>
        <Link to="/search">장소 찾아보기</Link>
      </div>}
    <ul className="v14-recent-cards">
      {recentPlaces.map((place, index) => <li key={`${place.id}-${index}`}>
        <PlaceExploreCard place={place} saving={saving}
          onDetail={handlePlaceClick} onSchedule={handleAddRoute} />
      </li>)}
    </ul>
  </main>;
}
