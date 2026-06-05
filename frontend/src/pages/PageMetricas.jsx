import { useEffect, useState, useMemo } from "react";
import { BarChart3 } from "lucide-react";
import PageHeader from "../components/ui/PageHeader.jsx";
import InsightGrid from "../components/ui/InsightGrid.jsx";
import { LoadingCenter } from "../components/ui/LoadingState.jsx";
import { InteractiveListTable } from "../components/ui/interactive-logs-table-shadcnui.jsx";
import {
  mapRegioes,
  mapEgo,
  mapGrausRanking,
} from "../lib/interactive-list-adapters.js";
import { insightsGraus, insightsRegioes } from "../lib/insights.js";
import { REGION_HEX, CHART } from "../constants/theme.js";
import { parseCSV } from "../lib/graphUtils.js";

function DegreeHistogram({ graus }) {
  const [hover, setHover] = useState(null);

  const { bars, binSize, total } = useMemo(() => {
    if (!graus.length) return { bars: [], binSize: 1, total: 0 };
    const degrees = graus.map((g) => parseInt(g.grau)).filter((d) => !isNaN(d));
    const maxDeg = Math.max(...degrees);
    const NUM_BINS = Math.min(14, maxDeg + 1);
    const bs = Math.max(1, Math.ceil(maxDeg / NUM_BINS));
    const bins = {};
    degrees.forEach((d) => {
      const key = Math.floor(d / bs) * bs;
      bins[key] = (bins[key] || 0) + 1;
    });
    const bars = Object.entries(bins)
      .map(([k, v]) => ({ start: parseInt(k), count: v }))
      .sort((a, b) => a.start - b.start);
    return { bars, binSize: bs, total: degrees.length };
  }, [graus]);

  if (!bars.length) return <LoadingCenter label="Aguardando dados do histograma…" />;

  const maxCount = Math.max(...bars.map((b) => b.count));
  const W = 620,
    H = 240,
    PL = 50,
    PT = 20,
    PR = 20,
    PB = 55;
  const plotW = W - PL - PR;
  const plotH = H - PT - PB;
  const barW = Math.max(4, plotW / bars.length - 3);

  const faixa = (b) =>
    binSize > 1 ? `${b.start}–${b.start + binSize - 1}` : `${b.start}`;

  const ativo = hover != null ? bars[hover] : null;

  return (
    <div>
      <div
        aria-live="polite"
        style={{
          minHeight: 22,
          marginBottom: "var(--space-2)",
          fontSize: "var(--text-caption)",
          color: "var(--color-text-muted)",
        }}
      >
        {ativo ? (
          <>
            <strong style={{ color: "var(--color-primary)" }}>{ativo.count}</strong>{" "}
            aeroporto{ativo.count !== 1 ? "s" : ""} com grau{" "}
            <strong style={{ color: "var(--color-text)" }}>{faixa(ativo)}</strong>
            {total > 0 && (
              <> · {((ativo.count / total) * 100).toFixed(0)}% da malha</>
            )}
          </>
        ) : (
          "Passe o mouse sobre uma barra para ver a contagem exata."
        )}
      </div>
      <svg
        width="100%"
        viewBox={`0 0 ${W} ${H}`}
        style={{ fontFamily: "var(--font-body)", overflow: "visible" }}
        role="img"
        aria-label="Histograma da distribuição de graus"
      >
        <defs>
          <linearGradient id="histGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART.accent} />
            <stop offset="100%" stopColor={CHART.primary} />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75, 1.0].map((frac) => {
          const y = PT + (1 - frac) * plotH;
          return (
            <g key={frac}>
              <line x1={PL} y1={y} x2={W - PR} y2={y} stroke={CHART.grid} />
              <text
                x={PL - 6}
                y={y + 4}
                textAnchor="end"
                fontSize={11.5}
                fill={CHART.label}
              >
                {Math.round(frac * maxCount)}
              </text>
            </g>
          );
        })}
        {bars.map((bin, i) => {
          const x = PL + i * (plotW / bars.length);
          const bH = (bin.count / maxCount) * plotH;
          const y = PT + plotH - bH;
          const isHover = hover === i;
          const dim = hover != null && !isHover;
          return (
            <g
              key={bin.start}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: "pointer" }}
            >
              {/* área de hover (cobre toda a coluna p/ facilitar o mouse) */}
              <rect
                x={x}
                y={PT}
                width={plotW / bars.length}
                height={plotH}
                fill="transparent"
              />
              <rect
                x={x + 1}
                y={y}
                width={barW}
                height={bH}
                fill="url(#histGrad)"
                rx={3}
                opacity={dim ? 0.4 : isHover ? 1 : 0.9}
                stroke={isHover ? CHART.primary : "transparent"}
                strokeWidth={isHover ? 1.5 : 0}
                style={{ transition: "opacity 120ms ease" }}
              />
              {bin.count > 0 && (
                <text
                  x={x + barW / 2 + 1}
                  y={y - 4}
                  textAnchor="middle"
                  fontSize={isHover ? 12 : 10}
                  fontWeight={isHover ? 700 : 400}
                  fill={isHover ? CHART.primary : CHART.labelStrong}
                >
                  {bin.count}
                </text>
              )}
              <text
                x={x + barW / 2 + 1}
                y={PT + plotH + 16}
                textAnchor="middle"
                fontSize={11.5}
                fill={isHover ? CHART.labelStrong : CHART.label}
              >
                {faixa(bin)}
              </text>
            </g>
          );
        })}
        <line x1={PL} y1={PT} x2={PL} y2={PT + plotH} stroke={CHART.axis} />
        <line
          x1={PL}
          y1={PT + plotH}
          x2={W - PR}
          y2={PT + plotH}
          stroke={CHART.axis}
        />
        <text
          x={W / 2}
          y={PT + plotH + 40}
          textAnchor="middle"
          fontSize={14}
          fill={CHART.label}
        >
          Grau (número de conexões por aeroporto)
        </text>
        <text
          x={14}
          y={PT + plotH / 2}
          textAnchor="middle"
          fontSize={14}
          fill={CHART.label}
          transform={`rotate(-90, 14, ${PT + plotH / 2})`}
        >
          Frequência
        </text>
      </svg>
    </div>
  );
}

