import React, { useState } from "react";
import "./Inquiry.css";

const AUTH_KEY = "mock_current_user";
const INQUIRIES_KEY = "mock_inquiries";

const getCurrentUser = () => {
  try {
    const localUser = localStorage.getItem(AUTH_KEY);
    if (localUser) return JSON.parse(localUser);

    const sessionUser = sessionStorage.getItem(AUTH_KEY);
    if (sessionUser) return JSON.parse(sessionUser);

    return null;
  } catch (error) {
    return null;
  }
};

const readInquiries = () => {
  try {
    return JSON.parse(localStorage.getItem(INQUIRIES_KEY) || "[]");
  } catch (error) {
    return [];
  }
};

const MailIcon = () => (
  <svg
    viewBox="0 0 24 24"
    width="24"
    height="24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M4 7.5C4 6.67 4.67 6 5.5 6H18.5C19.33 6 20 6.67 20 7.5V16.5C20 17.33 19.33 18 18.5 18H5.5C4.67 18 4 17.33 4 16.5V7.5Z"
      fill="currentColor"
    />
    <path
      d="M5 8L12 13L19 8"
      stroke="white"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const Inquiry = () => {
  const [form, setForm] = useState({
    title: "",
    content: "",
  });

  const handleChange = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const title = form.title.trim();
    const content = form.content.trim();

    if (!title || !content) {
      alert("제목과 내용을 입력해주세요.");
      return;
    }

    const currentUser = getCurrentUser();
    const inquiries = readInquiries();

    const newInquiry = {
      id: Date.now().toString(),
      title,
      content,
      status: "pending",
      createdAt: new Date().toISOString(),
      userId: currentUser?.id || "",
      userName: currentUser?.name || "",
      userEmail: currentUser?.email || "",
    };

    localStorage.setItem(
      INQUIRIES_KEY,
      JSON.stringify([newInquiry, ...inquiries])
    );

    alert("문의가 접수되었습니다.");
    setForm({
      title: "",
      content: "",
    });
  };

  return (
    <div className="inquiry-page">
      <section className="inquiry-section">
        <h1 className="inquiry-title">문의 내용을 작성해주세요</h1>
        <p className="inquiry-subtitle">
          궁금하신 점을 남겨주시면 정성껏 답변해 드리겠습니다.
        </p>

        <form className="inquiry-form" onSubmit={handleSubmit}>
          <label className="inquiry-label" htmlFor="inquiry-title">
            제목
          </label>
          <input
            id="inquiry-title"
            type="text"
            className="inquiry-input"
            placeholder="제목을 입력해주세요"
            value={form.title}
            onChange={(e) => handleChange("title", e.target.value)}
          />

          <label className="inquiry-label" htmlFor="inquiry-content">
            내용
          </label>
          <textarea
            id="inquiry-content"
            className="inquiry-textarea"
            placeholder="궁금한 점이나 불편한 사항을 자유롭게 적어주세요."
            value={form.content}
            onChange={(e) => handleChange("content", e.target.value)}
          />

          <button type="submit" className="inquiry-submit">
            문의하기
          </button>
        </form>

        <div className="inquiry-email-card">
          <div className="inquiry-email-icon">
            <MailIcon />
          </div>

          <div className="inquiry-email-body">
            <h2 className="inquiry-email-title">이메일로 문의하기</h2>
            <p className="inquiry-email-text">
              빠른 답변이 필요하시다면 이메일로도 문의가 가능합니다.
            </p>
            <a
              className="inquiry-email-link"
              href="mailto:support@go-travel.kr"
            >
              support@go-travel.kr
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Inquiry;