import { useEffect, useRef, useState } from "react";
import { logSafeApiError } from "../utils/safeLog";
import { consumeOAuthState, readAndClearOAuthQuery } from "../utils/oauthSecurity";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { getApiErrorMessage } from "../api/api";
import { completeSocialLoginApi } from "../api/authApi";
import EarthLoader from "../Loading/EarthLoader";
import {
  buildLoginPath,
  getSocialLoginReturnPath,
} from "../utils/authRedirect";
import "./Login.css";

function OAuthCallback() {
  const { provider } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const startedRef = useRef(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const { code, state, error: oauthError } = readAndClearOAuthQuery(searchParams);
    const validState = consumeOAuthState(provider, state);

    if (oauthError) {
      setErrorMessage("소셜 로그인이 취소되었거나 승인되지 않았습니다.");
      return;
    }

    if (!["kakao", "google"].includes(provider) || !code || !validState) {
      setErrorMessage("올바르지 않은 소셜 로그인 접근입니다. 다시 로그인해주세요.");
      return;
    }

    completeSocialLoginApi({ provider, code, state })
      .then(() => {
        navigate(getSocialLoginReturnPath({ consume: true }), { replace: true });
      })
      .catch((error) => {
        logSafeApiError(error, "oauth-complete");
        setErrorMessage(
          getApiErrorMessage(error, "소셜 로그인을 완료하지 못했습니다.")
        );
      });
  }, [navigate, provider, searchParams]);

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
