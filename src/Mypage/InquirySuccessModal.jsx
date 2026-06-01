import { useEffect } from "react";
import { createPortal } from "react-dom";
import "./InquirySuccessModal.css";
import checkIcon from "../img/체크.png";

const InquirySuccessModal = ({ open, onConfirm }) => {
  useEffect(() => {
    if (!open) return undefined;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="inquiry-success-modal-overlay">
      <div
        className="inquiry-success-modal-box"
        role="dialog"
        aria-modal="true"
        aria-labelledby="inquiry-success-modal-title"
      >
        <div className="inquiry-success-modal-icon-wrap">
          <img
            src={checkIcon}
            alt=""
            className="inquiry-success-modal-check-icon"
          />
        </div>

        <h2 id="inquiry-success-modal-title">
          문의가 정상적으로 접수되었습니다.
        </h2>

        <p>빠른 시일 내에 답변 드리겠습니다.</p>

        <button
          type="button"
          className="inquiry-success-modal-confirm-button"
          onClick={onConfirm}
        >
          확인
        </button>
      </div>
    </div>,
    document.body
  );
};

export default InquirySuccessModal;