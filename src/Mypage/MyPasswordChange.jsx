import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import useReadQuery from "../utils/useReadQuery";
import useSessionKey from "../utils/useSessionKey";
import { getAuthSnapshot } from "../utils/authState";
import { clearAuthenticatedUserStorage } from "../utils/authStorage";
import { changeMyPasswordApi, getMyProfileApi } from "../api/profileApi";
import { getApiErrorMessage } from "../api/api";
import { PASSWORD_PATTERN, PASSWORD_HELP } from "../Login/passwordValidation";
import "./MyPage.css";

export default function MyPasswordChange() {
  const account = useSessionKey();
  const navigate = useNavigate();
  const profileQuery = useReadQuery(account + ":password-change-profile",
    signal => getMyProfileApi({ signal }), account !== "anonymous",
    () => getAuthSnapshot().accountKey === account);
  const [current, setCurrent] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);
  const [message, setMessage] = useState("");
  const canSubmit = !busy && !complete && profileQuery.data?.provider === "LOCAL" &&
    current.length > 0 && PASSWORD_PATTERN.test(nextPassword) &&
    nextPassword === confirm && current !== nextPassword;

  const handleSubmit = async event => {
    event.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setMessage("");
    try {
      await changeMyPasswordApi({ currentPassword: current, newPassword: nextPassword });
      if (getAuthSnapshot().accountKey !== account) return;
      setCurrent(""); setNextPassword(""); setConfirm("");
      setComplete(true);
    } catch (error) {
      if (getAuthSnapshot().accountKey !== account) return;
      const unknown = !error?.response || Number(error.response.status) >= 500;
      setMessage(unknown
        ? "변경 결과를 확인하지 못했어요. 중복 요청하기 전에 새 비밀번호로 로그인할 수 있는지 확인해 주세요."
        : getApiErrorMessage(error, "비밀번호를 변경하지 못했어요. 입력 내용을 확인해 주세요."));
    } finally {
      if (getAuthSnapshot().accountKey === account) setBusy(false);
    }
  };
  const signInAgain = () => {
    clearAuthenticatedUserStorage();
    navigate("/login", { replace: true });
  };

  return <main className="mypage-v14 mypage-v14-subpage">
    <header className="mypage-v14-pagehead"><h1>비밀번호 변경</h1></header>
    {profileQuery.status === "loading" && !profileQuery.data &&
      <p role="status">계정 정보를 확인하고 있어요.</p>}
    {profileQuery.status === "error" && <div className="mypage-v14-message" role="alert">
      계정 정보를 확인하지 못했어요.
      <button type="button" onClick={profileQuery.retry}>다시 조회</button>
    </div>}
    {profileQuery.data?.provider !== "LOCAL" && profileQuery.status === "success" &&
      <div className="mypage-v14-account-extra" role="status">
        소셜 계정은 별도 서비스 비밀번호가 없어요. 카카오 또는 구글에서 비밀번호를 관리해 주세요.
      </div>}
    {complete ? <section className="mypage-v14-account-extra" role="status">
      <h2>비밀번호가 변경됐어요.</h2>
      <p>변경된 비밀번호로 다시 로그인해 주세요.</p>
      <button className="mypage-v14-primary-action" type="button" onClick={signInAgain}>다시 로그인</button>
    </section> : profileQuery.data?.provider === "LOCAL" && <form className="mypage-v14-form" onSubmit={handleSubmit}>
      <p className="mypage-v14-form-help">보안을 위해 현재 비밀번호를 확인해 주세요.</p>
      <label htmlFor="mypage-current-password">현재 비밀번호</label>
      <input id="mypage-current-password" type="password" autoComplete="current-password"
        value={current} onChange={e => setCurrent(e.target.value)} disabled={busy} required />
      <label htmlFor="mypage-next-password">새 비밀번호</label>
      <input id="mypage-next-password" type="password" autoComplete="new-password"
        value={nextPassword} onChange={e => setNextPassword(e.target.value)} disabled={busy} required
        aria-describedby="mypage-password-rules" />
      <p id="mypage-password-rules" className="mypage-v14-form-help">{PASSWORD_HELP}</p>
      <label htmlFor="mypage-next-password-confirm">새 비밀번호 확인</label>
      <input id="mypage-next-password-confirm" type="password" autoComplete="new-password"
        value={confirm} onChange={e => setConfirm(e.target.value)} disabled={busy} required />
      {message && <p role="alert">{message}</p>}
      <button type="submit" disabled={!canSubmit}>{busy ? "변경 중..." : "비밀번호 변경"}</button>
      <Link className="mypage-v14-forgot" to="/find-password">
        비밀번호를 잊으셨나요? 이메일 인증으로 재설정하기
      </Link>
    </form>}
  </main>;
}
