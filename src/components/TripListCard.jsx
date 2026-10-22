import React from "react";
import "./TripListCard.css";

// Material Design's recognizable top-view airliner silhouette: wings and tail are explicit.
function Airplane() {
  return <svg className="v15-ticket-plane" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="currentColor" d="M21 16v-2l-8-5V3.5C13 2.67 12.33 2 11.5 2S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5L21 16Z" />
  </svg>;
}

export default function TripListCard({
  trip, onOpen, featured = false, past = false, editing = false,
  selected = false, onToggleSelected, deleting = false,
}) {
  const name = trip.title || "여행 일정";
  const location = trip.location || trip.destination || "";
  const dateText = trip.dateText ||
    [trip.startDate, trip.endDate].filter(Boolean).join(" ~ ");
  return <article className={[
    "v15-trip-card", featured && "is-featured", past && "is-past",
    editing && "is-editing", selected && "is-selected",
  ].filter(Boolean).join(" ")}>
    <div className="v15-ticket-paper">
      <button type="button" className="v15-trip-card-open"
        aria-label={name + (editing ? " 선택" : " 일정 보기")}
        aria-pressed={editing ? selected : undefined}
        disabled={deleting}
        onClick={() => editing ? onToggleSelected?.(trip) : onOpen(trip)}>
        <span className="v15-trip-copy">
          {past ? <span className="v15-past-boarding-label">BOARDING PASS</span> :
            <span className="v15-trip-card-status">{trip.dday || "날짜 확인 필요"}</span>}
          <span role="heading" aria-level="3" className="v15-ticket-title">{name}</span>
          <span className="v15-trip-card-date">{dateText}</span>
          {location && <span className="v15-trip-card-location">
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M12 2a8 8 0 0 0-8 8c0 5.2 8 12 8 12s8-6.8 8-12a8 8 0 0 0-8-8Zm0 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z" /></svg>
            {location}
          </span>}
        </span>
        {!past && <span className="v15-ticket-flight-zone" aria-hidden="true">
          <span className="v15-ticket-airplane"><Airplane /></span>
          <span className="v15-ticket-barcode" />
        </span>}
        {editing && <span className="v15-trip-select-indicator" aria-hidden="true">{selected ? "✓" : ""}</span>}
      </button>
    </div>
  </article>;
}
