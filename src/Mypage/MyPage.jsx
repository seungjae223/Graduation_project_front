import React, { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useSavedPlaces } from "../Context/SavedPlacesContext";
import "./MyPage.css";
import api, { getAccessToken } from "../api/api";

import adminMenuIcon from "../img/관리자.png";
import locationPinIcon from "../img/파랑색 위치.png";
import navigationArrowIcon from "../img/Background.png";
import compassIcon from "../img/나침반.png";
import routeIcon from "../img/동선.png";

const DEFAULT_USER_NAME = "여행자";

const ArrowIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M7 4.5C7 3.94772 7.44772 3.5 8 3.5H16C16.5523 3.5 17 3.94772 17 4.5V20L12 16.8L7 20V4.5Z"
      stroke="#179FF4"
      strokeWidth="2"
      strokeLinejoin="round"
    />
  </svg>
);

const HistoryIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M5 6.5C5 5.39543 5.89543 4.5 7 4.5H17C18.1046 4.5 19 5.39543 19 6.5V13.5C19 14.6046 18.1046 15.5 17 15.5H10L6 19V15.5H7C5.89543 15.5 5 14.6046 5 13.5V6.5Z"
      stroke="#4C5A73"
      strokeWidth="2"
      strokeLinejoin="round"
    />
  </svg>
);

const LocationIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M12 21.5C12 21.5 19 15.1 19 9.8C19 5.93401 15.866 2.8 12 2.8C8.13401 2.8 5 5.93401 5 9.8C5 15.1 12 21.5 12 21.5Z"
      stroke="#4C5A73"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="9.8" r="2.4" stroke="#4C5A73" strokeWidth="2" />
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
        className="location-permission-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="location-permission-title"
        onClick={(event) => event.stopPropagation()}
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          background: "#ffffff",
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

        <p className="location-permission-message">
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
          PRIVACY MATTERS. YOUR LOCATION IS ENCRYPTED.
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

const pickText = (...values) => {
  const value = values.find((item) => {
    return typeof item === "string" && item.trim();
  });

  return value ? value.trim() : "";
};

const pickRealText = (...values) => {
  const value = values.find((item) => {
    return (
      typeof item === "string" &&
      item.trim() &&
      item.trim() !== DEFAULT_USER_NAME
    );
  });

  return value ? value.trim() : "";
};

const isObject = (value) => {
  return value && typeof value === "object" && !Array.isArray(value);
};

const getEmailLocalPart = (email) => {
  if (!email || typeof email !== "string") return "";

  return email.includes("@") ? email.split("@")[0] : email;
};

const getCachedNicknameByEmail = (email) => {
  if (!email) return "";

  return pickRealText(
    localStorage.getItem(`nickname:${email}`),
    sessionStorage.getItem(`nickname:${email}`)
  );
};

const normalizeToken = (token) => {
  if (!token || typeof token !== "string") return "";

  const trimmedToken = token.trim();

  if (!trimmedToken) return "";

  try {
    const parsed = JSON.parse(trimmedToken);

    const parsedToken = pickText(
      parsed?.accessToken,
      parsed?.token,
      parsed?.data?.accessToken,
      parsed?.data?.token
    );

    if (parsedToken) {
      return parsedToken.replace(/^Bearer\s+/i, "").trim();
    }
  } catch {
    // JSON 문자열이 아니면 일반 토큰으로 처리
  }

  return trimmedToken.replace(/^Bearer\s+/i, "").trim();
};

const getStoredUser = () => {
  try {
    const localUser = localStorage.getItem("currentUser");
    if (localUser) return JSON.parse(localUser);

    const sessionUser = sessionStorage.getItem("currentUser");
    if (sessionUser) return JSON.parse(sessionUser);

    const mockLocalUser = localStorage.getItem("mock_current_user");
    if (mockLocalUser) return JSON.parse(mockLocalUser);

    const mockSessionUser = sessionStorage.getItem("mock_current_user");
    if (mockSessionUser) return JSON.parse(mockSessionUser);

    return null;
  } catch (error) {
    localStorage.removeItem("currentUser");
    sessionStorage.removeItem("currentUser");
    return null;
  }
};

