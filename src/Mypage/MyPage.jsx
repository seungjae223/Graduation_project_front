import { logSafeApiError } from "../utils/safeLog";
import React, { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import useModalFocus from "../utils/useModalFocus";
import useReadQuery from "../utils/useReadQuery"; import useSessionKey from "../utils/useSessionKey"; import { getAuthSnapshot } from "../utils/authState";
import "./MyPage.css";
import api, { getAccessToken } from "../api/api";
import { getMyProfileApi } from "../api/profileApi";
import { readCurrentRole } from "../Admin/AdminAccessGuard";
import { clearAuthenticatedUserStorage } from "../utils/authStorage";

import adminMenuIcon from "../img/관리자.png";
import locationPinIcon from "../img/파랑색 위치.png";
import navigationArrowIcon from "../img/Background.png";
import compassIcon from "../img/나침반.png";
import routeIcon from "../img/동선.png";
import { getStoredTheme, saveTheme } from "../utils/theme";

const DEFAULT_USER_NAME = "여행자";

const getCurrentTheme = () => {
  if (typeof window === "undefined") return "light";
  return getStoredTheme();
};

const DEFAULT_MYPAGE_STATS = {
  visitedPlacesCount: null,
  savedPlacesCount: null,
  reviewsCount: null,
};

const ArrowIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M9 6L15 12L9 18"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const CalendarIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M7 2V5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M17 2V5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <rect
      x="4"
      y="5"
      width="16"
      height="15"
      rx="3"
      stroke="currentColor"
      strokeWidth="2"
    />
    <path d="M4 9H20" stroke="currentColor" strokeWidth="2" />
  </svg>
);

const BookmarkIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M7 4.5C7 3.94772 7.44772 3.5 8 3.5H16C16.5523 3.5 17 3.94772 17 4.5V20L12 16.8L7 20V4.5Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
  </svg>
);

const HistoryIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21C8.4913 21 5.4518 18.9918 3.96911 16.0645"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M3 7V12H8"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M12 7V12L15.5 14"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const InquiryIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M5 6.5C5 5.39543 5.89543 4.5 7 4.5H17C18.1046 4.5 19 5.39543 19 6.5V13.5C19 14.6046 18.1046 15.5 17 15.5H10L6 19V15.5H7C5.89543 15.5 5 14.6046 5 13.5V6.5Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
  </svg>
);

const LocationIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M12 21.5C12 21.5 19 15.1 19 9.8C19 5.93401 15.866 2.8 12 2.8C8.13401 2.8 5 5.93401 5 9.8C5 15.1 12 21.5 12 21.5Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="9.8" r="2.4" stroke="currentColor" strokeWidth="2" />
  </svg>
);

const LogoutIcon = () => (
  <svg viewBox="0 0 512 512" aria-hidden="true">
    <path d="M377.9 105.9L500.7 228.7c7.2 7.2 11.3 17.1 11.3 27.3s-4.1 20.1-11.3 27.3L377.9 406.1c-6.4 6.4-15 9.9-24 9.9c-18.7 0-33.9-15.2-33.9-33.9l0-62.1-128 0c-17.7 0-32-14.3-32-32l0-64c0-17.7 14.3-32 32-32l128 0 0-62.1c0-18.7 15.2-33.9 33.9-33.9c9 0 17.6 3.6 24 9.9zM160 96L96 96c-17.7 0-32 14.3-32 32l0 256c0 17.7 14.3 32 32 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-64 0c-53 0-96-43-96-96L0 128C0 75 43 32 96 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32z" />
  </svg>
);

const LocationPermissionSwitch = ({ active }) => (
  <span
    aria-hidden="true"
    className={`location-permission-check ${active ? "active" : ""}`}
    style={{ pointerEvents: "none" }}
  >
    <input type="checkbox" checked={active} readOnly tabIndex={-1} />
    <label />
  </span>
);

const LocationPermissionFeature = ({ icon, title, description, alt }) => (
  <div className="location-permission-feature">
    <div className="location-permission-feature-icon">
      <img src={icon} alt={alt} />
    </div>

    <div className="location-permission-feature-text">
      <strong>{title}</strong>
      <span>{description}</span>
    </div>
  </div>
);

