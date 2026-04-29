import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "./AdminInquiryPage.css";
import { getInquiryList } from "../../utils/mockInquiry";

const TABS = [
  { key: "all", label: "전체 문의" },
  { key: "pending", label: "대기 중" },
  { key: "answered", label: "답변 완료" },
];

const formatListTime = (dateString) => {
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / 1000 / 60);

  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "어제";

  const date = new Date(dateString);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");

  return `${yyyy}.${mm}.${dd}`;
};

const AdminInquiryPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [inquiries, setInquiries] = useState([]);

  const rawTab = searchParams.get("tab");

  const selectedTab = TABS.some((tab) => tab.key === rawTab)
    ? rawTab
    : "all";

  useEffect(() => {
    setInquiries(getInquiryList());
  }, [selectedTab]);

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

    navigate(`/admin/inquiry/write?id=${item.id}`);
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
        {filteredInquiries.length === 0 ? (
          <div className="admin-inquiry-empty">표시할 문의가 없습니다.</div>
        ) : (
          filteredInquiries.map((item) => (
            <article key={item.id} className="admin-inquiry-card">
              <div className="admin-inquiry-card-top">
                <div className="admin-inquiry-meta">
                  <span className={`admin-inquiry-status ${item.status}`}>
                    {item.status === "pending" ? "대기 중" : "답변 완료"}
                  </span>

                  <span className="admin-inquiry-uid">UID: {item.uid}</span>
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
                  item.status === "answered" ? "done" : ""
                }`}
                onClick={() => handleAnswerClick(item)}
                disabled={item.status === "answered"}
              >
                {item.status === "pending" ? "↩ 답변하기" : "답변 완료됨"}
              </button>
            </article>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminInquiryPage;