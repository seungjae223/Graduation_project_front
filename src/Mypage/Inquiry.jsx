import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Inquiry.css";
import { getInquiryList } from "./inquiryMockData";

const ITEMS_PER_PAGE = 5;

const Inquiry = () => {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);

  const inquiries = useMemo(() => {
    return getInquiryList();
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
            {currentInquiries.map((inquiry) => {
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

          {totalPages > 1 && (
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