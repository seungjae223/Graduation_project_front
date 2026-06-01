import React from "react";
import "./OnBoarding.css";
import { useNavigate } from "react-router-dom";
import mainImage from "../img/Overlay.png";

const OnBoarding = () => {
  const navigate = useNavigate();

  return (
    <div className="onboarding">
      {/* 이미지 */}
      <div
        className="image-wrapper"
        style={{ backgroundImage: `url(${mainImage})` }}
      />

      {/* 텍스트 */}
      <div className="text-area">
        <h2>가고 싶은 곳만 묶으세요.</h2>
        <p>
          복잡한 여행 계획의 시작,
          <br />
          장소 계획부터 시작해 보세요.
        </p>
      </div>

      {/* 인디케이터 */}
      <div className="indicator">
        <span className="dot active"></span>
        <span className="dot"></span>
        <span className="dot"></span>
      </div>

      {/* 버튼 */}
      <button className="next-btn" onClick={() => navigate("/onboarding2")}>
        다음으로 →
      </button>
    </div>
  );
};

export default OnBoarding;