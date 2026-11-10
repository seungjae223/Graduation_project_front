import "./LoadingSkeleton.css";

export function SkeletonStatus({ label, children, className }) {
  return (
    <div className={className} role="status" aria-label={label}>
      <span className="skeleton-status-label">{label}</span>
      <div aria-hidden="true">{children}</div>
    </div>
  );
}

export function SkeletonChips() {
  return (
    <div className="skeleton-chips">
      <span className="skeleton-fill" />
      <span className="skeleton-fill" />
      <span className="skeleton-fill" />
    </div>
  );
}

export function SkeletonCards({ kind }) {
  return (
    <div className={`skeleton-cards skeleton-cards--${kind}`}>
      {[1, 2].map(card => (
        <div className="skeleton-card" key={card}>
          <div className="skeleton-card-media"><span className="skeleton-fill" /></div>
          <div className="skeleton-card-copy">
            <span className="skeleton-fill skeleton-card-title" />
            <span className="skeleton-fill skeleton-card-caption" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonProgress({ label }) {
  return (
    <SkeletonStatus label={label} className="skeleton-progress">
      <span className="skeleton-fill" />
    </SkeletonStatus>
  );
}

export default function PageSkeleton({ page }) {
  const labels = { recommend: "추천", schedule: "일정" };
  return (
    <SkeletonStatus label={`${labels[page]} 화면 로딩`} className={`page-skeleton page-skeleton--${page}`}>
      <span className="skeleton-fill page-skeleton-title" />
      {page === "recommend" && <>
        <div className="page-skeleton-tabs">
          <span className="skeleton-fill" />
          <span className="skeleton-fill" />
        </div>
        <SkeletonChips />
        <SkeletonCards kind="cover" />
      </>}
      {page === "schedule" && <>
        <span className="skeleton-fill page-skeleton-create" />
        <span className="skeleton-fill page-skeleton-caption" />
        <span className="skeleton-fill page-skeleton-section-title" />
        <SkeletonCards kind="ticket" />
      </>}
    </SkeletonStatus>
  );
}
