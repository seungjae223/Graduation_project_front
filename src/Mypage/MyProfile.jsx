import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import useSessionKey from "../utils/useSessionKey";
import useReadQuery from "../utils/useReadQuery";
import { getAuthSnapshot } from "../utils/authState";
import { getMyProfileApi, updateMyNicknameApi } from "../api/profileApi";
import "./MyPage.css";

export default function MyProfile() {
  const account = useSessionKey();
  const version = getAuthSnapshot().credentialVersion;
  const query = useReadQuery(`${account}:${version}:mypage-edit-profile`,
    signal => getMyProfileApi({ signal }), account !== "anonymous",
    () => getAuthSnapshot().accountKey === account &&
      getAuthSnapshot().credentialVersion === version);
  const profile = query.data;
  const [nickname, setNickname] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => { if (profile) setNickname(profile.nickname); }, [profile]);

  const submit = async event => {
    event.preventDefault();
    if (isSaving || !profile) return;
    const proposed = nickname.trim();
    if (proposed.length < 2 || proposed.length > 20) {
      setMessage("닉네임은 2~20자로 입력해 주세요."); setSaved(false); return;
    }
    setIsSaving(true); setMessage("");
    try {
      const updated = await updateMyNicknameApi(proposed);
      setNickname(updated.nickname);
      setSaved(true); setMessage("닉네임이 변경됐어요.");
    } catch {
      setSaved(false); setMessage("닉네임을 변경하지 못했어요. 다시 시도해 주세요.");
    } finally { setIsSaving(false); }
  };

  return <main className="mypage-v14 mypage-v14-subpage">
    <header className="mypage-v14-pagehead"><h1>내 정보 수정</h1></header>
    {query.status === "loading" && !profile && <p role="status">프로필을 확인하는 중...</p>}
    {query.status === "error" && <div role="alert" className="mypage-v14-message">
      프로필을 불러오지 못했어요. <button type="button" onClick={query.retry}>다시 조회</button>
    </div>}
    {profile && <>
      <form className="mypage-v14-form" onSubmit={submit}>
        <label htmlFor="mypage-nickname">닉네임</label>
        <input id="mypage-nickname" value={nickname} maxLength={20}
          onChange={e => { setNickname(e.target.value); setMessage(""); setSaved(false); }} disabled={isSaving} />
        {message && <p role={saved ? "status" : "alert"}>{message}</p>}
        <button type="submit" disabled={isSaving || nickname.trim() === profile.nickname}>
          {isSaving ? "저장하는 중..." : "닉네임 저장"}
        </button>
      </form>
      {profile.provider === "LOCAL" && <div className="mypage-v14-account-extra">
        <h2>계정 보안</h2>
        <p>비밀번호는 내 정보 수정과 별도로 관리할 수 있어요.</p>
        <Link className="mypage-v14-account-link" to="/mypage/password">
          <span>비밀번호 변경</span><span aria-hidden="true">›</span>
        </Link>
      </div>}
    </>}
  </main>;
}
