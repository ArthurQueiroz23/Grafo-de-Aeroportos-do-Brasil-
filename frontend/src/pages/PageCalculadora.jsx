import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import {
  Route,
  ArrowRight,
  GitCompare,
  MapPin,
  Flag,
  History,
  Download,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Zap,
} from "lucide-react";
import GrafoVis from "../components/GrafoVis.jsx";
import PageHeader from "../components/ui/PageHeader.jsx";
import { dijkstra, bellmanFord, bfs, dfs, buildGraph } from "../lib/graphUtils.js";

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

const ALGOS = [
  { id: "dijkstra",     label: "Dijkstra" },
  { id: "bellman-ford", label: "Bellman-Ford" },
  { id: "bfs",          label: "BFS" },
  { id: "dfs",          label: "DFS" },
  { id: "comparar",     label: "Comparar" },
];

const ALGO_NOTES = {
  bfs: "BFS percorre por camadas, garantindo o menor número de escalas — mas não necessariamente o menor peso total.",
  dfs: "DFS explora em profundidade antes de retroceder — encontra um caminho possível, não o mais curto.",
};

// ── Histórico de pesquisas (localStorage) ──────────────────────────────────────
function useRouteHistory() {
  const STORAGE_KEY = "grafo-route-history";

  const [history, setHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  });

  const push = useCallback((entry) => {
    setHistory((prev) => {
      const next = [{ ...entry, ts: Date.now() }, ...prev].slice(0, 12);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { history, push, clear };
}

function formatTime(ts) {
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

// ── Exportação ─────────────────────────────────────────────────────────────────
function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportJSON({ origem, destino, algo, path, steps, cost }) {
  const payload = {
    origem,
    destino,
    algoritmo: algo,
    caminho: path,
    custo_total: parseFloat(cost.toFixed(2)),
    saltos: path.length - 1,
    intermediarios: Math.max(0, path.length - 2),
    passos: steps.map((s, i) => ({
      passo: i + 1,
      de: s.from,
      para: s.to,
      peso_aresta: parseFloat(s.edgeWeight.toFixed(2)),
      acumulado: parseFloat(s.accumulated.toFixed(2)),
    })),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  triggerDownload(blob, `rota-${origem}-${destino}.json`);
}

function exportCSV({ origem, destino, steps }) {
  const header = "passo,de,para,peso_aresta,acumulado\n";
  const rows = steps
    .map((s, i) => `${i + 1},${s.from},${s.to},${s.edgeWeight.toFixed(2)},${s.accumulated.toFixed(2)}`)
    .join("\n");
  const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, `rota-${origem}-${destino}.csv`);
}

// ── Exibição passo a passo ────────────────────────────────────────────────────
function PathDisplay({ path, steps, color, compact = false }) {
  if (!path || path.length === 0) return null;

  const hops = path.length - 1;
  const intermediaries = Math.max(0, path.length - 2);

  return (
    <div className="path-display-block">
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
        <span className="path-meta-stat">
          {hops} salto{hops !== 1 ? "s" : ""}
        </span>
        {intermediaries > 0 && (
          <span className="path-meta-stat">
            {intermediaries} intermediário{intermediaries !== 1 ? "s" : ""}
          </span>
        )}
      </div>

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

      {!compact && steps && steps.length > 0 && (
        <div className="path-steps">
          <div className="path-steps__header">
            <span className="path-steps__col path-steps__col--num">#</span>
            <span className="path-steps__col path-steps__col--seg">Trecho</span>
            <span className="path-steps__col path-steps__col--w">Peso</span>
            <span className="path-steps__col path-steps__col--acc">Acumulado</span>
          </div>
          {steps.map((step, i) => (
            <div
              key={i}
              className={[
                "path-step",
                i === 0 ? "path-step--first" : "",
                i === steps.length - 1 ? "path-step--last" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span className="path-step__num">{i + 1}</span>
              <div className="path-step__segment">
                <span
                  className={
                    i === 0
                      ? "path-step__node path-step__node--origin"
                      : "path-step__node"
                  }
                >
                  {step.from}
                </span>
                <span className="path-step__arrow">→</span>
                <span
                  className={
                    i === steps.length - 1
                      ? "path-step__node path-step__node--dest"
                      : "path-step__node"
                  }
                >
                  {step.to}
                </span>
              </div>
              <span className="path-step__weight">+{step.edgeWeight.toFixed(1)}</span>
              <span className="path-step__acc">{step.accumulated.toFixed(1)}</span>
            </div>
          ))}
        </div>
      )}
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

// ── Componente principal ───────────────────────────────────────────────────────
export default function PageCalculadora() {
  const [adjRows, setAdjRows]       = useState([]);
  const [airports, setAirports]     = useState([]);
  const [origem, setOrigem]         = useState("REC");
  const [destino, setDestino]       = useState("POA");
  const [regionMap, setRegionMap]   = useState({});
  const [grauMap, setGrauMap]       = useState({});
  const [algo, setAlgo]             = useState("dijkstra");
  const [showHistory, setShowHistory]         = useState(false);
  const [showExploration, setShowExploration] = useState(true);

  const { history, push: pushHistory, clear: clearHistory } = useRouteHistory();
  const lastSavedKeyRef = useRef(null);

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
        if (parts[0] && parts[1])
          gMap[parts[0].trim()] = parseInt(parts[1].trim()) || 1;
      });
      setGrauMap(gMap);
    });
  }, []);

  const graph    = useMemo(() => buildGraph(adjRows), [adjRows]);
  const vertices = useMemo(() => Object.keys(graph).sort(), [graph]);
  const edges    = useMemo(
    () =>
      adjRows.map((r) => ({
        from: r.origem,
        to: r.destino,
        weight: parseFloat(r.peso) || 1,
      })),
    [adjRows]
  );

  const guard = useMemo(
    () => !graph[origem] || !graph[destino] || origem === destino,
    [graph, origem, destino]
  );

  const resultadoDijkstra = useMemo(
    () => (guard ? null : dijkstra(graph, origem, destino)),
    [guard, graph, origem, destino]
  );
  const resultadoBF = useMemo(
    () => (guard ? null : bellmanFord(graph, origem, destino)),
    [guard, graph, origem, destino]
  );
  const resultadoBFS = useMemo(
    () => (guard ? null : bfs(graph, origem, destino)),
    [guard, graph, origem, destino]
  );
  const resultadoDFS = useMemo(
    () => (guard ? null : dfs(graph, origem, destino)),
    [guard, graph, origem, destino]
  );

  const resultado = useMemo(() => {
    if (algo === "bellman-ford") return resultadoBF;
    if (algo === "bfs")          return resultadoBFS;
    if (algo === "dfs")          return resultadoDFS;
    return resultadoDijkstra;
  }, [algo, resultadoDijkstra, resultadoBF, resultadoBFS, resultadoDFS]);

  const highlightPath = useMemo(() => {
    if (algo === "bellman-ford") return resultadoBF?.path ?? [];
    if (algo === "bfs")          return resultadoBFS?.path ?? [];
    if (algo === "dfs")          return resultadoDFS?.path ?? [];
    return resultadoDijkstra?.path ?? [];
  }, [algo, resultadoDijkstra, resultadoBF, resultadoBFS, resultadoDFS]);

  const algoLabel = useMemo(() => {
    const map = { "bellman-ford": "Bellman-Ford", bfs: "BFS", dfs: "DFS" };
    return map[algo] ?? "Dijkstra";
  }, [algo]);

  const explorationOrder = useMemo(() => {
    if (!showExploration || algo === "comparar") return [];
    return resultado?.visitedOrder ?? [];
  }, [resultado, showExploration, algo]);

  const igual      = origem === destino;
  const semCaminho = !igual && algo !== "comparar" && resultado?.path.length === 0;
  const temCaminho = !igual && algo !== "comparar" && resultado?.path.length > 0;

  // Modo comparação — checa se cada algoritmo encontrou caminho
  const compResults = useMemo(() => [
    { id: "dijkstra",     label: "Dijkstra",      color: "var(--color-primary)", result: resultadoDijkstra },
    { id: "bellman-ford", label: "Bellman-Ford",   color: "var(--color-accent)",  result: resultadoBF      },
    { id: "bfs",          label: "BFS",            color: "var(--region-norte)",  result: resultadoBFS     },
    { id: "dfs",          label: "DFS",            color: "var(--region-sul)",    result: resultadoDFS     },
  ], [resultadoDijkstra, resultadoBF, resultadoBFS, resultadoDFS]);

  const temComparacao = algo === "comparar" && !igual;

  // Insight sobre qual algoritmo foi mais eficiente
  const compInsight = useMemo(() => {
    if (!temComparacao) return null;
    const withPaths = compResults.filter((c) => c.result?.path.length > 0);
    if (withPaths.length === 0) return null;

    const minCost = Math.min(...withPaths.map((c) => c.result.cost));
    const minHops = Math.min(...withPaths.map((c) => c.result.path.length - 1));
    const cheapest = withPaths.filter((c) => Math.abs(c.result.cost - minCost) < 1e-9).map((c) => c.label);
    const fewest   = withPaths.filter((c) => c.result.path.length - 1 === minHops).map((c) => c.label);

    return { minCost, minHops, cheapest, fewest };
  }, [temComparacao, compResults]);

  // Salva no histórico quando o resultado muda
  useEffect(() => {
    if (algo === "comparar" || !resultado?.path?.length) return;
    const key = `${origem}|${destino}|${algo}`;
    if (lastSavedKeyRef.current === key) return;
    lastSavedKeyRef.current = key;
    pushHistory({
      origem,
      destino,
      algo: algoLabel,
      path: resultado.path,
      cost: resultado.cost,
      hops: resultado.path.length - 1,
    });
  }, [resultado, algo, origem, destino, algoLabel, pushHistory]);

  const handleHistoryClick = useCallback(
    (item) => {
      const algoId = { Dijkstra: "dijkstra", "Bellman-Ford": "bellman-ford", BFS: "bfs", DFS: "dfs" };
      setOrigem(item.origem);
      setDestino(item.destino);
      setAlgo(algoId[item.algo] ?? "dijkstra");
      setShowHistory(false);
    },
    []
  );

  return (
    <>
      <PageHeader
        eyebrow="Algoritmos em grafos"
        title="Calculadora de Rotas"
        subtitle="Calcula o menor caminho entre aeroportos usando Dijkstra, Bellman-Ford, BFS ou DFS — exibindo cada passo da rota com custo acumulado."
      />

      <section className="section">
        <h2 className="section-title">
          <Route size={18} strokeWidth={1.75} aria-hidden="true" />
          Selecionar rota
        </h2>

        {/* Seletor de algoritmo */}
        <div
          className="tabs"
          role="tablist"
          aria-label="Algoritmo de roteamento"
          style={{ marginBottom: "var(--space-5)" }}
        >
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

        {/* Nota explicativa para BFS e DFS */}
        {ALGO_NOTES[algo] && (
          <div className="algo-note">{ALGO_NOTES[algo]}</div>
        )}

        {/* Seletores de origem e destino */}
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
            style={{
              display: "flex",
              alignItems: "center",
              paddingBottom: "var(--space-1)",
              color: "var(--color-text-subtle)",
            }}
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

        {/* Alertas */}
        {igual && (
          <div className="alert alert--warning" role="alert" style={{ marginTop: "var(--space-4)" }}>
            Origem e destino são iguais. Selecione aeroportos diferentes.
          </div>
        )}
        {semCaminho && (
          <div className="alert alert--error" role="alert" style={{ marginTop: "var(--space-4)" }}>
            Não existe caminho entre <strong>{origem}</strong> e <strong>{destino}</strong> na malha atual.
          </div>
        )}

        {/* ── Resultado — algoritmo único ── */}
        {temCaminho && (
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

            <PathDisplay path={resultado.path} steps={resultado.steps} />

            {/* Exportação */}
            <div className="export-row">
              <span className="export-label">Exportar</span>
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={() =>
                  exportJSON({
                    origem,
                    destino,
                    algo: algoLabel,
                    path: resultado.path,
                    steps: resultado.steps,
                    cost: resultado.cost,
                  })
                }
              >
                <Download size={13} aria-hidden="true" />
                JSON
              </button>
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={() => exportCSV({ origem, destino, steps: resultado.steps })}
              >
                <Download size={13} aria-hidden="true" />
                CSV
              </button>
            </div>
          </>
        )}

        {/* ── Resultado — modo comparação ── */}
        {temComparacao && (
          <>
            <div className="algo-compare-grid" style={{ marginTop: "var(--space-6)" }}>
              {compResults.map(({ id, label, color, result }) => (
                <div key={id} className="algo-compare-card">
                  <div className="algo-compare-card__header" style={{ borderLeftColor: color }}>
                    <span className="algo-compare-card__label" style={{ color }}>
                      {label}
                    </span>
                    {result?.path.length > 0 ? (
                      <>
                        <span className="algo-compare-card__cost">
                          {result.cost.toFixed(1)}
                        </span>
                        <span className="algo-compare-card__hops">
                          {result.path.length - 1} salto{result.path.length - 1 !== 1 ? "s" : ""}
                        </span>
                      </>
                    ) : (
                      <span className="algo-compare-card__no-path">sem caminho</span>
                    )}
                  </div>
                  {result?.path.length > 0 && (
                    <PathDisplay
                      path={result.path}
                      steps={result.steps}
                      color={color}
                      compact
                    />
                  )}
                </div>
              ))}
            </div>

            {compInsight && (
              <div className="insight-box" style={{ marginTop: "var(--space-5)" }}>
                Menor custo:{" "}
                <strong style={{ color: "var(--color-primary)" }}>
                  {compInsight.minCost.toFixed(1)}
                </strong>{" "}
                via <strong>{compInsight.cheapest.join(" e ")}</strong>.
                {compInsight.cheapest.join(",") !== compInsight.fewest.join(",") && (
                  <>
                    {" "}Menor número de escalas:{" "}
                    <strong>{compInsight.minHops}</strong>{" "}
                    salto{compInsight.minHops !== 1 ? "s" : ""}{" "}
                    via <strong>{compInsight.fewest.join(" e ")}</strong>.
                  </>
                )}
                {compInsight.cheapest.includes("Dijkstra") &&
                  compInsight.cheapest.includes("Bellman-Ford") && (
                    <>{" "}Dijkstra e Bellman-Ford convergem para o mesmo custo mínimo em grafos sem pesos negativos.</>
                  )}
              </div>
            )}
          </>
        )}
      </section>

      {/* ── Histórico de pesquisas ── */}
      {history.length > 0 && (
        <div className="route-history">
          <button
            type="button"
            className="route-history__header"
            onClick={() => setShowHistory((v) => !v)}
            aria-expanded={showHistory}
          >
            <span className="route-history__title">
              <History size={14} aria-hidden="true" />
              Pesquisas recentes
              <span className="route-history__count">{history.length}</span>
            </span>
            {showHistory ? (
              <ChevronUp size={14} aria-hidden="true" />
            ) : (
              <ChevronDown size={14} aria-hidden="true" />
            )}
          </button>

          {showHistory && (
            <div className="route-history__list">
              {history.map((item, i) => (
                <button
                  key={i}
                  type="button"
                  className="route-history__item"
                  onClick={() => handleHistoryClick(item)}
                  title="Restaurar essa pesquisa"
                >
                  <span className="route-history__pair">
                    {item.origem} → {item.destino}
                  </span>
                  <span className="route-history__algo">{item.algo}</span>
                  <span className="route-history__cost">
                    custo {item.cost.toFixed(1)} · {item.hops} salto{item.hops !== 1 ? "s" : ""}
                  </span>
                  <span className="route-history__time">{formatTime(item.ts)}</span>
                </button>
              ))}
              <div className="route-history__footer">
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={clearHistory}
                >
                  <RotateCcw size={12} aria-hidden="true" />
                  Limpar histórico
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Grafo interativo ── */}
      {airports.length > 0 && edges.length > 0 && (
        <section className="section">
          <h2 className="section-title">
            Grafo interativo
            {highlightPath.length > 1 && (
              <span className="section-title-hint">
                — âmbar = origem · verde = destino · branco = intermediário · azul = explorado
              </span>
            )}
          </h2>

          {/* Toggle de animação de busca */}
          {algo !== "comparar" && (
            <div className="exploration-toggle">
              <button
                type="button"
                className={`exploration-toggle__btn${showExploration ? " exploration-toggle__btn--on" : ""}`}
                onClick={() => setShowExploration((v) => !v)}
                aria-pressed={showExploration}
              >
                <Zap size={13} aria-hidden="true" />
                {showExploration ? "Animação de busca ativa" : "Animação de busca desativada"}
              </button>
              {showExploration && resultado?.visitedOrder?.length > 0 && (
                <span className="exploration-toggle__stat">
                  {resultado.visitedOrder.length} nó{resultado.visitedOrder.length !== 1 ? "s" : ""} explorado{resultado.visitedOrder.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          )}

          <GrafoVis
            airports={airports}
            edges={edges}
            highlightPath={highlightPath}
            explorationOrder={explorationOrder}
            regionMap={regionMap}
            grauMap={grauMap}
            algoLabel={algoLabel}
          />
        </section>
      )}
    </>
  );
}
