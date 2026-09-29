import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Footer.css";

// Figma에서 내보낸 동일한 SVG의 색상만 active 상태에서 변경한다.
import { ReactComponent as HomeIcon } from "../img/nav-home.svg";
import { ReactComponent as SearchIcon } from "../img/nav-search.svg";
import { ReactComponent as RecommendIcon } from "../img/nav-recommend.svg";
import { ReactComponent as ScheduleIcon } from "../img/nav-schedule.svg";
import { ReactComponent as MypageIcon } from "../img/nav-mypage.svg";

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
      icon: HomeIcon,
    },
    {
      key: "search",
      label: "검색",
      path: "/search",
      icon: SearchIcon,
    },
    {
      key: "recommend",
      label: "추천",
      path: "/recommend",
      icon: RecommendIcon,
    },
    {
      key: "calendar",
      label: "일정",
      path: "/schedule",
      icon: ScheduleIcon,
    },
    {
      key: "mypage",
      label: "마이페이지",
      path: "/mypage",
      icon: MypageIcon,
    },
  ];

  return (
    <footer className="footer">
      <nav className="footer-nav" aria-label="하단 메뉴">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          const Icon = tab.icon;

          return (
            <button
              key={tab.key}
              type="button"
              className={`tab ${isActive ? "active" : ""} ${tab.key}-tab`}
              onClick={() => navigate(tab.path)}
              aria-pressed={isActive}
            >
              <div className="tab-icon-wrap">
                <Icon
                  className="tab-icon"
                  aria-hidden="true"
                  focusable="false"
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