const LocationPermissionModal = ({ onClose, onAllow }) => {
  const dialogRef = useModalFocus({
    open: true,
    onClose,
    lockScroll: true,
  });

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="location-permission-overlay"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        ref={dialogRef}
        className="location-permission-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="location-permission-title"
        aria-describedby="location-permission-message"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          background: "var(--color-surface)",
        }}
      >
        <div className="location-permission-hero">
          <div className="location-permission-pin-glow">
            <img
              src={locationPinIcon}
              alt=""
              className="location-permission-pin"
            />
          </div>

          <img
            src={navigationArrowIcon}
            alt=""
            className="location-permission-arrow-badge"
          />
        </div>

        <h2 id="location-permission-title" className="location-permission-title">
          너만 오면 go
        </h2>

        <p
          id="location-permission-message"
          className="location-permission-message"
        >
          <span>정확한 경로 안내를 위해</span>
          <strong>위치 권한 허용이 필요합니다.</strong>
        </p>

        <div className="location-permission-features">
          <LocationPermissionFeature
            icon={routeIcon}
            alt="동선"
            title="최적의 경로 계산"
            description="현재 위치 기준 실시간 길 안내"
          />

          <LocationPermissionFeature
            icon={compassIcon}
            alt="나침반"
            title="주변 명소 추천"
            description="가까운 여행지 및 맛집 정보 제공"
          />
        </div>

        <button
          type="button"
          className="location-permission-allow"
          onClick={onAllow}
          data-modal-initial-focus
        >
          허용하기
        </button>

        <button
          type="button"
          className="location-permission-later"
          onClick={onClose}
        >
          나중에
        </button>

        <p className="location-permission-privacy">
          위치 정보는 경로 계산과 주변 장소 추천에 사용됩니다.
        </p>
      </div>
    </div>,
    document.body
  );
};

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

const normalizeMypageStats = (data) => {
  const statsData = data?.data || data?.result || data || {};

  if (!statsData || typeof statsData !== "object" || Array.isArray(statsData)) throw new Error("통계 응답 확인 실패");
  const count = value => typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
  return { visitedPlacesCount: count(statsData.visitedPlacesCount), savedPlacesCount: count(statsData.savedPlacesCount), reviewsCount: count(statsData.reviewsCount) };
};

