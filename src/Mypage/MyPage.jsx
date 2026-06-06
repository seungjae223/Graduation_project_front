import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSavedPlaces } from "../Context/SavedPlacesContext";
import "./MyPage.css";
import api, { getAccessToken } from "../api/api";

import adminMenuIcon from "../img/관리자.png";

const DEFAULT_USER_NAME = "여행자";

const POLICY_SECTIONS = [
  {
    id: 1,
    title: "제1조 (목적)",
    content: `본 약관은 회사가 제공하는 위치기반서비스(이하 "서비스")를 이용함에 있어 회사와 이용자의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다. 회사는 이용자에게 최적의 이동 수단 및 정보를 제공하기 위해 본 약관을 제정하였습니다.`,
  },
  {
    id: 2,
    title: "제2조 (용어의 정의)",
    content: `1. "서비스"란 회사가 제공하는 위치기반서비스 전반을 의미합니다.
2. "이용자"란 회사의 서비스에 접속하여 본 약관에 따라 서비스를 이용하는 고객을 말합니다.
3. "위치정보"란 특정 개인이 위치하는 장소의 정보를 말합니다.`,
  },
  {
    id: 3,
    title: "제3조 (약관의 효력 및 변경)",
    content: `본 약관은 서비스를 신청한 고객 또는 개인위치정보주체가 본 약관에 동의하고 회사가 정한 소정의 절차에 따라 서비스의 이용자로 등록함으로써 효력이 발생합니다. 회사는 합리적인 사유가 발생할 경우 관계법령을 위배하지 않는 범위 내에서 약관을 개정할 수 있습니다.`,
  },
  {
    id: 4,
    title: "제4조 (관계법령의 적용)",
    content: `본 약관은 신의성실의 원칙에 따라 공정하게 적용하며, 약관에 명시되지 아니한 사항에 대하여는 위치정보의 보호 및 이용 등에 관한 법률, 정보통신망 이용촉진 및 정보보호 등에 관한 법률 등 관계법령 또는 상관례에 따릅니다.`,
  },
  {
    id: 5,
    title: "제5조 (서비스의 내용)",
    content: `회사는 위치정보를 활용하여 다음 각 호의 서비스를 제공합니다.
1. 현재 위치 기반 주변 명소 및 매장 추천
2. 실시간 경로 안내 및 소요 시간 예측
3. 사용자 간 실시간 위치 공유 기능
4. 위치 기반 이벤트 정보 및 쿠폰 제공`,
  },
  {
    id: 6,
    title: "제6조 (서비스 이용요금)",
    content: `회사가 제공하는 서비스는 기본적으로 무료입니다. 다만, 데이터 통신료는 이용자가 가입한 이동통신사의 요금제에 따라 별도로 부과될 수 있습니다. 유료 서비스가 도입될 경우 별도의 공지를 통해 안내합니다.`,
  },
  {
    id: 7,
    title: "제7조 (서비스 이용의 제한 및 중지)",
    content: `회사는 다음 각 호에 해당하는 경우 서비스의 전부 또는 일부를 제한하거나 중지할 수 있습니다.
1. 서비스용 설비의 보수 등 공사로 인한 부득이한 경우
2. 정전, 설비 장애 또는 이용량 폭주로 정상적인 서비스 이용에 지장이 있는 경우
3. 천재지변, 국가비상사태 등 불가항력적 사유가 있는 경우`,
  },
  {
    id: 8,
    title: "제8조 (개인위치정보의 이용 또는 제공)",
    content: `회사는 개인위치정보를 이용하여 서비스를 제공하고자 하는 경우에는 미리 이용약관에 명시한 후 개인위치정보주체의 동의를 얻어야 합니다. 회사는 타인에게 위치정보를 제공할 경우 제공받는 자, 제공일시 및 목적을 기록하여 보존합니다.`,
  },
  {
    id: 9,
    title: "제9조 (개인위치정보주체의 권리)",
    content: `이용자는 회사에 대하여 언제든지 개인위치정보를 이용한 위치기반서비스 제공 및 개인위치정보의 제3자 제공에 대한 동의의 전부 또는 일부를 철회할 수 있습니다. 또한 이용자는 위치정보 이용 및 제공 사실 확인자료의 열람 및 고지, 오류 정정을 요구할 수 있습니다.`,
  },
  {
    id: 10,
    title: "제10조 (법정대리인의 권리)",
    content: `회사는 14세 미만의 아동으로부터 개인위치정보를 수집·이용 또는 제공하고자 하는 경우에는 그 법정대리인의 동의를 얻어야 합니다. 법정대리인은 아동의 개인위치정보 보호를 위해 본 약관에 따른 모든 권리를 행사할 수 있습니다.`,
  },
  {
    id: 11,
    title: "제11조 (위치정보 이용·제공사실 확인자료의 보유근거 및 보유기간)",
    content: `회사는 위치정보의 보호 및 이용 등에 관한 법률 제16조 제2항에 따라 고객에 대한 위치정보 이용·제공사실 확인자료를 위치정보시스템에 자동으로 기록하며, 해당 자료는 6개월 이상 보관합니다.`,
  },
  {
    id: 12,
    title: "제12조 (서비스의 변경 및 중지)",
    content: `회사가 서비스를 변경하거나 중지하는 경우 회사는 이용자에게 사전 고지함을 원칙으로 합니다. 다만, 긴급한 상황의 경우 사후에 공지할 수 있습니다.`,
  },
  {
    id: 13,
    title: "제13조 (손해배상)",
    content: `회사가 위치정보의 보호 및 이용 등에 관한 법률 제15조 내지 제26조의 규정을 위반한 행위로 이용자에게 손해가 발생한 경우 이용자는 회사에 대하여 손해배상 청구를 할 수 있습니다. 회사는 고의 또는 과실이 없음을 입증하지 아니하면 책임을 면할 수 없습니다.`,
  },
  {
    id: 14,
    title: "제14조 (면책)",
    content: `회사는 천재지변 또는 이에 준하는 불가항력으로 인하여 서비스를 제공할 수 없는 경우에는 서비스 제공에 관한 책임이 면제됩니다. 또한 이용자의 귀책사유로 인한 서비스 이용 장애에 대하여는 책임을 지지 않습니다.`,
  },
  {
    id: 15,
    title: "제15조 (분쟁의 조정 등)",
    content: `서비스 이용과 관련하여 회사와 이용자 사이에 분쟁이 발생한 경우, 우선적으로 성실히 협의하여 해결하되 협의가 되지 않을 경우 방송통신위원회에 조정을 신청하거나 법원에 소를 제기할 수 있습니다.`,
  },
];

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
  >
    <input
      type="checkbox"
      checked={active}
      readOnly
      tabIndex={-1}
      onClick={(event) => event.preventDefault()}
    />
    <label />
  </span>
);