function HubRanking({ graus }) {
  const top = useMemo(() => {
    return [...graus]
      .sort((a, b) => parseInt(b.grau, 10) - parseInt(a.grau, 10))
      .slice(0, 20);
  }, [graus]);

  if (!top.length) return <LoadingCenter label="Carregando hubs…" />;

  const maxGrau = parseInt(top[0]?.grau, 10) || 1;

  return (
    <div className="rank-list">
      {top.map((g, i) => {
        const pct = (parseInt(g.grau, 10) / maxGrau) * 100;
        const isTop = i < 3;
        return (
          <div key={g.aeroporto} className="rank-row">
            <span className={`rank-pos${isTop ? " rank-pos--top" : ""}`}>
              {i + 1}
            </span>
            <span className={`rank-code${isTop ? " rank-code--top" : ""}`}>
              {g.aeroporto}
            </span>
            <div className="rank-bar-track">
              <div
                className="rank-bar-fill"
                style={{ width: `${pct}%` }}
              >
                {pct > 28 ? g.grau : ""}
              </div>
            </div>
            {pct <= 28 && (
              <span
                style={{
                  fontSize: "var(--text-caption)",
                  color: "var(--color-primary)",
                  minWidth: 24,
                  fontFamily: "var(--font-mono)",
                  fontWeight: 600,
                }}
              >
                {g.grau}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function PageMetricas() {
  const [tab, setTab] = useState("regioes");
  const [regioes, setRegioes] = useState([]);
  const [ego, setEgo] = useState([]);
  const [graus, setGraus] = useState([]);

  const grausInsights = useMemo(() => insightsGraus(graus), [graus]);
  const regioesInsights = useMemo(() => insightsRegioes(regioes), [regioes]);

  useEffect(() => {
    fetch("/out/regioes.json")
      .then((r) => r.json())
      .then((j) => setRegioes(Array.isArray(j) ? j : j.regioes ?? []));
    fetch("/out/ego_aeroportos.csv")
      .then((r) => r.text())
      .then((t) => setEgo(parseCSV(t)));
    fetch("/out/graus.csv")
      .then((r) => r.text())
      .then((t) => setGraus(parseCSV(t)));
  }, []);

  const TABS = [
    { id: "regioes", label: "Por Região" },
    { id: "ego", label: "Ego-redes" },
    { id: "ranking", label: "Ranking" },
    { id: "hubs", label: "Top Hubs" },
    { id: "distribuicao", label: "Distribuição" },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Análise estrutural"
        title="Métricas do Grafo"
        subtitle="Análise estrutural completa da rede de aeroportos — regiões, ego-redes, conectividade e distribuição de graus."
      />

      <div className="tabs" role="tablist" aria-label="Seções de métricas">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`tab-btn${tab === t.id ? " tab-btn--active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "regioes" && (
        <section className="section">
          <h2 className="section-title">
            <BarChart3 size={18} strokeWidth={1.75} aria-hidden="true" />
            Subgrafos Regionais
          </h2>

          {regioes.length === 0 ? (
            <LoadingCenter label="Carregando métricas regionais…" />
          ) : (
            <>
              <div className="region-grid">
                {regioes.map((r, i) => {
                  const color = REGION_HEX[r.regiao] || CHART.primary;
                  return (
                    <div
                      key={i}
                      className="region-card"
                      style={{ "--region-color": color }}
                    >
                      <div className="region-card-name">{r.regiao}</div>
                      <div className="region-card-stats">
                        <div>
                          <div className="region-stat-value">{r.ordem}</div>
                          <div className="region-stat-label">vértices</div>
                        </div>
                        <div>
                          <div className="region-stat-value">{r.tamanho}</div>
                          <div className="region-stat-label">arestas</div>
                        </div>
                        <div>
                          <div className="region-stat-value">
                            {parseFloat(r.densidade).toFixed(3)}
                          </div>
                          <div className="region-stat-label">dens.</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <InteractiveListTable
                title="Tabela regional"
                items={mapRegioes(regioes)}
                searchPlaceholder="Buscar por região, ordem ou densidade…"
                filterLabels={{ level: "Região" }}
              />

              {regioesInsights.length > 0 && (
                <div style={{ marginTop: "var(--space-6)" }}>
                  <InsightGrid insights={regioesInsights} />
                </div>
              )}
            </>
          )}
        </section>
      )}

      {tab === "ego" && (
        <section className="section">
          <h2 className="section-title">Ego-redes por Aeroporto</h2>
          <p className="section-lead">
            Ego-rede = aeroporto + seus vizinhos diretos. Mede a conectividade local de cada nó.
          </p>
          {ego.length === 0 ? (
            <LoadingCenter />
          ) : (
            <InteractiveListTable
              title="Ego-redes por aeroporto"
              items={mapEgo(ego)}
              searchPlaceholder="Buscar aeroporto ou métricas de ego…"
              filterLabels={{
                level: "Faixa de grau",
                service: "Aeroporto",
              }}
            />
          )}
        </section>
      )}

      {tab === "ranking" && (
        <section className="section">
          <h2 className="section-title">Ranking de Conectividade</h2>
          <p className="section-lead">
            Aeroportos com maior grau são os hubs centrais da malha — ponto focal segundo a Gestalt.
          </p>
          {graus.length === 0 ? (
            <LoadingCenter />
          ) : (
            <InteractiveListTable
              title="Top 15 — conectividade"
              items={mapGrausRanking(graus, 15)}
              searchPlaceholder="Buscar aeroporto no ranking…"
              filterLabels={{
                level: "Faixa de grau",
                service: "Aeroporto",
              }}
            />
          )}
        </section>
      )}

      {tab === "hubs" && (
        <section className="section">
          <h2 className="section-title">
            <BarChart3 size={18} strokeWidth={1.75} aria-hidden="true" />
            Top 20 — Hubs por Conectividade
          </h2>
          <p className="section-lead">
            Aeroportos ordenados pelo número de conexões diretas (grau). Hubs com grau elevado
            concentram a maior parte das rotas na malha — padrão típico de redes{" "}
            <strong>livre de escala</strong>. Posições 1–3 destacadas em âmbar (Gestalt — figura-fundo).
          </p>
          {graus.length === 0 ? (
            <LoadingCenter />
          ) : (
            <HubRanking graus={graus} />
          )}
        </section>
      )}

      {tab === "distribuicao" && (
        <section className="section">
          <h2 className="section-title">
            <BarChart3 size={18} strokeWidth={1.75} aria-hidden="true" />
            Distribuição de Graus
          </h2>
          <p className="section-lead">
            Quantos aeroportos possuem cada grau de conectividade. O gráfico é interativo:
            passe o mouse sobre uma barra para ver a contagem exata e a fração da malha.
          </p>
          <DegreeHistogram graus={graus} />
          {grausInsights.length > 0 && (
            <div style={{ marginTop: "var(--space-6)" }}>
              <InsightGrid insights={grausInsights} />
            </div>
          )}
        </section>
      )}
    </>
  );
}
