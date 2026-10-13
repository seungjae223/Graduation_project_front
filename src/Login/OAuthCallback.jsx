import { useEffect, useRef, useState } from "react";
import { logSafeApiError } from "../utils/safeLog";
import { consumeOAuthState, readAndClearOAuthQuery } from "../utils/oauthSecurity";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { getApiErrorMessage } from "../api/api";
import { completeSocialLoginApi } from "../api/authApi";
import EarthLoader from "../Loading/EarthLoader";
import {
  buildLoginPath,
  getSocialLoginReturnPath,
} from "../utils/authRedirect";
import "./Login.css";
import useAuthRequest, { isCanceledAuthRequest } from "./useAuthRequest";

function OAuthCallback() {
  const { provider } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const scope = `${location.key}:${provider}`;
  const task = useAuthRequest(scope);
  const { begin, end } = task;
  const attemptRef = useRef(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (attemptRef.current?.scope !== scope) {
      const { code, state, error: oauthError } = readAndClearOAuthQuery(searchParams);
      const validState = consumeOAuthState(provider, state);
      attemptRef.current = {
        scope, payload: { provider, code, state }, started: false,
        error: oauthError ? "소셜 로그인이 취소되었거나 승인되지 않았습니다." :
          (!["kakao", "google"].includes(provider) || !code || !validState)
            ? "올바르지 않은 소셜 로그인 접근입니다. 다시 로그인해주세요." : "",
      };
    }
    const attempt = attemptRef.current;
    setErrorMessage(attempt.error);
    if (attempt.error) return;
    let cancelled = false;
    // StrictMode replays setup/cleanup before this microtask. Capture the
    // single-use OAuth state once, but only start the still-mounted setup.
    Promise.resolve().then(async () => {
      if (cancelled || attempt.started) return;
      const request = begin("oauth");
      if (!request) return;
      attempt.started = true;
      try {
        await completeSocialLoginApi(attempt.payload, request.options);
        if (request.isCurrent()) navigate(getSocialLoginReturnPath({ consume: true }), { replace: true });
      } catch (error) {
        if (!request.isCurrent() || isCanceledAuthRequest(error)) return;
        logSafeApiError(error, "oauth-complete");
        setErrorMessage(
          getApiErrorMessage(error, "소셜 로그인을 완료하지 못했습니다.")
        );
      } finally { end(request); }
    });
    return () => { cancelled = true; };
  }, [navigate, provider, searchParams, scope, begin, end]);

  if (errorMessage) {
    return (
      <main className="login">
        <div className="login-card">
          <div className="login-header">
            <h2>로그인 실패</h2>
            <p>{errorMessage}</p>
          </div>
          <button
            type="button"
            className="login-btn"
            onClick={() =>
              navigate(buildLoginPath(getSocialLoginReturnPath()), {
                replace: true,
              })
            }
          >
            로그인으로 돌아가기
          </button>
        </div>
      </main>
    );
  }

  return <EarthLoader text="소셜 로그인을 완료하는 중..." />;
}

export default OAuthCallback;
