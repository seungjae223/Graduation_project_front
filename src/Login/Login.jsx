import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";

// 아이콘 이미지 추가
import logoIcon from "../img/지구본.png";
import eyeIcon from "../img/눈알.png";
import kakaoIcon from "../img/카카오.png";
import naverIcon from "../img/네이버.png";

// 경로는 실제 파일 위치에 맞게 수정
import { loginMockUser } from "../utils/mockAuth";

const Login = () => {
  const navigate = useNavigate();
  const [showPw, setShowPw] = useState(false);
  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
    keepLogin: false,
  });

  const handleSignupClick = () => {
    navigate("/signup");
  };

  const handleChange = (key, value) => {
    setLoginForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleLogin = (e) => {
    e.preventDefault();

    const email = loginForm.email.trim();
    const password = loginForm.password;

    if (!email || !password) {
      alert("이메일과 비밀번호를 입력해주세요.");
      return;
    }

    const result = loginMockUser({
      email,
      password,
      keepLogin: loginForm.keepLogin,
    });

    if (!result.ok) {
      alert(result.message || "로그인에 실패했습니다.");
      return;
    }

    // 관리자/일반회원 구분 없이 로그인 후 메인 홈으로 이동
    navigate("/home", { replace: true });
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
            <label>이메일</label>
            <input
              type="text"
              placeholder="이메일을 입력해주세요"
              value={loginForm.email}
              onChange={(e) => handleChange("email", e.target.value)}
            />
          </div>

          <div className="input-group">
            <label>비밀번호</label>
            <div className="password-box">
              <input
                type={showPw ? "text" : "password"}
                placeholder="비밀번호를 입력해주세요"
                value={loginForm.password}
                onChange={(e) => handleChange("password", e.target.value)}
              />
              <img
                src={eyeIcon}
                alt="eye"
                className="eye-icon"
                onClick={() => setShowPw(!showPw)}
              />
            </div>
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
            <span className="link">비밀번호 찾기</span>
          </div>

          <button type="submit" className="login-btn">
            로그인
          </button>

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
          <button type="button" className="kakao">
            <img src={kakaoIcon} alt="kakao" />
            카카오 로그인
          </button>
          <button type="button" className="naver">
            <img src={naverIcon} alt="naver" />
            구글 로그인
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;