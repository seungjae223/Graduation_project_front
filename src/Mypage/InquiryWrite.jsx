import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./InquiryWrite.css";
import mailIcon from "../img/메일.png";
import InquirySuccessModal from "./InquirySuccessModal";
import api from "../api/api";

const getErrorMessage = (error, fallbackMessage) => {
  const data = error.response?.data;

  if (typeof data === "string") {
    return data;
  }

  return data?.message || data?.error || fallbackMessage;
};

const InquiryWrite = () => {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    if (!trimmedTitle) {
      setErrorMessage("제목을 입력해주세요.");
      return;
    }

    if (!trimmedContent) {
      setErrorMessage("문의 내용을 입력해주세요.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");

      await api.post("/api/inquiries", {
        title: trimmedTitle,
        content: trimmedContent,
      });

      setIsSuccessModalOpen(true);
    } catch (error) {
      console.error("문의사항 등록 실패:", error);

      if (error.message.includes("Network Error")) {
        setErrorMessage("백엔드 서버 연결 또는 CORS 설정을 확인해주세요.");
        return;
      }

      setErrorMessage(
        getErrorMessage(
          error,
          "문의사항 등록에 실패했습니다. 잠시 후 다시 시도해주세요."
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmSuccessModal = () => {
    setIsSuccessModalOpen(false);
    navigate("/inquiry");
  };

  return (
    <main className="inquiry-write-page">
      <section className="inquiry-write-screen">
        <header className="inquiry-write-header">
          <h1>문의 내용을 작성해주세요</h1>
          <p>궁금하신 점을 남겨주시면 성심껏 답변해 드리겠습니다.</p>
        </header>

        <form className="inquiry-write-form" onSubmit={handleSubmit}>
          <label className="inquiry-write-field">
            <span>제목</span>

            <input
              type="text"
              value={title}
              placeholder="제목을 입력해주세요"
              onChange={(event) => {
                setTitle(event.target.value);
                setErrorMessage("");
              }}
            />
          </label>

          <label className="inquiry-write-field">
            <span>내용</span>

            <textarea
              value={content}
              placeholder="궁금한 점이나 불편한 사항을 자유롭게 적어주세요."
              onChange={(event) => {
                setContent(event.target.value);
                setErrorMessage("");
              }}
            />
          </label>

          {errorMessage && (
            <p className="inquiry-write-error-message">{errorMessage}</p>
          )}

          <button
            type="submit"
            className="inquiry-write-submit-button"
            disabled={isSubmitting}
          >
            {isSubmitting ? "문의 등록 중..." : "문의하기"}
          </button>
        </form>

        <section className="inquiry-email-card">
          <div className="inquiry-email-icon-wrap">
            <img src={mailIcon} alt="" className="inquiry-email-icon" />
          </div>

          <div className="inquiry-email-text">
            <strong>이메일로 문의하기</strong>
            <p>빠른 답변이 필요하시면 이메일로도 문의가 가능합니다.</p>
            <a href="mailto:support@go-travel.kr">support@go-travel.kr</a>
          </div>
        </section>
      </section>

      <InquirySuccessModal
        open={isSuccessModalOpen}
        onConfirm={handleConfirmSuccessModal}
      />
    </main>
  );
};

export default InquiryWrite;