import { savePreparedPdf } from "../utils/pdfTask";
import { logSafeApiError } from "../utils/safeLog";
import React, { useEffect, useMemo, useState } from "react";
import "./Header.css";
import { useLocation, useNavigate } from "react-router-dom";
import html2pdf from "html2pdf.js";
import { getAuthSnapshot } from "../utils/authState";
import ShareModal from "../ShareModal/ShareModal";
import Alert from "../Alert/Alert";
import { navigateWithOnboardingTransition } from "../OnBoarding/onboardingTransition";

const ROUTE_STORAGE_KEY = "mock_saved_route_results";
const ROUTE_STORAGE_EVENT = "mock-routes-updated";

const BrandWordmark = ({ tone = "default" }) => (
  <span className={`brand-wordmark brand-wordmark--${tone}`}>너만 오면 go</span>
);

const BackIcon = () => (
  <svg className="header-icon" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M15 4 7 12l8 8" />
  </svg>
);

const SearchIcon = () => (
  <svg className="header-icon" viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4 4" />
  </svg>
);

const ShareIcon = () => (
  <svg className="header-icon" viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="18" cy="5" r="2.25" />
    <circle cx="6" cy="12" r="2.25" />
    <circle cx="18" cy="19" r="2.25" />
    <path d="m8 11 7.8-4.6M8 13l7.8 4.6" />
  </svg>
);

const ProfileIcon = () => (
  <svg className="my-icon" viewBox="0 0 32 32" aria-hidden="true">
    <circle cx="16" cy="16" r="13" />
    <circle cx="16" cy="12" r="4" />
    <path d="M8.5 25c1.4-4.1 4-6.1 7.5-6.1s6.1 2 7.5 6.1" />
  </svg>
);

const BlackTrashIcon = () => (
  <svg
    className="header-icon trash-icon"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      d="M9 4H15"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
    <path
      d="M5 7H19"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
    <path
      d="M7.2 7.5L8.1 20H15.9L16.8 7.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M10.3 11V17"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
    <path
      d="M13.7 11V17"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
  </svg>
);

const deleteSavedRouteById = (routeId) => {
  if (!routeId || typeof window === "undefined") {
    return false;
  }

  try {
    const raw = window.localStorage.getItem(ROUTE_STORAGE_KEY);
    const prev = raw ? JSON.parse(raw) : [];

    if (!Array.isArray(prev)) {
      return false;
    }

    const next = prev.filter((route) => String(route.id) !== String(routeId));

    window.localStorage.setItem(ROUTE_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(ROUTE_STORAGE_EVENT));

    return prev.length !== next.length;
  } catch (error) {
    logSafeApiError(error, "Header.jsx");
    return false;
  }
};

