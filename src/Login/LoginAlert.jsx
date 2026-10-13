import React, { useMemo } from "react";
import { createPortal } from "react-dom";
import useModalFocus from "../utils/useModalFocus";
import "./LoginAlert.css";

const LOGIN_ALERT_PRESETS = {
  emailError: {
    title: "이메일 형식 오류",
    message: "올바른 이메일 형식이 아닙니다.\n다시 확인해 주세요.",
    confirmText: "확인",
  },
  loginFail: {
    title: "로그인 실패",
    message: "이메일 또는 비밀번호를 다시 확인해 주세요.",
    confirmText: "확인",
  },
  networkError: {
    title: "네트워크 오류",
    message:
      "네트워크 연결이 불안정합니다.\n연결 상태를 확인하고 다시 시도해 주세요.",
    confirmText: "다시 시도",
  },
};

function LoginAlert({
  open = false,
  type = "emailError",
  iconSrc,
  confirmIconSrc,
  title,
  message,
  confirmText,
  onConfirm,
  onClose,
  closeOnBackdrop = true,
}) {
  const config = useMemo(() => {
    const preset = LOGIN_ALERT_PRESETS[type] || LOGIN_ALERT_PRESETS.emailError;

    return {
      ...preset,
      title: title ?? preset.title,
      message: message ?? preset.message,
      confirmText: confirmText ?? preset.confirmText,
    };
  }, [type, title, message, confirmText]);

  const dialogRef = useModalFocus({ open, onClose, lockScroll: true });

  if (!open) return null;

  const messageLines = config.message ? config.message.split("\n") : [];

  const handleBackdropClick = () => {
    if (!closeOnBackdrop) return;
    onClose?.();
  };

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
      return;
    }
    onClose?.();
  };

  return createPortal(
    <div className="login-alert-overlay" onClick={handleBackdropClick}>
      <div ref={dialogRef} className="login-alert-sheet" role="alertdialog" aria-modal="true"
        aria-labelledby="login-alert-title" aria-describedby={messageLines.length ? "login-alert-message" : undefined}
        tabIndex={-1} onClick={(e) => e.stopPropagation()}>
        <div className="login-alert-handle" />

        {iconSrc ? (
          <div className="login-alert-icon-wrap">
            <img src={iconSrc} alt="" className="login-alert-icon" />
          </div>
        ) : null}

        <h2 id="login-alert-title" className="login-alert-title">{config.title}</h2>

        {messageLines.length > 0 && (
          <p id="login-alert-message" className="login-alert-message">
            {messageLines.map((line, index) => (
              <React.Fragment key={`${line}-${index}`}>
                {line}
                {index !== messageLines.length - 1 && <br />}
              </React.Fragment>
            ))}
          </p>
        )}

        <button
          type="button"
          className="login-alert-confirm-btn"
          onClick={handleConfirm}
          data-modal-initial-focus
        >
          {confirmIconSrc ? (
            <img
              src={confirmIconSrc}
              alt=""
              className="login-alert-confirm-icon"
            />
          ) : null}
          {config.confirmText}
        </button>
      </div>
    </div>,
    document.body
  );
}

export default LoginAlert;
