import React from "react";
import { Link, useNavigate } from "react-router-dom";
import folderIcon from "react-useanimations/lib/folder";
import briefcaseIcon from "react-useanimations/lib/briefcase";
import clockIcon from "react-useanimations/lib/clock";
import editIcon from "react-useanimations/lib/edit";
import userIcon from "react-useanimations/lib/user";
import logoutIcon from "react-useanimations/lib/logOut";
import AnimatedIconButton from "../components/AnimatedIconButton";
import useTapFeedback from "../utils/useTapFeedback";
import useSessionKey from "../utils/useSessionKey";
import useReadQuery from "../utils/useReadQuery";
import { getAuthSnapshot } from "../utils/authState";
import { getMyProfileApi } from "../api/profileApi";
import { clearAuthenticatedUserStorage } from "../utils/authStorage";
import { readCurrentRole } from "../Admin/AdminAccessGuard";
import MyPageIcon from "./MyPageIcon";
import "./MyPage.css";

const TRAVEL_SHORTCUTS = [
  { label: "저장한 장소", path: "/saved-places", animation: folderIcon },
  { label: "지난 여행", path: "/mypage/past-trips", animation: briefcaseIcon },
  { label: "최근 본 장소", path: "/mypage/recent-places", animation: clockIcon },
  { label: "작성한 리뷰", path: "/mypage/reviews", animation: editIcon },
];

const NavItem = ({ to, icon, animation, label, description, onClick }) => {
  const content = <>
    {icon && <span className="mypage-v14-icon" aria-hidden="true"><MyPageIcon name={icon} /></span>}
    <span className="mypage-v14-item-text"><strong>{label}</strong>{description && <small>{description}</small>}</span>
    <span className="mypage-v14-chevron" aria-hidden="true"><MyPageIcon name="chevron" /></span>
  </>;
  if (animation) return <AnimatedIconButton as={to ? Link : "button"} to={to} onClick={onClick}
    className="mypage-v14-item" animation={animation} iconSize={20} iconWrapClassName="mypage-v14-icon">
    {content}
  </AnimatedIconButton>;
  return <Link to={to} className="mypage-v14-item">{content}</Link>;
};

export default function MyPage() {
  const navigate = useNavigate();
  const tapFeedback = useTapFeedback();
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
  const animateLink = (event, to) => tapFeedback(event, () => navigate(to));

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
        <AnimatedIconButton as={Link} className="mypage-v14-shortcut" key={item.path} to={item.path}
          onClick={event => animateLink(event, item.path)} animation={item.animation}
          iconSize={23} iconWrapClassName="mypage-v14-shortcut-icon">
          <span>{item.label}</span>
        </AnimatedIconButton>)}
    </nav>

    <section className="mypage-v14-section">
      <h2>계정</h2>
      <nav aria-label="계정" className="mypage-v14-menu">
        <NavItem to="/mypage/profile" animation={userIcon} label="내 정보 수정"
          onClick={event => animateLink(event, "/mypage/profile")} />
        {profile.data?.provider === "LOCAL" && <NavItem to="/mypage/password"
          icon="lock" label="비밀번호 변경" />}
        <NavItem animation={logoutIcon} label="로그아웃" onClick={event => {
          if (!tapFeedback(event, logout)) logout();
        }} />
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
