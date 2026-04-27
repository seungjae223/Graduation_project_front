import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "./AdminInquiryWrite.css";
import { getInquiryById, submitInquiryAnswer } from "../../utils/mockInquiry";

const formatDateTime = (dateString) => {
  const date = new Date(dateString);

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");

  return `${yyyy}.${mm}.${dd} ${hh}:${mi}`;
};

const AdminInquiryWrite = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const id = searchParams.get("id");

  const [inquiry, setInquiry] = useState(null);
  const [answer, setAnswer] = useState("");
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  useEffect(() => {
    if (!id) return;

    const foundInquiry = getInquiryById(id);

    if (foundInquiry) {
      setInquiry(foundInquiry);
      setAnswer(foundInquiry.answer || "");
    }
  }, [id]);

  if (!id || !inquiry) {
    return (
      <div className="admin-inquiry-write-page">
        <div className="admin-inquiry-write-card">
          <h2 className="admin-inquiry-error-title">
            문의 정보를 찾을 수 없습니다.
          </h2>

          <button
            type="button"
            className="admin-answer-submit-button"
            onClick={() => navigate("/admin/inquiry")}
          >
            목록으로 이동
          </button>
        </div>
      </div>
    );
  }

  const isAnswered = inquiry.status === "answered";

  const handleBackClick = () => {
    if (isAnswered) {
      navigate("/admin/inquiry?tab=answered");
      return;
    }

    navigate("/admin/inquiry?tab=pending");
  };

  const handleSubmit = () => {
    const trimmedAnswer = answer.trim();

    if (!trimmedAnswer) {
      alert("답변 내용을 입력해주세요.");
      return;
    }

    const updatedInquiry = submitInquiryAnswer(id, trimmedAnswer);

    if (updatedInquiry) {
      setInquiry(updatedInquiry);
      setAnswer(updatedInquiry.answer || trimmedAnswer);
    }

    setIsSuccessModalOpen(true);
  };

  const handleSuccessConfirm = () => {
    setIsSuccessModalOpen(false);
    navigate("/admin/inquiry?tab=answered", { replace: true });
  };

  return (
    <div className="admin-inquiry-write-page">
      <button
        type="button"
        className="admin-inquiry-back-button"
        onClick={handleBackClick}
      >
        목록으로
      </button>

      <section className="admin-inquiry-write-card">
        <p className="admin-inquiry-section-label">INQUIRY DETAILS</p>

        <div className="admin-inquiry-detail-header">
          <h2>{inquiry.title}</h2>
          <span>{formatDateTime(inquiry.createdAt)}</span>
        </div>

        <div className="admin-inquiry-customer-box">
          <div className="admin-inquiry-customer-avatar">
            {inquiry.customerName.slice(0, 1)}
          </div>

          <div className="admin-inquiry-customer-info">
            <strong>{inquiry.customerName}</strong>
            <span>{inquiry.customerEmail}</span>
            <span>{inquiry.customerGrade}</span>
          </div>
        </div>

        <div className="admin-inquiry-content-box">
          <p>{inquiry.content}</p>

          {inquiry.bookingNumber && (
            <p className="admin-inquiry-extra-line">
              예약 번호: {inquiry.bookingNumber}
            </p>
          )}

          {inquiry.checkInDate && (
            <p className="admin-inquiry-extra-line">
              체크인 예정일: {inquiry.checkInDate}
            </p>
          )}
        </div>
      </section>

      <section className="admin-answer-write-card">
        <p className="admin-inquiry-section-label">WRITE A RESPONSE</p>

        <textarea
          className="admin-answer-textarea"
          placeholder="문의 사항에 대한 답변을 입력해주세요."
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          readOnly={isAnswered}
        />

        {isAnswered && (
          <p className="admin-answer-done-message">
            이미 답변 완료된 문의입니다.
          </p>
        )}
      </section>

      <button
        type="button"
        className="admin-answer-submit-button"
        onClick={handleSubmit}
        disabled={isAnswered}
      >
        {isAnswered ? "답변 완료" : "답변 전송하기"}
      </button>

      {isSuccessModalOpen && (
        <div className="admin-success-modal-overlay">
          <div className="admin-success-modal">
            <div className="admin-success-icon-wrap">
              <div className="admin-success-icon">✓</div>
            </div>

            <h2 className="admin-success-title">답변이 전송되었습니다</h2>

            <p className="admin-success-message">
              사용자에게 성공적으로
              <br />
              답변이 전달되었습니다.
            </p>

            <button
              type="button"
              className="admin-success-confirm-button"
              onClick={handleSuccessConfirm}
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminInquiryWrite;