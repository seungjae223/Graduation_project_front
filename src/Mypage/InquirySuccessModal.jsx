import { createPortal } from "react-dom";
import useModalFocus from "../utils/useModalFocus";
import "./InquirySuccessModal.css";

const InquirySuccessModal = ({ open, onConfirm }) => {
  const dialogRef = useModalFocus({
    open,
    onClose: onConfirm,
    lockScroll: true,
  });

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="inquiry-success-modal-overlay">
      <div
        ref={dialogRef}
        className="inquiry-success-modal-box"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="inquiry-success-modal-title"
        aria-describedby="inquiry-success-modal-description"
        tabIndex={-1}
      >
        <div className="inquiry-success-modal-icon-wrap" aria-hidden="true">
          <svg
            className="inquiry-success-modal-check-icon"
            viewBox="0 0 32 32"
          >
            <path d="M7 16.5L13 22L25 10" />
          </svg>
        </div>

        <h2 id="inquiry-success-modal-title">
          문의가 정상적으로 접수되었습니다.
        </h2>

        <p id="inquiry-success-modal-description">
          빠른 시일 내에 답변 드리겠습니다.
        </p>

        <button
          type="button"
          className="inquiry-success-modal-confirm-button"
          onClick={onConfirm}
          data-modal-initial-focus
        >
          확인
        </button>
      </div>
    </div>,
    document.body
  );
};

export default InquirySuccessModal;
