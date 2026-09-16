import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Footer.css";

// Figma에서 내보낸 벡터 아이콘: 확대되어도 흐려지지 않음
import homeIcon from "../img/nav-home.svg";
import searchIcon from "../img/nav-search.svg";
import recommendIcon from "../img/nav-recommend.svg";
import scheduleIcon from "../img/nav-schedule.svg";
import mypageIcon from "../img/nav-mypage.svg";
import mypageActiveIcon from "../img/nav-mypage-active.svg";

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
      off: homeIcon,
      on: homeIcon,
    },
    {
      key: "search",
      label: "검색",
      path: "/search",
      off: searchIcon,
      on: searchIcon,
    },
    {
      key: "recommend",
      label: "추천",
      path: "/recommend",
      off: recommendIcon,
      on: recommendIcon,
    },
    {
      key: "calendar",
      label: "일정",
      path: "/schedule",
      off: scheduleIcon,
      on: scheduleIcon,
    },
    {
      key: "mypage",
      label: "마이페이지",
      path: "/mypage",
      off: mypageIcon,
      on: mypageActiveIcon,
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
