import React, { useState } from "react";
import "./Landing.css";
import { useNavigate } from "react-router-dom";

import bgImage from "../img/서비스 소개 .png";

// 아이콘
import compass from "../img/나침반.png";
import route from "../img/동선.png";
import map from "../img/랜딩지도.png";

const Landing = () => {
  const [activeBtn, setActiveBtn] = useState(null);
  const navigate = useNavigate();

  return (
    <div className="landing">
      {/* 상단 이미지 */}
      <div className="landing-hero">
        <img src={bgImage} alt="hero" />
      </div>

      {/* 콘텐츠 */}
      <div className="landing-content">
        <h2>
          너만 오면 <span className="blue">go!</span>
        </h2>

        <p>
          복잡한 계획은 저희에게 맡기세요.
          <br />
          당신만을 위한 완벽한 맞춤형 여행이
          <br />
          그 순간 시작됩니다.
        </p>

        {/* 시작하기 */}
        <button
          className={`btn ${activeBtn === "start" ? "active" : "inactive"}`}
          onClick={() => {
            setActiveBtn("start");
            navigate("/login");
          }}
        >
          시작하기
        </button>

        {/* 둘러보기 */}
        <button
          className={`btn ${activeBtn === "explore" ? "active" : "inactive"}`}
          onClick={() => {
            setActiveBtn("explore");
            navigate("/home");
          }}
        >
          둘러보기
        </button>

        <div className="scroll">SCROLL TO EXPLORE ↓</div>
      </div>

      {/* 기능 카드 */}
      <div className="feature">
        <div className="card">
          <div className="icon-box">
            <img src={compass} alt="icon" />
          </div>

          <div>
            <h3>테마 여행 추천</h3>
            <p>
              취향만 말씀하세요. 감성 카페부터 숨은 명소
              <br />
              까지 테마별로 골라드려요.
            </p>
          </div>
        </div>

        <div className="card">
          <div className="icon-box">
            <img src={route} alt="icon" />
          </div>

          <div>
            <h3>최적 동선 설계</h3>
            <p>
              이동 시간을 최소화하는 최적의 루트로 여행 시간을 아껴드립니다.
            </p>
          </div>
        </div>

        <div className="card">
          <div className="icon-box">
            <img src={map} alt="icon" />
          </div>

          <div>
            <h3>지능형 맵 서비스</h3>
            <p>
              복잡한 지도 대신 꼭 필요한 정보만 담은 직관적인 안내를 경험하세요.
            </p>
          </div>
        </div>
      </div>

      {/* 푸터 */}
      <div className="landing-footer">
        너만 오면 go
        <br />© 2025 All rights reserved.
      </div>
    </div>
  );
};

export default Landing;