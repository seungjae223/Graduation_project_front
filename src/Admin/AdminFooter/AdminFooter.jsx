import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./AdminFooter.css";

import statsIcon from "../../img/검은색 통계.png";
import inquiryIcon from "../../img/문의.png";

const AdminFooter = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const activeTab = "stats";

  const isAdminMainPage = location.pathname === "/admin";
  const isAdminInquiryPage = location.pathname.startsWith("/admin/inquiry");

  const footerItems = [
    {
      key: "stats",
      label: "통계",
      type: "image",
      icon: statsIcon,
      onClick: () => navigate("/admin"),
    },
    {
      key: "inquiry",
      label: "문의사항",
      type: "image",
      icon: inquiryIcon,
      onClick: () => navigate("/admin/inquiry"),
    },
  ];

  const checkIsActive = (key) => {
    if (key === "inquiry") {
      return isAdminInquiryPage;
    }

    if (key === "stats") {
      return isAdminMainPage && activeTab === "stats";
    }


    return false;
  };

  return (
    <footer className="admin-footer">
      <nav className="admin-footer-inner" aria-label="관리자 하단 메뉴">
        {footerItems.map((item) => {
          const isActive = checkIsActive(item.key);

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
