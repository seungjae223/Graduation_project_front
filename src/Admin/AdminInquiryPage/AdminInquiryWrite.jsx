

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useSearchParams } from "react-router-dom";
import "./AdminInquiryWrite.css";
import api from "../../api/api";
import useReadQuery from "../../utils/useReadQuery"; import useMutationTask from "../../utils/useMutationTask"; import useSessionKey from "../../utils/useSessionKey"; import { getAuthSnapshot } from "../../utils/authState"; import { readInquiryList, inquiryErrorMessage } from "../../Mypage/inquiryData";
import useModalFocus from "../../utils/useModalFocus";

const formatDateTime = (dateString) => {
  if (!dateString) return "날짜 없음";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "날짜 없음";
  }

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");

  return `${yyyy}.${mm}.${dd} ${hh}:${mi}`;
};



const AdminSuccessModal = ({ open, onConfirm }) => {
  const dialogRef = useModalFocus({
    open,
    onClose: onConfirm,
    lockScroll: true,
  });

  if (!open) return null;

  return createPortal(
    <div className="admin-success-modal-overlay">
      <div
        ref={dialogRef}
        className="admin-success-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="admin-success-title"
        aria-describedby="admin-success-description"
        tabIndex={-1}
      >
        <div className="admin-success-icon-wrap" aria-hidden="true">
          <svg className="admin-success-icon" viewBox="0 0 32 32">
            <path d="M7 16.5L13 22L25 10" />
          </svg>
        </div>

        <h2 id="admin-success-title" className="admin-success-title">
          답변이 전송되었습니다
        </h2>

        <p id="admin-success-description" className="admin-success-message">
          사용자에게 성공적으로
          <br />
          답변이 전달되었습니다.
        </p>

        <button
          type="button"
          className="admin-success-confirm-button"
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


const AdminInquiryWrite = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");
  const account = useSessionKey();
  const key = account + ":admin-answer:" + id;
  const current = useRef(key); current.current = key;
  const mounted = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const query = useReadQuery(key, async signal => {
    const rows = readInquiryList((await api.get("/api/inquiries/admin", { signal })).data);
    const found = rows.find(item => String(item.id) === String(id));
    if (!found) throw Object.assign(new Error("문의 없음"), { response: { status: 404 } });
    return found;
  }, Boolean(id) && account !== "anonymous", () => getAuthSnapshot().accountKey === account);
  const [draft, setDraft] = useState({ key, value: "", initialized: false });
  const answer = draft.key === key ? draft.value : "";
  useEffect(() => {
    if (query.status === "success") setDraft(previous => previous.key === key && previous.initialized ? previous : { key, value: query.data.answer || "", initialized: true });
  }, [key, query.status, query.data]);
  const task = useMutationTask(key);
  const [verified, setVerified] = useState({ key, inquiry: null });
  const inquiry = verified.key === key && verified.inquiry ? verified.inquiry : query.data;
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [validation, setValidation] = useState("");
  useEffect(() => { if (task.status === "success") setIsSuccessModalOpen(true); }, [task.status]);
  const isAnswered = Boolean(inquiry?.answered);
  const canEdit = query.status === "success" && !isAnswered && !task.blocked && task.status !== "success";
  const handleSubmit = async () => {
    if (!canEdit || !id || !inquiry || current.current !== key) return;
    const value = answer.trim();
    if (!value) { setValidation("답변 내용을 입력해주세요."); return; }
    setValidation("");
    await task.run(() => api.post('/api/inquiries/admin/' + encodeURIComponent(id) + '/answer', value, { headers: { "Content-Type": "text/plain" } }), async () => {
      const latest = readInquiryList((await api.get("/api/inquiries/admin")).data).find(item => String(item.id) === String(id));
      if (!mounted.current || current.current !== key || getAuthSnapshot().accountKey !== account || !latest) throw new Error("문의 상태 확인 실패");
      setVerified({ key, inquiry: latest });
      return { confirmed: latest.answer === value && latest.answered };
    }, { failure: "답변 전송에 실패했습니다. 작성한 내용은 유지됩니다.", success: "답변이 등록되었습니다.", refreshFailure: "답변은 전송됐지만 최신 상태를 확인하지 못했습니다. 작성한 내용은 유지됩니다." });
  };
  const handleBackClick = () => navigate(isAnswered ? "/admin/inquiry?tab=answered" : "/admin/inquiry?tab=pending");
  if (!id || (!inquiry && query.status !== "loading")) return <div className="admin-inquiry-write-page"><div className="admin-inquiry-write-card"><h2 className="admin-inquiry-error-title" role="alert">{!id ? "문의 정보를 찾을 수 없습니다." : inquiryErrorMessage(query.cause, "문의 정보와 권한을 확인하지 못했습니다.")}</h2>{id && <button type="button" className="admin-answer-submit-button" onClick={query.retry}>다시 불러오기</button>}<button type="button" className="admin-answer-submit-button" onClick={() => navigate("/admin/inquiry")}>목록으로 이동</button></div></div>;
  if (!inquiry) return <div className="admin-inquiry-write-page"><div className="admin-inquiry-write-card"><h2 className="admin-inquiry-error-title" role="status">문의 정보를 불러오는 중입니다.</h2></div></div>;
  return <div className="admin-inquiry-write-page">
    <button type="button" className="admin-inquiry-back-button" onClick={handleBackClick}>목록으로</button>
    {query.status === "error" && <div role="alert"><p>{inquiryErrorMessage(query.cause, "최신 문의 정보와 권한을 확인하지 못했습니다. 전송할 수 없습니다.")}</p><button type="button" onClick={query.retry}>다시 불러오기</button></div>}
    {query.status === "loading" && <p role="status">최신 문의 정보를 확인하는 중입니다.</p>}
    <section className="admin-inquiry-write-card">
      <p className="admin-inquiry-section-label">INQUIRY DETAILS</p>
      <div className="admin-inquiry-detail-header"><h2>{inquiry.title}</h2>{inquiry.createdAt && <span>{formatDateTime(inquiry.createdAt)}</span>}</div>
      <div className="admin-inquiry-customer-box"><div className="admin-inquiry-customer-avatar">{(inquiry.customerName || inquiry.userEmail || "고객").slice(0, 1)}</div><div className="admin-inquiry-customer-info"><strong>{inquiry.customerName || "고객"}</strong><span>{inquiry.userEmail || "이메일 정보 없음"}</span>{inquiry.customerGrade && <span>{inquiry.customerGrade}</span>}</div></div>
      <div className="admin-inquiry-content-box"><p>{inquiry.content}</p>{inquiry.bookingNumber && <p className="admin-inquiry-extra-line">예약 번호: {inquiry.bookingNumber}</p>}{inquiry.checkInDate && <p className="admin-inquiry-extra-line">체크인 예정일: {inquiry.checkInDate}</p>}</div>
    </section>
    <section className="admin-answer-write-card"><label htmlFor="admin-inquiry-answer" className="admin-inquiry-section-label">{isAnswered ? "문의 답변" : "WRITE A RESPONSE"}</label>
      <textarea id="admin-inquiry-answer" className="admin-answer-textarea" placeholder="문의 사항에 대한 답변을 입력해주세요." value={answer} maxLength={255} onChange={event => { setDraft({ key, value: event.target.value, initialized: true }); setValidation(""); }} readOnly={!canEdit} />
      {isAnswered && <p className="admin-answer-done-message">{inquiry.answer ? "이미 답변 완료된 문의입니다." : "답변 완료 상태이지만 답변 내용이 제공되지 않았습니다."}</p>}
      {validation && <p role="alert">{validation}</p>}{task.message && <p role="status">{task.message}</p>}
      {["unknown", "refreshError"].includes(task.status) && <button type="button" onClick={task.retryRead}>답변 결과 확인</button>}
      {task.status === "unknown" && verified.inquiry && <p>최신 답변이 작성한 내용과 일치하지 않습니다. 처리 결과는 아직 미확정입니다.</p>}
    </section>
    <button type="button" className="admin-answer-submit-button" onClick={handleSubmit} disabled={!canEdit}>{isAnswered ? "답변 완료" : task.status === "running" ? "전송 중..." : "답변 전송하기"}</button>
    <AdminSuccessModal open={isSuccessModalOpen} onConfirm={() => { setIsSuccessModalOpen(false); navigate("/admin/inquiry?tab=answered", { replace: true }); }} />
  </div>;
};
export default AdminInquiryWrite;