const LocationPolicyModal = ({ onClose, onAgree }) => (
  <div className="location-policy-overlay">
    <div
      className="location-policy-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="location-policy-title"
    >
      <div className="location-policy-header">
        <h2 id="location-policy-title" className="location-policy-title">
          위치기반서비스 이용약관
        </h2>

        <button
          type="button"
          className="location-policy-close"
          onClick={onClose}
          aria-label="위치기반서비스 이용약관 닫기"
        >
          ×
        </button>
      </div>

      <div className="location-policy-content">
        <h3 className="location-policy-service-title">너만 오면 go</h3>

        <p className="location-policy-description">
          서비스 이용을 위해 아래의 약관 전문을 확인해 주세요.
        </p>

        {POLICY_SECTIONS.map((section) => (
          <section key={section.id} className="location-policy-section">
            <div className="location-policy-section-title-wrap">
              <span className="location-policy-bar" />
              <h4 className="location-policy-section-title">{section.title}</h4>
            </div>

            <p className="location-policy-section-content">{section.content}</p>
          </section>
        ))}
      </div>

      <div className="location-policy-footer">
        <button
          type="button"
          className="location-policy-agree"
          onClick={onAgree}
        >
          동의하고 계속하기 〉
        </button>
      </div>
    </div>
  </div>
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
  const [isLocationPolicyOpen, setIsLocationPolicyOpen] = useState(false);

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
    if (!isLocationPolicyOpen || typeof document === "undefined") {
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
  }, [isLocationPolicyOpen]);

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
    if (locationAllowed) {
      alert(
        "이미 위치 권한이 허용되어 있습니다. 권한 해제는 브라우저 설정에서 변경해주세요."
      );
      return;
    }

    setIsLocationPolicyOpen(true);
  };

  const handleAgreeLocationPolicy = () => {
    try {
      localStorage.setItem("locationPolicyAgreed", "true");
      localStorage.setItem(
        "locationPolicyAgreedAt",
        new Date().toISOString()
      );
    } catch (error) {
      console.error("위치기반서비스 약관 동의 저장 실패:", error);
    }

    setIsLocationPolicyOpen(false);
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

      {isLocationPolicyOpen && (
        <LocationPolicyModal
          onClose={() => setIsLocationPolicyOpen(false)}
          onAgree={handleAgreeLocationPolicy}
        />
      )}
    </div>
  );
};

export default MyPage;