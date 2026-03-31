import React from "react";
import { useNavigate } from "react-router-dom";
import { useSavedPlaces } from "../Context/SavedPlacesContext";
import "./MyPage.css";

import logoutGrayIcon from "../img/회색 로그아웃.png";

const ArrowIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M9 6L15 12L9 18"
      stroke="#A8B3C3"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const CalendarIcon = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <path d="M7 2V5" stroke="#179FF4" strokeWidth="2" strokeLinecap="round" />
    <path d="M17 2V5" stroke="#179FF4" strokeWidth="2" strokeLinecap="round" />
    <rect
      x="4"
      y="5"
      width="16"
      height="15"
      rx="3"
      stroke="#179FF4"
      strokeWidth="2"
    />
    <path d="M4 9H20" stroke="#179FF4" strokeWidth="2" />
  </svg>
);

const BookmarkIcon = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M7 4.5C7 3.94772 7.44772 3.5 8 3.5H16C16.5523 3.5 17 3.94772 17 4.5V20L12 16.8L7 20V4.5Z"
      stroke="#179FF4"
      strokeWidth="2"
      strokeLinejoin="round"
    />
  </svg>
);

const HistoryIcon = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21C8.4913 21 5.4518 18.9918 3.96911 16.0645"
      stroke="#179FF4"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M3 7V12H8"
      stroke="#179FF4"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M12 7V12L15.5 14"
      stroke="#179FF4"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const InquiryIcon = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M5 6.5C5 5.39543 5.89543 4.5 7 4.5H17C18.1046 4.5 19 5.39543 19 6.5V13.5C19 14.6046 18.1046 15.5 17 15.5H10L6 19V15.5H7C5.89543 15.5 5 14.6046 5 13.5V6.5Z"
      stroke="#4C5A73"
      strokeWidth="2"
      strokeLinejoin="round"
    />
  </svg>
);

const AvatarIllustration = () => (
  <svg
    className="mypage-avatar-svg"
    viewBox="0 0 84 84"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <circle
      cx="42"
      cy="42"
      r="41"
      fill="#EAF7FF"
      stroke="#BFE2F8"
      strokeWidth="2"
    />
    <circle cx="42" cy="31" r="13" fill="#F5C39C" />
    <path
      d="M26 65C28 54.5 35.5 49 42 49C48.5 49 56 54.5 58 65"
      fill="#45656A"
    />
    <path
      d="M30 29C30 19 36.5 14 42.5 14C50.5 14 56.5 20.5 55 31C53.5 29 51.5 28 48 27.5C45 31 39 33 31.5 33C30.5 32 30 30.5 30 29Z"
      fill="#2C313E"
    />
    <path
      d="M37 36C38.2 37 39.8 37.5 41.5 37.5C43.2 37.5 44.8 37 46 36"
      stroke="#CB8D67"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <circle cx="37.5" cy="31.5" r="1.3" fill="#2C313E" />
    <circle cx="46.5" cy="31.5" r="1.3" fill="#2C313E" />
  </svg>
);

const getStoredUser = () => {
  try {
    const localUser = localStorage.getItem("mock_current_user");
    if (localUser) return JSON.parse(localUser);

    const sessionUser = sessionStorage.getItem("mock_current_user");
    if (sessionUser) return JSON.parse(sessionUser);

    return null;
  } catch (error) {
    return null;
  }
};

const MyPage = () => {
  const navigate = useNavigate();
  const { savedPlaces } = useSavedPlaces();
  const currentUser = getStoredUser();

  const stats = [
    { label: "다녀온 곳", value: 12 },
    { label: "저장한 곳", value: savedPlaces.length },
    { label: "작성한 리뷰", value: 25 },
  ];

  const myActivityMenus = [
    {
      id: "calendar",
      label: "내 일정 관리",
      icon: <CalendarIcon />,
      onClick: () => navigate("/my-schedule"),
    },
    {
      id: "saved",
      label: "저장한 장소",
      icon: <BookmarkIcon />,
      onClick: () => navigate("/saved-places"),
    },
    {
      id: "recent",
      label: "최근 본 장소",
      icon: <HistoryIcon />,
      onClick: () => console.log("최근 본 장소"),
    },
  ];

  const supportMenus = [
    {
      id: "inquiry",
      label: "1:1 문의",
      icon: <InquiryIcon />,
      onClick: () => console.log("1:1 문의"),
    },
  ];

  const handleLogout = () => {
    try {
      localStorage.removeItem("mock_current_user");
      sessionStorage.removeItem("mock_current_user");
    } catch (error) {
      console.error("로그아웃 실패:", error);
    }

    navigate("/login", { replace: true });
  };

  return (
    <div className="mypage-page">
      <div className="mypage-inner">
        <section className="mypage-profile">
          <div className="mypage-user-row">
            <div className="mypage-avatar-wrap">
              <AvatarIllustration />
            </div>

            <div className="mypage-user-info">
              <div className="mypage-name-row">
                <h1>{currentUser?.name || "김여행"}</h1>

                <button
                  type="button"
                  className="mypage-logout-btn"
                  onClick={handleLogout}
                  aria-label="로그아웃"
                >
                  <img
                    src={logoutGrayIcon}
                    alt="로그아웃"
                    className="mypage-logout-icon"
                  />
                  <span>로그아웃</span>
                </button>
              </div>

              <p>{currentUser?.email || "traveler_kim@email.com"}</p>
            </div>
          </div>

          <div className="mypage-stats-grid">
            {stats.map((stat) => (
              <div key={stat.label} className="mypage-stat-card">
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>
        </section>

        <button
          type="button"
          className="mypage-invite-banner"
          onClick={() => console.log("친구 초대")}
        >
          <div className="mypage-invite-text">
            <strong>친구 초대하고 포인트 받기!</strong>
            <span>함께 여행갈 친구를 초대해보세요.</span>
          </div>
          <ArrowIcon />
        </button>

        <section className="mypage-section">
          <h2 className="mypage-section-title">나의 활동</h2>

          <div className="mypage-menu-list">
            {myActivityMenus.map((menu) => (
              <button
                key={menu.id}
                type="button"
                className="mypage-menu-item"
                onClick={menu.onClick}
              >
                <div className="mypage-menu-left">
                  <div className="mypage-menu-icon-circle">{menu.icon}</div>
                  <span>{menu.label}</span>
                </div>
                <ArrowIcon />
              </button>
            ))}
          </div>
        </section>

        <section className="mypage-section">
          <h2 className="mypage-section-title">고객지원 & 정보</h2>

          <div className="mypage-menu-list">
            {supportMenus.map((menu) => (
              <button
                key={menu.id}
                type="button"
                className="mypage-menu-item"
                onClick={menu.onClick}
              >
                <div className="mypage-menu-left">
                  <div className="mypage-menu-icon-circle support">
                    {menu.icon}
                  </div>
                  <span>{menu.label}</span>
                </div>
                <ArrowIcon />
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default MyPage;