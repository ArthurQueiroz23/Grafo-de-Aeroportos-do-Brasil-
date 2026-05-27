const VARIANTS = {
  primary: "badge--primary",
  accent: "badge--accent",
  success: "badge--success",
  danger: "badge--danger",
  neutral: "badge--neutral",
};

export default function AppBadge({ children, variant = "primary", style, className = "" }) {
  return (
    <span
      className={`badge ${VARIANTS[variant] || ""} ${className}`.trim()}
      style={style}
    >
      {children}
    </span>
  );
}
