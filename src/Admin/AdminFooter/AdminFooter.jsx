import React, { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./AdminFooter.css";

import statsIcon from "../../img/검은색 통계.png";
import inquiryIcon from "../../img/문의.png";

const LogIcon = () => (
  <svg
    viewBox="0 0 24 24"
    className="admin-footer-log-icon"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <rect
      x="4"
      y="4"
      width="16"
      height="12"
      rx="2"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    />
    <path
      d="M9 8L12 10.8L9 13.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M13.5 13.5H17"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const AdminFooter = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const activeTab = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("tab") || "stats";
  }, [location.search]);

  const footerItems = [
    {
      key: "stats",
      label: "통계",
      type: "image",
      icon: statsIcon,
      onClick: () => navigate("/admin"),
    },
    {
      key: "logs",
      label: "로그",
      type: "component",
      icon: <LogIcon />,
      onClick: () => navigate("/admin?tab=logs"),
    },
    {
      key: "inquiry",
      label: "문의사항",
      type: "image",
      icon: inquiryIcon,
      onClick: () => navigate("/admin?tab=inquiry"),
    },
  ];

  return (
    <footer className="admin-footer">
      <nav className="admin-footer-inner" aria-label="관리자 하단 메뉴">
        {footerItems.map((item) => {
          const isActive =
            item.key === "stats"
              ? activeTab === "stats"
              : item.key === activeTab;

          return (
            <button
              key={item.key}
              type="button"
              className={`admin-footer-item ${isActive ? "active" : ""}`}
              onClick={item.onClick}
              aria-pressed={isActive}
            >
              <div className="admin-footer-icon-wrap">
                {item.type === "image" ? (
                  <img
                    src={item.icon}
                    alt=""
                    className="admin-footer-icon"
                    aria-hidden="true"
                  />
                ) : (
                  item.icon
                )}
              </div>

              <span className="admin-footer-label">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </footer>
  );
};

export default AdminFooter;