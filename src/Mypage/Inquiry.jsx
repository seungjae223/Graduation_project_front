

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Inquiry.css";
import api from "../api/api";
import useReadQuery from "../utils/useReadQuery"; import useSessionKey from "../utils/useSessionKey"; import { getAuthSnapshot } from "../utils/authState"; import { readInquiryList, inquiryErrorMessage } from "./inquiryData";

const ITEMS_PER_PAGE = 5;
const EMPTY_INQUIRIES = [];

const Inquiry = () => {
  const navigate = useNavigate();

  const [currentPage, setCurrentPage] = useState(1);
  const account = useSessionKey();
  const query = useReadQuery(account + ":inquiries", async signal => readInquiryList((await api.get("/api/inquiries", { signal })).data), account !== "anonymous", () => getAuthSnapshot().accountKey === account);
  const inquiries = query.data || EMPTY_INQUIRIES;
  const isLoading = query.status === "loading" && !query.data;
  const errorMessage = query.status === "error" ? inquiryErrorMessage(query.cause, "문의 목록을 불러오지 못했습니다. 다시 시도해 주세요.") : "";
  useEffect(() => { setCurrentPage(1); }, [account]);

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

  const handleCardKeyDown = (event, inquiry) => {
    if (event.target !== event.currentTarget) return;

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

          <div className="inquiry-write-area">
            <button type="button" className="inquiry-write-button" onClick={handleWriteInquiry}>
              문의하기
            </button>
          </div>

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
                <p className="inquiry-error-message" role="alert">{errorMessage}</p><button type="button" onClick={query.retry}>다시 불러오기</button>
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
              currentInquiries.map((inquiry) => {
                const isAnswered = inquiry.answered === true;

                return (
                  <article
                    key={inquiry.id}
                    className={`inquiry-card ${
                      "is-clickable"
                    }`}
                    role="button"
                    tabIndex={0}
                    onClick={
                      () => handleCheckAnswer(inquiry)
                    }
                    onKeyDown={(event) =>
                      handleCardKeyDown(event, inquiry)
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

                      {inquiry.date && (
                        <time className="inquiry-date">{inquiry.date}</time>
                      )}
                    </div>

                    <h2 className="inquiry-card-title">{inquiry.title}</h2>

                    <p className="inquiry-card-content">{inquiry.content}</p>

                    {(
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
                          {isAnswered ? "답변 확인하기" : "문의 내용 보기"}
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


      </section>
    </main>
  );
};

export default Inquiry;
