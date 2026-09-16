import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "./AdminInquiryPage.css";
import api from "../../api/api";

const TABS = [
  { key: "all", label: "전체 문의" },
  { key: "pending", label: "대기 중" },
  { key: "answered", label: "답변 완료" },
];

const formatListTime = (dateString) => {
  if (!dateString) return "날짜 없음";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "날짜 없음";
  }

  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 1000 / 60);

  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "어제";

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");

  return `${yyyy}.${mm}.${dd}`;
};

const getInquiryArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.inquiries)) return data.inquiries;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.response)) return data.response;

  return [];
};

const normalizeInquiry = (inquiry) => {
  const rawStatus = String(inquiry.status || "").toLowerCase();

  const answer =
    inquiry.answer ||
    inquiry.reply ||
    inquiry.answerContent ||
    inquiry.answerText ||
    "";

  const isAnswered =
    inquiry.answered === true ||
    inquiry.isAnswered === true ||
    Boolean(answer) ||
    rawStatus === "answered" ||
    rawStatus === "complete" ||
    rawStatus === "completed" ||
    rawStatus === "done" ||
    rawStatus === "답변완료" ||
    rawStatus === "답변 완료";

  return {
    id: inquiry.id ?? inquiry.inquiryId ?? inquiry.questionId,
    title: inquiry.title || inquiry.subject || "제목 없음",
    content: inquiry.content || inquiry.question || inquiry.body || "",
    userEmail: inquiry.userEmail || inquiry.email || "",
    uid: inquiry.userEmail || inquiry.email || "-",
    answer,
    status: isAnswered ? "answered" : "pending",
    createdAt:
      inquiry.createdAt ||
      inquiry.createdDate ||
      inquiry.date ||
      inquiry.updatedAt ||
      "",
    originalData: inquiry,
  };
};

const getErrorMessage = (error, fallbackMessage) => {
  const data = error.response?.data;

  if (typeof data === "string" && data.trim()) {
    return data;
  }

  return data?.message || data?.error || fallbackMessage;
};

const AdminInquiryPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [inquiries, setInquiries] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const rawTab = searchParams.get("tab");

  const selectedTab = TABS.some((tab) => tab.key === rawTab)
    ? rawTab
    : "all";

  useEffect(() => {
    const fetchAdminInquiries = async () => {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const response = await api.get("/api/inquiries/admin");
        const inquiryArray = getInquiryArray(response.data);

        setInquiries(inquiryArray.map(normalizeInquiry));
      } catch (error) {
        console.error("관리자 문의 목록 조회 실패:", error);

        if (error.message.includes("Network Error")) {
          setErrorMessage("백엔드 서버 연결 또는 CORS 설정을 확인해주세요.");
          return;
        }

        if (error.response?.status === 401 || error.response?.status === 403) {
          setErrorMessage(
            "관리자 권한이 없거나 로그인 정보가 만료되었습니다. 다시 로그인해주세요."
          );
          return;
        }

        setErrorMessage(
          getErrorMessage(
            error,
            "문의 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요."
          )
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchAdminInquiries();
  }, []);

  const filteredInquiries =
    selectedTab === "all"
      ? inquiries
      : inquiries.filter((item) => item.status === selectedTab);

  const handleTabClick = (tabKey) => {
    if (tabKey === "all") {
      setSearchParams({});
      return;
    }

    setSearchParams({ tab: tabKey });
  };

  const handleAnswerClick = (item) => {
    if (item.status === "answered") return;

    navigate(`/admin/inquiry/write?id=${item.id}`, {
      state: {
        inquiry: item,
      },
    });
  };

  return (
    <div className="admin-inquiry-page">
      <div className="admin-inquiry-label">SUPPORT CENTER</div>

      <h1 className="admin-inquiry-title">1:1 문의 목록</h1>

      <p className="admin-inquiry-subtitle">
        고객 문의사항을 효율적으로 관리해 응답하세요
      </p>

      <div className="admin-inquiry-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`admin-inquiry-tab ${
              selectedTab === tab.key ? "active" : ""
            }`}
            onClick={() => handleTabClick(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="admin-inquiry-list">
        {isLoading ? (
          <div className="admin-inquiry-empty">문의 목록을 불러오는 중입니다.</div>
        ) : errorMessage ? (
          <div className="admin-inquiry-empty">{errorMessage}</div>
        ) : filteredInquiries.length === 0 ? (
          <div className="admin-inquiry-empty">표시할 문의가 없습니다.</div>
        ) : (
          filteredInquiries.map((item) => {
            const isAnswered = item.status === "answered";

            return (
              <article key={item.id} className="admin-inquiry-card">
                <div className="admin-inquiry-card-top">
                  <div className="admin-inquiry-meta">
                    <span className={`admin-inquiry-status ${item.status}`}>
                      {isAnswered ? "답변 완료" : "대기 중"}
                    </span>

                    <span className="admin-inquiry-uid">
                      이메일: {item.uid}
                    </span>
                  </div>

                  <span className="admin-inquiry-time">
                    {formatListTime(item.createdAt)}
                  </span>
                </div>

                <h3 className="admin-inquiry-card-title">{item.title}</h3>

                <p className="admin-inquiry-card-content">{item.content}</p>

                <button
                  type="button"
                  className={`admin-inquiry-answer-button ${
                    isAnswered ? "done" : ""
                  }`}
                  onClick={() => handleAnswerClick(item)}
                  disabled={isAnswered || item.id === undefined || item.id === null}
                >
                  {isAnswered ? "답변 완료됨" : "↩ 답변하기"}
                </button>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AdminInquiryPage;