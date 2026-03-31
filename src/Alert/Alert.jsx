import React, { useEffect, useMemo } from "react";
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
      title: title ?? preset.title,
      description: description ?? preset.description,
      primaryText: primaryText ?? preset.primaryText,
      secondaryText:
        secondaryText !== undefined ? secondaryText : preset.secondaryText,
    };
  }, [type, title, description, primaryText, secondaryText]);

  useEffect(() => {
    if (!open) return undefined;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

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

  return (
    <div className="alert-overlay" onClick={handleBackdropClick}>
      <div className="alert-modal" onClick={(e) => e.stopPropagation()}>
        {iconSrc ? (
          <div className={`alert-icon-wrap ${config.iconTone}`}>
            <img src={iconSrc} alt="" className="alert-icon-image" />
          </div>
        ) : null}

        <h2 className="alert-title">{config.title}</h2>

        {descriptionLines.length > 0 && (
          <p className="alert-description">
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
              >
                {config.primaryText}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Alert;