const MyPage = () => {
  const navigate = useNavigate();

  const account = useSessionKey();
  const credentialVersion = getAuthSnapshot().credentialVersion;
  const profileQuery = useReadQuery(`${account}:${credentialVersion}:mypage-profile`, signal => getMyProfileApi({ signal }), account !== "anonymous", () => getAuthSnapshot().accountKey === account && getAuthSnapshot().credentialVersion === credentialVersion);
  const currentUser = profileQuery.data;
  const statsQuery = useReadQuery(account + ":mypage-stats", async signal => normalizeMypageStats((await api.get("/api/mypage/stats", { signal })).data), account !== "anonymous", () => getAuthSnapshot().accountKey === account);
  const mypageStats = statsQuery.data || DEFAULT_MYPAGE_STATS;
  const [locationAllowed, setLocationAllowed] = useState(false);
  const [theme, setTheme] = useState(getCurrentTheme);
  const [isLocationPermissionOpen, setIsLocationPermissionOpen] =
    useState(false);

  let isAdmin = false;
  try { isAdmin = readCurrentRole() === "admin"; } catch { /* No confirmed role. */ }

  const handleThemeChange = (nextTheme) => {
    setTheme(saveTheme(nextTheme));
  };

  useEffect(() => {
    if (!getAccessToken()) navigate("/login", { replace: true });
  }, [navigate, account]);

  const saveLocationAllowed = useCallback((isAllowed) => {
    setLocationAllowed(isAllowed);

    try {
      localStorage.setItem(
        "locationPermissionAllowed",
        isAllowed ? "true" : "false"
      );
    } catch (error) {
      logSafeApiError(error, "MyPage.jsx");
    }
  }, []);

  useEffect(() => {
    let savedLocationAllowed = false;

    try {
      savedLocationAllowed =
        localStorage.getItem("locationPermissionAllowed") === "true";
    } catch (error) {
      logSafeApiError(error, "MyPage.jsx");
    }

    if (!savedLocationAllowed) {
      setLocationAllowed(false);
      return undefined;
    }

    if (typeof navigator === "undefined" || !navigator.permissions) {
      saveLocationAllowed(false);
      return undefined;
    }

    let isMounted = true;
    let permissionStatus = null;

    navigator.permissions
      .query({ name: "geolocation" })
      .then((status) => {
        if (!isMounted) return;

        permissionStatus = status;
        saveLocationAllowed(status.state === "granted");

        status.onchange = () => {
          if (status.state !== "granted") {
            saveLocationAllowed(false);
          }
        };
      })
      .catch((error) => {
        logSafeApiError(error, "MyPage.jsx");
      });

    return () => {
      isMounted = false;

      if (permissionStatus) {
        permissionStatus.onchange = null;
      }
    };
  }, [saveLocationAllowed]);

  useEffect(() => {
    if (!isLocationPermissionOpen || typeof document === "undefined") {
      return undefined;
    }

    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
    };
  }, [isLocationPermissionOpen]);

  const requestLocationPermission = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      saveLocationAllowed(false);
      alert("현재 브라우저에서는 위치 정보를 지원하지 않습니다.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;

        try {
          localStorage.setItem(
            "userLocation",
            JSON.stringify({
              latitude,
              longitude,
              savedAt: new Date().toISOString(),
            })
          );
        } catch (error) {
          logSafeApiError(error, "MyPage.jsx");
        }

        saveLocationAllowed(true);
        alert("위치 권한이 허용되었습니다.");
      },
      (error) => {
        saveLocationAllowed(false);

        if (error.code === error.PERMISSION_DENIED) {
          alert(
            "위치 권한이 거부되었습니다. 브라우저 설정에서 다시 허용할 수 있습니다."
          );
          return;
        }

        alert("위치 정보를 가져오지 못했습니다. 잠시 후 다시 시도해주세요.");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, [saveLocationAllowed]);

  const handleLocationPermissionClick = () => {
    if (locationAllowed) {
      saveLocationAllowed(false);

      try {
        localStorage.removeItem("userLocation");
        localStorage.removeItem("currentLocation");
        localStorage.removeItem("currentLocationLabel");
      } catch (error) {
        logSafeApiError(error, "MyPage.jsx");
      }

      return;
    }

    setIsLocationPermissionOpen(true);
  };

  const handleAllowLocationPermission = () => {
    try {
      localStorage.setItem(
        "locationPermissionRequestedAt",
        new Date().toISOString()
      );
    } catch (error) {
      logSafeApiError(error, "MyPage.jsx");
    }

    setIsLocationPermissionOpen(false);
    requestLocationPermission();
  };

  const stats = [
    {
      label: "여행 일정",
      value: mypageStats.visitedPlacesCount,
    },
    {
      label: "저장한 곳",
      value: mypageStats.savedPlacesCount,
    },
    {
      label: "작성한 리뷰",
      value: mypageStats.reviewsCount,
    },
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
      onClick: () => navigate("/mypage/recent-places"),
    },
  ];

  const supportMenus = [
    {
      id: "inquiry",
      label: "1:1 문의",
      icon: <InquiryIcon />,
      onClick: () => navigate("/inquiry"),
    },
    ...(isAdmin
      ? [
          {
            id: "admin",
            label: "관리자 페이지",
            icon: (
              <img
                src={adminMenuIcon}
                alt="관리자"
                className="admin-menu-icon"
              />
            ),
            onClick: () => navigate("/admin"),
          },
        ]
      : []),
  ];

  const handleLogout = () => {
    clearAuthenticatedUserStorage();
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
                <h1>
                  {profileQuery.status === "loading" && !currentUser ? "불러오는 중..." : currentUser?.nickname || DEFAULT_USER_NAME}
                </h1>

                <button
                  type="button"
                  className="mypage-logout-btn"
                  onClick={handleLogout}
                  aria-label="로그아웃"
                >
                  <span className="mypage-logout-sign">
                    <LogoutIcon />
                  </span>

                  <span className="mypage-logout-text">로그아웃</span>
                </button>
              </div>

              <p>{currentUser?.emailAvailable ? currentUser.email : "이메일 정보 없음"}</p>
              {currentUser && <p className="mypage-provider">{({ LOCAL: "이메일", KAKAO: "카카오", GOOGLE: "구글" })[currentUser.provider]} 로그인</p>}
            </div>
          </div>

          {profileQuery.status === "loading" && <p role="status">프로필을 확인하는 중입니다.</p>}
          {profileQuery.status === "error" && <div role="alert"><p>프로필을 불러오지 못했습니다.</p><button type="button" onClick={profileQuery.retry}>프로필 다시 불러오기</button></div>}
          {statsQuery.status === "loading" && <p role="status">활동 통계를 확인하는 중입니다.</p>}
          {statsQuery.status === "error" && <div role="alert"><p>{statsQuery.data ? "활동 통계를 갱신하지 못했습니다. 마지막으로 확인한 값입니다." : "활동 통계를 불러오지 못했습니다."}</p><button type="button" onClick={statsQuery.retry}>통계 다시 불러오기</button></div>}
          <div className="mypage-stats-grid">
            {stats.map((stat) => (
              <div key={stat.label} className="mypage-stat-card">
                <strong aria-label={stat.value === null ? `${stat.label} 미확인` : undefined}>{stat.value === null ? "—" : stat.value}</strong>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>
        </section>

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
          <h2 className="mypage-section-title">화면 설정</h2>

          <div className="mypage-settings-list">
            <div className="mypage-theme-setting">
              <span className="mypage-theme-label">테마</span>
              <div className="mypage-theme-options" role="group" aria-label="화면 테마 선택">
                {[["light", "라이트"], ["dark", "다크"]].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={`mypage-theme-option ${theme === value ? "active" : ""}`}
                    aria-label={`${label} 모드로 전환`}
                    aria-pressed={theme === value}
                    onClick={() => handleThemeChange(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              className="mypage-menu-item mypage-location-setting"
              onClick={handleLocationPermissionClick}
              aria-label={`위치 사용 ${locationAllowed ? "끄기" : "켜기"}`}
              aria-pressed={locationAllowed}
            >
              <div className="mypage-menu-left">
                <div className="mypage-menu-icon-circle support">
                  <LocationIcon />
                </div>
                <span>위치 사용</span>
              </div>

              <LocationPermissionSwitch active={locationAllowed} />
            </button>
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

      {isLocationPermissionOpen && (
        <LocationPermissionModal
          onClose={() => setIsLocationPermissionOpen(false)}
          onAllow={handleAllowLocationPermission}
        />
      )}
    </div>
  );
};

export default MyPage;
