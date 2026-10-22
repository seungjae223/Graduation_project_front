import React from "react";
import { Link, useNavigate } from "react-router-dom";
import useSessionKey from "../utils/useSessionKey";
import useReadQuery from "../utils/useReadQuery";
import { getAuthSnapshot } from "../utils/authState";
import { getMyProfileApi } from "../api/profileApi";
import { clearAuthenticatedUserStorage } from "../utils/authStorage";
import { readCurrentRole } from "../Admin/AdminAccessGuard";
import MyPageIcon from "./MyPageIcon";
import "./MyPage.css";

const TRAVEL_SHORTCUTS = [
  { label: "저장한 장소", path: "/saved-places", icon: "folder" },
  { label: "지난 여행", path: "/mypage/past-trips", icon: "luggage" },
  { label: "최근 본 장소", path: "/mypage/recent-places", icon: "history" },
  { label: "작성한 리뷰", path: "/mypage/reviews", icon: "review" },
];

const NavItem = ({ to, icon, label, description, onClick }) => {
  const content = <>
    <span className="mypage-v14-icon" aria-hidden="true"><MyPageIcon name={icon} /></span>
    <span className="mypage-v14-item-text"><strong>{label}</strong>{description && <small>{description}</small>}</span>
    <span className="mypage-v14-chevron" aria-hidden="true"><MyPageIcon name="chevron" /></span>
  </>;
  return to
    ? <Link to={to} className="mypage-v14-item">{content}</Link>
    : <button type="button" className="mypage-v14-item" onClick={onClick}>{content}</button>;
};

export default function MyPage() {
  const navigate = useNavigate();
  const account = useSessionKey();
  const credentialVersion = getAuthSnapshot().credentialVersion;
  const profile = useReadQuery(`${account}:${credentialVersion}:mypage-profile`,
    signal => getMyProfileApi({ signal }), account !== "anonymous",
    () => getAuthSnapshot().accountKey === account &&
      getAuthSnapshot().credentialVersion === credentialVersion);
  let isAdmin = false;
  try { isAdmin = readCurrentRole() === "admin"; } catch { /* unauthenticated role */ }

  const logout = () => {
    clearAuthenticatedUserStorage();
    navigate("/login", { replace: true });
  };

  return <main className="mypage-v14" aria-label="마이페이지">
    <section className="mypage-v14-profile">
      <div className="mypage-v14-avatar" aria-hidden="true"><MyPageIcon name="avatar" /></div>
      <div className="mypage-v14-identity">
        <h1>{profile.data?.nickname || (profile.status === "loading" ? "불러오는 중..." : "여행자")}</h1>
      </div>
      <Link to="/mypage/profile" className="mypage-v14-profile-link" aria-label="내 정보 수정">
        내 정보 <MyPageIcon name="chevron" />
      </Link>
    </section>

    {profile.status === "error" && <div role="alert" className="mypage-v14-message">
      프로필을 불러오지 못했어요. <button type="button" onClick={profile.retry}>프로필 다시 불러오기</button>
    </div>}

    <nav className="mypage-v14-shortcuts" aria-label="여행 바로가기">
      {TRAVEL_SHORTCUTS.map(item =>
        <Link className="mypage-v14-shortcut" key={item.path} to={item.path}>
          <span className="mypage-v14-shortcut-icon" aria-hidden="true"><MyPageIcon name={item.icon} /></span>
          <span>{item.label}</span>
        </Link>)}
    </nav>

    <section className="mypage-v14-section">
      <h2>계정</h2>
      <nav aria-label="계정" className="mypage-v14-menu">
        <NavItem to="/mypage/profile" icon="user-edit" label="내 정보 수정" />
        {profile.data?.provider === "LOCAL" && <NavItem to="/mypage/password"
          icon="lock" label="비밀번호 변경" />}
        <NavItem icon="logout" label="로그아웃" onClick={logout} />
      </nav>
    </section>

    <section className="mypage-v14-section">
      <h2>고객지원</h2>
      <nav aria-label="고객지원" className="mypage-v14-menu">
        <NavItem to="/inquiry" icon="message" label="1:1 문의" description="문의 및 답변 내역" />
        {isAdmin && <NavItem to="/admin" icon="settings" label="관리자 페이지" />}
      </nav>
    </section>
  </main>;
}
