import React, { useEffect, useMemo, useState } from "react";
import "./Header.css";
import { useLocation, useNavigate } from "react-router-dom";
import html2pdf from "html2pdf.js";
import ShareModal from "../ShareModal/ShareModal";

import logoBlue from "../img/너만 오면 go.png";
import logoBlack from "../img/너만 오면 go 블랙.png";
import backIcon from "../img/백.png";
import searchIcon from "../img/검정 검색.png";
import shareIcon from "../img/공유.png";
import myIcon from "../img/마이페이지.png";

const Header = ({ onSearchClick }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const path = location.pathname;
  const [isShareOpen, setIsShareOpen] = useState(false);

  const routeShareUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}${location.pathname}${location.search || ""}`;
  }, [location.pathname, location.search]);

  const waitForNextPaint = () =>
    new Promise((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(resolve);
      });
    });

  const waitForPdfImages = async (root) => {
    const images = Array.from(
      root.querySelectorAll('img[data-pdf-asset="true"]')
    );

    if (!images.length) return;

    await Promise.all(
      images.map((img) => {
        if (img.complete && img.naturalWidth > 0) {
          return Promise.resolve();
        }

        return new Promise((resolve) => {
          const done = () => {
            img.removeEventListener("load", done);
            img.removeEventListener("error", done);
            resolve();
          };

          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
        });
      })
    );
  };

  const buildPdfFileDate = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(today.getDate()).padStart(2, "0")}`;
  };

  useEffect(() => {
    if (path !== "/route-result") {
      setIsShareOpen(false);
    }
  }, [path]);

  const handleSearchClick = () => {
    if (typeof onSearchClick === "function") {
      onSearchClick();
      return;
    }

    navigate("/search");
  };

  const handleSavePdfFromShare = async () => {
    const target = document.getElementById("route-result-pdf");

    if (!target) {
      alert("PDF로 저장할 내용을 찾지 못했어요.");
      return;
    }

    target.classList.add("is-exporting");

    try {
      await waitForNextPaint();
      await waitForPdfImages(target);
      await waitForNextPaint();

      const fileDate = buildPdfFileDate();

      const options = {
        margin: 0,
        filename: `최적경로결과_${fileDate}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          backgroundColor: "#f7f9fc",
        },
        jsPDF: {
          unit: "mm",
          format: "a4",
          orientation: "portrait",
        },
        pagebreak: {
          mode: ["css", "legacy"],
        },
      };

      await html2pdf().from(target).set(options).save();
      setIsShareOpen(false);
    } catch (error) {
      console.log("PDF 저장 실패:", error);
      alert("PDF 저장에 실패했어요.");
    } finally {
      target.classList.remove("is-exporting");
    }
  };

  const handleShare = () => {
    if (path !== "/route-result") return;
    setIsShareOpen(true);
  };

  const renderHeader = () => {
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
            <button
              type="button"
              className="icon-btn"
              onClick={handleSearchClick}
            >
              <img src={searchIcon} alt="search" className="header-icon" />
            </button>
          </div>
        </>
      );
    }

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
              aria-label="일정 공유"
            >
              <img src={shareIcon} alt="share" className="header-icon" />
            </button>
          </div>
        </>
      );
    }

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

  return (
    <>
      <header className="header">{renderHeader()}</header>

      {path === "/route-result" && (
        <ShareModal
          open={isShareOpen}
          onClose={() => setIsShareOpen(false)}
          variant="schedule"
          shareUrl={routeShareUrl}
          onSavePdf={handleSavePdfFromShare}
        />
      )}
    </>
  );
};

export default Header;