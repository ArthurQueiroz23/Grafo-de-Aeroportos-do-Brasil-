import { useEffect, useState } from "react";

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
    { id: "regioes", label: "Por Região" },
    { id: "ego",     label: "Ego-redes" },
    { id: "ranking", label: "Ranking" },
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
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
            {graus.slice(0, 10).map((g, i) => {
              const grau = parseInt(g.grau);
              const pct = (grau / maxGrau) * 100;
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <span style={{
                    width: 10,
                    textAlign: "right",
                    fontSize: 11,
                    color: "var(--muted)",
                    fontWeight: 700,
                  }}>
                    {i + 1}
                  </span>
                  <span style={{
                    width: 38,
                    fontSize: 12,
                    color: "var(--text)",
                    fontFamily: "monospace",
                    fontWeight: 700,
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
    </div>
  );
}
