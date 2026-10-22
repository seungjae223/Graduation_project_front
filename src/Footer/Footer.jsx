import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Footer.css";
import { useDetailFooter } from "../components/DetailFooterContext";

// Figma에서 내보낸 동일한 SVG의 색상만 active 상태에서 변경한다.
import { ReactComponent as HomeIcon } from "../img/nav-home.svg";
import { ReactComponent as SearchIcon } from "../img/nav-search.svg";
import { ReactComponent as RecommendIcon } from "../img/nav-recommend.svg";
import { ReactComponent as ScheduleIcon } from "../img/nav-schedule.svg";
import { ReactComponent as MypageIcon } from "../img/nav-mypage.svg";

const Footer = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isDetail = location.pathname === "/detail";
  const detailFooter = useDetailFooter();
  const actions = detailFooter?.actions;

  const getActiveTab = (pathname) => {
    if (pathname === "/home" || pathname === "/popular-all") return "home";
    if (pathname.startsWith("/search")) return "search";
    if (pathname.startsWith("/destinations/")) {
      return new URLSearchParams(location.search).get("from") === "recommend" ? "recommend" : "search";
    }
    if (pathname.startsWith("/recommend") || pathname.startsWith("/total")) {
      return "recommend";
    }

    if (
      pathname.startsWith("/schedule") ||
      pathname.startsWith("/calendar") ||
      pathname.startsWith("/route-create") ||
      pathname.startsWith("/route-result") ||
      pathname.startsWith("/route-add-places") ||
      pathname.startsWith("/my-schedule")
    ) {
      return "calendar";
    }

    if (
      pathname.startsWith("/mypage") ||
      pathname.startsWith("/saved-places") ||
      pathname.startsWith("/inquiry")
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

  const actionIcons = {
    directions: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5 11 2l8 3v15l-8-3-7 3V5Zm7-3v15M16 7l-3 3 3 3M13 10h7"/></svg>,
    folder: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10H3V7Zm9 5v5m-2.5-2.5h5"/></svg>,
    schedule: <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="16" rx="2"/><path d="M8 3v4m8-4v4M4 10h16m-4 6H8m4-4v8"/></svg>,
  };

  return (
    <footer className={`footer ${isDetail ? "footer--detail" : ""}`}>
      <nav className={`footer-nav ${isDetail ? "footer-nav--detail" : ""}`} aria-label={isDetail ? "장소 상세 빠른 메뉴" : "하단 메뉴"}>
        <div className="footer-rail footer-rail--main" aria-hidden={isDetail}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            const Icon = tab.icon;
            return (
              <button key={tab.key} type="button"
                className={`tab ${isActive ? "active" : ""} ${tab.key}-tab`}
                onClick={() => navigate(tab.path)} aria-pressed={isActive}
                disabled={isDetail} tabIndex={isDetail ? -1 : 0}>
                <div className="tab-icon-wrap"><Icon className="tab-icon" aria-hidden="true" focusable="false" /></div>
                <span className="tab-label">{tab.label}</span>
              </button>
            );
          })}
        </div>
        <div className="footer-rail footer-rail--detail" aria-hidden={!isDetail}>
          {actions?.directions ? (
            <a className="detail-nav-tab" href={actions.directions.url} target="_blank" rel="noopener noreferrer"
              aria-label={`${actions.directions.provider === "kakao" ? "카카오맵" : "구글맵"} 길찾기`}
              tabIndex={isDetail ? 0 : -1}>
              {actionIcons.directions}<span>길찾기</span>
            </a>
          ) : <button type="button" className="detail-nav-tab" disabled aria-label="길찾기 이용 불가">
            {actionIcons.directions}<span>길찾기</span>
          </button>}
          <button type="button" className="detail-nav-tab" onClick={event => actions?.openFolder?.(event)}
            disabled={!isDetail || !actions || actions.folderDisabled}
            aria-busy={Boolean(actions?.saving)} tabIndex={isDetail ? 0 : -1}>
            {actionIcons.folder}<span>폴더 저장</span>
          </button>
          <button type="button" className="detail-nav-tab" onClick={() => actions?.openTrip?.()}
            disabled={!isDetail || !actions?.placeId} tabIndex={isDetail ? 0 : -1}>
            {actionIcons.schedule}<span>일정 추가</span>
          </button>
        </div>
      </nav>
    </footer>
  );
};

export default Footer;
