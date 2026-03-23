import React from "react";
import "./OnBoarding.css";
import { useNavigate } from "react-router-dom"; // 🔥 추가
import mainImage from "../img/OnBoarding3.png";

const OnBoarding3 = () => {
  const navigate = useNavigate(); // 🔥 추가

  return (
    <div className="onboarding">

      {/* 이미지 */}
      <div
        className="image-wrapper"
        style={{ backgroundImage: `url(${mainImage})` }}
      />

      {/* 텍스트 */}
      <div className="text-area">
        <h2>함께라면 더 즐거워요</h2>
        <p>
          완성된 일정을 친구들에게 공유하고 함께 여행을 떠나보세요!
        </p>
      </div>

      {/* 인디케이터 */}
      <div className="indicator">
        <span className="dot"></span>
        <span className="dot"></span>
        <span className="dot active"></span>
      </div>

      {/* 버튼 */}
      <button
        className="next-btn"
        onClick={() => navigate("/Landing")}  // 🔥 핵심
      >
        지금 시작하기
      </button>

    </div>
  );
};

export default OnBoarding3;