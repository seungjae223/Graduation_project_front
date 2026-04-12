import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import "./SearchPop.css";

const SearchIcon = () => (
  <svg
    width="28"
    height="28"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <circle cx="11" cy="11" r="6.5" stroke="#1698EC" strokeWidth="2.2" />
    <path
      d="M16 16L20 20"
      stroke="#1698EC"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
  </svg>
);

const PinIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M12 21C12 21 18 15.6 18 10.5C18 7.18629 15.3137 4.5 12 4.5C8.68629 4.5 6 7.18629 6 10.5C6 15.6 12 21 12 21Z"
      stroke="#72839B"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="10.5" r="2.2" stroke="#72839B" strokeWidth="2" />
  </svg>
);

const mockPlaces = [
  { id: 1, name: "경복궁", address: "서울 종로구" },
  { id: 2, name: "남산타워", address: "서울 용산구" },
  { id: 3, name: "광장시장", address: "서울 종로구" },
];

const SearchPop = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState("서울");

  const filteredPlaces = useMemo(() => {
    const value = keyword.trim().toLowerCase();

    if (!value) return [];

    return mockPlaces.filter((place) =>
      `${place.name} ${place.address}`.toLowerCase().includes(value)
    );
  }, [keyword]);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose?.();
    }
  };

  const handleDetailClick = () => {
    onClose?.();
    navigate("/detail");
  };

  return createPortal(
    <div
      className="search-pop-overlay"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label="검색 팝업"
    >
      <div className="search-pop-sheet">
        <div className="search-pop-inner">
          <div className="search-pop-search-box">
            <SearchIcon />
            <input
              type="text"
              className="search-pop-input"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="검색어를 입력하세요"
              autoFocus
            />
          </div>

          <div className="search-pop-result-header">
            <h2>검색 결과</h2>
            <span>{filteredPlaces.length}개 발견</span>
          </div>

          <div className="search-pop-list">
            {filteredPlaces.map((place) => (
              <div key={place.id} className="search-pop-card">
                <div className="search-pop-card-left">
                  <strong>{place.name}</strong>

                  <div className="search-pop-location">
                    <PinIcon />
                    <span>{place.address}</span>
                  </div>
                </div>

                <button
                  type="button"
                  className="search-pop-detail-btn"
                  onClick={handleDetailClick}
                >
                  상세보기
                </button>
              </div>
            ))}

            {filteredPlaces.length === 0 && (
              <div className="search-pop-empty">
                <p>검색 결과가 없습니다.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default SearchPop;