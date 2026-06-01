import React, { useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import "./InquiryDetail.css";
import { getInquiryList } from "./inquiryMockData";

import customerCenterIcon from "../img/고객센터.png";
import verifyIcon from "../img/인증.png";

const DEFAULT_ANSWER = {
  team: "너만 오면 go 운영팀",
  date: "2024.05.22 오후 4:45",
  intro:
    "안녕하세요, 고객님! Azure Horizon '너만 오면 go' 서비스를 이용해 주셔서 감사합니다.",
  body:
    "문의하신 내용에 대해 안내드립니다. 현재 해당 이슈를 확인하였으며, 서비스 이용 중 불편이 발생하지 않도록 관련 기능을 점검하고 있습니다.",
  progressTitle: "진행 현황",
  progressText: "서비스 기능 점검 및 데이터 동기화 확인 완료",
  outro:
    "현재 조치가 완료되어 다시 앱을 실행하시면 정상적으로 서비스를 이용하실 수 있습니다. 서비스 이용에 불편을 드려 죄송하며, 앞으로 더욱 안정적인 여행 경험을 제공하기 위해 노력하겠습니다.",
  end: "추가적인 궁금증이 있으시면 언제든 문의해 주세요. 감사합니다!",
};

const normalizeInquiryId = (value, id) => {
  if (!value) return `AZ-R-${String(id || 1).padStart(3, "0")}`;
  return String(value).replace("#", "");
};

const getStatusText = (inquiry) => {
  if (inquiry.statusText) return inquiry.statusText;
  if (inquiry.status === "answered") return "답변 완료";
  if (inquiry.status === "waiting") return "답변 대기";
  return "답변 완료";
};

const getAnswerData = (inquiry) => {
  const answer = inquiry.answer;

  if (!answer) {
    return DEFAULT_ANSWER;
  }

  if (typeof answer === "string") {
    return {
      ...DEFAULT_ANSWER,
      body: answer,
    };
  }

  return {
    team: answer.team || answer.answerTeam || DEFAULT_ANSWER.team,
    date: answer.date || answer.answerDate || DEFAULT_ANSWER.date,
    intro: answer.intro || answer.answerIntro || DEFAULT_ANSWER.intro,
    body:
      answer.body ||
      answer.content ||
      answer.answerBody ||
      DEFAULT_ANSWER.body,
    progressTitle:
      answer.progressTitle ||
      answer.statusTitle ||
      DEFAULT_ANSWER.progressTitle,
    progressText:
      answer.progressText ||
      answer.statusText ||
      DEFAULT_ANSWER.progressText,
    outro: answer.outro || answer.answerOutro || DEFAULT_ANSWER.outro,
    end: answer.end || answer.answerEnd || DEFAULT_ANSWER.end,
  };
};

const UserIcon = () => (
  <svg
    viewBox="0 0 24 24"
    width="18"
    height="18"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="12" cy="8" r="3" stroke="currentColor" strokeWidth="1.8" />
    <path
      d="M6.8 18.2C7.5 15.8 9.5 14.5 12 14.5C14.5 14.5 16.5 15.8 17.2 18.2"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

const InquiryDetail = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams();

  const inquiry = useMemo(() => {
    if (location.state?.inquiry) {
      return location.state.inquiry;
    }

    const savedInquiries = getInquiryList();
    return savedInquiries.find((item) => String(item.id) === String(id));
  }, [location.state, id]);

  if (!inquiry) {
    return (
      <main className="inquiry-detail-page">
        <section className="inquiry-empty-box">
          <p>문의 내용을 찾을 수 없습니다.</p>
          <button type="button" onClick={() => navigate("/inquiry")}>
            문의 목록으로 돌아가기
          </button>
        </section>
      </main>
    );
  }

  const answer = getAnswerData(inquiry);

  const detail = {
    statusText: getStatusText(inquiry),
    title: inquiry.title || "문의 제목",
    date: inquiry.date || inquiry.createdDate || "2024.05.21",
    inquiryId: normalizeInquiryId(
      inquiry.inquiryId || inquiry.inquiryCode || inquiry.code,
      inquiry.id
    ),
    time: inquiry.time || inquiry.createdTime || "오후 2:14",
    content:
      inquiry.detailContent ||
      inquiry.fullContent ||
      inquiry.content ||
      "문의 내용이 없습니다.",
  };

  return (
    <main className="inquiry-detail-page">
      <header className="inquiry-detail-header">
        <div className="inquiry-detail-left">
          <span className="inquiry-detail-status">{detail.statusText}</span>
          <h1>{detail.title}</h1>
        </div>

        <div className="inquiry-detail-meta">
          <strong>{detail.date}</strong>
          <span>INQUIRY ID: #{detail.inquiryId}</span>
        </div>
      </header>

      <section className="inquiry-question-card">
        <div className="inquiry-question-head">
          <div className="inquiry-question-icon">
            <UserIcon />
          </div>

          <div>
            <h2>나의 문의 내용</h2>
            <p>{detail.time}</p>
          </div>
        </div>

        <p className="inquiry-question-text">{detail.content}</p>
      </section>

      <section className="inquiry-answer-card">
        <div className="inquiry-answer-head">
          <div className="inquiry-answer-profile">
            <div className="inquiry-answer-icon">
              <img src={customerCenterIcon} alt="" />
            </div>

            <div>
              <h2>{answer.team}</h2>
              <p>{answer.date}</p>
            </div>
          </div>

          <div className="inquiry-answer-mark">
            <img src={verifyIcon} alt="" />
          </div>
        </div>

        <div className="inquiry-answer-content">
          <p className="inquiry-answer-bold">{answer.intro}</p>

          <p>{answer.body}</p>

          <div className="inquiry-progress-box">
            <strong>{answer.progressTitle}</strong>
            <span>{answer.progressText}</span>
          </div>

          <p>{answer.outro}</p>

          <p>{answer.end}</p>
        </div>
      </section>
    </main>
  );
};

export default InquiryDetail;