import { logSafeApiError } from "../utils/safeLog";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import useModalFocus from "../utils/useModalFocus";
import "./ShareModal.css";
import useSessionKey from "../utils/useSessionKey";

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

  let copied;
  try { copied = document.execCommand("copy"); } finally { textarea.remove(); }

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
  contextKey = shareUrl,
  exportBlockedReason = "",
}) {
  const account = useSessionKey();
  const [task, setTask] = useState({ status: "idle", kind: "", message: "" });
  const lock = useRef(null);
  const current = useRef({ open, contextKey, account }); current.current = { open, contextKey, account };
  const generation = useRef(0);
  useEffect(() => {
    const version = ++generation.current; lock.current = null;
    setTask({ status: "idle", kind: "", message: "" });
    return () => { generation.current = version + 1; lock.current = null; };
  }, [open, contextKey, account]);
  const busy = task.status === "running";
  const close = () => { if (!lock.current) onClose?.(); };
  const dialogRef = useModalFocus({ open, onClose: close, canClose: !busy, lockScroll: true });
  const showPreviewCard = variant !== "schedule";
  const previewUrl = useMemo(() => (shareUrl || "").replace(/^https?:\/\//, "").toUpperCase(), [shareUrl]);
  const execute = async kind => {
    if (lock.current) return;
    const version = generation.current;
    const operation = { version }; lock.current = operation;
    const initial = { open, contextKey, account };
    const isCurrent = () => generation.current === version && current.current.open &&
      current.current.contextKey === initial.contextKey && current.current.account === initial.account;
    setTask({ status: "running", kind, message: kind === "copy" ? "링크 복사 중..." : "PDF 생성 중... 처리 중에는 닫을 수 없습니다." });
    try {
      if (kind === "copy") await copyText(shareUrl);
      else {
        if (exportBlockedReason) throw new Error(exportBlockedReason);
        if (typeof onSavePdf !== "function") throw new Error("PDF 출력할 내용이 없습니다.");
        await onSavePdf({ isCurrent });
      }
      if (isCurrent()) setTask({ status: "success", kind, message: kind === "copy" ? "링크를 복사했어요." : "파일 저장 요청을 보냈어요. 저장 여부는 브라우저에서 확인해 주세요." });
    } catch (error) {
      if (isCurrent()) {
        logSafeApiError(error, "ShareModal.jsx");
        setTask({ status: "error", kind, message: kind === "copy" ? "자동 복사가 어려워요. 아래 링크를 직접 선택해 복사해 주세요." : exportBlockedReason || "PDF를 생성하지 못했어요. 다시 시도해 주세요." });
      }
    } finally { if (lock.current === operation) lock.current = null; }
  };
  const handleCopy = () => execute("copy");
  const handlePdf = () => execute("pdf");
  const copied = task.status === "success" && task.kind === "copy";
  const isSavingPdf = busy && task.kind === "pdf";
  if (!open) return null;
  return createPortal(
    <div className="share-modal-overlay" onClick={close}>
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
            onClick={close}
            disabled={busy}
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
            disabled={busy}
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
            disabled={busy || Boolean(exportBlockedReason)}
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

        {(task.message || exportBlockedReason) && <div className="share-modal-status" role="status"><p>{task.message || exportBlockedReason}</p>
          {task.status === "error" && <button type="button" onClick={() => execute(task.kind)}>다시 시도</button>}
          {task.status === "error" && task.kind === "copy" && <label>직접 복사할 링크<input aria-label="직접 복사할 링크" readOnly value={shareUrl} onFocus={event => event.target.select()} /></label>}
        </div>}
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
