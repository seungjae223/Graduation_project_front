import PlacePhoto from "./PlacePhoto";
import FavoriteHeart from "./FavoriteHeart";
import { getPlacePhoto } from "../data/placePhotos";
import { getPlaceCategoryLabel } from "../utils/placeCategory";
import "./PlaceExploreCard.css";

// Shared card: the same places and actions look the same in search and destination explore.
// Action buttons stay separate from the detail action for keyboard and pointer users.
export default function PlaceExploreCard({ place, saving, onDetail, onSchedule, likeCount, confirmFavoriteRemoval = false }) {
  const folderBlocked = saving.blocked ||
    (saving.folders.account !== "anonymous" && saving.folders.status === "loading");
  return <article className="destination-place-card place-explore-card">
    <div className="destination-place-photo place-explore-photo">
      <PlacePhoto place={place} src={place.imageUrl || place.thumbnailUrl || place.image || place.imgUrl || place.photo || getPlacePhoto(place.name).image} alt={place.name} />
    </div>
    <div className="destination-place-body place-explore-body">
      <div className="destination-place-topline place-explore-topline">
        <span className="destination-place-kind">{place.region || "지역 미제공"} · {place.placeCategoryLabel || getPlaceCategoryLabel(place.placeCategory)}</span>
        <div className="place-explore-favorite-stack">
          <FavoriteHeart place={place} saving={saving} confirmUnlike={confirmFavoriteRemoval} />
          {Number.isSafeInteger(likeCount) && likeCount >= 0 &&
            <span className="place-explore-like-count" aria-label={`${place.name} 좋아요 ${likeCount}개`}>
              {likeCount.toLocaleString("ko-KR")}
            </span>}
        </div>
      </div>
      <h3>{place.name}</h3>
      <div className="destination-place-actions place-explore-actions">
        <div className="place-explore-inline-actions">
          <button type="button" className="destination-place-folder place-explore-action-link place-explore-folder"
            onClick={event => saving.openFolderPicker(event, place)} disabled={folderBlocked}
            title="폴더에 저장" aria-label={`${place.name} 폴더에 저장`}>
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 7.5a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M15.5 11v6M12.5 14h6"/></svg>
            <span>폴더 저장</span>
          </button>
          <span className="place-explore-divider" aria-hidden="true">|</span>
          <button type="button" className="destination-place-schedule place-explore-action-link place-explore-schedule"
            onClick={() => onSchedule(place)} aria-label={`${place.name} 일정에 추가`}>
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="4" y="5" width="16" height="16" rx="2"/><path d="M8 3v4M16 3v4M4 10h16M12 13v5M9.5 15.5h5"/></svg>
            <span>일정 추가</span>
          </button>
        </div>
        <button type="button" className="destination-place-detail place-explore-detail"
          onClick={() => onDetail(place)} aria-label={`${place.name} 상세 보기`}>
          상세 보기 <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  </article>;
}
