import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Inquiry.css";
import api from "../api/api";

const ITEMS_PER_PAGE = 5;

const formatDate = (value) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toISOString().slice(0, 10);
};

const getInquiryArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.inquiries)) return data.inquiries;
  if (Array.isArray(data?.items)) return data.items;

  return [];
};

const normalizeInquiry = (inquiry) => {
  const rawStatus = String(inquiry.status || "").toLowerCase();
  const hasAnswer = Boolean(inquiry.answer || inquiry.reply || inquiry.answerContent);

  const isAnswered =
    hasAnswer ||
    rawStatus === "answered" ||
    rawStatus === "complete" ||
    rawStatus === "completed" ||
    rawStatus === "done" ||
    rawStatus === "답변완료";

  return {
    id: inquiry.id || inquiry.inquiryId || inquiry.questionId,
    title: inquiry.title || inquiry.subject || "제목 없음",
    content: inquiry.content || inquiry.question || inquiry.body || "",
    answer: inquiry.answer || inquiry.reply || inquiry.answerContent || "",
    date: formatDate(inquiry.createdAt || inquiry.date || inquiry.createdDate),
    status: isAnswered ? "answered" : "waiting",
    statusText:
      inquiry.statusText || inquiry.statusName || (isAnswered ? "답변 완료" : "답변 대기"),
    originalData: inquiry,
  };
};

const getErrorMessage = (error, fallbackMessage) => {
  const data = error.response?.data;

  if (typeof data === "string") {
    return data;
  }

  return data?.message || data?.error || fallbackMessage;
};

const Inquiry = () => {
  const navigate = useNavigate();

  const [currentPage, setCurrentPage] = useState(1);
  const [inquiries, setInquiries] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const fetchInquiries = async () => {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const response = await api.get("/api/inquiries");
        const inquiryArray = getInquiryArray(response.data);

        setInquiries(inquiryArray.map(normalizeInquiry));
        setCurrentPage(1);
      } catch (error) {
        console.error("문의사항 목록 조회 실패:", error);

        if (error.message.includes("Network Error")) {
          setErrorMessage("백엔드 서버 연결 또는 CORS 설정을 확인해주세요.");
          return;
        }

        setErrorMessage(
          getErrorMessage(
            error,
            "문의사항 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요."
          )
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchInquiries();
  }, []);

  const totalPages = Math.ceil(inquiries.length / ITEMS_PER_PAGE);

  const currentInquiries = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;

    return inquiries.slice(startIndex, endIndex);
  }, [inquiries, currentPage]);

  const handleWriteInquiry = () => {
    navigate("/inquiry/write");
  };

  const handleCheckAnswer = (inquiry) => {
    navigate(`/inquiry/${inquiry.id}`, {
      state: {
        inquiry,
      },
    });
  };

  const handleCardKeyDown = (event, inquiry, isAnswered) => {
    if (!isAnswered) return;

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleCheckAnswer(inquiry);
    }
  };

  const handlePrevPage = () => {
    setCurrentPage((prevPage) => Math.max(prevPage - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prevPage) => Math.min(prevPage + 1, totalPages));
  };

  return (
    <main className="inquiry-page">
      <section className="inquiry-screen">
        <div className="inquiry-content">
          <header className="inquiry-title-section">
            <h1>
              궁금한 점이
              <br />
              해결되었나요?
            </h1>

            <p>고객님의 소중한 의견을 기다리고 있습니다.</p>
          </header>

          <section className="inquiry-list" aria-label="문의사항 목록">
            {isLoading && (
              <article className="inquiry-card">
                <p className="inquiry-card-content">
                  문의사항을 불러오는 중입니다.
                </p>
              </article>
            )}

            {!isLoading && errorMessage && (
              <article className="inquiry-card">
                <p className="inquiry-card-content">{errorMessage}</p>
              </article>
            )}

            {!isLoading && !errorMessage && currentInquiries.length === 0 && (
              <article className="inquiry-card">
                <p className="inquiry-card-content">
                  등록된 문의사항이 없습니다.
                </p>
              </article>
            )}

            {!isLoading &&
              !errorMessage &&
              currentInquiries.map((inquiry) => {
                const isAnswered =
                  inquiry.status === "answered" && Boolean(inquiry.answer);

                return (
                  <article
                    key={inquiry.id}
                    className={`inquiry-card ${
                      isAnswered ? "is-clickable" : ""
                    }`}
                    role={isAnswered ? "button" : undefined}
                    tabIndex={isAnswered ? 0 : undefined}
                    onClick={
                      isAnswered ? () => handleCheckAnswer(inquiry) : undefined
                    }
                    onKeyDown={(event) =>
                      handleCardKeyDown(event, inquiry, isAnswered)
                    }
                  >
                    <div className="inquiry-card-top">
                      <span
                        className={`inquiry-status-badge ${
                          isAnswered ? "is-done" : "is-waiting"
                        }`}
                      >
                        {inquiry.statusText}
                      </span>

                      <time className="inquiry-date">{inquiry.date}</time>
                    </div>

                    <h2 className="inquiry-card-title">{inquiry.title}</h2>

                    <p className="inquiry-card-content">{inquiry.content}</p>

                    {isAnswered && (
                      <>
                        <div className="inquiry-card-divider" />

                        <button
                          type="button"
                          className="inquiry-answer-button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleCheckAnswer(inquiry);
                          }}
                        >
                          답변 확인하기
                          <span aria-hidden="true">›</span>
                        </button>
                      </>
                    )}
                  </article>
                );
              })}
          </section>

          {!isLoading && !errorMessage && totalPages > 1 && (
            <nav className="inquiry-pagination" aria-label="문의사항 페이지 이동">
              <button
                type="button"
                className="inquiry-page-button inquiry-page-arrow"
                onClick={handlePrevPage}
                disabled={currentPage === 1}
              >
                이전
              </button>

              {Array.from({ length: totalPages }, (_, index) => {
                const pageNumber = index + 1;

                return (
                  <button
                    type="button"
                    key={pageNumber}
                    className={`inquiry-page-button ${
                      currentPage === pageNumber ? "is-active" : ""
                    }`}
                    onClick={() => setCurrentPage(pageNumber)}
                  >
                    {pageNumber}
                  </button>
                );
              })}

              <button
                type="button"
                className="inquiry-page-button inquiry-page-arrow"
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
              >
                다음
              </button>
            </nav>
          )}
        </div>

        <div className="inquiry-write-area">
          <button
            type="button"
            className="inquiry-write-button"
            onClick={handleWriteInquiry}
          >
            <span className="inquiry-write-icon" aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                width="19"
                height="19"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M4.5 5.5H19.5V15.5H8.4L4.5 19V5.5Z"
                  fill="white"
                />
                <path
                  d="M9 10.5H15"
                  stroke="#18A8ED"
                  strokeWidth="2.1"
                  strokeLinecap="round"
                />
                <path
                  d="M12 7.5V13.5"
                  stroke="#18A8ED"
                  strokeWidth="2.1"
                  strokeLinecap="round"
                />
              </svg>
            </span>

            문의하기
          </button>
        </div>
      </section>
    </main>
  );
};

export default Inquiry;