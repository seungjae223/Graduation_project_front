import React from "react";
import "./AdminMain.css";

// 여기 파일명은 실제 img 폴더 안 이름으로 맞춰줘
import dailyUserIcon from "../../img/사람.png";
import plusIcon from "../../img/플러스.png";

const dashboardMock = {
  dailyUsers: 24800,
  growthRate: 12,
  userBars: [28, 42, 56, 42, 68, 86],
  routeCreated: 842,
  todayCreated: 156,
  weeklyProgress: 65,
};

const formatNumber = (value) => {
  return value.toLocaleString("ko-KR");
};

const RouteCreateMiniIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <circle cx="6" cy="7" r="2" fill="#19A5F4" />
    <circle cx="18" cy="7" r="2" fill="#19A5F4" />
    <circle cx="12" cy="18" r="2" fill="#19A5F4" />
    <path
      d="M8 7H16"
      stroke="#19A5F4"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M7.4 8.7L10.8 15.4"
      stroke="#19A5F4"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M16.6 8.7L13.2 15.4"
      stroke="#19A5F4"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const AdminMain = () => {
  return (
    <div className="admin-page">
      <div className="admin-dashboard-badge">DASHBOARD</div>

      <h1 className="admin-page-title">시스템 통계</h1>
      <p className="admin-page-subtitle">실시간 플랫폼 성능 개요</p>

      <section className="admin-stat-card large">
        <div className="admin-card-top">
          <div className="admin-card-label">
            <img
              src={dailyUserIcon}
              alt="일일 사용자"
              className="admin-card-icon-image"
            />
            <span>일일 사용자</span>
          </div>

          <div className="admin-growth-badge">
            ↗ {dashboardMock.growthRate}%
          </div>
        </div>

        <div className="admin-main-value">
          {formatNumber(dashboardMock.dailyUsers)}명
        </div>

        <div className="admin-bar-chart">
          {dashboardMock.userBars.map((height, index) => (
            <div
              key={`bar-${index}`}
              className={`admin-bar ${
                index === dashboardMock.userBars.length - 1 ? "active" : ""
              }`}
              style={{ height: `${height}px` }}
            />
          ))}
        </div>

        <p className="admin-card-footnote">
          전일 대비 사용자 유입 증가세가 안정적입니다.
        </p>
      </section>

      <section className="admin-stat-card">
        <div className="admin-card-top">
          <div className="admin-card-label">
            <div className="admin-card-svg-icon">
              <RouteCreateMiniIcon />
            </div>
            <span>새로운 경로 생성</span>
          </div>

          <div className="admin-plus-box">
            <img src={plusIcon} alt="추가" className="admin-plus-icon" />
          </div>
        </div>

        <div className="admin-main-value">
          {formatNumber(dashboardMock.routeCreated)}건
        </div>

        <div className="admin-progress-panel">
          <div className="admin-progress-header">
            <span>오늘 생성된 수치</span>
            <strong>+{formatNumber(dashboardMock.todayCreated)}건</strong>
          </div>

          <div className="admin-progress-track">
            <div
              className="admin-progress-fill"
              style={{ width: `${dashboardMock.weeklyProgress}%` }}
            />
          </div>
        </div>

        <p className="admin-card-footnote">
          주간 목표량의 {dashboardMock.weeklyProgress}%를 달성했습니다.
        </p>
      </section>
    </div>
  );
};

export default AdminMain;