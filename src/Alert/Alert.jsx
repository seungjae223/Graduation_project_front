import React, { useMemo } from "react";
import { createPortal } from "react-dom";
import useModalFocus from "../utils/useModalFocus";
import "./Alert.css";

const ALERT_PRESETS = {
  logout: {
    title: "로그아웃 하시겠습니까?",
    description: "",
    iconTone: "blue",
    primaryText: "로그아웃",
    secondaryText: "취소",
    primaryVariant: "blue",
    secondaryVariant: "gray",
    buttonLayout: "stack",
  },
  network: {
    title: "네트워크 오류",
    description:
      "네트워크 연결이 불안정합니다.\n연결 상태를 확인하고 다시 시도해 주세요.",
    iconTone: "red",
    primaryText: "다시 시도",
    secondaryText: "",
    primaryVariant: "blue",
    secondaryVariant: "gray",
    buttonLayout: "single",
  },
  delete: {
    title: "장소 삭제",
    description: "선택한 장소를 일정에서 삭제할까요?",
    iconTone: "red",
    primaryText: "삭제하기",
    secondaryText: "취소",
    primaryVariant: "red",
    secondaryVariant: "gray",
    buttonLayout: "row",
  },
  success: {
    title: "삭제되었습니다",
    description: "",
    iconTone: "blue",
    primaryText: "확인",
    secondaryText: "",
    primaryVariant: "blue",
    secondaryVariant: "gray",
    buttonLayout: "single",
  },
};

function Alert({
  open = false,
  type = "logout",
  iconSrc,
  primaryButtonIconSrc,
  title,
  description,
  primaryText,
  secondaryText,
  onPrimary,
  onSecondary,
  onClose,
  closeOnBackdrop = true,
}) {
  const config = useMemo(() => {
    const preset = ALERT_PRESETS[type] || ALERT_PRESETS.logout;

    return {
      ...preset,
      iconSrc: iconSrc ?? preset.iconSrc,
      title: title ?? preset.title,
      description: description ?? preset.description,
      primaryText: primaryText ?? preset.primaryText,
      secondaryText:
        secondaryText !== undefined ? secondaryText : preset.secondaryText,
    };
  }, [type, iconSrc, title, description, primaryText, secondaryText]);
  const dialogRef = useModalFocus({ open, onClose, lockScroll: true });

  if (!open) return null;

  const handleBackdropClick = () => {
    if (!closeOnBackdrop) return;
    onClose?.();
  };

  const handleSecondaryClick = () => {
    if (onSecondary) {
      onSecondary();
      return;
    }

    onClose?.();
  };

  const descriptionLines = config.description
    ? config.description.split("\n")
    : [];

  return createPortal(
    <div className="alert-overlay" onClick={handleBackdropClick}>
      <div
        ref={dialogRef}
        className="alert-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="common-alert-title"
        aria-describedby={descriptionLines.length > 0 ? "common-alert-description" : undefined}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        {config.iconSrc || type === "delete" ? (
          <div className={`alert-icon-wrap ${config.iconTone}`}>
            {config.iconSrc ? (
              <img src={config.iconSrc} alt="" className="alert-icon-image" />
            ) : (
              <svg
                className="alert-icon-image alert-trash-icon"
                viewBox="0 0 32 32"
                aria-hidden="true"
              >
                <path d="M8 10h16M13 6h6l1.5 4h-9zM10 10l1.2 16h9.6L22 10M14 14v8M18 14v8" />
              </svg>
            )}
          </div>
        ) : null}

        <h2 id="common-alert-title" className="alert-title">
          {config.title}
        </h2>

        {descriptionLines.length > 0 && (
          <p id="common-alert-description" className="alert-description">
            {descriptionLines.map((line, index) => (
              <React.Fragment key={`${line}-${index}`}>
                {line}
                {index !== descriptionLines.length - 1 && <br />}
              </React.Fragment>
            ))}
          </p>
        )}

        <div className={`alert-actions ${config.buttonLayout}`}>
          {config.buttonLayout === "stack" && (
            <>
              <button
                type="button"
                className={`alert-btn primary ${config.primaryVariant}`}
                onClick={onPrimary}
                data-modal-initial-focus
              >
                {config.primaryText}
              </button>

              {config.secondaryText ? (
                <button
                  type="button"
                  className={`alert-btn secondary ${config.secondaryVariant}`}
                  onClick={handleSecondaryClick}
                >
                  {config.secondaryText}
                </button>
              ) : null}
            </>
          )}

          {config.buttonLayout === "single" && (
            <button
              type="button"
              className={`alert-btn primary ${config.primaryVariant}`}
              onClick={onPrimary}
              data-modal-initial-focus
            >
              {primaryButtonIconSrc ? (
                <img
                  src={primaryButtonIconSrc}
                  alt=""
                  className="alert-btn-icon"
                />
              ) : null}

              {config.primaryText}
            </button>
          )}

          {config.buttonLayout === "row" && (
            <>
              {config.secondaryText ? (
                <button
                  type="button"
                  className={`alert-btn secondary ${config.secondaryVariant}`}
                  onClick={handleSecondaryClick}
                >
                  {config.secondaryText}
                </button>
              ) : null}

              <button
                type="button"
                className={`alert-btn primary ${config.primaryVariant}`}
                onClick={onPrimary}
                data-modal-initial-focus
              >
                {config.primaryText}
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default Alert;
