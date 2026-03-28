import React, { useState } from "react";
import { useSavedPlaces } from "../Context/SavedPlacesContext";
import PlaceCard from "../components/PlaceCard";
import "./SavedPlaces.css";

const tabs = ["전체", "명소", "맛집", "숙소"];

function SavedPlaces() {
  const [activeTab, setActiveTab] = useState("전체");
  const { savedPlaces, clearSavedPlaces } = useSavedPlaces();

  const filteredPlaces =
    activeTab === "전체"
      ? savedPlaces
      : savedPlaces.filter((place) => place.tabType === activeTab);

  return (
    <div className="saved-places-page">
      <div className="saved-tab-bar">
        {tabs.map((tab) => (
          <button
            type="button"
            key={tab}
            className={`saved-tab ${activeTab === tab ? "active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {savedPlaces.length > 0 && (
        <div className="saved-actions">
          <button type="button" onClick={clearSavedPlaces}>
            전체 삭제
          </button>
        </div>
      )}

      {filteredPlaces.length === 0 ? (
        <div className="saved-empty">
          <p>저장한 장소가 없어요.</p>
          <span>추천 탭에서 하트를 누르면 여기에 표시돼요.</span>
        </div>
      ) : (
        <div className="saved-place-list">
          {filteredPlaces.map((place) => (
            <PlaceCard key={place.id} place={place} />
          ))}
        </div>
      )}
    </div>
  );
}

export default SavedPlaces;