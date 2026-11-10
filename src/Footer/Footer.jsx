import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import homeIcon from "react-useanimations/lib/home";
import exploreIcon from "react-useanimations/lib/explore";
import calendarIcon from "react-useanimations/lib/calendar";
import profileIcon from "react-useanimations/lib/user";
import directionsIcon from "react-useanimations/lib/navigation";
import folderIcon from "react-useanimations/lib/folder";
import "./Footer.css";
import searchIcon from "../animations/searchIcon";
import AnimatedIconButton from "../components/AnimatedIconButton";
import { useDetailFooter } from "../components/DetailFooterContext";

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
      icon: homeIcon,
    },
    {
      key: "search",
      label: "검색",
      path: "/search",
      icon: searchIcon,
    },
    {
      key: "recommend",
      label: "추천",
      path: "/recommend",
      icon: exploreIcon,
    },
    {
      key: "calendar",
      label: "일정",
      path: "/schedule",
      icon: calendarIcon,
    },
    {
      key: "mypage",
      label: "마이페이지",
      path: "/mypage",
      icon: profileIcon,
    },
  ];

  return (
    <footer className={`footer ${isDetail ? "footer--detail" : ""}`}>
      <nav className={`footer-nav ${isDetail ? "footer-nav--detail" : ""}`} aria-label={isDetail ? "장소 상세 빠른 메뉴" : "하단 메뉴"}>
        <div className="footer-rail footer-rail--main" aria-hidden={isDetail}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <AnimatedIconButton key={tab.key} animation={tab.icon} iconSize={22} iconWrapClassName="tab-icon-wrap"
                className={`tab ${isActive ? "active" : ""} ${tab.key}-tab`}
                onClick={() => navigate(tab.path)} aria-pressed={isActive}
                disabled={isDetail} tabIndex={isDetail ? -1 : 0}>
                <span className="tab-label">{tab.label}</span>
              </AnimatedIconButton>
            );
          })}
        </div>
        <div className="footer-rail footer-rail--detail" aria-hidden={!isDetail}>
          {actions?.directions ? (
            <AnimatedIconButton as="a" animation={directionsIcon} className="detail-nav-tab"
              href={actions.directions.url} target="_blank" rel="noopener noreferrer"
              aria-label={`${actions.directions.provider === "kakao" ? "카카오맵" : "구글맵"} 길찾기`}
              tabIndex={isDetail ? 0 : -1}>
              <span>길찾기</span>
            </AnimatedIconButton>
          ) : <AnimatedIconButton animation={directionsIcon} className="detail-nav-tab" disabled aria-label="길찾기 이용 불가">
            <span>길찾기</span>
          </AnimatedIconButton>}
          <AnimatedIconButton animation={folderIcon} className="detail-nav-tab" onClick={event => actions?.openFolder?.(event)}
            disabled={!isDetail || !actions || actions.folderDisabled}
            aria-busy={Boolean(actions?.saving)} tabIndex={isDetail ? 0 : -1}>
            <span>폴더 저장</span>
          </AnimatedIconButton>
          <AnimatedIconButton animation={calendarIcon} className="detail-nav-tab" onClick={() => actions?.openTrip?.()}
            disabled={!isDetail || !actions?.placeId} tabIndex={isDetail ? 0 : -1}>
            <span>일정 추가</span>
          </AnimatedIconButton>
        </div>
      </nav>
    </footer>
  );
};

export default Footer;
