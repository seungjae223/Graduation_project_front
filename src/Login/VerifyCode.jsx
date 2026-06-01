import React, { useEffect, useRef, useState } from "react";
import {
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import "./VerifyCode.css";

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:8080";

const CODE_LENGTH = 6;
const TIMER_SECONDS = 180;

const VerifyCode = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const email =
    location.state?.email || searchParams.get("email") || "";

  const inputRefs = useRef([]);

  const [code, setCode] = useState(Array(CODE_LENGTH).fill(""));
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (!email) {
      alert("이메일 정보가 없습니다. 다시 시도해주세요.");
      navigate("/find-password", { replace: true });
    }
  }, [email, navigate]);

  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds) => {
    const minutes = String(Math.floor(seconds / 60)).padStart(2, "0");
    const remainSeconds = String(seconds % 60).padStart(2, "0");

    return `${minutes}:${remainSeconds}`;
  };

  const handleCodeChange = (index, value) => {
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
      pastedValue.length >= CODE_LENGTH
        ? CODE_LENGTH - 1
        : pastedValue.length;

    inputRefs.current[nextFocusIndex]?.focus();
  };

  const handleResendCode = async () => {
    if (isResending) return;

    try {
      setIsResending(true);

      const response = await fetch(`${API_BASE_URL}/api/email/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
        }),
      });

      const resultText = await response.text();

      if (!response.ok) {
        throw new Error(resultText || "인증번호 재발송에 실패했습니다.");
      }

      setCode(Array(CODE_LENGTH).fill(""));
      setTimeLeft(TIMER_SECONDS);
      inputRefs.current[0]?.focus();

      alert("인증번호를 다시 발송했습니다.");
    } catch (error) {
      console.error("인증번호 재발송 실패:", error);

      if (error.message.includes("Failed to fetch")) {
        alert("백엔드 서버 연결을 확인해주세요.");
        return;
      }

      alert(error.message || "인증번호 재발송에 실패했습니다.");
    } finally {
      setIsResending(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();

    const verificationCode = code.join("");

    if (verificationCode.length !== CODE_LENGTH) {
      alert("6자리 인증번호를 모두 입력해주세요.");
      return;
    }

    if (timeLeft <= 0) {
      alert("인증 시간이 만료되었습니다. 인증번호를 다시 받아주세요.");
      return;
    }

    try {
      setIsVerifying(true);

      const response = await fetch(`${API_BASE_URL}/api/email/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          code: verificationCode,
        }),
      });

      const resultText = await response.text();

      if (!response.ok) {
        throw new Error(resultText || "인증번호가 올바르지 않습니다.");
      }

      alert(resultText || "인증이 완료되었습니다.");

      // 비밀번호 재설정 페이지가 생기면 여기 경로만 바꾸면 됨
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("인증번호 확인 실패:", error);

      if (error.message.includes("Failed to fetch")) {
        alert("백엔드 서버 연결을 확인해주세요.");
        return;
      }

      alert(error.message || "인증번호 확인에 실패했습니다.");
    } finally {
      setIsVerifying(false);
    }
  };

  const isCodeComplete = code.every((number) => number !== "");

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
            <span>{email || "user@example.com"}</span> 으로 인증번호가 발송되었습니다.
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
                value={number}
                autoFocus={index === 0}
                onChange={(e) => handleCodeChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                aria-label={`${index + 1}번째 인증번호`}
              />
            ))}
          </div>

          <div className="verify-code-info">
            <div className="verify-code-timer">
              <span className="timer-icon">⏱</span>
              <span>{formatTime(timeLeft)}</span>
            </div>

            <button
              type="button"
              className="verify-code-resend"
              onClick={handleResendCode}
              disabled={isResending}
            >
              <span className="resend-icon">↻</span>
              <span>
                {isResending ? "재발송 중..." : "인증번호 재발송"}
              </span>
            </button>
          </div>
        </section>

        <section className="verify-code-bottom">
          <button
            type="submit"
            className="verify-code-submit"
            disabled={!isCodeComplete || isVerifying}
          >
            {isVerifying ? "확인 중..." : "확인"}
          </button>
        </section>
      </form>
    </main>
  );
};

export default VerifyCode;