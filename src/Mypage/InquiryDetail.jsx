import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./InquiryDetail.css";
import api from "../api/api";
import useReadQuery from "../utils/useReadQuery";
import useSessionKey from "../utils/useSessionKey";
import { getAuthSnapshot } from "../utils/authState";
import { inquiryErrorMessage, readInquiryList } from "./inquiryData";
import customerCenterIcon from "../img/고객센터.png";
import verifyIcon from "../img/인증.png";

const UserIcon = () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true"><circle cx="12" cy="8" r="3" stroke="currentColor" strokeWidth="1.8" /><path d="M6.8 18.2C7.5 15.8 9.5 14.5 12 14.5C14.5 14.5 16.5 15.8 17.2 18.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;

export default function InquiryDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const account = useSessionKey();
  const query = useReadQuery(`${account}:inquiry:${id}`, async signal => {
    const response = await api.get("/api/inquiries", { signal });
    const found = readInquiryList(response.data).find(item => String(item.id) === String(id));
    if (!found) throw Object.assign(new Error("문의 없음"), { response: { status: 404 } });
    return found;
  }, Boolean(id) && account !== "anonymous", () => getAuthSnapshot().accountKey === account);
  const inquiry = query.data;
  if (!inquiry) return <main className="inquiry-detail-page"><section className="inquiry-empty-box">
    <p role={query.status === "error" ? "alert" : "status"}>{query.status === "loading" ? "문의 내용을 불러오는 중입니다." : inquiryErrorMessage(query.cause, "문의 내용을 불러오지 못했습니다. 다시 시도해 주세요.")}</p>
    {query.status === "error" && <button type="button" onClick={query.retry}>다시 불러오기</button>}
    <button type="button" onClick={() => navigate("/inquiry")}>문의 목록으로 돌아가기</button>
  </section></main>;
  const answer = inquiry.answerData;
  return <main className="inquiry-detail-page">
    {query.status === "error" && <section role="alert"><p>{inquiryErrorMessage(query.cause, "최신 문의 내용을 확인하지 못했습니다.")}</p><button type="button" onClick={query.retry}>다시 불러오기</button></section>}
    <header className="inquiry-detail-header">
      <div className="inquiry-detail-left"><span className="inquiry-detail-status">{inquiry.statusText}</span><h1>{inquiry.title}</h1></div>
      <div className="inquiry-detail-meta">{inquiry.date && <strong>{inquiry.date}</strong>}<span>INQUIRY ID: #{inquiry.inquiryCode || inquiry.id}</span></div>
    </header>
    <section className="inquiry-question-card">
      <div className="inquiry-question-head"><div className="inquiry-question-icon"><UserIcon /></div><div><h2>나의 문의 내용</h2>{inquiry.time && <p>{inquiry.time}</p>}</div></div>
      <p className="inquiry-question-text">{inquiry.content || "문의 내용이 없습니다."}</p>
    </section>
    {answer ? <section className="inquiry-answer-card">
      <div className="inquiry-answer-head"><div className="inquiry-answer-profile"><div className="inquiry-answer-icon"><img src={customerCenterIcon} alt="" /></div><div><h2>{answer.team || "문의 답변"}</h2>{answer.date && <p>{answer.date}</p>}</div></div><div className="inquiry-answer-mark"><img src={verifyIcon} alt="" /></div></div>
      <div className="inquiry-answer-content">
        {answer.intro && <p className="inquiry-answer-bold">{answer.intro}</p>}<p>{answer.body}</p>
        {(answer.progressTitle || answer.progressText) && <div className="inquiry-progress-box">{answer.progressTitle && <strong>{answer.progressTitle}</strong>}{answer.progressText && <span>{answer.progressText}</span>}</div>}
        {answer.outro && <p>{answer.outro}</p>}{answer.end && <p>{answer.end}</p>}
      </div>
    </section> : inquiry.answered && <p role="status">답변 완료 상태이지만 답변 내용이 제공되지 않았습니다.</p>}
  </main>;
}
