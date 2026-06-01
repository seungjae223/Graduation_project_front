import { useEffect, useRef, useState } from "react";
import "./StartPlaceModal.css";
import locationIcon from "../img/파랑색 위치.png";
import arrowIcon from "../img/위쪽 화살표.png";

const padDayNumber = (value) => String(value).padStart(2, "0");

const getPlaceImage = (place) => {
  return (
    place?.thumb ||
    place?.image ||
    place?.thumbnail ||
    place?.photo ||
    place?.imgUrl ||
    place?.imageUrl ||
    ""
  );
};

const getPlaceAddress = (place) => {
  return (
    place?.desc ||
    place?.address ||
    place?.roadAddress ||
    place?.addr ||
    ""
  );
};

const StartPlaceModal = ({
  open,
  selectedDates = [],
  placesByDate = {},
  activeDayIndex = 0,
  selectedStartPlaces = {},
  getDateKey,
  onChangeDay,
  onSelectPlace,
  onClose,
  onConfirm,
}) => {
  const [isPlaceDropdownOpen, setIsPlaceDropdownOpen] = useState(false);

  const dayScrollRef = useRef(null);
  const dayDragRef = useRef({
    isDragging: false,
    hasMoved: false,
    startX: 0,
    scrollLeft: 0,
  });

  useEffect(() => {
    if (open) {
      setIsPlaceDropdownOpen(false);
    }
  }, [open, activeDayIndex]);

  if (!open) return null;

  const activeDate = selectedDates[activeDayIndex] || selectedDates[0];
  const activeDateKey = activeDate ? getDateKey(activeDate) : "";
  const currentPlaces = activeDateKey ? placesByDate[activeDateKey] || [] : [];

  const activeSelectedId =
    selectedStartPlaces[activeDateKey] || currentPlaces[0]?.id || "";

  const isConfirmDisabled = selectedDates.some((date) => {
    const dateKey = getDateKey(date);
    const dayPlaces = placesByDate[dateKey] || [];

    if (dayPlaces.length === 0) {
      return false;
    }

    const selectedId = selectedStartPlaces[dateKey] || dayPlaces[0]?.id;

    return !dayPlaces.some((place) => place.id === selectedId);
  });

  const handleDayScrollMouseDown = (event) => {
    const scrollTarget = dayScrollRef.current;

    if (!scrollTarget) return;

    const canScroll = scrollTarget.scrollWidth > scrollTarget.clientWidth;

    if (!canScroll) return;

    dayDragRef.current = {
      isDragging: true,
      hasMoved: false,
      startX: event.clientX,
      scrollLeft: scrollTarget.scrollLeft,
    };

    scrollTarget.classList.add("is-dragging");
  };

  const handleDayScrollMouseMove = (event) => {
    const scrollTarget = dayScrollRef.current;
    const dragState = dayDragRef.current;

    if (!scrollTarget || !dragState.isDragging) return;

    const moveX = event.clientX - dragState.startX;

    if (Math.abs(moveX) > 5) {
      dragState.hasMoved = true;
      event.preventDefault();
    }

    scrollTarget.scrollLeft = dragState.scrollLeft - moveX;
  };

  const handleDayScrollMouseEnd = () => {
    const scrollTarget = dayScrollRef.current;

    dayDragRef.current.isDragging = false;

    if (scrollTarget) {
      scrollTarget.classList.remove("is-dragging");
    }
  };

  const handleDayScrollWheel = (event) => {
    const scrollTarget = dayScrollRef.current;

    if (!scrollTarget) return;

    const canScroll = scrollTarget.scrollWidth > scrollTarget.clientWidth;

    if (!canScroll) return;

    const delta =
      Math.abs(event.deltaX) > Math.abs(event.deltaY)
        ? event.deltaX
        : event.deltaY;

    if (!delta) return;

    event.preventDefault();
    scrollTarget.scrollLeft += delta;
  };

  const handleDayButtonClick = (event, index) => {
    if (dayDragRef.current.hasMoved) {
      event.preventDefault();
      event.stopPropagation();
      dayDragRef.current.hasMoved = false;
      return;
    }

    onChangeDay(index);
  };

  return (
    <div className="start-place-overlay" onClick={onClose}>
      <div
        className="start-place-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="start-place-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="start-place-header">
          <button
            type="button"
            className="start-place-back-btn"
            onClick={onClose}
            aria-label="출발 장소 설정 닫기"
          >
            ←
          </button>

          <h2 id="start-place-modal-title">출발 장소 설정</h2>
        </div>

        <div className="start-place-content">
          <div className="start-place-section-title-row">
            <strong>여행 일정 선택</strong>
            <span>Day 1 - Day {selectedDates.length}</span>
          </div>

          <div
            ref={dayScrollRef}
            className="start-place-day-scroll"
            onMouseDown={handleDayScrollMouseDown}
            onMouseMove={handleDayScrollMouseMove}
            onMouseUp={handleDayScrollMouseEnd}
            onMouseLeave={handleDayScrollMouseEnd}
            onWheel={handleDayScrollWheel}
          >
            {selectedDates.map((date, index) => {
              const dateKey = getDateKey(date);

              return (
                <button
                  key={dateKey}
                  type="button"
                  className={`start-place-day-pill ${
                    activeDayIndex === index ? "is-active" : ""
                  }`}
                  onClick={(event) => handleDayButtonClick(event, index)}
                >
                  <span>DAY</span>
                  <strong>{padDayNumber(index + 1)}</strong>
                </button>
              );
            })}
          </div>

          <div className="start-place-section-title-row start-place-list-title-row">
            <strong>출발지 지정</strong>
            <span>{currentPlaces.length}개의 장소 검색됨</span>
          </div>

          <section
            className={`start-place-list-card ${
              isPlaceDropdownOpen ? "is-open" : "is-closed"
            }`}
          >
            <button
              type="button"
              className="start-place-list-card-header"
              onClick={() => setIsPlaceDropdownOpen((prev) => !prev)}
              aria-expanded={isPlaceDropdownOpen}
            >
              <img
                src={locationIcon}
                alt=""
                className="start-place-header-icon-img"
              />

              <strong>현재 선택된 일정의 장소</strong>

              <img
                src={arrowIcon}
                alt=""
                className={`start-place-card-arrow-img ${
                  isPlaceDropdownOpen ? "is-open" : "is-closed"
                }`}
              />
            </button>

            {isPlaceDropdownOpen && (
              <div className="start-place-list">
                {currentPlaces.length > 0 ? (
                  currentPlaces.map((place) => {
                    const isSelected = place.id === activeSelectedId;
                    const placeImage = getPlaceImage(place);
                    const placeAddress = getPlaceAddress(place);

                    return (
                      <button
                        key={place.id}
                        type="button"
                        className={`start-place-item ${
                          isSelected ? "is-selected" : ""
                        }`}
                        aria-pressed={isSelected}
                        onClick={() => onSelectPlace(activeDateKey, place.id)}
                      >
                        <span className="start-place-thumb">
                          {placeImage ? (
                            <img src={placeImage} alt="" />
                          ) : (
                            <span>{place.name?.slice(0, 1) || "장"}</span>
                          )}
                        </span>

                        <span className="start-place-text">
                          <strong>{place.name}</strong>
                          <small>{placeAddress}</small>
                        </span>

                        <span
                          className={`start-place-radio ${
                            isSelected ? "is-selected" : ""
                          }`}
                        >
                          <span />
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <div className="start-place-empty">
                    이 날짜에는 선택된 장소가 없어요.
                    <br />
                    먼저 장소를 추가해 주세요.
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        <div className="start-place-actions">
          <button
            type="button"
            className="start-place-cancel-btn"
            onClick={onClose}
          >
            취소
          </button>

          <button
            type="button"
            className="start-place-confirm-btn"
            onClick={onConfirm}
            disabled={isConfirmDisabled}
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
};

export default StartPlaceModal;