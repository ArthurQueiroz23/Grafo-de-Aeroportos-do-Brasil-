import { useEffect, useState, useMemo } from "react";
import { Route, ArrowRight, GitCompare, MapPin, Flag } from "lucide-react";
import GrafoVis from "../components/GrafoVis.jsx";
import PageHeader from "../components/ui/PageHeader.jsx";

function parseAdjCSV(text) {
  const lines = text.trim().split("\n").slice(1);
  return lines.map((line) => {
    const parts = line.split(",");
    return {
      origem: parts[0].trim(),
      destino: parts[1].trim(),
      peso: parts[parts.length - 1].trim(),
    };
  });
}

function buildGraph(rows) {
  const g = {};
  for (const { origem, destino, peso } of rows) {
    const w = parseFloat(peso) || 1;
    if (!g[origem]) g[origem] = {};
    if (!g[destino]) g[destino] = {};
    g[origem][destino] = w;
    g[destino][origem] = w;
  }
  return g;
}

function dijkstra(graph, start, end) {
  const dist = {};
  const prev = {};
  const visited = new Set();
  for (const n of Object.keys(graph)) dist[n] = Infinity;
  dist[start] = 0;
  const pq = [[0, start]];
  while (pq.length > 0) {
    pq.sort((a, b) => a[0] - b[0]);
    const [d, u] = pq.shift();
    if (visited.has(u)) continue;
    visited.add(u);
    if (u === end) break;
    for (const [v, w] of Object.entries(graph[u] || {})) {
      const nd = d + w;
      if (nd < dist[v]) { dist[v] = nd; prev[v] = u; pq.push([nd, v]); }
    }
  }
  if (dist[end] === Infinity) return { cost: Infinity, path: [] };
  const path = [];
  let cur = end;
  while (cur !== undefined) { path.unshift(cur); cur = prev[cur]; }
  return { cost: dist[end], path };
}

function bellmanFord(graph, start, end) {
  const nodes = Object.keys(graph);
  const dist = {};
  const prev = {};
  for (const n of nodes) dist[n] = Infinity;
  dist[start] = 0;
  for (let i = 0; i < nodes.length - 1; i++) {
    let updated = false;
    for (const u of nodes) {
      if (dist[u] === Infinity) continue;
      for (const [v, w] of Object.entries(graph[u] || {})) {
        const nd = dist[u] + w;
        if (nd < dist[v]) { dist[v] = nd; prev[v] = u; updated = true; }
      }
    }
    if (!updated) break;
  }
  if (dist[end] === Infinity) return { cost: Infinity, path: [] };
  const path = [];
  let cur = end;
  while (cur !== undefined) { path.unshift(cur); cur = prev[cur]; }
  return { cost: dist[end], path };
}

const ALGOS = [
  { id: "dijkstra", label: "Dijkstra" },
  { id: "bellman-ford", label: "Bellman-Ford" },
  { id: "comparar", label: "Comparar" },
];

