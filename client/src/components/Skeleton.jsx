/** Shimmering placeholder rows, for a table that's still loading instead of bare "Loading…" text. */
export function SkeletonRows({ rows = 4, cols = 4 }) {
  return (
    <div className="skeleton-rows" aria-hidden="true">
      {Array.from({ length: rows }).map((_, r) => (
        <div className="skeleton-row" key={r}>
          {Array.from({ length: cols }).map((_, c) => (
            <span className="skeleton-cell" key={c} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Shimmering placeholder cards, for a card grid that's still loading. */
export function SkeletonCards({ count = 4 }) {
  return (
    <div className="skeleton-cards" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div className="skeleton-card" key={i}>
          <span className="skeleton-circle" />
          <span className="skeleton-line" style={{ width: "55%" }} />
          <span className="skeleton-line" style={{ width: "85%" }} />
        </div>
      ))}
    </div>
  );
}
