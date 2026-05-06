import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Footer.css";

// 아이콘
import homeOff from "../img/검정색 홈.png";
import searchOff from "../img/검정색 검색.png";
import recommendOff from "../img/검정색 추천.png";
import calendarOff from "../img/검정색 일정.png";
import mypageOff from "../img/마이페이지회색.png";

import homeOn from "../img/파랑색 홈.png";
import recommendOn from "../img/파랑색 추천.png";
import calendarOn from "../img/파랑색 일정.png";

const Footer = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const getActiveTab = (pathname) => {
    if (pathname === "/home") return "home";
    if (pathname.startsWith("/search")) return "search";
    if (pathname.startsWith("/recommend") || pathname.startsWith("/total")) {
      return "recommend";
    }

    if (
      pathname.startsWith("/schedule") ||
      pathname.startsWith("/calendar") ||
      pathname.startsWith("/route-create") ||
      pathname.startsWith("/route-result")
    ) {
      return "calendar";
    }

    if (
      pathname.startsWith("/mypage") ||
      pathname.startsWith("/saved-places") ||
      pathname.startsWith("/my-schedule")
    ) {
      return "mypage";
    }

    return "";
  };

  const activeTab = getActiveTab(location.pathname);

  const tabs = [
    {
      key: "home",
      label: "홈",
      path: "/home",
      off: homeOff,
      on: homeOn,
    },
    {
      key: "search",
      label: "검색",
      path: "/search",
      off: searchOff,
      on: searchOff,
    },
    {
      key: "recommend",
      label: "추천",
      path: "/recommend",
      off: recommendOff,
      on: recommendOn,
    },
    {
      key: "calendar",
      label: "일정",
      path: "/schedule",
      off: calendarOff,
      on: calendarOn,
    },
    {
      key: "mypage",
      label: "마이페이지",
      path: "/mypage",
      off: mypageOff,
      on: mypageOff,
    },
  ];

  return (
    <footer className="footer">
      <nav className="footer-nav" aria-label="하단 메뉴">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              className={`tab ${isActive ? "active" : ""} ${tab.key}-tab`}
              onClick={() => navigate(tab.path)}
              aria-pressed={isActive}
            >
              <div className="tab-icon-wrap">
                <img
                  src={isActive ? tab.on : tab.off}
                  alt=""
                  className="tab-icon"
                  aria-hidden="true"
                />
              </div>

              <span className="tab-label">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </footer>
  );
};

export default Footer;