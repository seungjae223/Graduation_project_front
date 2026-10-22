import { savePreparedPdf, preparePdfImages, clonePdfContent, removeEmptyPdfPages } from "../utils/pdfTask";
import { preparePdfMaps } from "../utils/pdfMaps";
import React, { useEffect, useMemo, useRef, useState } from "react";
import "./Header.css";
import { useLocation, useNavigate } from "react-router-dom";
import html2pdf from "html2pdf.js";
import { getAuthSnapshot } from "../utils/authState";
import ShareModal from "../ShareModal/ShareModal";
import Alert from "../Alert/Alert";
import { returnFromDetail } from "../utils/detailBack";
import { navigateWithOnboardingTransition } from "../OnBoarding/onboardingTransition";
import { deleteTripApi } from "../api/tripApi";
import useMutationTask from "../utils/useMutationTask";
import useSessionKey from "../utils/useSessionKey";

const BrandWordmark = ({ tone = "default" }) => (
  <span className={`brand-wordmark brand-wordmark--${tone}`}>너만 오면 go</span>
);

const BackIcon = () => (
  <svg className="header-icon" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M15 4 7 12l8 8" />
  </svg>
);

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const path = location.pathname;
  const isRouteResultPage = path === "/route-result";

  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const accountKey = useSessionKey();
  const currentRouteId = new URLSearchParams(location.search).get("id") || location.state?.savedRoute?.id || location.state?.routeId || "";
  const deleteKey = `${accountKey}:${location.pathname}:${currentRouteId}`;
  const currentDeleteKey = useRef(deleteKey);
  currentDeleteKey.current = deleteKey;
  const deleteTask = useMutationTask(deleteKey);

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
    setIsShareOpen(false);
    setIsDeleteOpen(false);
  }, [isRouteResultPage, deleteKey]);

  useEffect(() => {
    if (!isRouteResultPage) return;
    const open = () => setIsShareOpen(true);
    window.addEventListener("nomango:open-trip-share", open);
    return () => window.removeEventListener("nomango:open-trip-share", open);
  }, [isRouteResultPage]);

  const handleBackClick = () => {
    setIsShareOpen(false);
    setIsDeleteOpen(false);

    if (path === "/route-optimize") {
      const tripId = new URLSearchParams(location.search).get("id");
      navigate(tripId && /^[1-9]\d*$/.test(tripId)
        ? "/route-result?id=" + encodeURIComponent(tripId) : "/schedule");
    } else if (path === "/route-add-places") {
      const query = new URLSearchParams(location.search);
      const tripId = query.get("id");
      const day = Number(query.get("day")) || 1;
      const optimized = query.get("version") === "optimized" ? "&version=optimized" : "";
      const origin = query.get("origin") === "past" ? "&origin=past" : "";
      navigate(tripId && /^[1-9]\d*$/.test(tripId)
        ? "/route-result?id=" + encodeURIComponent(tripId) + "&edit=1&day=" + day + optimized + origin
        : "/schedule");
    } else if (path === "/route-result") {
      const query = new URLSearchParams(location.search);
      const tripId = query.get("id");
      const past = query.get("origin") === "past" || location.state?.from === "/mypage/past-trips";
      navigate(query.get("edit") === "1" && tripId
        ? "/route-result?id=" + encodeURIComponent(tripId) + (past ? "&origin=past" : "")
        : past ? "/mypage/past-trips" : "/schedule");
    } else if (path === "/detail") returnFromDetail(navigate);
    else if (path === "/saved-places") {
      // The back action must be deterministic, even after direct links or refresh.
      const inFolder = new URLSearchParams(location.search).has("folderId");
      navigate(inFolder ? "/saved-places" : "/mypage");
    } else navigate(-1);
  };

  const handleOnboardingBackClick = () => {
    navigateWithOnboardingTransition(navigate, window.history.state?.idx > 0 ? -1 : "/onboarding2", "backward");
  };

  const handleSavePdfFromShare = async ({ isCurrent = () => true } = {}) => {
    const target = document.getElementById("route-result-pdf") || document.getElementById("v16-detail-export");

    if (!target) {
      throw new Error("PDF로 저장할 내용을 찾지 못했어요.");
    }

    if (target.dataset.exportReady !== "true") throw new Error("일정과 타임라인, 지도의 장소 위치를 확인한 뒤 출력해 주세요.");
    const context = target.dataset.exportContext;
    const account = getAuthSnapshot().accountKey;
    const wrapper = document.createElement("div");
    wrapper.style.cssText = "position:fixed;left:-100000px;top:0;width:" + (target.clientWidth || 390) + "px";
    const exclusion = target.id === "v16-detail-export"
      ? ".v16-detail-actions,.v16-detail-view-toolbar,.v16-detail-day-actions,.v16-detail-local-note,.v16-detail-day-time-controls,.v16-detail-title-action svg"
      : ".route-result-screen";
    const clone = clonePdfContent(target, exclusion); clone.classList.add("is-exporting");
    wrapper.appendChild(clone); document.body.appendChild(wrapper);

    try {
      await waitForNextPaint();
      await preparePdfMaps(clone);
      await preparePdfImages(clone);
      await waitForNextPaint();

      const fileDate = buildPdfFileDate();

      const options = {
        margin: 0,
        filename: `경로결과_${fileDate}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          allowTaint: false,
          logging: false,
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
      await worker.toCanvas();
      const canvas = await worker.get("canvas");
      const pageSize = await worker.get("pageSize");
      await worker.set({ canvas: removeEmptyPdfPages(canvas, pageSize.inner.ratio, [247, 249, 252]) });
      await savePreparedPdf(worker, () => isCurrent() && target.isConnected && target.dataset.exportContext === context && target.dataset.exportReady === "true" && getAuthSnapshot().accountKey === account);
    } catch (error) {
      throw error;
    } finally {
      wrapper.remove();
    }
  };

  const handleDeleteConfirm = async () => {
    if (deleteTask.blocked) return;
    const targetRouteId = getCurrentRouteId();

    if (!targetRouteId) {
      alert("삭제할 일정 정보를 찾지 못했어요.");
      setIsDeleteOpen(false);
      return;
    }

    const key = deleteKey;
    await deleteTask.run(
      () => deleteTripApi(targetRouteId),
      async () => {
        if (currentDeleteKey.current !== key) return;
        setIsDeleteOpen(false);
        setIsShareOpen(false);
        navigate("/my-schedule", { replace: true, state: { deleteSuccess: true, deletedRouteId: targetRouteId } });
      },
      { failure: "일정을 삭제하지 못했어요. 다시 시도해 주세요.", unknown: "일정 삭제 여부를 확인하지 못했어요. 목록에서 최신 상태를 확인해 주세요.", success: "일정을 삭제했어요.", refreshFailure: "삭제 응답을 확인했지만 화면을 갱신하지 못했어요." }
    );
  };

  const closeDelete = () => { if (deleteTask.status !== "running") setIsDeleteOpen(false); };
  const handleCheckDeletion = () => navigate("/my-schedule");

  const renderHeader = () => {
    if (path === "/home") {
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

    // Main navigation roots do not have a meaningful parent to return to.
    if (["/search", "/schedule", "/mypage"].includes(path)) {
      return (
        <>
          <div className="header-side" />
          <div className="header-center"><BrandWordmark /></div>
          <div className="header-side" />
        </>
      );
    }

    if (path === "/recommend") {
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

    if (path === "/route-create" || path === "/route-create/region") {
      return (
        <>
          <div className="header-side">
            <button type="button" className="icon-btn" onClick={handleBackClick} aria-label="뒤로 가기">
              <BackIcon />
            </button>
          </div>

          <div className="header-center">
            <h2 className="header-title">일정 만들기</h2>
          </div>

          <div className="header-side" />
        </>
      );
    }

    if (path === "/route-add-places") {
      return (
        <>
          <div className="header-side">
            <button type="button" className="icon-btn" onClick={handleBackClick} aria-label="뒤로 가기">
              <BackIcon />
            </button>
          </div>
          <div className="header-center">
            <h2 className="header-title">장소 추가</h2>
          </div>
          <div className="header-side" />
        </>
      );
    }

    if (path === "/route-optimize") {
      return <>
        <div className="header-side">
          <button type="button" className="icon-btn" onClick={handleBackClick} aria-label="뒤로 가기">
            <BackIcon/>
          </button>
        </div>
        <div className="header-center"><h2 className="header-title">경로 최적화</h2></div>
        <div className="header-side"/>
      </>;
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
            <h2 className="header-title result-title">여행 일정</h2>
          </div>

          <div className="header-side" />
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
            onClick={() => navigate("/home")}
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
          type={deleteTask.status === "unknown" ? "deleteUnknown" : "delete"}
          title={deleteTask.status === "unknown" ? "삭제 결과 확인 필요" : "일정 삭제"}
          description={deleteTask.message || "이 일정을 삭제할까요?"}
          primaryText={deleteTask.status === "running" ? "삭제 중..." : deleteTask.status === "unknown" ? "일정 목록 확인" : "삭제하기"}
          secondaryText={deleteTask.status === "unknown" ? "닫기" : "취소"}
          primaryDisabled={deleteTask.status === "running"}
          secondaryDisabled={deleteTask.status === "running"}
          canClose={deleteTask.status !== "running"}
          onClose={closeDelete}
          onSecondary={closeDelete}
          onPrimary={deleteTask.status === "unknown" ? handleCheckDeletion : handleDeleteConfirm}
        />
      )}
    </>
  );
};

export default Header;
