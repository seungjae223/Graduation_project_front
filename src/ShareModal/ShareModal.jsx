import React, { useEffect, useMemo, useState } from "react";
import copyIcon from "../img/복사.png";
import pdfIcon from "../img/pdf.png";
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
  onSavePdf,
}) {
  const [copied, setCopied] = useState(false);
  const [isSavingPdf, setIsSavingPdf] = useState(false);

  const showPreviewCard = variant !== "schedule";

  const displayUrl = useMemo(() => {
    return (shareUrl || "").replace(/^https?:\/\//, "");
  }, [shareUrl]);

  const previewUrl = useMemo(() => {
    return displayUrl.toUpperCase();
  }, [displayUrl]);

  useEffect(() => {
    if (!open) return undefined;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

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

  return (
    <div className="share-modal-overlay" onClick={onClose}>
      <div
        className="share-modal-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="공유하기"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="share-modal-header">
          <h2 className="share-modal-title">공유하기</h2>

          <button
            type="button"
            className="share-modal-close"
            onClick={onClose}
            aria-label="닫기"
          >
            ×
          </button>
        </div>

        <div className="share-modal-top-row">
          <div className="share-modal-url" title={shareUrl}>
            {displayUrl || "링크를 준비 중이에요."}
          </div>

          <button
            type="button"
            className="share-modal-copy-button"
            onClick={handleCopy}
          >
            <img src={copyIcon} alt="" aria-hidden="true" />
            <span>{copied ? "복사됨" : "링크 복사"}</span>
          </button>
        </div>

        <button
          type="button"
          className="share-modal-pdf-button"
          onClick={handlePdf}
          disabled={isSavingPdf}
        >
          <span className="share-modal-pdf-icon-box">
            <img src={pdfIcon} alt="" aria-hidden="true" />
          </span>
          <span>{isSavingPdf ? "PDF 저장 중..." : "PDF로 저장하기"}</span>
        </button>

        {showPreviewCard && (
          <div className="share-modal-preview-card">
            <div className="share-modal-preview-title">{previewTitle}</div>
            <div className="share-modal-preview-subtitle">
              {previewSubtitle}
            </div>
            <div className="share-modal-preview-url">{previewUrl}</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ShareModal;