import React from "react";
import { useSavedPlaces } from "../Context/SavedPlacesContext";
import "./PlaceCard.css";

const HeartIcon = ({ filled }) => (
  <svg viewBox="0 0 24 24" className="heart-icon" aria-hidden="true">
    <path
      d="M12 21s-6.8-4.35-9.4-8.1C.3 9.55 1.1 5.2 5.4 4.3c2.3-.5 4.3.5 5.6 2.1 1.3-1.6 3.3-2.6 5.6-2.1 4.3.9 5.1 5.25 2.8 8.6C18.8 16.65 12 21 12 21z"
      fill={filled ? "#FF5A5F" : "#FFFFFF"}
      stroke={filled ? "#FF5A5F" : "#D7DEE8"}
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </svg>
);

function PlaceCard({ place }) {
  const { isSaved, toggleSavedPlace } = useSavedPlaces();

  const saved = isSaved(place?.id);
  const title = place?.title ?? "이름 없음";
  const address = place?.address ?? "주소 정보 없음";
  const badge = place?.badge ?? "PLACE";
  const image = place?.image ?? "";
  const rating = Number(place?.rating ?? 0);
  const reviewCount = Number(place?.reviewCount ?? 0);

  return (
    <article className="place-card">
      <div className="place-image-wrap">
        <img src={image} alt={title} className="place-image" />

        <button
          type="button"
          className="place-heart-btn"
          onClick={() => toggleSavedPlace(place)}
          aria-label={saved ? "저장 취소" : "저장"}
        >
          <HeartIcon filled={saved} />
        </button>
      </div>

      <div className="place-content">
        <span className="place-badge">{badge}</span>

        <h3 className="place-title">{title}</h3>

        <p className="place-address">{address}</p>

        <div className="place-rating">
          <span className="star">★</span>
          <span>{rating}</span>
          <span className="review-count">({reviewCount.toLocaleString()})</span>
        </div>

        <button type="button" className="route-add-btn">
          상세 보기
        </button>
      </div>
    </article>
  );
}

export default PlaceCard;