const parseJwtPayload = (token) => {
  try {
    const cleanToken = normalizeToken(token);

    if (!cleanToken) return null;

    const payload = cleanToken.split(".")[1];
    if (!payload) return null;

    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const paddedBase64 = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      "="
    );

    const decodedPayload = atob(paddedBase64);
    const jsonPayload = decodeURIComponent(
      decodedPayload
        .split("")
        .map((char) => {
          return `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`;
        })
        .join("")
    );

    return JSON.parse(jsonPayload);
  } catch (error) {
    return null;
  }
};

const normalizeRole = (role) => {
  if (Array.isArray(role)) {
    const firstRole = role[0];

    if (typeof firstRole === "object" && firstRole !== null) {
      return firstRole.authority || firstRole.role || "";
    }

    return firstRole || "";
  }

  if (typeof role === "object" && role !== null) {
    return role.authority || role.role || "";
  }

  return role || "";
};

const getUserData = (data) => {
  const candidates = [
    data?.data?.user,
    data?.data?.member,
    data?.data?.userInfo,
    data?.data?.memberInfo,
    data?.data?.profile,
    data?.data,

    data?.result?.user,
    data?.result?.member,
    data?.result?.userInfo,
    data?.result?.memberInfo,
    data?.result?.profile,
    data?.result,

    data?.user,
    data?.member,
    data?.userInfo,
    data?.memberInfo,
    data?.profile,
    data,
  ];

  return candidates.find(isObject) || null;
};

const getNestedUserData = (user) => {
  if (isObject(user?.user)) return user.user;
  if (isObject(user?.member)) return user.member;
  if (isObject(user?.userInfo)) return user.userInfo;
  if (isObject(user?.memberInfo)) return user.memberInfo;
  if (isObject(user?.profile)) return user.profile;

  return {};
};

const getStoredAccessToken = () => {
  try {
    return (
      getAccessToken() ||
      localStorage.getItem("accessToken") ||
      localStorage.getItem("token") ||
      sessionStorage.getItem("accessToken") ||
      sessionStorage.getItem("token") ||
      ""
    );
  } catch {
    return (
      localStorage.getItem("accessToken") ||
      localStorage.getItem("token") ||
      sessionStorage.getItem("accessToken") ||
      sessionStorage.getItem("token") ||
      ""
    );
  }
};

