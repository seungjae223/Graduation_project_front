import { getApiErrorMessage as safeApiErrorMessage } from "../api/api";
import { logSafeApiError } from "../utils/safeLog";
import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./FindPassword.css";

import passwordIcon from "../img/비번찾기.png";
import arrowIcon from "../img/화살표.png";
import warningIcon from "../img/주의.png";
import { sendEmailCodeApi } from "../api/authApi";
import { buildAuthPath, getAuthReturnPath } from "./authPaths";
import useAuthRequest, { isCanceledAuthRequest } from "./useAuthRequest";
import useEmailCooldown from "./useEmailCooldown";

const getErrorMessage = safeApiErrorMessage;

const FindPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const returnPath = getAuthReturnPath(location.search);
  const task = useAuthRequest(`${location.key}:${location.pathname}${location.search}`);

  const [email, setEmail] = useState("");
  const emailCooldown = useEmailCooldown(email);
  const isSending = Boolean(task.busy);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSendMail = async (e) => {
    e.preventDefault();
    if (emailCooldown.remaining > 0) return;

    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      setErrorMessage("이메일 주소를 입력해주세요.");
      return;
    }

    const request = task.begin("send");
    if (!request) return;
    setErrorMessage("");
    try {
      await sendEmailCodeApi(trimmedEmail, request.options);
      if (!request.isCurrent()) return;
      navigate(buildAuthPath("/verify-code", returnPath, { email: trimmedEmail }), {
        state: {
          email: trimmedEmail,
        },
      });
    } catch (error) {
      if (!request.isCurrent() || isCanceledAuthRequest(error)) return;
      emailCooldown.blockFromError(error);
      logSafeApiError(error, "FindPassword.jsx");

      if (error.message?.includes("Network Error")) {
        setErrorMessage("네트워크 연결을 확인한 뒤 다시 시도해주세요.");
        return;
      }

      setErrorMessage(
        getErrorMessage(
          error,
          "인증번호 발송에 실패했습니다. 잠시 후 다시 시도해주세요."
        )
      );
    } finally {
      task.end(request);
    }
  };

  return (
    <main className="find-password-page">
      <form className="find-password-form" onSubmit={handleSendMail} aria-label="비밀번호 찾기">
        <section className="find-password-top">
          <h1>
            가입하신 이메일 주소를
            <br />
            입력해 주세요.
          </h1>

          <p className="find-password-desc">
            입력하신 주소로 인증번호를 보내드립니다.
          </p>

          <div className="find-password-field">
            <label htmlFor="find-password-email">이메일 주소</label>
            <input
              id="find-password-email"
              type="email"
              autoComplete="email"
              placeholder="이메일 주소 입력"
              value={email}
              maxLength={255}
              disabled={isSending}
              aria-describedby={errorMessage ? "find-password-error" : undefined}
              onChange={(e) => { setEmail(e.target.value); setErrorMessage(""); }}
            />
            {errorMessage && <p id="find-password-error" className="auth-field-error" role="alert">{errorMessage}</p>}
          </div>

          <div className="find-password-help">
            <img src={warningIcon} alt="" />
            <span>메일이 오지 않는다면 스팸 메일함을 확인해 주세요.</span>
          </div>

          <div className="find-password-icon-area">
            <div className="find-password-icon-circle">
              <img src={passwordIcon} alt="비밀번호 찾기" />
            </div>
          </div>
        </section>

        <section className="find-password-bottom">
          <button
            type="submit"
            className="find-password-submit"
            disabled={isSending || emailCooldown.remaining > 0}
          >
            <span>
              {isSending ? "메일 보내는 중..." : emailCooldown.remaining > 0 ? `${emailCooldown.remaining}초 후 재발송` : "비밀번호 찾기 메일 보내기"}
            </span>
            {!isSending && <img src={arrowIcon} alt="" />}
          </button>

          <p className="find-password-login">
            비밀번호가 생각나셨나요?{" "}
            <Link
              to={buildAuthPath("/login", returnPath)}
            >
              로그인하기
            </Link>
          </p>
        </section>
      </form>
    </main>
  );
};

export default FindPassword;
