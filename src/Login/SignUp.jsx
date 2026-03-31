import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./SignUp.css";
import eyeIcon from "../img/눈알.png";
import warningIcon from "../img/워닝.png";
import LoginAlert from "./LoginAlert";

const USERS_KEY = "mock_users";

const readUsers = () => {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
  } catch (error) {
    return [];
  }
};

const saveUsers = (users) => {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

const SignUp = () => {
  const navigate = useNavigate();

  const [showPw, setShowPw] = useState(false);
  const [showPwConfirm, setShowPwConfirm] = useState(false);
  const [isEmailAlertOpen, setIsEmailAlertOpen] = useState(false);

  const [mockVerificationCode, setMockVerificationCode] = useState("");
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [isCodeVerified, setIsCodeVerified] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    code: "",
    password: "",
    passwordConfirm: "",
    agreed: false,
  });

  const handleChange = (key, value) => {
    if (key === "email") {
      setForm((prev) => ({
        ...prev,
        email: value,
        code: "",
      }));
      setMockVerificationCode("");
      setIsCodeSent(false);
      setIsCodeVerified(false);
      return;
    }

    if (key === "code") {
      setForm((prev) => ({
        ...prev,
        code: value,
      }));
      setIsCodeVerified(false);
      return;
    }

    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleEmailBlur = () => {
    if (!form.email.trim()) return;

    if (!isValidEmail(form.email)) {
      setIsEmailAlertOpen(true);
    }
  };

  const handleSendCode = () => {
    const normalizedEmail = form.email.trim().toLowerCase();

    if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
      setIsEmailAlertOpen(true);
      return;
    }

    const generatedCode = String(
      Math.floor(100000 + Math.random() * 900000)
    );

    setForm((prev) => ({
      ...prev,
      email: normalizedEmail,
      code: "",
    }));
    setMockVerificationCode(generatedCode);
    setIsCodeSent(true);
    setIsCodeVerified(false);

    alert(
      `목업 인증번호가 발송되었습니다.\n\n인증번호: ${generatedCode}`
    );
  };

  const handleVerifyCode = () => {
    if (!isCodeSent || !mockVerificationCode) {
      alert("먼저 인증번호를 발송해주세요.");
      return;
    }

    if (!form.code.trim()) {
      alert("인증번호를 입력해주세요.");
      return;
    }

    if (form.code.trim() !== mockVerificationCode) {
      setIsCodeVerified(false);
      alert("인증번호가 일치하지 않습니다.");
      return;
    }

    setIsCodeVerified(true);
    alert("이메일 인증이 완료되었습니다.");
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const trimmedName = form.name.trim();
    const normalizedEmail = form.email.trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      setIsEmailAlertOpen(true);
      return;
    }

    if (!isCodeVerified) {
      alert("이메일 인증을 완료해주세요.");
      return;
    }

    if (form.password.length < 8) {
      alert("비밀번호는 8자 이상 입력해주세요.");
      return;
    }

    if (form.password !== form.passwordConfirm) {
      alert("비밀번호가 일치하지 않습니다.");
      return;
    }

    const users = readUsers();
    const duplicatedUser = users.some((user) => user.email === normalizedEmail);

    if (duplicatedUser) {
      alert("이미 가입된 이메일입니다.");
      return;
    }

    const newUser = {
      id: Date.now().toString(),
      name: trimmedName,
      email: normalizedEmail,
      password: form.password,
      createdAt: new Date().toISOString(),
      verifiedAt: new Date().toISOString(),
    };

    saveUsers([...users, newUser]);

    alert("회원가입이 완료되었습니다.");
    navigate("/login");
  };

  const isFormValid = Boolean(
    form.name.trim() &&
      isValidEmail(form.email) &&
      isCodeVerified &&
      form.password.trim() &&
      form.passwordConfirm.trim() &&
      form.password === form.passwordConfirm &&
      form.password.length >= 8 &&
      form.agreed
  );

  return (
    <>
      <div className="signup-page">
        <div className="signup-container">
          <div className="signup-top">
            <h1 className="signup-brand">너만 오면 go</h1>
            <p className="signup-subtitle">
              새로운 여행의 시작, 정보를 입력해주세요.
            </p>
          </div>

          <form className="signup-form" onSubmit={handleSubmit}>
            <div className="signup-field">
              <label className="signup-label">이름</label>
              <input
                className="signup-input"
                type="text"
                placeholder="이름을 입력하세요"
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
              />
            </div>

            <div className="signup-field">
              <label className="signup-label">이메일 (아이디)</label>
              <div className="signup-inline">
                <input
                  className="signup-input"
                  type="email"
                  placeholder="example@travel.com"
                  value={form.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  onBlur={handleEmailBlur}
                />
                <button
                  type="button"
                  className="signup-inline-btn signup-inline-btn--active"
                  onClick={handleSendCode}
                >
                  인증번호 발송
                </button>
              </div>

              {isCodeSent && !isCodeVerified && (
                <p
                  style={{
                    margin: "10px 4px 0",
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#1da1f2",
                  }}
                >
                  목업 인증번호: {mockVerificationCode}
                </p>
              )}

              {isCodeVerified && (
                <p
                  style={{
                    margin: "10px 4px 0",
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#12b76a",
                  }}
                >
                  이메일 인증이 완료되었습니다.
                </p>
              )}
            </div>

            <div className="signup-field signup-field--compact">
              <div className="signup-inline">
                <input
                  className="signup-input"
                  type="text"
                  placeholder="인증번호 6자리 입력"
                  value={form.code}
                  onChange={(e) => handleChange("code", e.target.value)}
                />
                <button
                  type="button"
                  className="signup-inline-btn"
                  onClick={handleVerifyCode}
                >
                  인증 확인
                </button>
              </div>
            </div>

            <div className="signup-field">
              <label className="signup-label">비밀번호</label>
              <div className="signup-password-wrap">
                <input
                  className="signup-input signup-input--password"
                  type={showPw ? "text" : "password"}
                  placeholder="8자 이상 입력하세요"
                  value={form.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                />
                <button
                  type="button"
                  className="signup-eye-btn"
                  onClick={() => setShowPw(!showPw)}
                >
                  <img src={eyeIcon} alt="비밀번호 보기" />
                </button>
              </div>
            </div>

            <div className="signup-field">
              <label className="signup-label">비밀번호 확인</label>
              <div className="signup-password-wrap">
                <input
                  className="signup-input signup-input--password"
                  type={showPwConfirm ? "text" : "password"}
                  placeholder="비밀번호를 다시 입력하세요"
                  value={form.passwordConfirm}
                  onChange={(e) =>
                    handleChange("passwordConfirm", e.target.value)
                  }
                />
                <button
                  type="button"
                  className="signup-eye-btn"
                  onClick={() => setShowPwConfirm(!showPwConfirm)}
                >
                  <img src={eyeIcon} alt="비밀번호 보기" />
                </button>
              </div>
            </div>

            <label className="signup-agreement">
              <input
                type="checkbox"
                checked={form.agreed}
                onChange={(e) => handleChange("agreed", e.target.checked)}
              />
              <span>
                <span className="signup-agreement-link">
                  이용약관 및 개인정보 처리방침
                </span>
                에 동의합니다.
              </span>
            </label>

            <button
              type="submit"
              className={`signup-submit-btn ${isFormValid ? "enabled" : ""}`}
              disabled={!isFormValid}
            >
              회원가입 하기
            </button>
          </form>

          <p className="signup-footer-text">
            이미 계정이 있으신가요?{" "}
            <span
              className="signup-footer-link"
              onClick={() => navigate("/login")}
            >
              로그인으로 돌아가기
            </span>
          </p>

          <div className="signup-bottom-icons">
            <span>✈</span>
            <span>⌖</span>
            <span>▭</span>
          </div>
        </div>
      </div>

      <LoginAlert
        open={isEmailAlertOpen}
        type="emailError"
        iconSrc={warningIcon}
        onConfirm={() => setIsEmailAlertOpen(false)}
        onClose={() => setIsEmailAlertOpen(false)}
        closeOnBackdrop={false}
      />
    </>
  );
};

export default SignUp;