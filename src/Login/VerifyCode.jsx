import { logSafeApiError } from "../utils/safeLog";
import React, { useEffect, useRef, useState } from "react";
import {
  useLocation,
  Link,
  useSearchParams,
} from "react-router-dom";
import "./VerifyCode.css";
import { getApiErrorMessage } from "../api/api";
import { resetPasswordApi, sendEmailCodeApi, verifyEmailCodeApi } from "../api/authApi";
import { PASSWORD_PATTERN, PASSWORD_HELP, getPasswordIssues } from "./passwordValidation";
import { getPasswordResetFailure } from "../utils/passwordResetError";
import { buildAuthPath, getAuthReturnPath } from "./authPaths";
import useAuthRequest, { isCanceledAuthRequest } from "./useAuthRequest";
import useEmailCooldown from "./useEmailCooldown";

const CODE_LENGTH = 6;
const getErrorMessage = getApiErrorMessage;

const VerifyCode = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const email = String(location.state?.email || searchParams.get("email") || "").trim().toLowerCase();
  const returnPath = getAuthReturnPath(location.search);
  const scope = `${location.key}:${location.pathname}${location.search}:${email}`;
  const task = useAuthRequest(scope);
  const emailCooldown = useEmailCooldown(email);

  const inputRefs = useRef([]);
  const resendFocus = useRef(null);
  const passwordFocus = useRef(null);

  const [code, setCode] = useState(Array(CODE_LENGTH).fill(""));
  const [isVerified, setIsVerified] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isResetComplete, setIsResetComplete] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const isVerifying = task.busy === "verify";
  const isResending = task.busy === "resend";
  const isResetting = task.busy === "reset";
  // Email send/verify currently provide no expiration metadata. The server
  // validates expiration; a new visit must not invent another five minutes.
  useEffect(() => {
    setCode(Array(CODE_LENGTH).fill(""));
    setIsVerified(false);
    setNewPassword("");
    setConfirmPassword("");
    setIsResetComplete(false);
    setErrorMessage("");
    setStatusMessage("");
    resendFocus.current = null;
  }, [scope]);
  useEffect(() => {
    if (isVerified && !isResetComplete) passwordFocus.current?.focus();
  }, [isVerified, isResetComplete]);
  useEffect(() => {
    if (task.busy || resendFocus.current === null) return;
    if (resendFocus.current === scope) inputRefs.current[0]?.focus();
    resendFocus.current = null;
  }, [scope, task.busy]);

  const handleCodeChange = (index, value) => {
    if (task.busy || isVerified) return;
    setErrorMessage("");
    const onlyNumber = value.replace(/[^0-9]/g, "");

    if (!onlyNumber) {
      const nextCode = [...code];
      nextCode[index] = "";
      setCode(nextCode);
      return;
    }

    const nextCode = [...code];
    nextCode[index] = onlyNumber.slice(-1);
    setCode(nextCode);

    if (index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (task.busy || isVerified) return;
    if (e.key !== "Backspace") return;

    if (code[index]) {
      const nextCode = [...code];
      nextCode[index] = "";
      setCode(nextCode);
      return;
    }

    if (index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    if (task.busy || isVerified) return;

    const pastedValue = e.clipboardData
      .getData("text")
      .replace(/[^0-9]/g, "")
      .slice(0, CODE_LENGTH);

    if (!pastedValue) return;

    const nextCode = Array(CODE_LENGTH).fill("");

    pastedValue.split("").forEach((number, index) => {
      nextCode[index] = number;
    });

    setCode(nextCode);

    const nextFocusIndex =
      pastedValue.length >= CODE_LENGTH ? CODE_LENGTH - 1 : pastedValue.length;

    inputRefs.current[nextFocusIndex]?.focus();
  };

  const handleResendCode = async () => {
    if (!email || isVerified || emailCooldown.remaining > 0) return;
    const request = task.begin("resend");
    if (!request) return;
    setErrorMessage("");
    setStatusMessage("");
    try {
      await sendEmailCodeApi(email, request.options);
      if (!request.isCurrent()) return;
      emailCooldown.start();

      setCode(Array(CODE_LENGTH).fill(""));
      resendFocus.current = scope;
      setStatusMessage("인증번호를 다시 발송했습니다.");
    } catch (error) {
      if (!request.isCurrent() || isCanceledAuthRequest(error)) return;
      emailCooldown.blockFromError(error);
      logSafeApiError(error, "VerifyCode.jsx");

      if (error.message?.includes("Network Error")) {
        setErrorMessage("네트워크 연결을 확인한 뒤 다시 시도해주세요.");
        return;
      }

      setErrorMessage(
        getErrorMessage(
          error,
          "인증번호 재발송에 실패했습니다. 잠시 후 다시 시도해주세요."
        )
      );
    } finally {
      task.end(request);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();

    const verificationCode = code.join("");

    if (verificationCode.length !== CODE_LENGTH) {
      setErrorMessage("6자리 인증번호를 모두 입력해주세요.");
      return;
    }

    if (!email || isVerified) return;
    const request = task.begin("verify");
    if (!request) return;
    setErrorMessage("");
    setStatusMessage("");
    try {
      const response = await verifyEmailCodeApi({
        email,
        code: verificationCode,
      }, request.options);
      if (!request.isCurrent()) return;
      if (response?.verified === false) throw new Error("인증번호를 확인해주세요.");
      setIsVerified(true);
      setStatusMessage("이메일 인증이 완료되었습니다.");
    } catch (error) {
      if (!request.isCurrent() || isCanceledAuthRequest(error)) return;
      logSafeApiError(error, "VerifyCode.jsx");

      if (error.message?.includes("Network Error")) {
        setErrorMessage("네트워크 연결을 확인한 뒤 다시 시도해주세요.");
        return;
      }

      setErrorMessage(
        getErrorMessage(
          error,
          "인증번호가 올바르지 않거나 인증 시간이 만료되었습니다."
        )
      );
    } finally {
      task.end(request);
    }
  };

  const isCodeComplete = code.every((number) => number !== "");
  const passwordIssues = getPasswordIssues(newPassword);
  const passwordsMatch = confirmPassword === newPassword;
  const canReset = PASSWORD_PATTERN.test(newPassword) && passwordsMatch;

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!isVerified || isResetComplete || !canReset) return;
    const request = task.begin("reset");
    if (!request) return;
    setErrorMessage("");
    try {
      await resetPasswordApi({ email, newPassword }, request.options);
      if (!request.isCurrent()) return;
      setNewPassword("");
      setConfirmPassword("");
      setCode(Array(CODE_LENGTH).fill(""));
      setIsVerified(false);
      setIsResetComplete(true);
      setStatusMessage("비밀번호가 변경되었습니다. 새 비밀번호로 로그인해주세요.");
    } catch (error) {
      if (!request.isCurrent() || isCanceledAuthRequest(error)) return;
      logSafeApiError(error, "VerifyCode.jsx");
      const failure = getPasswordResetFailure(error);
      setErrorMessage(failure?.message || getApiErrorMessage(error, "비밀번호 변경 결과를 확인하지 못했습니다. 새 비밀번호로 로그인하거나 이메일 인증을 다시 진행해주세요."));
      if (failure?.reason === "email_verification") {
        setIsVerified(false);
        setCode(Array(CODE_LENGTH).fill(""));
        setNewPassword("");
        setConfirmPassword("");
        setStatusMessage("");
      }
    } finally {
      task.end(request);
    }
  };

  if (!email) {
    return <main className="verify-code-page"><section className="verify-code-form">
      <h1>인증할 이메일을 확인해 주세요.</h1>
      <Link className="verify-code-login" to={buildAuthPath("/find-password", returnPath)}>이메일 다시 입력하기</Link>
    </section></main>;
  }

  return (
    <main className="verify-code-page">
      <form className="verify-code-form" onSubmit={isVerified ? handleResetPassword : handleVerifyCode} aria-label={isVerified ? "비밀번호 재설정" : "이메일 인증"}>
        <section className="verify-code-top">
          <h1>
            {isResetComplete ? "비밀번호가 변경되었습니다." : isVerified ? "새 비밀번호를 입력해 주세요." : <>이메일로 발송된<br />6자리 인증번호를<br />입력해 주세요.</>}
          </h1>

          <p className="verify-code-desc">
            <span>{email}</span>{isVerified || isResetComplete ? " 계정의 비밀번호를 재설정합니다." : " 주소의 인증번호를 입력해 주세요."}
            <br />
            {isResetComplete ? "새 비밀번호로 로그인해주세요." : isVerified ? "이메일 인증 후 10분 이내에 변경해 주세요. 카카오·구글 계정은 해당 서비스로 로그인해 주세요." : "메일함을 확인해 주세요."}
          </p>

          {!isVerified && !isResetComplete && <><div className="verify-code-inputs" onPaste={handlePaste}>
            {code.map((number, index) => (
              <input
                key={index}
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                disabled={Boolean(task.busy) || isVerified}
                value={number}
                autoFocus={index === 0}
                onChange={(e) => handleCodeChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                aria-label={`${index + 1}번째 인증번호`}
              />
            ))}
          </div>

          <div className="verify-code-info">
            <button
              type="button"
              className="verify-code-resend"
              onClick={handleResendCode}
              disabled={Boolean(task.busy) || isVerified || emailCooldown.remaining > 0}
            >
              <span className="resend-icon" aria-hidden="true">↻</span>
              <span>{isResending ? "재발송 중..." : emailCooldown.remaining > 0 ? `${emailCooldown.remaining}초 후 재발송` : "인증번호 재발송"}</span>
            </button>
          </div></>}
          {isVerified && <div className="reset-password-fields">
            <label htmlFor="reset-password">새 비밀번호</label>
            <input ref={passwordFocus} id="reset-password" type="password" autoComplete="new-password" value={newPassword} disabled={Boolean(task.busy)}
              aria-invalid={Boolean(newPassword && passwordIssues.length)} aria-describedby="reset-password-help reset-password-issues"
              onChange={e => { setNewPassword(e.target.value); setErrorMessage(""); }} />
            <p id="reset-password-help">{PASSWORD_HELP}</p>
            <p id="reset-password-issues" className="verify-code-error">{newPassword && passwordIssues.join(" ")}</p>
            <label htmlFor="reset-password-confirm">새 비밀번호 확인</label>
            <input id="reset-password-confirm" type="password" autoComplete="new-password" value={confirmPassword} disabled={Boolean(task.busy)}
              aria-invalid={Boolean(confirmPassword && !passwordsMatch)} aria-describedby="reset-password-match"
              onChange={e => { setConfirmPassword(e.target.value); setErrorMessage(""); }} />
            <p id="reset-password-match" className="verify-code-error">{confirmPassword && !passwordsMatch ? "비밀번호가 일치하지 않습니다." : ""}</p>
          </div>}
          {errorMessage && <p className="verify-code-error" role="alert">{errorMessage}</p>}
          {statusMessage && <p className="verify-code-status" role="status">{statusMessage}</p>}
        </section>

        <section className="verify-code-bottom">
          {!isResetComplete && <button
            type="submit"
            className="verify-code-submit"
            disabled={Boolean(task.busy) || (isVerified ? !canReset : !isCodeComplete)}
          >
            {isResetting ? "변경 중..." : isVerified ? "비밀번호 변경" : isVerifying ? "확인 중..." : "확인"}
          </button>}
          {!isResetComplete && <Link className="verify-code-login" to={buildAuthPath("/find-password", returnPath)}>이메일 다시 입력하기</Link>}
          <Link className="verify-code-login" to={buildAuthPath("/login", returnPath)}>로그인으로 돌아가기</Link>
        </section>
      </form>
    </main>
  );
};

export default VerifyCode;
