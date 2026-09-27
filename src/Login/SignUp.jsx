import React, { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import "./SignUp.css";
import eyeIcon from "../img/눈알.png";
import PrivacyPolicyModal from "./PrivacyPolicyModal";
import useModalFocus from "../utils/useModalFocus";
import { getApiErrorMessage } from "../api/api";
import {
  sendEmailCodeApi,
  signupApi,
  verifyEmailCodeApi,
} from "../api/authApi";

const getErrorMessage = getApiErrorMessage;
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[@$!%*?&#~]).{10,}$/;

const SignUpTopAlert = ({ open, onConfirm }) => {
  const dialogRef = useModalFocus({
    open,
    onClose: onConfirm,
    lockScroll: true,
  });

  if (!open) return null;

  return createPortal(
    <div className="signup-alert-overlay">
      <div
        ref={dialogRef}
        className="signup-alert-card"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="signup-alert-title"
        aria-describedby="signup-alert-message"
        tabIndex={-1}
      >
        <div className="signup-alert-icon-wrap" aria-hidden="true">
          <svg
            className="signup-alert-icon"
            viewBox="0 0 48 48"
            fill="none"
          >
            <path
              d="M21.1 7.2c1.3-2.3 4.5-2.3 5.8 0l16.2 28.1c1.3 2.2-.3 5-2.9 5H7.8c-2.6 0-4.2-2.8-2.9-5L21.1 7.2Z"
              fill="currentColor"
            />
            <path
              d="M24 17.2v10.9"
              stroke="#fff"
              strokeWidth="3.4"
              strokeLinecap="round"
            />
            <circle cx="24" cy="34.1" r="2.1" fill="#fff" />
          </svg>
        </div>

        <h2 id="signup-alert-title">이메일 형식 오류</h2>

        <p id="signup-alert-message">
          올바른 이메일 주소를 입력해주세요.
          <br />
          예시: example@travel.com
        </p>

        <button
          type="button"
          className="signup-alert-confirm-btn"
          onClick={onConfirm}
          data-modal-initial-focus
        >
          확인
        </button>
      </div>
    </div>,
    document.body
  );
};

const SignupCompleteModal = ({ open, onStart }) => {
  const dialogRef = useModalFocus({
    open,
    onClose: onStart,
    lockScroll: true,
  });

  if (!open) return null;

  return createPortal(
    <div className="signup-complete-overlay">
      <section
        ref={dialogRef}
        className="signup-complete-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="signup-complete-title"
        aria-describedby="signup-complete-description"
        tabIndex={-1}
      >
        <div className="signup-complete-icon-circle" aria-hidden="true">
          <svg viewBox="0 0 40 40" className="signup-complete-icon">
            <circle cx="20" cy="20" r="16" />
            <path d="M12.5 20.5L17.5 25.5L28 15" />
          </svg>
        </div>

        <div className="signup-complete-text">
          <h2 id="signup-complete-title">알림</h2>
          <p id="signup-complete-description">
            회원가입이 완료되었습니다!
            <br />
            너만 오면 go와 함께 즐거운 여행을 시작해 보세요.
          </p>
        </div>

        <button
          type="button"
          className="signup-complete-button"
          onClick={onStart}
          data-modal-initial-focus
        >
          로그인하러 가기 <span>→</span>
        </button>
      </section>
    </div>,
    document.body
  );
};

const SignUp = () => {
  const navigate = useNavigate();
  const emailAlertReturnFocusRef = useRef(null);

  const [showPw, setShowPw] = useState(false);
  const [showPwConfirm, setShowPwConfirm] = useState(false);
  const [isEmailAlertOpen, setIsEmailAlertOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);

  const [isCodeSent, setIsCodeSent] = useState(false);
  const [isCodeVerified, setIsCodeVerified] = useState(false);

  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleEmailBlur = (event) => {
    if (!form.email.trim()) return;

    if (!isValidEmail(form.email)) {
      emailAlertReturnFocusRef.current = event.currentTarget;
      setIsEmailAlertOpen(true);
    }
  };

  const handleSendCode = async (event) => {
    const normalizedEmail = form.email.trim().toLowerCase();

    if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
      emailAlertReturnFocusRef.current = event.currentTarget;
      setIsEmailAlertOpen(true);
      return;
    }

    try {
      setIsSendingCode(true);

      await sendEmailCodeApi(normalizedEmail);

      setForm((prev) => ({
        ...prev,
        email: normalizedEmail,
        code: "",
      }));

      setIsCodeSent(true);
      setIsCodeVerified(false);

      alert("인증번호가 발송되었습니다. 이메일을 확인해주세요.");
    } catch (error) {
      console.error("인증번호 발송 실패:", error);

      alert(
        getErrorMessage(
          error,
          "인증번호 발송에 실패했습니다. 입력한 이메일 또는 서버 상태를 확인해주세요."
        )
      );
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    const normalizedEmail = form.email.trim().toLowerCase();
    const verificationCode = form.code.trim();

    if (!isCodeSent) {
      alert("먼저 인증번호를 발송해주세요.");
      return;
    }

    if (!verificationCode) {
      alert("인증번호를 입력해주세요.");
      return;
    }

    try {
      setIsVerifyingCode(true);

      await verifyEmailCodeApi({
        email: normalizedEmail,
        code: verificationCode,
      });

      setIsCodeVerified(true);
      alert("이메일 인증이 완료되었습니다.");
    } catch (error) {
      console.error("이메일 인증 실패:", error);

      setIsCodeVerified(false);

      alert(
        getErrorMessage(
          error,
          "인증번호가 일치하지 않거나 인증 시간이 만료되었습니다."
        )
      );
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const handleOpenPrivacyModal = () => {
    setIsPrivacyModalOpen(true);
  };

  const handleCloseEmailAlert = () => {
    setIsEmailAlertOpen(false);

    window.requestAnimationFrame(() => {
      emailAlertReturnFocusRef.current?.focus();
    });
  };

  const handleAgreePrivacyPolicy = () => {
    setForm((prev) => ({
      ...prev,
      agreed: true,
    }));

    setIsPrivacyModalOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmedName = form.name.trim();
    const normalizedEmail = form.email.trim().toLowerCase();

    if (!trimmedName) {
      alert("이름을 입력해주세요.");
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      setIsEmailAlertOpen(true);
      return;
    }

    if (!isCodeVerified) {
      alert("이메일 인증을 완료해주세요.");
      return;
    }

    if (!PASSWORD_PATTERN.test(form.password)) {
      alert(
        "비밀번호는 10자 이상이며 영문 대문자, 소문자, 특수문자(@$!%*?&#~)를 포함해야 합니다."
      );
      return;
    }

    if (form.password !== form.passwordConfirm) {
      alert("비밀번호가 일치하지 않습니다.");
      return;
    }

    if (!form.agreed) {
      alert("이용약관 및 개인정보 처리방침에 동의해주세요.");
      return;
    }

    try {
      setIsSubmitting(true);

      await signupApi({
        email: normalizedEmail,
        password: form.password,
        nickname: trimmedName,
      });

      setIsCompleteModalOpen(true);
    } catch (error) {
      console.error("회원가입 실패:", error);

      alert(
        getErrorMessage(
          error,
          "회원가입에 실패했습니다. 입력 정보를 다시 확인해주세요."
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartAfterSignup = () => {
    setIsCompleteModalOpen(false);
    navigate("/login");
  };

  const isFormValid = Boolean(
    form.name.trim() &&
      isValidEmail(form.email) &&
      isCodeVerified &&
      form.password.trim() &&
      form.passwordConfirm.trim() &&
      form.password === form.passwordConfirm &&
      PASSWORD_PATTERN.test(form.password) &&
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
              <label className="signup-label" htmlFor="signup-name">이름</label>
              <input
                id="signup-name"
                className="signup-input"
                type="text"
                placeholder="이름을 입력하세요"
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
              />
            </div>

            <div className="signup-field">
              <label className="signup-label" htmlFor="signup-email">이메일 (아이디)</label>
              <div className="signup-inline">
                <input
                  id="signup-email"
                  className="signup-input"
                  type="email"
                  placeholder="example@travel.com"
                  value={form.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  onBlur={handleEmailBlur}
                />

                <button
                  type="button"
                  className="signup-inline-btn signup-code-send-btn"
                  onClick={handleSendCode}
                  disabled={isSendingCode}
                >
                  {isSendingCode ? "발송 중..." : "인증번호 발송"}
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
                  인증번호가 발송되었습니다. 이메일을 확인해주세요.
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
                  id="signup-code"
                  aria-label="이메일 인증번호"
                  className="signup-input"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="인증번호 6자리 입력"
                  value={form.code}
                  onChange={(e) => handleChange("code", e.target.value)}
                />

                <button
                  type="button"
                  className="signup-inline-btn"
                  onClick={handleVerifyCode}
                  disabled={!isCodeSent || isVerifyingCode}
                >
                  {isVerifyingCode ? "확인 중..." : "인증 확인"}
                </button>
              </div>
            </div>

            <div className="signup-field">
              <label className="signup-label" htmlFor="signup-password">비밀번호</label>
              <div className="signup-password-wrap">
                <input
                  id="signup-password"
                  className="signup-input signup-input--password"
                  type={showPw ? "text" : "password"}
                  placeholder="10자 이상, 대·소문자와 특수문자 포함"
                  value={form.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                />

                <button
                  type="button"
                  className="signup-eye-btn"
                  onClick={() => setShowPw(!showPw)}
                  aria-label={showPw ? "비밀번호 숨기기" : "비밀번호 표시"}
                  aria-pressed={showPw}
                >
                  <img src={eyeIcon} alt="" />
                </button>
              </div>
            </div>

            <div className="signup-field">
              <label className="signup-label" htmlFor="signup-password-confirm">비밀번호 확인</label>
              <div className="signup-password-wrap">
                <input
                  id="signup-password-confirm"
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
                  aria-label={showPwConfirm ? "비밀번호 확인 값 숨기기" : "비밀번호 확인 값 표시"}
                  aria-pressed={showPwConfirm}
                >
                  <img src={eyeIcon} alt="" />
                </button>
              </div>
            </div>

            <div
              className="signup-agreement"
              role="button"
              tabIndex={0}
              onClick={handleOpenPrivacyModal}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleOpenPrivacyModal();
                }
              }}
            >
              <input
                type="checkbox"
                checked={form.agreed}
                readOnly
                onClick={(e) => e.preventDefault()}
              />
              <span>
                <span className="signup-agreement-link">
                  이용약관 및 개인정보 처리방침
                </span>
                에 동의합니다.
              </span>
            </div>

            <button
              type="submit"
              className={`signup-submit-btn ${isFormValid ? "enabled" : ""}`}
              disabled={!isFormValid || isSubmitting}
            >
              {isSubmitting ? "회원가입 중..." : "회원가입 하기"}
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

      <SignUpTopAlert
        open={isEmailAlertOpen}
        onConfirm={handleCloseEmailAlert}
      />

      <PrivacyPolicyModal
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
        onAgree={handleAgreePrivacyPolicy}
      />

      <SignupCompleteModal
        open={isCompleteModalOpen}
        onStart={handleStartAfterSignup}
      />
    </>
  );
};

export default SignUp;
