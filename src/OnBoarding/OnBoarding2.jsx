import React from "react";
import "./OnBoarding.css";
import { useNavigate } from "react-router-dom";
import mainImage from "../img/지도.png";

const OnBoarding2 = () => {
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
        <h2>동선 최적화는 저희가 할게요</h2>
        <p>
          AI가 분석한 가장 효율적인 경로로 이동 시간을
          <br />
          아끼고 여행에 집중해 보세요.
        </p>
      </div>

      {/* 인디케이터 */}
      <div className="indicator">
        <span className="dot"></span>
        <span className="dot active"></span>
        <span className="dot"></span>
      </div>

      {/* 버튼 */}
      <button className="next-btn" onClick={() => navigate("/onboarding3")}>
        다음으로 →
      </button>
    </div>
  );
};

export default OnBoarding2;