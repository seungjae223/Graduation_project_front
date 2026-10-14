import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import useModalFocus from "../utils/useModalFocus";
import PlacePhoto from "../components/PlacePhoto";
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
  isSubmitting = false,
  submitError = "",
  progressText = "생성 중...",
  submitBlocked = false,
}) => {
  const [isPlaceDropdownOpen, setIsPlaceDropdownOpen] = useState(false);
  const dialogRef = useModalFocus({
    open,
    onClose,
    canClose: !isSubmitting,
    lockScroll: true,
  });

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
    selectedStartPlaces[activeDateKey] || currentPlaces.find(place => !place.isFixedTime)?.id || "";

  const isConfirmDisabled = selectedDates.some((date) => {
    const dateKey = getDateKey(date);
    const dayPlaces = placesByDate[dateKey] || [];

    if (dayPlaces.length === 0) {
      return false;
    }

    const selectedId = selectedStartPlaces[dateKey] || dayPlaces.find(place => !place.isFixedTime)?.id;

    return !dayPlaces.some((place) => place.id === selectedId && !place.isFixedTime);
  });

  const handleRequestClose = () => {
    if (isSubmitting) return;
    onClose?.();
  };

  const handleDayScrollMouseDown = (event) => {
    if (isSubmitting) return;

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
    if (isSubmitting) return;

    if (dayDragRef.current.hasMoved) {
      event.preventDefault();
      event.stopPropagation();
      dayDragRef.current.hasMoved = false;
      return;
    }

    onChangeDay(index);
  };

  return createPortal(
    <div className="start-place-overlay" onClick={handleRequestClose}>
      <div
        ref={dialogRef}
        className="start-place-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="start-place-modal-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="start-place-header">
          <button
            type="button"
            className="start-place-back-btn"
            onClick={handleRequestClose}
            aria-label="출발 장소 설정 닫기"
            disabled={isSubmitting}
            data-modal-initial-focus
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M15 6L9 12L15 18" />
            </svg>
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
                  disabled={isSubmitting}
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
          <p className="start-place-time-limit">출발 시간은 오전 10시입니다. 고정 시간이 있는 장소는 출발지로 선택할 수 없어요. 해당 장소의 고정 시간을 해제하거나 다른 출발지를 선택해 주세요.</p>

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
              aria-controls="start-place-list"
              disabled={isSubmitting}
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
              <div id="start-place-list" className="start-place-list">
                {currentPlaces.length > 0 ? (
                  currentPlaces.map((place) => {
                    const isSelected = place.id === activeSelectedId;
                    const placeImage = getPlaceImage(place);
                    const placeAddress = getPlaceAddress(place);

                    return (
                      <div
                        key={place.id}
                        className={`start-place-item ${
                          isSelected ? "is-selected" : ""
                        }`}
                        aria-disabled={isSubmitting || place.isFixedTime || undefined}
                      >
                        <span className="start-place-thumb">
                          <PlacePhoto place={place} src={placeImage} alt={place.name || "장소"} className="start-place-photo" />
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
                        <button type="button" className="place-photo-card-action" aria-pressed={isSelected}
                          aria-label={place.isFixedTime ? `${place.name} (고정 시간 설정으로 출발지 선택 불가)` : place.name}
                          onClick={() => onSelectPlace(activeDateKey, place.id)} disabled={isSubmitting || place.isFixedTime} />
                      </div>
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

          {submitError && (
            <p className="start-place-error-message">{submitError}</p>
          )}
        </div>

        <div className="start-place-actions">
          <button
            type="button"
            className="start-place-cancel-btn"
            onClick={handleRequestClose}
            disabled={isSubmitting}
          >
            취소
          </button>

          <button
            type="button"
            className="start-place-confirm-btn"
            onClick={onConfirm}
            disabled={isConfirmDisabled || isSubmitting || submitBlocked}
          >
            {isSubmitting ? progressText : "확인"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default StartPlaceModal;
