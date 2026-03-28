import React, { useEffect, useState } from "react";
import RouteResult from "../RouteResult/RouteResult";
import {
  getSavedRoutes,
  ROUTE_STORAGE_EVENT,
} from "../utils/routeStorage";
import "./Schedule.css";

function Schedule() {
  const [savedRoutes, setSavedRoutes] = useState([]);

  useEffect(() => {
    const syncRoutes = () => {
      setSavedRoutes(getSavedRoutes());
    };

    syncRoutes();

    window.addEventListener("storage", syncRoutes);
    window.addEventListener(ROUTE_STORAGE_EVENT, syncRoutes);
    window.addEventListener("focus", syncRoutes);

    return () => {
      window.removeEventListener("storage", syncRoutes);
      window.removeEventListener(ROUTE_STORAGE_EVENT, syncRoutes);
      window.removeEventListener("focus", syncRoutes);
    };
  }, []);

  const latestSavedRoute = savedRoutes[0];

  if (!latestSavedRoute) {
    return (
      <div className="schedule-empty-page">
        <div className="schedule-empty-box">
          <h2>저장된 일정이 없어요</h2>
          <p>경로 생성 후 일정 탭에서 결과를 확인할 수 있어요.</p>
        </div>
      </div>
    );
  }

  return <RouteResult initialSavedRoute={latestSavedRoute} isEmbedded />;
}

export default Schedule;