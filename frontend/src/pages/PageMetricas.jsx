import { useEffect, useState, useMemo } from "react";

function DegreeHistogram({ graus }) {
  const data = useMemo(() => {
    if (!graus.length) return [];
    const degrees = graus.map((g) => parseInt(g.grau)).filter((d) => !isNaN(d));
    const maxDeg = Math.max(...degrees);
    const NUM_BINS = Math.min(14, maxDeg + 1);
    const binSize = Math.max(1, Math.ceil(maxDeg / NUM_BINS));
    const bins = {};
    degrees.forEach((d) => {
      const key = Math.floor(d / binSize) * binSize;
      bins[key] = (bins[key] || 0) + 1;
    });
    return Object.entries(bins)
      .map(([k, v]) => ({ start: parseInt(k), count: v }))
      .sort((a, b) => a.start - b.start);
  }, [graus]);

  if (!data.length) return <div style={{ color: "var(--muted)", fontSize: 12 }}>Aguardando dados…</div>;

  const maxCount = Math.max(...data.map((b) => b.count));
  const W = 620, H = 240, PL = 50, PT = 20, PR = 20, PB = 55;
  const plotW = W - PL - PR;
  const plotH = H - PT - PB;
  const barW = Math.max(4, plotW / data.length - 3);

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ fontFamily: "Segoe UI, sans-serif", overflow: "visible" }}>
      <defs>
        <linearGradient id="histGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4da3ff" />
          <stop offset="100%" stopColor="#7c5cff" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75, 1.0].map((frac) => {
        const y = PT + (1 - frac) * plotH;
        return (
          <g key={frac}>
            <line x1={PL} y1={y} x2={W - PR} y2={y} stroke="rgba(255,255,255,0.06)" />
            <text x={PL - 6} y={y + 4} textAnchor="end" fontSize={10} fill="rgba(221,232,245,0.4)">
              {Math.round(frac * maxCount)}
            </text>
          </g>
        );
      })}
      {data.map((bin, i) => {
        const x = PL + i * (plotW / data.length);
        const bH = (bin.count / maxCount) * plotH;
        const y = PT + plotH - bH;
        return (
          <g key={bin.start}>
            <rect x={x + 1} y={y} width={barW} height={bH} fill="url(#histGrad)" rx={3} opacity={0.88} />
            {bin.count > 0 && (
              <text x={x + barW / 2 + 1} y={y - 4} textAnchor="middle" fontSize={10} fill="rgba(221,232,245,0.65)">
                {bin.count}
              </text>
            )}
            <text x={x + barW / 2 + 1} y={PT + plotH + 16} textAnchor="middle" fontSize={10} fill="rgba(221,232,245,0.45)">
              {bin.start}
            </text>
          </g>
        );
      })}
      <line x1={PL} y1={PT} x2={PL} y2={PT + plotH} stroke="rgba(255,255,255,0.15)" />
      <line x1={PL} y1={PT + plotH} x2={W - PR} y2={PT + plotH} stroke="rgba(255,255,255,0.15)" />
      <text x={W / 2} y={PT + plotH + 40} textAnchor="middle" fontSize={12} fill="rgba(221,232,245,0.55)">
        Grau (número de conexões por aeroporto)
      </text>
      <text x={14} y={PT + plotH / 2} textAnchor="middle" fontSize={12} fill="rgba(221,232,245,0.55)"
        transform={`rotate(-90, 14, ${PT + plotH / 2})`}>
        Frequência
      </text>
    </svg>
  );
}

function parseCSV(text) {
  const [header, ...lines] = text.trim().split("\n");
  const keys = header.split(",");
  return lines.map((l) => {
    const vals = l.split(",");
    const obj = {};
    keys.forEach((k, i) => { obj[k.trim()] = vals[i] ? vals[i].trim() : ""; });
    return obj;
  });
}

const REGION_COLOR = {
  Norte: "#7c5cff",
  Nordeste: "#4da3ff",
  "Centro-Oeste": "#f5c542",
  Sudeste: "#2ecc71",
  Sul: "#e74c3c",
};

