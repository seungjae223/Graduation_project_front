
import { logSafeApiError } from "../utils/safeLog";
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./InquiryWrite.css";
import mailIcon from "../img/메일.png";
import InquirySuccessModal from "./InquirySuccessModal";
import api from "../api/api";
import useSessionKey from "../utils/useSessionKey";
import { getAuthSnapshot } from "../utils/authState";
import useMutationTask from "../utils/useMutationTask";
import { readInquiryList } from "./inquiryData";



const InquiryWrite = () => {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const account = useSessionKey();
  const task = useMutationTask(account + ":create-inquiry");
  const isSubmitting = task.status === "running";
  const [checkedInquiries, setCheckedInquiries] = useState(null);
  const current = useRef(account); current.current = account;
  const mounted = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { if (task.status === "success") setIsSuccessModalOpen(true); }, [task.status]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (task.blocked || task.status === "success" || account === "anonymous") return;

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

    setErrorMessage(""); setCheckedInquiries(null);
    const payload = { title: trimmedTitle, content: trimmedContent };
    await task.run(async () => {
      try { await api.post("/api/inquiries", payload); }
      catch (error) { logSafeApiError(error, "InquiryWrite.jsx"); throw error; }
    }, async () => {
      const rows = readInquiryList((await api.get("/api/inquiries")).data);
      if (!mounted.current || current.current !== account || getAuthSnapshot().accountKey !== account) throw new Error("화면 변경");
      setCheckedInquiries(rows.filter(row => row.title === payload.title && row.content === payload.content));
      // Matching content cannot prove which request created it; do not unlock an uncertain write.
      return { confirmed: false };
    }, { failure: "문의 등록에 실패했습니다. 입력한 내용은 유지됩니다.", success: "문의가 등록되었습니다.", refreshFailure: "문의는 등록됐지만 목록을 확인하지 못했습니다. 입력한 내용은 유지됩니다." });
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
              readOnly={task.blocked || task.status === "success"}
              maxLength={255}
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
              readOnly={task.blocked || task.status === "success"}
              maxLength={255}
              placeholder="궁금한 점이나 불편한 사항을 자유롭게 적어주세요."
              onChange={(event) => {
                setContent(event.target.value);
                setErrorMessage("");
              }}
            />
          </label>

          {errorMessage && (
            <p className="inquiry-write-error-message" role="alert">{errorMessage}</p>
          )}
          {task.message && <p role="status">{task.message}</p>}
          {["unknown", "refreshError"].includes(task.status) && <button type="button" onClick={task.retryRead}>등록 결과 확인</button>}
          {checkedInquiries && ["unknown", "refreshError"].includes(task.status) && <div className="inquiry-write-result-check"><p>{checkedInquiries.length ? "같은 내용의 문의가 있습니다. 상세 내용을 확인해 주세요." : "같은 내용의 문의를 확인하지 못했습니다. 처리 결과는 아직 미확정입니다."}</p>{checkedInquiries.map(row => <a key={row.id} href={`/inquiry/${encodeURIComponent(row.id)}`} target="_blank" rel="noreferrer">문의 #{row.id} 새 창에서 확인</a>)}</div>}

          <button
            type="submit"
            className="inquiry-write-submit-button"
            disabled={task.blocked || task.status === "success"}
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
