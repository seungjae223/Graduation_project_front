import "./LoadingSkeleton.css";

export function SkeletonStatus({ label, children, className }) {
  return (
    <div className={className} data-route-loader="" role="status" aria-label={label}>
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

export function DestinationCardSkeletons() {
  return (
    <div className="destination-card-skeletons">
      {[1, 2].map(card => (
        <div className="destination-card-skeleton" key={card}>
          <span className="skeleton-fill destination-card-skeleton-title" />
          <span className="skeleton-fill destination-card-skeleton-caption" />
        </div>
      ))}
    </div>
  );
}

export default function RecommendationPageSkeleton() {
  return (
    <SkeletonStatus label="추천 화면 로딩" className="page-skeleton page-skeleton--recommend">
      <span className="skeleton-fill page-skeleton-title" />
      <div className="page-skeleton-tabs">
        <span className="skeleton-fill" />
        <span className="skeleton-fill" />
      </div>
      <SkeletonChips />
      <DestinationCardSkeletons />
    </SkeletonStatus>
  );
}
