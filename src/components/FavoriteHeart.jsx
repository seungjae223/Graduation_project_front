import React from "react";
import "./FavoriteHeart.css";

// Keep disabled hearts visually stable while their server state is being confirmed.
export default function FavoriteHeart({ place, saving, className = "", confirmUnlike = false }) {
  const liked = saving.isLiked?.(place.id) === true;
  return <button type="button" className={`favorite-heart-button ${liked ? "liked" : ""} ${className}`.trim()}
    onClick={event => {
      event.stopPropagation();
      if (confirmUnlike && liked &&
          !window.confirm("좋아요를 해제하면 ‘좋아하는 장소’ 폴더에서 사라져요. 해제할까요?")) return;
      saving.toggleFavorite(event, place);
    }}
    disabled={Boolean(saving.favoriteBlocked)}
    aria-pressed={liked}
    aria-label={`${place.name || place.title} 좋아요 ${liked ? "해제" : "추가"}`}>
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M20.8 8.6c0 4.4-8.8 10-8.8 10s-8.8-5.6-8.8-10a4.9 4.9 0 0 1 8.8-2.8 4.9 4.9 0 0 1 8.8 2.8Z" />
    </svg>
  </button>;
}
