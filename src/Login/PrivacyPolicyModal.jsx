import React from "react";
import { createPortal } from "react-dom";
import useModalFocus from "../utils/useModalFocus";
import "./PrivacyPolicyModal.css";

// No approved privacy/terms document or publication metadata is bundled with
// this app. Do not substitute location-service terms or today's date for it.
const PrivacyPolicyModal = ({ isOpen, onClose }) => {
  const dialogRef = useModalFocus({ open: isOpen, onClose, lockScroll: true });
  if (!isOpen) return null;

  return createPortal(
    <div className="privacy-modal-overlay">
      <div
        ref={dialogRef}
        className="privacy-modal privacy-modal--unavailable"
        role="dialog"
        aria-modal="true"
        aria-labelledby="privacy-policy-title"
        aria-describedby="privacy-policy-unavailable"
        tabIndex={-1}
      >
        <button
          type="button"
          className="privacy-modal-close"
          onClick={onClose}
          aria-label="이용약관 및 개인정보 처리방침 모달 닫기"
          data-modal-initial-focus
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6L18 18M18 6L6 18" />
          </svg>
        </button>

        <div className="privacy-modal-header">
          <p className="privacy-modal-brand">너만 오면 go</p>
          <h2 id="privacy-policy-title">이용약관 및 개인정보 처리방침</h2>
        </div>

        <div className="privacy-modal-content">
          <div className="privacy-notice-card">
            <p id="privacy-policy-unavailable">현재 이용약관 및 개인정보 처리방침 문서를 확인할 수 없어요.</p>
          </div>
        </div>

        <div className="privacy-modal-bottom">
          <button type="button" onClick={onClose}>닫기</button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default PrivacyPolicyModal;
