import { getApiErrorMessage as safeApiErrorMessage } from "../../api/api";
import { logSafeApiError } from "../../utils/safeLog";
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import "./AdminInquiryWrite.css";
import api from "../../api/api";
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

const getInquiryArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.inquiries)) return data.inquiries;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.response)) return data.response;

  return [];
};

const normalizeInquiry = (inquiry) => {
  const rawStatus = String(inquiry.status || "").toLowerCase();

  const answer =
    inquiry.answer ||
    inquiry.reply ||
    inquiry.answerContent ||
    inquiry.answerText ||
    "";

  const userEmail = inquiry.userEmail || inquiry.email || inquiry.customerEmail || "";

  const customerName =
    inquiry.customerName ||
    inquiry.name ||
    inquiry.nickname ||
    (userEmail ? userEmail.split("@")[0] : "고객");

  const isAnswered =
    inquiry.answered === true ||
    inquiry.isAnswered === true ||
    Boolean(answer) ||
    rawStatus === "answered" ||
    rawStatus === "complete" ||
    rawStatus === "completed" ||
    rawStatus === "done" ||
    rawStatus === "답변완료" ||
    rawStatus === "답변 완료";

  return {
    id: inquiry.id ?? inquiry.inquiryId ?? inquiry.questionId,
    title: inquiry.title || inquiry.subject || "제목 없음",
    content: inquiry.content || inquiry.question || inquiry.body || "",
    answer,
    status: isAnswered ? "answered" : "pending",
    answered: isAnswered,
    createdAt:
      inquiry.createdAt ||
      inquiry.createdDate ||
      inquiry.date ||
      inquiry.updatedAt ||
      "",
    customerName,
    customerEmail: userEmail || "이메일 정보 없음",
    customerGrade: inquiry.customerGrade || inquiry.grade || "일반 회원",
    bookingNumber: inquiry.bookingNumber || "",
    checkInDate: inquiry.checkInDate || "",
    originalData: inquiry,
  };
};

const getErrorMessage = safeApiErrorMessage;

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
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const id = searchParams.get("id");

  const [inquiry, setInquiry] = useState(null);
  const [answer, setAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  useEffect(() => {
    if (!id) return;

    const stateInquiry = location.state?.inquiry;

    if (stateInquiry && String(stateInquiry.id) === String(id)) {
      const normalizedStateInquiry = normalizeInquiry(stateInquiry);
      setInquiry(normalizedStateInquiry);
      setAnswer(normalizedStateInquiry.answer || "");
    }

    const fetchInquiry = async () => {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const response = await api.get("/api/inquiries/admin");
        const inquiryArray = getInquiryArray(response.data);

        const foundInquiry = inquiryArray.find((item) => {
          const itemId = item.id ?? item.inquiryId ?? item.questionId;
          return String(itemId) === String(id);
        });

        if (!foundInquiry) {
          setErrorMessage("문의 정보를 찾을 수 없습니다.");
          return;
        }

        const normalizedInquiry = normalizeInquiry(foundInquiry);

        setInquiry(normalizedInquiry);
        setAnswer(normalizedInquiry.answer || "");
      } catch (error) {
        logSafeApiError(error, "AdminInquiryWrite.jsx");

        if (error.message.includes("Network Error")) {
          setErrorMessage("네트워크 연결을 확인한 뒤 다시 시도해주세요.");
          return;
        }

        if (error.response?.status === 401 || error.response?.status === 403) {
          setErrorMessage(
            "관리자 권한이 없거나 로그인 정보가 만료되었습니다. 다시 로그인해주세요."
          );
          return;
        }

        setErrorMessage(
          getErrorMessage(
            error,
            "문의 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요."
          )
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchInquiry();
  }, [id, location.state]);

  const handleBackClick = () => {
    if (inquiry?.status === "answered") {
      navigate("/admin/inquiry?tab=answered");
      return;
    }

    navigate("/admin/inquiry?tab=pending");
  };

  const handleSubmit = async () => {
    if (!id || !inquiry) return;

    const trimmedAnswer = answer.trim();

    if (!trimmedAnswer) {
      alert("답변 내용을 입력해주세요.");
      return;
    }

    try {
      setIsSubmitting(true);

      await api.post(
        `/api/inquiries/admin/${id}/answer`,
        trimmedAnswer,
        {
          headers: {
            "Content-Type": "text/plain",
          },
        }
      );

      setInquiry((prev) => ({
        ...prev,
        answer: trimmedAnswer,
        answered: true,
        status: "answered",
      }));

      setAnswer(trimmedAnswer);
      setIsSuccessModalOpen(true);
    } catch (error) {
      logSafeApiError(error, "AdminInquiryWrite.jsx");

      if (error.message.includes("Network Error")) {
        alert("네트워크 연결을 확인한 뒤 다시 시도해주세요.");
        return;
      }

      if (error.response?.status === 401 || error.response?.status === 403) {
        alert("관리자 권한이 없거나 로그인 정보가 만료되었습니다. 다시 로그인해주세요.");
        return;
      }

      alert(
        getErrorMessage(
          error,
          "답변 전송에 실패했습니다. 잠시 후 다시 시도해주세요."
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuccessConfirm = () => {
    setIsSuccessModalOpen(false);
    navigate("/admin/inquiry?tab=answered", { replace: true });
  };

  if (!id) {
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

  if (isLoading && !inquiry) {
    return (
      <div className="admin-inquiry-write-page">
        <div className="admin-inquiry-write-card">
          <h2 className="admin-inquiry-error-title">
            문의 정보를 불러오는 중입니다.
          </h2>
        </div>
      </div>
    );
  }

  if (errorMessage && !inquiry) {
    return (
      <div className="admin-inquiry-write-page">
        <div className="admin-inquiry-write-card">
          <h2 className="admin-inquiry-error-title">{errorMessage}</h2>

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

  if (!inquiry) {
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
          maxLength={255}
          onChange={(e) => setAnswer(e.target.value)}
          readOnly={isAnswered || isSubmitting}
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
        disabled={isAnswered || isSubmitting}
      >
        {isAnswered ? "답변 완료" : isSubmitting ? "전송 중..." : "답변 전송하기"}
      </button>

      <AdminSuccessModal
        open={isSuccessModalOpen}
        onConfirm={handleSuccessConfirm}
      />
    </div>
  );
};

export default AdminInquiryWrite;
