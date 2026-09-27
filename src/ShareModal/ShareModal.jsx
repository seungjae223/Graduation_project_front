import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import useModalFocus from "../utils/useModalFocus";
import "./ShareModal.css";

const copyText = async (text) => {
  if (!text) {
    throw new Error("복사할 링크가 없습니다.");
  }

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  textarea.style.opacity = "0";

  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);

  if (!copied) {
    throw new Error("링크 복사 실패");
  }
};

function ShareModal({
  open,
  onClose,
  variant = "place", // place | theme | schedule
  shareUrl = "",
  previewTitle = "",
  previewSubtitle = "",
  previewImage = "",
  onSavePdf,
}) {
  const [copied, setCopied] = useState(false);
  const [isSavingPdf, setIsSavingPdf] = useState(false);
  const dialogRef = useModalFocus({
    open,
    onClose,
    canClose: !isSavingPdf,
    lockScroll: true,
  });

  const showPreviewCard = variant !== "schedule";

  const displayUrl = useMemo(() => {
    return (shareUrl || "").replace(/^https?:\/\//, "");
  }, [shareUrl]);

  const previewUrl = useMemo(() => {
    return displayUrl.toUpperCase();
  }, [displayUrl]);

  useEffect(() => {
    if (!copied) return undefined;

    const timer = window.setTimeout(() => {
      setCopied(false);
    }, 1400);

    return () => window.clearTimeout(timer);
  }, [copied]);

  if (!open) return null;

  const handleCopy = async () => {
    try {
      await copyText(shareUrl);
      setCopied(true);
    } catch (error) {
      console.error(error);
      alert("링크 복사에 실패했어요.");
    }
  };

  const handlePdf = async () => {
    if (typeof onSavePdf !== "function") {
      alert("PDF 저장 기능을 찾지 못했어요.");
      return;
    }

    try {
      setIsSavingPdf(true);
      await onSavePdf();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSavingPdf(false);
    }
  };

  return createPortal(
    <div className="share-modal-overlay" onClick={onClose}>
      <div
        ref={dialogRef}
        className="share-modal-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="공유하기"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="share-modal-header">
          <h2 className="share-modal-title">공유하기</h2>

          <button
            type="button"
            className="share-modal-close"
            onClick={onClose}
            aria-label="닫기"
            data-modal-initial-focus
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6L18 18M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="share-modal-actions">
          <button
            type="button"
            className="share-modal-action-card"
            onClick={handleCopy}
            aria-label="링크 복사"
          >
            <span className="share-modal-action-icon">
              <svg
                className="share-modal-copy-icon"
                viewBox="0 0 32 32"
                aria-hidden="true"
              >
                <rect x="10" y="6" width="15" height="18" rx="3" />
                <path d="M21 24v1a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V12a3 3 0 0 1 3-3h2" />
              </svg>
            </span>

            <span className="share-modal-action-label">
              {copied ? "복사됨" : "링크 복사"}
            </span>
          </button>

          <button
            type="button"
            className="share-modal-action-card"
            onClick={handlePdf}
            disabled={isSavingPdf}
            aria-label="PDF로 저장하기"
          >
            <span className="share-modal-action-icon">
              <svg
                className="share-modal-pdf-icon"
                viewBox="0 0 32 32"
                aria-hidden="true"
              >
                <path d="M8 3h11l6 6v20H8z" />
                <path d="M19 3v7h6" />
                <path d="M11 21h3.5a2.5 2.5 0 0 0 0-5H11v9M18 16h2.2a3 3 0 0 1 0 6H18zM26 16h-3v9M23 20h2.5" />
              </svg>
            </span>

            <span className="share-modal-action-label">
              {isSavingPdf ? "PDF 저장 중..." : "PDF로 저장하기"}
            </span>
          </button>
        </div>

        {showPreviewCard && (
          <div
            className={`share-modal-preview-card ${
              previewImage ? "has-image" : ""
            }`}
          >
            {previewImage && (
              <img
                className="share-modal-preview-image"
                src={previewImage}
                alt={previewTitle ? `${previewTitle} 대표 사진` : "대표 사진"}
              />
            )}

            <div className="share-modal-preview-info">
              <div className="share-modal-preview-title">
                {previewTitle || "장소 이름"}
              </div>

              <div className="share-modal-preview-subtitle">
                {previewSubtitle || "주소 정보"}
              </div>

              <div className="share-modal-preview-url">
                {previewUrl || "AZUREHORIZON.COM"}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

export default ShareModal;
