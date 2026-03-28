import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Footer.css";

// 아이콘
import homeOff from "../img/검정색 홈.png";
import searchOff from "../img/검정색 검색.png";
import recommendOff from "../img/검정색 추천.png";
import calendarOff from "../img/검정색 일정.png";

import homeOn from "../img/파랑색 홈.png";
import recommendOn from "../img/파랑색 추천.png";
import calendarOn from "../img/파랑색 일정.png";

const Footer = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const getActiveTab = (pathname) => {
    if (pathname === "/home") return "home";
    if (pathname.startsWith("/search")) return "search";
    if (pathname.startsWith("/recommend")) return "recommend";
    if (pathname.startsWith("/calendar") || pathname.startsWith("/route-result")) {
      return "calendar";
    }
    return "";
  };

  const activeTab = getActiveTab(location.pathname);

  const tabs = [
    { key: "home", label: "홈", path: "/home", off: homeOff, on: homeOn },
    { key: "search", label: "검색", path: "/search", off: searchOff, on: searchOff },
    { key: "recommend", label: "추천", path: "/recommend", off: recommendOff, on: recommendOn },
    { key: "calendar", label: "일정", path: "/schedule", off: calendarOff, on: calendarOn },
  ];

  return (
    <div className="footer-nav">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;

        return (
          <div
            key={tab.key}
            className={`tab ${isActive ? "active" : ""} ${tab.key}-tab`}
            onClick={() => navigate(tab.path)}
          >
            <div className="tab-icon-wrap">
              <img
                src={isActive ? tab.on : tab.off}
                alt={tab.label}
                className="tab-icon"
              />
            </div>
            <span>{tab.label}</span>
          </div>
        );
      })}
    </div>
  );
};

export default Footer;