const normalizeUserData = (data) => {
  const user = getUserData(data);
  const nestedUser = getNestedUserData(user || {});
  const token = getStoredAccessToken();
  const payload = parseJwtPayload(token);

  const userIsFallback = user?._isNicknameFallback === true;

  const username = pickText(
    user?.username,
    user?.loginId,
    user?.userId,
    nestedUser?.username,
    nestedUser?.loginId,
    nestedUser?.userId
  );

  const usernameIsEmail = username.includes("@");

  const storedEmail = pickText(
    localStorage.getItem("userEmail"),
    sessionStorage.getItem("userEmail")
  );

  const email = pickText(
    user?.email,
    user?.userEmail,
    user?.memberEmail,
    user?.loginEmail,
    user?.accountEmail,
    user?.emailAddress,
    user?.mail,

    nestedUser?.email,
    nestedUser?.userEmail,
    nestedUser?.memberEmail,
    nestedUser?.loginEmail,
    nestedUser?.accountEmail,
    nestedUser?.emailAddress,
    nestedUser?.mail,

    usernameIsEmail ? username : "",
    storedEmail,

    payload?.email,
    payload?.userEmail,
    payload?.memberEmail,
    typeof payload?.sub === "string" && payload.sub.includes("@")
      ? payload.sub
      : "",
    typeof payload?.username === "string" && payload.username.includes("@")
      ? payload.username
      : ""
  );

  const storedName = pickRealText(
    getCachedNicknameByEmail(email),
    localStorage.getItem("userNickname"),
    localStorage.getItem("userName"),
    sessionStorage.getItem("userNickname"),
    sessionStorage.getItem("userName")
  );

  const serverName = userIsFallback
    ? ""
    : pickRealText(
        user?.nickname,
        user?.name,
        user?.userName,
        user?.memberName,
        user?.displayName,
        user?.realName,
        user?.fullName,

        nestedUser?.nickname,
        nestedUser?.name,
        nestedUser?.userName,
        nestedUser?.memberName,
        nestedUser?.displayName,
        nestedUser?.realName,
        nestedUser?.fullName,

        !usernameIsEmail ? username : ""
      );

  const payloadName = pickRealText(
    payload?.nickname,
    payload?.name,
    payload?.userName,
    payload?.memberName,
    typeof payload?.sub === "string" && !payload.sub.includes("@")
      ? payload.sub
      : ""
  );

  const realNickname = pickRealText(serverName, storedName, payloadName);
  const emailFallbackName = getEmailLocalPart(email);
  const displayName = realNickname || emailFallbackName || DEFAULT_USER_NAME;

  const role = normalizeRole(
    user?.role ||
      user?.roles ||
      user?.authority ||
      user?.authorities ||
      nestedUser?.role ||
      nestedUser?.roles ||
      nestedUser?.authority ||
      nestedUser?.authorities ||
      payload?.role ||
      payload?.roles ||
      payload?.authority ||
      payload?.authorities
  );

  const hasUserObject = user && Object.keys(user).length > 0;

  if (!hasUserObject && !email && !displayName) {
    return null;
  }

  return {
    ...(user || {}),
    name: displayName,
    nickname: realNickname || displayName,
    username: realNickname || displayName,
    email: email || "",
    role,
    _isNicknameFallback: !realNickname,
  };
};

const getFallbackUser = () => {
  return normalizeUserData(null);
};

const getInitialUser = () => {
  return normalizeUserData(getStoredUser()) || getFallbackUser();
};

const getUserDisplayName = (user) => {
  if (!user) return DEFAULT_USER_NAME;

  return (
    pickRealText(user.name, user.nickname, user.username) ||
    getEmailLocalPart(user.email) ||
    DEFAULT_USER_NAME
  );
};

const saveUserToStorage = (user) => {
  if (!user) return;

  try {
    localStorage.setItem("currentUser", JSON.stringify(user));

    if (user.email) {
      localStorage.setItem("userEmail", user.email);
    }

    if (!user._isNicknameFallback) {
      const realNickname = pickRealText(user.nickname, user.name, user.username);

      if (realNickname) {
        localStorage.setItem("userName", realNickname);
        localStorage.setItem("userNickname", realNickname);

        if (user.email) {
          localStorage.setItem(`nickname:${user.email}`, realNickname);
        }
      }
    }
  } catch (storageError) {
    console.error("사용자 정보 저장 실패:", storageError);
  }
};

