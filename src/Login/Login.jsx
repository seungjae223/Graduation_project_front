import React, { useState } from "react";
import "./Login.css";

// 🔥 아이콘 이미지 추가
import logoIcon from "../img/지구본.png";
import eyeIcon from "../img/눈알.png";
import kakaoIcon from "../img/카카오.png";
import naverIcon from "../img/네이버.png";

const Login = () => {
  const [showPw, setShowPw] = useState(false);

  return (
    <div className="login">

      <div className="login-card">

        {/* 상단 */}
        <div className="login-header">
          <div className="icon-circle">
            <img src={logoIcon} alt="icon" /> {/* 🔥 수정 */}
          </div>
          <h2>너만 오면 go !</h2>
          <p>준비 됐어? 너만 오면 돼!</p>
        </div>

        {/* 이메일 */}
        <div className="input-group">
          <label>이메일 또는 아이디</label>
          <input type="text" placeholder="이메일을 입력해주세요" />
        </div>

        {/* 비밀번호 */}
        <div className="input-group">
          <label>비밀번호</label>
          <div className="password-box">
            <input
              type={showPw ? "text" : "password"}
              placeholder="비밀번호를 입력해주세요"
            />
            {/* 🔥 눈 아이콘 변경 */}
            <img
              src={eyeIcon}
              alt="eye"
              className="eye-icon"
              onClick={() => setShowPw(!showPw)}
            />
          </div>
        </div>

        {/* 옵션 */}
        <div className="login-options">
          <label>
            <input type="checkbox" /> 로그인 상태 유지
          </label>
          <span className="link">비밀번호 찾기</span>
        </div>

        {/* 로그인 버튼 */}
        <button className="login-btn">로그인</button>

        {/* 회원가입 */}
        <p className="signup">
          아직 회원이 아니신가요? <span>회원가입</span>
        </p>

        {/* 간편 로그인 */}
        <div className="divider">간편 로그인</div>

        {/* 🔥 소셜 로그인 아이콘 추가 */}
        <div className="social">
          <button className="kakao">
            <img src={kakaoIcon} alt="kakao" />
            카카오 로그인
          </button>
          <button className="naver">
            <img src={naverIcon} alt="naver" />
            네이버 로그인
          </button>
        </div>

      </div>
    </div>
  );
};

export default Login;