const Header = ({ onSearchClick }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const path = location.pathname;
  const isRouteResultPage = path === "/route-result";

  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleteSuccessOpen, setIsDeleteSuccessOpen] = useState(false);

  const routeShareUrl = useMemo(() => {
    if (typeof window === "undefined") return "";

    return `${window.location.origin}${location.pathname}${
      location.search || ""
    }`;
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

  const getCurrentRouteId = () => {
    const params = new URLSearchParams(location.search);

    return (
      params.get("id") ||
      location.state?.savedRoute?.id ||
      location.state?.routeId ||
      ""
    );
  };

  useEffect(() => {
    if (!isRouteResultPage) {
      setIsShareOpen(false);
      setIsDeleteOpen(false);
    }
  }, [isRouteResultPage]);

  const handleBackClick = () => {
    setIsShareOpen(false);
    setIsDeleteOpen(false);
    setIsDeleteSuccessOpen(false);

    navigate(-1);
  };

  const handleOnboardingBackClick = () => {
    navigateWithOnboardingTransition(navigate, -1, "backward");
  };

  const handleSearchClick = () => {
    if (typeof onSearchClick === "function") {
      onSearchClick();
      return;
    }

    navigate("/search");
  };

  const handleSavePdfFromShare = async ({ isCurrent = () => true } = {}) => {
    const target = document.getElementById("route-result-pdf");

    if (!target) {
      throw new Error("PDF로 저장할 내용을 찾지 못했어요.");
    }

    if (target.dataset.exportReady !== "true") throw new Error("일정과 타임라인 조회를 완료한 뒤 출력해 주세요.");
    const context = target.dataset.exportContext;
    const account = getAuthSnapshot().accountKey;
    const wrapper = document.createElement("div");
    wrapper.style.cssText = "position:fixed;left:-100000px;top:0;width:" + (target.clientWidth || 390) + "px";
    const clone = target.cloneNode(true); clone.classList.add("is-exporting");
    wrapper.appendChild(clone); document.body.appendChild(wrapper);

    try {
      await waitForNextPaint();
      await waitForPdfImages(clone);
      await waitForNextPaint();

      const fileDate = buildPdfFileDate();

      const options = {
        margin: 0,
        filename: `경로결과_${fileDate}.pdf`,
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

      const worker = html2pdf().from(clone).set(options);
      await savePreparedPdf(worker, () => isCurrent() && target.isConnected && target.dataset.exportContext === context && target.dataset.exportReady === "true" && getAuthSnapshot().accountKey === account);
    } catch (error) {
      throw error;
    } finally {
      wrapper.remove();
    }
  };

  const handleShare = () => {
    if (!isRouteResultPage) return;

    setIsDeleteOpen(false);
    setIsShareOpen(true);
  };

  const handleDeleteClick = () => {
    if (!isRouteResultPage) return;

    setIsShareOpen(false);
    setIsDeleteOpen(true);
  };

  const handleDeleteConfirm = () => {
    const targetRouteId = getCurrentRouteId();

    if (!targetRouteId) {
      alert("삭제할 일정 정보를 찾지 못했어요.");
      setIsDeleteOpen(false);
      return;
    }

    const deleted = deleteSavedRouteById(targetRouteId);

    if (!deleted) {
      alert("삭제할 일정을 저장소에서 찾지 못했어요.");
      setIsDeleteOpen(false);
      return;
    }

    setIsDeleteOpen(false);
    setIsShareOpen(false);
    setIsDeleteSuccessOpen(true);

    navigate("/my-schedule", {
      replace: true,
      state: {
        deleteSuccess: true,
        deletedRouteId: targetRouteId,
      },
    });
  };

  const handleCloseDeleteSuccess = () => {
    setIsDeleteSuccessOpen(false);
  };

  const renderHeader = () => {
    if (path === "/home") {
      return (
        <>
          <div className="header-side" />

          <div className="header-center">
            <BrandWordmark />
          </div>

          <div className="header-side">
            <button
              type="button"
              className="icon-btn"
              onClick={() => navigate("/mypage")}
              aria-label="마이페이지"
            >
              <ProfileIcon />
            </button>
          </div>
        </>
      );
    }

    if (path === "/recommend") {
      return (
        <>
          <div className="header-side">
            <button type="button" className="icon-btn" onClick={handleBackClick} aria-label="뒤로 가기">
              <BackIcon />
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
              aria-label="검색"
            >
              <SearchIcon />
            </button>
          </div>
        </>
      );
    }

    if (path === "/route-create") {
      return (
        <>
          <div className="header-side">
            <button type="button" className="icon-btn" onClick={handleBackClick} aria-label="뒤로 가기">
              <BackIcon />
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
            <button type="button" className="icon-btn" onClick={handleBackClick} aria-label="뒤로 가기">
              <BackIcon />
            </button>
          </div>

          <div className="header-center">
            <h2 className="header-title result-title">최적 경로 결과</h2>
          </div>

          <div className="header-side route-result-header-actions">
            <button
              type="button"
              className="icon-btn header-trash-button"
              onClick={handleDeleteClick}
              aria-label="일정 삭제"
            >
              <BlackTrashIcon />
            </button>

            <button
              type="button"
              className="icon-btn"
              onClick={handleShare}
              aria-label="일정 공유"
            >
              <ShareIcon />
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
              className="icon-btn onboarding-motion-button onboarding-motion-button--small onboarding-motion-button--header"
              onClick={handleOnboardingBackClick}
              aria-label="뒤로 가기"
            >
              <BackIcon />
            </button>
          </div>

          <div className="header-center">
            <BrandWordmark />
          </div>

          <div className="header-side" />
        </>
      );
    }

    if (path === "/" || path === "/onboarding" || path === "/onboarding2") {
      return (
        <>
          <BrandWordmark tone="blue" />
          <button
            className="skip-btn onboarding-motion-button onboarding-motion-button--small onboarding-motion-button--header"
            onClick={() => navigate("/")}
          >
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
            <BrandWordmark />
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
            className={`icon-btn${
              path === "/landing"
                ? " onboarding-motion-button onboarding-motion-button--small onboarding-motion-button--header"
                : ""
            }`}
            onClick={handleBackClick}
            aria-label="뒤로 가기"
          >
            <BackIcon />
          </button>
        </div>

        <div className="header-center">
          <BrandWordmark />
        </div>

        <div className="header-side" />
      </>
    );
  };

  return (
    <>
      <header className="header">{renderHeader()}</header>

      {isRouteResultPage && (
        <ShareModal
          open={isShareOpen}
          onClose={() => setIsShareOpen(false)}
          variant="schedule"
          shareUrl={routeShareUrl}
          onSavePdf={handleSavePdfFromShare}
          contextKey={location.pathname + location.search}
        />
      )}

      {isRouteResultPage && (
        <Alert
          open={isDeleteOpen}
          type="delete"
          onClose={() => setIsDeleteOpen(false)}
          onSecondary={() => setIsDeleteOpen(false)}
          onPrimary={handleDeleteConfirm}
        />
      )}

      <Alert
        open={isDeleteSuccessOpen}
        type="network"
        title="삭제되었습니다"
        description=""
        primaryText="확인"
        secondaryText=""
        onClose={handleCloseDeleteSuccess}
        onPrimary={handleCloseDeleteSuccess}
      />
    </>
  );
};

export default Header;