const MyPage = () => {
  const navigate = useNavigate();
  const { savedPlaces } = useSavedPlaces();

  const [currentUser, setCurrentUser] = useState(getInitialUser());
  const [isUserLoading, setIsUserLoading] = useState(false);
  const [locationAllowed, setLocationAllowed] = useState(false);
  const [isLocationPermissionOpen, setIsLocationPermissionOpen] =
    useState(false);

  const currentRole = String(currentUser?.role || "").toUpperCase();
  const isAdmin = currentRole === "ADMIN" || currentRole === "ROLE_ADMIN";

  useEffect(() => {
    let isMounted = true;

    const fetchMyInfo = async () => {
      const token = getStoredAccessToken();

      if (!token) {
        navigate("/login", { replace: true });
        return;
      }

      const fallbackUser = getInitialUser();

      if (fallbackUser && isMounted) {
        setCurrentUser(fallbackUser);
        saveUserToStorage(fallbackUser);
      }

      try {
        setIsUserLoading(true);

        const response = await api.get("/api/users/me");

        console.log("내 정보 응답:", response.data);

        const userData = normalizeUserData(response.data);

        if (!userData) {
          throw new Error("사용자 정보가 비어 있습니다.");
        }

        if (!isMounted) return;

        setCurrentUser(userData);
        saveUserToStorage(userData);
      } catch (error) {
        console.error("내 정보 조회 실패:", error);

        const safeFallbackUser = getInitialUser();

        if (safeFallbackUser && isMounted) {
          setCurrentUser(safeFallbackUser);
          saveUserToStorage(safeFallbackUser);
        }
      } finally {
        if (isMounted) {
          setIsUserLoading(false);
        }
      }
    };

    fetchMyInfo();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  const saveLocationAllowed = useCallback((isAllowed) => {
    setLocationAllowed(isAllowed);

    try {
      localStorage.setItem(
        "locationPermissionAllowed",
        isAllowed ? "true" : "false"
      );
    } catch (error) {
      console.error("위치 권한 상태 저장 실패:", error);
    }
  }, []);

  useEffect(() => {
    try {
      const savedLocationAllowed = localStorage.getItem(
        "locationPermissionAllowed"
      );

      if (savedLocationAllowed !== null) {
        setLocationAllowed(savedLocationAllowed === "true");
      }
    } catch (error) {
      console.error("저장된 위치 권한 상태 확인 실패:", error);
    }

    if (typeof navigator === "undefined" || !navigator.permissions) {
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
          saveLocationAllowed(status.state === "granted");
        };
      })
      .catch((error) => {
        console.error("위치 권한 상태 확인 실패:", error);
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
          console.error("사용자 위치 저장 실패:", error);
        }

        saveLocationAllowed(true);
        alert("위치 권한이 허용되었습니다.");
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          saveLocationAllowed(false);
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
    setIsLocationPermissionOpen(true);
  };

  const handleAllowLocationPermission = () => {
    try {
      localStorage.setItem(
        "locationPermissionRequestedAt",
        new Date().toISOString()
      );
    } catch (error) {
      console.error("위치 권한 요청 시간 저장 실패:", error);
    }

    setIsLocationPermissionOpen(false);
    requestLocationPermission();
  };

  const stats = [
    {
      label: "다녀온 곳",
      value:
        currentUser?.visitedPlaceCount ??
        currentUser?.visitedCount ??
        currentUser?.tripCount ??
        0,
    },
    {
      label: "저장한 곳",
      value:
        currentUser?.savedPlaceCount ??
        currentUser?.bookmarkCount ??
        savedPlaces.length,
    },
    {
      label: "작성한 리뷰",
      value:
        currentUser?.reviewCount ??
        currentUser?.writtenReviewCount ??
        0,
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
    try {
      localStorage.removeItem("petapp_session_v1");
      localStorage.removeItem("jakdang_access_token");
      localStorage.removeItem("accessToken");
      localStorage.removeItem("token");
      localStorage.removeItem("tokenType");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("isLoggedIn");
      localStorage.removeItem("keepLogin");
      localStorage.removeItem("userEmail");
      localStorage.removeItem("userName");
      localStorage.removeItem("userNickname");
      localStorage.removeItem("currentUser");
      localStorage.removeItem("mock_current_user");

      sessionStorage.removeItem("petapp_session_v1");
      sessionStorage.removeItem("jakdang_access_token");
      sessionStorage.removeItem("accessToken");
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("userEmail");
      sessionStorage.removeItem("userName");
      sessionStorage.removeItem("userNickname");
      sessionStorage.removeItem("currentUser");
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
                <h1>
                  {isUserLoading && !currentUser
                    ? "불러오는 중..."
                    : getUserDisplayName(currentUser)}
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

              <p>{currentUser?.email || "이메일 정보 없음"}</p>
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

            <button
              type="button"
              className="mypage-menu-item"
              onClick={handleLocationPermissionClick}
              aria-label="위치 권한 허용"
              aria-pressed={locationAllowed}
            >
              <div className="mypage-menu-left">
                <div className="mypage-menu-icon-circle support">
                  <LocationIcon />
                </div>
                <span>위치 권한 허용</span>
              </div>

              <LocationPermissionSwitch active={locationAllowed} />
            </button>
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