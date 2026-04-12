import React from "react";
import "./InquiryList.css";

const inquiryItems = [
  {
    id: 1,
    status: "done",
    statusText: "답변 완료",
    date: "2024.05.21",
    title: "동선 추천이 잘 안 돼요",
    content: "추천 알고리즘이 가끔 현재 위치를 제대로 반영하지 않는 것 같아요.",
  },
  {
    id: 2,
    status: "waiting",
    statusText: "대기 중",
    date: "2024.05.20",
    title: "장소 추가는 어떻게 하나요?",
    content: "내 일정에 새로운 카페를 추가하고 싶은데 메뉴를 어디서 눌러야 하나요?",
  },
  {
    id: 3,
    status: "done",
    statusText: "답변 완료",
    date: "2024.05.18",
    title: "비밀번호를 바꾸고 싶어요",
    content: "보안상의 이유로 비밀번호를 변경하려고 하는데 방법을 모르겠어요.",
  },
];

const InquiryList = () => {
  const handleAnswerClick = (id) => {
    console.log(`${id}번 문의 상세 페이지 연결 예정`);
  };

  const handleWriteClick = () => {
    console.log("문의 작성 페이지 연결 예정");
  };

  return (
    <div className="inquiry-list-page">
      <div className="inquiry-list-inner">
        <section className="inquiry-list-hero">
          <h1>
            궁금한 점이
            <br />
            해결되었나요?
          </h1>
          <p>고객님의 소중한 의견을 기다리고 있습니다.</p>
        </section>

        <section className="inquiry-card-list">
          {inquiryItems.map((item) => (
            <article key={item.id} className="inquiry-card">
              <div className="inquiry-card-top">
                <span
                  className={`inquiry-status ${
                    item.status === "done" ? "done" : "waiting"
                  }`}
                >
                  {item.statusText}
                </span>

                <span className="inquiry-date">{item.date}</span>
              </div>

              <h2 className="inquiry-card-title">{item.title}</h2>
              <p className="inquiry-card-desc">{item.content}</p>

              {item.status === "done" && (
                <>
                  <div className="inquiry-card-divider" />
                  <button
                    type="button"
                    className="inquiry-answer-btn"
                    onClick={() => handleAnswerClick(item.id)}
                  >
                    답변 확인하기
                    <span aria-hidden="true">›</span>
                  </button>
                </>
              )}
            </article>
          ))}
        </section>
      </div>

      <button
        type="button"
        className="inquiry-write-fab"
        onClick={handleWriteClick}
      >
        <span className="inquiry-write-plus">+</span>
        문의하기
      </button>
    </div>
  );
};

export default InquiryList;