export default function PageMetricas() {
  const [tab, setTab] = useState("regioes");
  const [regioes, setRegioes] = useState([]);
  const [ego, setEgo] = useState([]);
  const [graus, setGraus] = useState([]);

  useEffect(() => {
    fetch("/out/regioes.json").then((r) => r.json()).then(setRegioes);
    fetch("/out/ego_aeroportos.csv").then((r) => r.text()).then((t) => setEgo(parseCSV(t)));
    fetch("/out/graus.csv").then((r) => r.text()).then((t) => setGraus(parseCSV(t)));
  }, []);

  const maxGrau = graus.length > 0 ? Math.max(...graus.map((g) => parseInt(g.grau))) : 1;

  const TABS = [
    { id: "regioes",      label: "Por Região" },
    { id: "ego",          label: "Ego-redes" },
    { id: "ranking",      label: "Ranking" },
    { id: "distribuicao", label: "Distribuição" },
  ];

  return (
    <div>
      <div className="page-title">Métricas do Grafo</div>
      <div className="page-subtitle">Análise estrutural completa da rede de aeroportos</div>

      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab-btn${tab === t.id ? " tab-active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "regioes" && (
        <div className="section">
          <div className="section-title">Subgrafos Regionais</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, marginBottom: 24 }}>
            {regioes.map((r, i) => {
              const color = REGION_COLOR[r.regiao] || "#4da3ff";
              return (
                <div key={i} style={{
                  background: "rgba(255,255,255,0.03)",
                  border: `1px solid ${color}30`,
                  borderTop: `3px solid ${color}`,
                  borderRadius: 12,
                  padding: "16px 18px",
                }}>
                  <div style={{ fontSize: 12, color, fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.6px" }}>
                    {r.regiao}
                  </div>
                  <div style={{ display: "flex", gap: 18 }}>
                    <div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text)" }}>{r.ordem}</div>
                      <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>vértices</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text)" }}>{r.tamanho}</div>
                      <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>arestas</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text)" }}>
                        {parseFloat(r.densidade).toFixed(3)}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>dens.</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <table>
            <thead>
              <tr>
                <th>Região</th>
                <th>Ordem (vértices)</th>
                <th>Tamanho (arestas)</th>
                <th>Densidade</th>
              </tr>
            </thead>
            <tbody>
              {regioes.map((r, i) => (
                <tr key={i}>
                  <td>
                    <span
                      className="badge"
                      style={{
                        background: `${REGION_COLOR[r.regiao] || "#4da3ff"}20`,
                        color: REGION_COLOR[r.regiao] || "#4da3ff",
                        border: `1px solid ${REGION_COLOR[r.regiao] || "#4da3ff"}30`,
                      }}
                    >
                      {r.regiao}
                    </span>
                  </td>
                  <td>{r.ordem}</td>
                  <td>{r.tamanho}</td>
                  <td>{parseFloat(r.densidade).toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "ego" && (
        <div className="section">
          <div className="section-title">Ego-redes por Aeroporto</div>
          <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 16 }}>
            Ego-rede = aeroporto + seus vizinhos diretos. Mede a conectividade local de cada nó.
          </p>
          <table>
            <thead>
              <tr>
                <th>Aeroporto</th>
                <th>Grau</th>
                <th>Ordem Ego</th>
                <th>Tamanho Ego</th>
                <th>Densidade Ego</th>
              </tr>
            </thead>
            <tbody>
              {ego.map((r, i) => (
                <tr key={i}>
                  <td><span className="badge badge-blue">{r.aeroporto}</span></td>
                  <td style={{ fontWeight: 700, color: "var(--blue)" }}>{r.grau}</td>
                  <td>{r.ordem_ego}</td>
                  <td>{r.tamanho_ego}</td>
                  <td>{parseFloat(r.densidade_ego).toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "ranking" && (
        <div className="section">
          <div className="section-title">Ranking de Conectividade</div>
          <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14 }}>
            Aeroportos com maior grau são os hubs centrais da malha — ponto focal segundo a Gestalt.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
            {graus.slice(0, 15).map((g, i) => {
              const grau = parseInt(g.grau);
              const pct = (grau / maxGrau) * 100;
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <span style={{
                    width: 18,
                    textAlign: "right",
                    fontSize: 11,
                    color: i < 3 ? "var(--gold)" : "var(--muted)",
                    fontWeight: 700,
                  }}>
                    {i + 1}
                  </span>
                  <span style={{
                    width: 38,
                    fontSize: 12,
                    color: i < 3 ? "var(--text)" : "var(--muted)",
                    fontFamily: "monospace",
                    fontWeight: i < 3 ? 700 : 500,
                  }}>
                    {g.aeroporto}
                  </span>
                  <div className="rank-bar-track">
                    <div className="rank-bar-fill" style={{ width: `${pct}%` }}>
                      {grau}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "distribuicao" && (
        <div className="section">
          <div className="section-title">Distribuição de Graus — Visão Exploratória</div>
          <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4, lineHeight: 1.6 }}>
            Histograma da distribuição de graus da rede. A concentração de nós com baixo grau e poucos
            hubs com grau elevado é característica de redes <strong style={{ color: "var(--blue)" }}>livre de escala</strong>.
            Barras agrupadas por proximidade seguindo a <em>Lei da Proximidade</em> (Gestalt).
          </p>
          <p style={{ fontSize: 11, color: "var(--muted)", marginBottom: 20, lineHeight: 1.5 }}>
            Insight: a maioria dos aeroportos tem poucas conexões diretas, enquanto GRU, CGH e GIG
            concentram a maior parte das rotas — padrão típico de hub-and-spoke.
          </p>
          <DegreeHistogram graus={graus} />
        </div>
      )}
    </div>
  );
}
