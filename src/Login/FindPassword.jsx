import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./FindPassword.css";

import passwordIcon from "../img/비번찾기.png";
import arrowIcon from "../img/화살표.png";
import warningIcon from "../img/주의.png";

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:8080";

const FindPassword = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSendMail = async (e) => {
    e.preventDefault();

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      alert("이메일 주소를 입력해주세요.");
      return;
    }

    try {
      setIsSending(true);

      const response = await fetch(`${API_BASE_URL}/api/email/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: trimmedEmail,
        }),
      });

      const resultText = await response.text();

      if (!response.ok) {
        throw new Error(resultText || "인증번호 발송에 실패했습니다.");
      }

      navigate(`/verify-code?email=${encodeURIComponent(trimmedEmail)}`, {
        state: {
          email: trimmedEmail,
        },
      });
    } catch (error) {
      console.error("인증번호 발송 실패:", error);

      if (error.message.includes("Failed to fetch")) {
        alert("백엔드 서버 연결을 확인해주세요.");
        return;
      }

      alert(error.message || "인증번호 발송에 실패했습니다.");
    } finally {
      setIsSending(false);
    }
  };

  const handleLoginClick = () => {
    navigate("/login");
  };

  return (
    <main className="find-password-page">
      <form className="find-password-form" onSubmit={handleSendMail}>
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
            <label>이메일 주소</label>
            <input
              type="email"
              placeholder="이메일 주소 입력"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
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
            disabled={isSending}
          >
            <span>{isSending ? "메일 보내는 중..." : "비밀번호 찾기 메일 보내기"}</span>
            {!isSending && <img src={arrowIcon} alt="" />}
          </button>

          <p className="find-password-login">
            비밀번호가 생각나셨나요?{" "}
            <span
              onClick={handleLoginClick}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  handleLoginClick();
                }
              }}
            >
              로그인하기
            </span>
          </p>
        </section>
      </form>
    </main>
  );
};

export default FindPassword;