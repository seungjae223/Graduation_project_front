import useModalFocus from "../utils/useModalFocus";
import "./InputDialog.css";
export default function InputDialog({ open, title, label, value, onChange, onClose, onSubmit, busy, blocked, message, onRetry, submitLabel = "생성", maxLength }) {
  const ref = useModalFocus({ open, onClose, canClose: !busy, lockScroll: true });
  if (!open) return null;
  return <div className="input-dialog-backdrop"><form ref={ref} className="input-dialog" role="dialog" aria-modal="true" aria-labelledby="input-dialog-title" onSubmit={e => { e.preventDefault(); if (!busy && !blocked) onSubmit(); }}>
    <h2 id="input-dialog-title">{title}</h2><label htmlFor="input-dialog-value">{label}</label>
    <input id="input-dialog-value" data-modal-initial-focus value={value} maxLength={maxLength} disabled={busy || blocked} onChange={e => onChange(e.target.value)} />
    {message && <p role="status">{message}</p>}{onRetry && <button type="button" onClick={onRetry}>최신 목록 다시 확인</button>}
    <div className="input-dialog-actions"><button type="button" disabled={busy} onClick={onClose}>취소</button><button type="submit" disabled={busy || blocked}>{busy ? "처리 중..." : submitLabel}</button></div>
  </form></div>;
}
