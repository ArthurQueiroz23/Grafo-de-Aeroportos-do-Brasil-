import { Lightbulb } from "lucide-react";

const TONE_COLOR = {
  primary: "var(--color-primary)",
  accent: "var(--color-accent)",
  neutral: "var(--region-sudeste)",
};

/**
 * Renderiza uma lista de insights (objetos { tone, title, text }) reutilizando
 * o estilo de "callout" já existente, para manter a identidade visual.
 */
export default function InsightGrid({ insights }) {
  if (!insights?.length) return null;

  return (
    <div className="callout-grid">
      {insights.map((it, i) => (
        <div
          key={i}
          className="callout"
          style={{ "--callout-color": TONE_COLOR[it.tone] || "var(--color-primary)" }}
        >
          <div
            className="callout-title"
            style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}
          >
            <Lightbulb size={14} strokeWidth={2} aria-hidden="true" />
            {it.title}
          </div>
          <div className="callout-desc">{it.text}</div>
        </div>
      ))}
    </div>
  );
}
