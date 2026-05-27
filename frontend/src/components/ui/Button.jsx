const VARIANTS = {
  primary: "btn--primary",
  secondary: "btn--secondary",
  ghost: "btn--ghost",
  destructive: "btn--destructive",
};

export default function Button({
  children,
  variant = "primary",
  size,
  className = "",
  as: Tag = "button",
  ...props
}) {
  const classes = [
    "btn",
    VARIANTS[variant] || VARIANTS.primary,
    size === "sm" ? "btn--sm" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Tag className={classes} {...props}>
      {children}
    </Tag>
  );
}
