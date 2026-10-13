import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getAccessToken } from "../api/api";
import { USE_MOCK } from "../config/mockConfig";
import { getMockUser } from "../mocks/authMock";
import useSessionKey from "../utils/useSessionKey";
import { buildLoginPath } from "../utils/authRedirect";
import "./AdminMain/AdminMain.css";

function rolesOf(value) {
  if (Array.isArray(value)) return value.flatMap(rolesOf);
  if (value && typeof value === "object") return rolesOf(value.authority || value.role || value.name);
  return typeof value === "string" ? value.toUpperCase().split(/[\s,]+/).filter(Boolean) : [];
}
export function roleFromUser(user) {
  const roles = rolesOf(user?.role || user?.roles || user?.authority || user?.authorities);
  if (roles.includes("ADMIN") || roles.includes("ROLE_ADMIN")) return "admin";
  return roles.length ? "user" : "unknown";
}

// Existing user metadata controls this UI only; the server still authorizes every admin API.
export function readCurrentRole() {
  if (USE_MOCK) return roleFromUser(getMockUser());
  const token = getAccessToken();
  let claims = {};
  if (token) {
    try { const part = token.split(".")[1]; claims = JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/"))); } catch { /* Opaque credentials do not provide a role. */ }
  }
  const claimRole = roleFromUser(claims);
  if (claimRole !== "unknown") return claimRole;
  for (const storage of [localStorage, sessionStorage]) {
    const cached = storage.getItem("currentUser");
    if (!cached) continue;
    const user = JSON.parse(cached);
    if (claims.email && user?.email !== claims.email) continue;
    const role = roleFromUser(user);
    if (role !== "unknown") return role;
  }
  return "unknown";
}

export default function AdminAccessGuard({ children }) {
  const account = useSessionKey();
  const location = useLocation();
  const [attempt, setAttempt] = useState(0);
  const [checked, setChecked] = useState({ account, attempt: -1, role: "checking" });
  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => readCurrentRole()).then(role => { if (active) setChecked({ account, attempt, role }); }).catch(() => { if (active) setChecked({ account, attempt, role: "unknown" }); });
    return () => { active = false; };
  }, [account, attempt]);
  if (account === "anonymous") return <Navigate replace to={buildLoginPath(location.pathname + location.search)} />;
  const role = checked.account === account && checked.attempt === attempt ? checked.role : "checking";
  if (role === "admin") return children;
  return <main className="admin-page"><h1>{role === "checking" ? "관리자 권한 확인 중" : role === "user" ? "관리자 권한이 필요합니다" : "관리자 권한을 확인하지 못했습니다"}</h1>
    <p role={role === "checking" ? "status" : "alert"}>{role === "checking" ? "사용자 역할을 확인하고 있습니다." : role === "user" ? "관리자 계정으로 로그인해 주세요." : "현재 로그인 정보에 확인 가능한 역할이 없습니다. 다시 로그인하거나 권한 정보를 확인해 주세요."}</p>
    {role === "unknown" && <button type="button" onClick={() => setAttempt(value => value + 1)}>권한 다시 확인</button>}
    {role !== "checking" && <a href="/home">홈으로 돌아가기</a>}
  </main>;
}
