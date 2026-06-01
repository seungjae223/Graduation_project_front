import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./InquiryWrite.css";
import mailIcon from "../img/메일.png";
import InquirySuccessModal from "./InquirySuccessModal";

const MOCK_INQUIRY_STORAGE_KEY = "mock_user_inquiries";

const InquiryWrite = () => {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  const saveMockInquiry = (newInquiry) => {
    try {
      const savedInquiries = JSON.parse(
        localStorage.getItem(MOCK_INQUIRY_STORAGE_KEY) || "[]"
      );

      localStorage.setItem(
        MOCK_INQUIRY_STORAGE_KEY,
        JSON.stringify([newInquiry, ...savedInquiries])
      );
    } catch (error) {
      console.error("문의사항 목업 저장 실패:", error);
    }
  };

  const handleSubmit = (event) => {
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

    const newInquiry = {
      id: Date.now(),
      status: "pending",
      statusText: "대기 중",
      date: new Date().toISOString().slice(0, 10).replaceAll("-", "."),
      title: trimmedTitle,
      content: trimmedContent,
      answer: null,
    };

    saveMockInquiry(newInquiry);
    setErrorMessage("");
    setIsSuccessModalOpen(true);
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

          <button type="submit" className="inquiry-write-submit-button">
            문의하기
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