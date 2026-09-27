import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getApiErrorMessage } from "../api/api";
import { getSocialAuthorizationApi, loginApi } from "../api/authApi";
import {
  getReturnPathFromSearch,
  saveSocialLoginReturnPath,
} from "../utils/authRedirect";
import "./Login.css";

// 아이콘 이미지 추가
import logoIcon from "../img/지구본.png";
import eyeIcon from "../img/눈알.png";
import kakaoIcon from "../img/카카오.png";
import googleIcon from "../img/google.png";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const returnPath = getReturnPathFromSearch(location.search);

  const [showPw, setShowPw] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [loginError, setLoginError] = useState("");

  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
    keepLogin: false,
  });

  const handleSignupClick = () => {
    navigate("/signup");
  };

  const handleFindPasswordClick = () => {
    navigate("/find-password");
  };

  const handleChange = (key, value) => {
    setLoginForm((prev) => ({
      ...prev,
      [key]: value,
    }));
    setFieldErrors((prev) => ({ ...prev, [key]: "" }));
    setLoginError("");
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    const email = loginForm.email.trim();
    const password = loginForm.password;

    const nextErrors = {
      email: email ? "" : "이메일을 입력해주세요.",
      password: password ? "" : "비밀번호를 입력해주세요.",
    };

    if (nextErrors.email || nextErrors.password) {
      setFieldErrors(nextErrors);
      return;
    }

    try {
      setIsLoading(true);

      await loginApi({ email, password, keepLogin: loginForm.keepLogin });

      navigate(returnPath, { replace: true });
    } catch (error) {
      console.error("로그인 실패:", error);

      setLoginError(
        error.message?.includes("Failed to fetch") ||
        error.message?.includes("Network Error")
          ? "네트워크 연결을 확인한 뒤 다시 시도해주세요."
          : getApiErrorMessage(error, "이메일 또는 비밀번호를 확인해주세요.")
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider) => {
    try {
      setIsLoading(true);
      saveSocialLoginReturnPath(returnPath);
      const { authorizationUrl } = await getSocialAuthorizationApi(provider);
      window.location.assign(authorizationUrl);
    } catch (error) {
      console.error(`${provider} 로그인 시작 실패:`, error);
      alert(getApiErrorMessage(error, "소셜 로그인을 시작하지 못했습니다."));
      setIsLoading(false);
    }
  };

  return (
    <div className="login">
      <div className="login-card">
        <div className="login-header">
          <div className="icon-circle">
            <img src={logoIcon} alt="icon" />
          </div>
          <h2>너만 오면 go !</h2>
          <p>준비 됐어? 너만 오면 돼!</p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label htmlFor="login-email">이메일</label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder="이메일을 입력해주세요"
              value={loginForm.email}
              onChange={(e) => handleChange("email", e.target.value)}
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? "login-email-error" : undefined}
            />
            {fieldErrors.email && (
              <p id="login-email-error" className="login-field-error">
                {fieldErrors.email}
              </p>
            )}
          </div>

          <div className="input-group">
            <label htmlFor="login-password">비밀번호</label>
            <div className="password-box">
              <input
                id="login-password"
                type={showPw ? "text" : "password"}
                autoComplete="current-password"
                placeholder="비밀번호를 입력해주세요"
                value={loginForm.password}
                onChange={(e) => handleChange("password", e.target.value)}
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={fieldErrors.password ? "login-password-error" : undefined}
              />
              <button
                type="button"
                className="eye-icon"
                onClick={() => setShowPw(!showPw)}
                aria-label={showPw ? "비밀번호 숨기기" : "비밀번호 표시"}
                aria-pressed={showPw}
              >
                <img src={eyeIcon} alt="" />
              </button>
            </div>
            {fieldErrors.password && (
              <p id="login-password-error" className="login-field-error">
                {fieldErrors.password}
              </p>
            )}
          </div>

          <div className="login-options">
            <label>
              <input
                type="checkbox"
                checked={loginForm.keepLogin}
                onChange={(e) => handleChange("keepLogin", e.target.checked)}
              />{" "}
              로그인 상태 유지
            </label>

            <span
              className="link"
              onClick={handleFindPasswordClick}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  handleFindPasswordClick();
                }
              }}
            >
              비밀번호 찾기
            </span>
          </div>

          <button type="submit" className="login-btn" disabled={isLoading}>
            {isLoading ? "로그인 중..." : "로그인"}
          </button>

          {loginError && (
            <p className="login-submit-error" role="alert">
              {loginError}
            </p>
          )}

          <p className="signup">
            아직 회원이 아니신가요?{" "}
            <span
              onClick={handleSignupClick}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  handleSignupClick();
                }
              }}
            >
              회원가입
            </span>
          </p>
        </form>

        <div className="divider">간편 로그인</div>

        <div className="social">
          <button
            type="button"
            className="kakao"
            onClick={() => handleSocialLogin("kakao")}
            disabled={isLoading}
          >
            <img src={kakaoIcon} alt="" />
            카카오 로그인
          </button>

          <button
            type="button"
            className="google"
            onClick={() => handleSocialLogin("google")}
            disabled={isLoading}
          >
            <img src={googleIcon} alt="" />
            구글 로그인
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
