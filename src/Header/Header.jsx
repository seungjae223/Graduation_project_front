import React from "react";
import "./Header.css";
import { useLocation, useNavigate } from "react-router-dom";

import logoBlue from "../img/너만 오면 go.png";
import logoBlack from "../img/너만 오면 go 블랙.png";
import backIcon from "../img/백.png";
import searchIcon from "../img/검정 검색.png";
import shareIcon from "../img/공유.png";
import myIcon from "../img/마이페이지.png";

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const path = location.pathname;

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: document.title,
          url: window.location.href,
        });
        return;
      }

      await navigator.clipboard.writeText(window.location.href);
      alert("링크가 복사됐어요.");
    } catch (error) {
      console.log("공유 실패:", error);
    }
  };

  const renderHeader = () => {
    // 홈
    if (path === "/home") {
      return (
        <>
          <div className="header-side" />

          <div className="header-center">
            <img src={logoBlack} alt="logo" className="logo-center" />
          </div>

          <div className="header-side">
            <button
              type="button"
              className="icon-btn"
              onClick={() => navigate("/mypage")}
            >
              <img src={myIcon} alt="mypage" className="my-icon" />
            </button>
          </div>
        </>
      );
    }

    // 테마 선택 페이지
    if (path === "/recommend") {
      return (
        <>
          <div className="header-side">
            <button
              type="button"
              className="icon-btn"
              onClick={() => navigate(-1)}
            >
              <img src={backIcon} alt="back" className="header-icon" />
            </button>
          </div>

          <div className="header-center">
            <h2 className="header-title">테마 선택</h2>
          </div>

          <div className="header-side">
            <button type="button" className="icon-btn">
              <img src={searchIcon} alt="search" className="header-icon" />
            </button>
          </div>
        </>
      );
    }

    // 경로 만들기 페이지
    if (path === "/route-create") {
      return (
        <>
          <div className="header-side">
            <button
              type="button"
              className="icon-btn"
              onClick={() => navigate(-1)}
            >
              <img src={backIcon} alt="back" className="header-icon" />
            </button>
          </div>

          <div className="header-center">
            <h2 className="header-title">경로 만들기</h2>
          </div>

          <div className="header-side" />
        </>
      );
    }

    // 최적 경로 결과 페이지
    if (path === "/route-result") {
      return (
        <>
          <div className="header-side">
            <button
              type="button"
              className="icon-btn"
              onClick={() => navigate(-1)}
            >
              <img src={backIcon} alt="back" className="header-icon" />
            </button>
          </div>

          <div className="header-center">
            <h2 className="header-title result-title">최적 경로 결과</h2>
          </div>

          <div className="header-side">
            <button
              type="button"
              className="icon-btn"
              onClick={handleShare}
            >
              <img src={shareIcon} alt="share" className="header-icon" />
            </button>
          </div>
        </>
      );
    }

    // 온보딩 3
    if (path === "/onboarding3") {
      return (
        <>
          <div className="header-side">
            <button
              type="button"
              className="icon-btn"
              onClick={() => navigate(-1)}
            >
              <img src={backIcon} alt="back" className="header-icon" />
            </button>
          </div>

          <div className="header-center">
            <img src={logoBlack} alt="logo" className="logo-center" />
          </div>

          <div className="header-side" />
        </>
      );
    }

    // 온보딩 1, 2
    if (path === "/" || path === "/onboarding" || path === "/onboarding2") {
      return (
        <>
          <img src={logoBlue} alt="logo" className="logo" />
          <button className="skip-btn" onClick={() => navigate("/")}>
            Skip
          </button>
        </>
      );
    }

    // 랜딩
    if (path === "/Landing") {
      return (
        <>
          <div className="header-side" />
          <div className="header-center">
            <img src={logoBlack} alt="logo" className="logo-center" />
          </div>
          <div className="header-side" />
        </>
      );
    }

    // 기본
    return (
      <>
        <div className="header-side">
          <button
            type="button"
            className="icon-btn"
            onClick={() => navigate(-1)}
          >
            <img src={backIcon} alt="back" className="header-icon" />
          </button>
        </div>

        <div className="header-center">
          <img src={logoBlack} alt="logo" className="logo-center" />
        </div>

        <div className="header-side" />
      </>
    );
  };

  return <header className="header">{renderHeader()}</header>;
};

export default Header;