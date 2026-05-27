export function LoadingCenter({ label = "Carregando dados…" }) {
  return (
    <div className="loading-center" role="status" aria-live="polite">
      <div className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function SkeletonGraph() {
  return <div className="skeleton skeleton--graph" aria-hidden="true" />;
}

export function SkeletonKpiGrid({ count = 5 }) {
  return (
    <div className="skeleton-grid" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton skeleton--kpi" />
      ))}
    </div>
  );
}
