import AppBadge from "./ui/AppBadge.jsx";

export default function ChartSequence({ images, onOpen }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(460px, 100%), 1fr))",
        gap: "var(--space-6)",
        alignItems: "start",
      }}
    >
      {images.map((img, i) => (
        <article
          key={img.src}
          style={{
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-lg)",
            background: "var(--color-surface)",
            padding: "var(--space-5)",
            animationDelay: `${i * 50}ms`,
          }}
          aria-label={img.label}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-3)",
              marginBottom: "var(--space-2)",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--text-h2)",
                fontWeight: 800,
                color: "var(--color-text-subtle)",
                minWidth: "2.4ch",
              }}
              aria-hidden="true"
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <h3
              style={{
                flex: 1,
                margin: 0,
                fontSize: "var(--text-h3)",
                fontWeight: 700,
              }}
            >
              {img.label}
            </h3>
            <AppBadge variant={img.variant}>{img.cat}</AppBadge>
          </div>

          {img.desc && (
            <p
              style={{
                margin: "0 0 var(--space-4)",
                color: "var(--color-text-muted)",
                fontSize: "var(--text-body)",
              }}
            >
              {img.desc}
            </p>
          )}

          <button
            type="button"
            onClick={() => onOpen(img)}
            aria-label={`Ampliar: ${img.label}`}
            style={{
              display: "block",
              width: "100%",
              padding: 0,
              border: "none",
              background: "transparent",
              cursor: "zoom-in",
            }}
          >
            <img
              src={img.src}
              alt={img.label}
              loading="lazy"
              style={{
                display: "block",
                width: "100%",
                margin: "0 auto",
                borderRadius: "var(--radius-md)",
              }}
            />
          </button>
        </article>
      ))}
    </div>
  );
}