/* ── PathDisplay — rich full-path display ───────────────────── */
function PathDisplay({ path, color, label }) {
  if (!path || path.length === 0) return null;
  const hops = path.length - 1;
  const intermediaries = Math.max(0, path.length - 2);

  return (
    <div className="path-display-block">
      {/* meta row */}
      <div className="path-display-meta">
        <span className="path-meta-chip">
          <MapPin size={11} aria-hidden="true" />
          {path[0]}
        </span>
        <span className="path-meta-sep">→</span>
        <span className="path-meta-chip path-meta-chip--dest">
          <Flag size={11} aria-hidden="true" />
          {path[path.length - 1]}
        </span>
        <span className="path-meta-stat">{hops} salto{hops !== 1 ? "s" : ""}</span>
        {intermediaries > 0 && (
          <span className="path-meta-stat">
            {intermediaries} intermediário{intermediaries !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* full path */}
      <div
        className="result-path"
        aria-live="polite"
        style={color ? { borderLeftColor: color } : undefined}
      >
        {path.map((node, i) => (
          <span key={`${node}-${i}`}>
            <strong
              style={{
                color:
                  i === 0
                    ? "var(--color-primary)"
                    : i === path.length - 1
                      ? "var(--color-accent)"
                      : "var(--color-text)",
                fontSize: i === 0 || i === path.length - 1 ? "1.05em" : undefined,
              }}
            >
              {node}
            </strong>
            {i < path.length - 1 && (
              <span className="result-path-arrow">→</span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

function AlgoLabel({ label, color }) {
  return (
    <div
      style={{
        fontSize: "var(--text-caption)",
        fontWeight: 700,
        color,
        textTransform: "uppercase",
        letterSpacing: "var(--tracking-wide)",
        marginBottom: "var(--space-3)",
      }}
    >
      {label}
    </div>
  );
}

export default function PageCalculadora() {
  const [adjRows, setAdjRows] = useState([]);
  const [airports, setAirports] = useState([]);
  const [origem, setOrigem] = useState("REC");
  const [destino, setDestino] = useState("POA");
  const [regionMap, setRegionMap] = useState({});
  const [grauMap, setGrauMap] = useState({});
  const [algo, setAlgo] = useState("dijkstra");

  useEffect(() => {
    fetch("/data/adjacencias_aeroportos.csv")
      .then((r) => r.text())
      .then((t) => setAdjRows(parseAdjCSV(t)));

    Promise.all([
      fetch("/data/aeroportos_data.csv").then((r) => r.text()),
      fetch("/out/graus.csv").then((r) => r.text()),
    ]).then(([aerText, grausText]) => {
      const aerLines = aerText.trim().split("\n").slice(1);
      const rMap = {};
      aerLines.forEach((l) => {
        const parts = l.split(",");
        if (parts[0] && parts[2]) rMap[parts[0].trim()] = parts[2].trim();
      });
      setRegionMap(rMap);
      setAirports(aerLines.map((l) => ({ id: l.split(",")[0].trim() })));

      const grausLines = grausText.trim().split("\n").slice(1);
      const gMap = {};
      grausLines.forEach((l) => {
        const parts = l.split(",");
        if (parts[0] && parts[1]) gMap[parts[0].trim()] = parseInt(parts[1].trim()) || 1;
      });
      setGrauMap(gMap);
    });
  }, []);

  const graph = useMemo(() => buildGraph(adjRows), [adjRows]);
  const vertices = useMemo(() => Object.keys(graph).sort(), [graph]);
  const edges = useMemo(
    () => adjRows.map((r) => ({ from: r.origem, to: r.destino, weight: parseFloat(r.peso) || 1 })),
    [adjRows]
  );

  const resultadoDijkstra = useMemo(() => {
    if (!graph[origem] || !graph[destino] || origem === destino) return null;
    return dijkstra(graph, origem, destino);
  }, [graph, origem, destino]);

  const resultadoBF = useMemo(() => {
    if (!graph[origem] || !graph[destino] || origem === destino) return null;
    return bellmanFord(graph, origem, destino);
  }, [graph, origem, destino]);

  const resultado = algo === "bellman-ford" ? resultadoBF : resultadoDijkstra;

  const highlightPath = useMemo(() => {
    if (algo === "bellman-ford") return resultadoBF?.path ?? [];
    return resultadoDijkstra?.path ?? [];
  }, [algo, resultadoDijkstra, resultadoBF]);

  const igual = origem === destino;
  const semCaminho = !igual && resultado && resultado.path.length === 0;
  const temCaminho = !igual && resultado && resultado.path.length > 0;
  const temComparacao =
    algo === "comparar" &&
    resultadoDijkstra?.path.length > 0 &&
    resultadoBF?.path.length > 0;
  const costasIguais =
    temComparacao &&
    Math.abs(resultadoDijkstra.cost - resultadoBF.cost) < 1e-9;

  return (
    <>
      <PageHeader
        eyebrow="Algoritmos em grafos"
        title="Calculadora de Rotas"
        subtitle="Calcula o menor caminho entre aeroportos usando Dijkstra ou Bellman-Ford, exibindo a rota completa com todos os nós intermediários e número de saltos."
      />

      <section className="section">
        <h2 className="section-title">
          <Route size={18} strokeWidth={1.75} aria-hidden="true" />
          Selecionar rota
        </h2>

        <div className="tabs" role="tablist" aria-label="Algoritmo de roteamento" style={{ marginBottom: "var(--space-5)" }}>
          {ALGOS.map((a) => (
            <button
              key={a.id}
              type="button"
              role="tab"
              aria-selected={algo === a.id}
              className={`tab-btn${algo === a.id ? " tab-btn--active" : ""}`}
              onClick={() => setAlgo(a.id)}
            >
              {a.id === "comparar" && (
                <GitCompare size={12} style={{ marginRight: 4 }} aria-hidden="true" />
              )}
              {a.label}
            </button>
          ))}
        </div>

        <div className="form-row">
          <div className="form-field">
            <label className="form-label" htmlFor="calc-origem">Origem</label>
            <select
              id="calc-origem"
              className="ctrl-input ctrl-select"
              style={{ minWidth: 140 }}
              value={origem}
              onChange={(e) => setOrigem(e.target.value)}
            >
              {vertices.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          <div
            style={{ display: "flex", alignItems: "center", paddingBottom: "var(--space-1)", color: "var(--color-text-subtle)" }}
            aria-hidden="true"
          >
            <ArrowRight size={22} strokeWidth={1.5} />
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="calc-destino">Destino</label>
            <select
              id="calc-destino"
              className="ctrl-input ctrl-select"
              style={{ minWidth: 140 }}
              value={destino}
              onChange={(e) => setDestino(e.target.value)}
            >
              {vertices.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
        </div>

        {igual && (
          <div className="alert alert--warning" role="alert" style={{ marginTop: "var(--space-4)" }}>
            Origem e destino são iguais. Selecione aeroportos diferentes.
          </div>
        )}

        {semCaminho && (
          <div className="alert alert--error" role="alert" style={{ marginTop: "var(--space-4)" }}>
            Não existe caminho entre <strong>{origem}</strong> e{" "}
            <strong>{destino}</strong> na malha atual.
          </div>
        )}

        {/* Single algorithm result */}
        {temCaminho && algo !== "comparar" && (
          <>
            <div className="kpi-grid" style={{ marginTop: "var(--space-6)" }}>
              <div className="kpi-card">
                <div className="kpi-label">Custo total</div>
                <div className="kpi-value">{resultado.cost.toFixed(1)}</div>
                <div className="kpi-unit">peso acumulado</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label">Saltos</div>
                <div className="kpi-value">{resultado.path.length - 1}</div>
                <div className="kpi-unit">arestas percorridas</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label">Intermediários</div>
                <div className="kpi-value">{Math.max(0, resultado.path.length - 2)}</div>
                <div className="kpi-unit">nós de passagem</div>
              </div>
            </div>
            <PathDisplay path={resultado.path} />
          </>
        )}

        {/* Comparison mode */}
        {temComparacao && (
          <>
            <div className="two-col" style={{ marginTop: "var(--space-6)" }}>
              <div>
                <AlgoLabel label="Dijkstra" color="var(--color-primary)" />
                <div className="kpi-grid">
                  <div className="kpi-card">
                    <div className="kpi-label">Custo total</div>
                    <div className="kpi-value">{resultadoDijkstra.cost.toFixed(1)}</div>
                    <div className="kpi-unit">peso acumulado</div>
                  </div>
                  <div className="kpi-card">
                    <div className="kpi-label">Saltos</div>
                    <div className="kpi-value">{resultadoDijkstra.path.length - 1}</div>
                    <div className="kpi-unit">arestas</div>
                  </div>
                </div>
                <PathDisplay path={resultadoDijkstra.path} />
              </div>

              <div>
                <AlgoLabel label="Bellman-Ford" color="var(--color-accent)" />
                <div className="kpi-grid">
                  <div className="kpi-card">
                    <div className="kpi-label">Custo total</div>
                    <div className="kpi-value">{resultadoBF.cost.toFixed(1)}</div>
                    <div className="kpi-unit">peso acumulado</div>
                  </div>
                  <div className="kpi-card">
                    <div className="kpi-label">Saltos</div>
                    <div className="kpi-value">{resultadoBF.path.length - 1}</div>
                    <div className="kpi-unit">arestas</div>
                  </div>
                </div>
                <PathDisplay path={resultadoBF.path} color="var(--color-accent)" />
              </div>
            </div>

            <div className="insight-box">
              Dijkstra e Bellman-Ford produziram{" "}
              <strong style={{ color: costasIguais ? "var(--color-success)" : "var(--color-danger)" }}>
                {costasIguais ? "resultados idênticos" : "resultados diferentes"}
              </strong>{" "}
              — custo{" "}
              <strong style={{ color: "var(--color-primary)" }}>
                {resultadoDijkstra.cost.toFixed(1)}
              </strong>{" "}
              em <strong>{resultadoDijkstra.path.length - 1}</strong> saltos. Em
              grafos sem pesos negativos, ambos garantem o caminho mínimo; o grafo
              abaixo destaca a rota{" "}
              <span style={{ color: "var(--color-primary)" }}>Dijkstra</span>.
            </div>
          </>
        )}
      </section>

      {airports.length > 0 && edges.length > 0 && (
        <section className="section">
          <h2 className="section-title">
            Grafo interativo
            {(temCaminho || temComparacao) && (
              <span className="section-title-hint">
                — arestas âmbar ={" "}
                {algo === "comparar"
                  ? "rota Dijkstra"
                  : `rota ${ALGOS.find((a) => a.id === algo)?.label}`}
              </span>
            )}
          </h2>
          <GrafoVis
            airports={airports}
            edges={edges}
            highlightPath={highlightPath}
            regionMap={regionMap}
            grauMap={grauMap}
          />
        </section>
      )}
    </>
  );
}
