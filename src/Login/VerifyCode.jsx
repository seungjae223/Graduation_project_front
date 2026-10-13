import { logSafeApiError } from "../utils/safeLog";
import React, { useEffect, useRef, useState } from "react";
import {
  useLocation,
  Link,
  useSearchParams,
} from "react-router-dom";
import "./VerifyCode.css";
import { getApiErrorMessage } from "../api/api";
import { sendEmailCodeApi, verifyEmailCodeApi } from "../api/authApi";
import { buildAuthPath, getAuthReturnPath } from "./authPaths";
import useAuthRequest, { isCanceledAuthRequest } from "./useAuthRequest";
import useEmailCooldown from "./useEmailCooldown";

const CODE_LENGTH = 6;
const getErrorMessage = getApiErrorMessage;

const VerifyCode = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const email = location.state?.email || searchParams.get("email") || "";
  const returnPath = getAuthReturnPath(location.search);
  const scope = `${location.key}:${location.pathname}${location.search}:${email}`;
  const task = useAuthRequest(scope);
  const emailCooldown = useEmailCooldown(email);

  const inputRefs = useRef([]);
  const resendFocus = useRef(null);

  const [code, setCode] = useState(Array(CODE_LENGTH).fill(""));
  const [isVerified, setIsVerified] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const isVerifying = task.busy === "verify";
  const isResending = task.busy === "resend";
  // Email send/verify currently provide no expiration metadata. The server
  // validates expiration; a new visit must not invent another five minutes.
  useEffect(() => {
    setCode(Array(CODE_LENGTH).fill(""));
    setIsVerified(false);
    setErrorMessage("");
    setStatusMessage("");
    resendFocus.current = null;
  }, [scope]);
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

  if (!email) {
    return <main className="verify-code-page"><section className="verify-code-form">
      <h1>인증할 이메일을 확인해 주세요.</h1>
      <Link className="verify-code-login" to={buildAuthPath("/find-password", returnPath)}>이메일 다시 입력하기</Link>
    </section></main>;
  }

  return (
    <main className="verify-code-page">
      <form className="verify-code-form" onSubmit={handleVerifyCode}>
        <section className="verify-code-top">
          <h1>
            이메일로 발송된
            <br />
            6자리 인증번호를
            <br />
            입력해 주세요.
          </h1>

          <p className="verify-code-desc">
            <span>{email}</span> 주소의 인증번호를 입력해 주세요.
            <br />
            메일함을 확인해 주세요.
          </p>

          <div className="verify-code-inputs" onPaste={handlePaste}>
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
          </div>
          {errorMessage && <p className="verify-code-error" role="alert">{errorMessage}</p>}
          {statusMessage && <p className="verify-code-status" role="status">{statusMessage}</p>}
          {isVerified && <p className="verify-code-service-notice">현재 비밀번호 변경 기능은 준비 중입니다.</p>}
        </section>

        <section className="verify-code-bottom">
          <button
            type="submit"
            className="verify-code-submit"
            disabled={!isCodeComplete || Boolean(task.busy) || isVerified}
          >
            {isVerifying ? "확인 중..." : isVerified ? "인증 완료" : "확인"}
          </button>
          <Link className="verify-code-login" to={buildAuthPath("/login", returnPath)}>로그인으로 돌아가기</Link>
        </section>
      </form>
    </main>
  );
};

export default VerifyCode;
