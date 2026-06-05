import { useEffect, useState, useMemo } from "react";
import { Network, TrendingUp, Route, ArrowRight, X, Lightbulb } from "lucide-react";
import GrafoVizPanel from "../components/GrafoVizPanel.jsx";
import PageHeader from "../components/ui/PageHeader.jsx";
import AppButton from "../components/ui/AppButton.jsx";
import InsightGrid from "../components/ui/InsightGrid.jsx";
import { SkeletonGraph, SkeletonKpiGrid } from "../components/ui/LoadingState.jsx";
import { insightsRede } from "../lib/insights.js";
import { parseCSV, buildGraph, dijkstra } from "../lib/graphUtils.js";

const GESTALT_LEGEND = [
  { color: "var(--region-nordeste)", title: "Gestalt — Similaridade",   desc: "Cor do nó identifica a região geográfica" },
  { color: "var(--color-primary)",   title: "Gestalt — Conectividade",  desc: "Espessura e opacidade da aresta ∝ peso" },
  { color: "var(--color-accent)",    title: "Hierarquia Visual",        desc: "Hubs são maiores e têm destaque luminoso" },
  { color: "var(--region-sul)",      title: "Figura-Fundo",             desc: "Fundo escuro destaca caminhos coloridos" },
];

export default function PageGeral() {
  const [global, setGlobal]       = useState(null);
  const [rankings, setRankings]   = useState(null);
  const [graphData, setGraphData] = useState(null);
  const [regionMap, setRegionMap] = useState({});
  const [grauMap, setGrauMap]     = useState({});
  const [regioes, setRegioes]     = useState([]);
  const [routes, setRoutes]       = useState([]);

  const [pathFrom, setPathFrom]     = useState("");
  const [pathTo, setPathTo]         = useState("");
  const [pathResult, setPathResult] = useState(null);

  useEffect(() => {
    fetch("/out/global.json").then((r) => r.json()).then(setGlobal);
    fetch("/out/rankings.json").then((r) => r.json()).then(setRankings);
    fetch("/out/regioes.json")
      .then((r) => r.json())
      .then((j) => setRegioes(Array.isArray(j) ? j : j.regioes ?? []))
      .catch(() => {});

    Promise.all([
      fetch("/data/adjacencias_aeroportos.csv").then((r) => r.text()),
      fetch("/out/distancias_rotas.csv").then((r) => r.text()),
      fetch("/data/aeroportos_data.csv").then((r) => r.text()),
      fetch("/out/graus.csv").then((r) => r.text()),
    ]).then(([adjText, rotasText, aeroportosText, grausText]) => {
      const aerRows = parseCSV(aeroportosText);
      const rMap = {};
      aerRows.forEach((r) => { rMap[r.iata] = r.regiao; });
      setRegionMap(rMap);

      const grausRows = parseCSV(grausText);
      const gMap = {};
      grausRows.forEach((r) => { gMap[r.aeroporto] = parseInt(r.grau) || 1; });
      setGrauMap(gMap);

      const adjRows = parseCSV(adjText);
      const airports = new Set();
      adjRows.forEach((r) => { airports.add(r.origem); airports.add(r.destino); });
      const edges = adjRows.map((r) => ({
        from: r.origem,
        to: r.destino,
        weight: parseFloat(r.peso) || 1,
      }));

      const rotasRows = parseCSV(rotasText);
      setRoutes(rotasRows);
      const mandatoryPairs = [];
      const mandSet = new Set();
      rotasRows.forEach((r) => {
        if (r.origem === "MAO" || r.origem === "REC") {
          const hops = r.caminho.split("→");
          for (let i = 0; i < hops.length - 1; i++) {
            const key = `${hops[i]}__${hops[i + 1]}`;
            if (!mandSet.has(key)) {
              mandSet.add(key);
              mandatoryPairs.push([hops[i], hops[i + 1]]);
            }
          }
        }
      });

      setGraphData({
        airports: Array.from(airports).map((id) => ({ id })),
        edges,
        mandatoryPairs,
        adjRows,
      });
    });
  }, []);

  const graph = useMemo(() => {
    if (!graphData?.adjRows) return {};
    return buildGraph(graphData.adjRows);
  }, [graphData]);

  const airportList = useMemo(
    () => graphData?.airports.map((a) => a.id).sort() ?? [],
    [graphData]
  );

  const highlightPath = useMemo(() => pathResult?.path ?? [], [pathResult]);

  const pathPairs = useMemo(() => {
    const p = highlightPath;
    if (p.length < 2) return [];
    const pairs = [];
    for (let i = 0; i < p.length - 1; i++) pairs.push([p[i], p[i + 1]]);
    return pairs;
  }, [highlightPath]);

  const topHubs = useMemo(() => {
    if (!grauMap || Object.keys(grauMap).length === 0) return [];
    return Object.entries(grauMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([id, grau]) => ({ id, grau }));
  }, [grauMap]);

  const grausArr = useMemo(
    () => Object.entries(grauMap).map(([aeroporto, grau]) => ({ aeroporto, grau })),
    [grauMap]
  );

  const redeInsights = useMemo(
    () => insightsRede({ global, rankings, graus: grausArr, regioes, rotas: routes }),
    [global, rankings, grausArr, regioes, routes]
  );

  const handleFindRoute = () => {
    if (!pathFrom || !pathTo || pathFrom === pathTo) return;
    if (!graph[pathFrom] || !graph[pathTo]) return;
    setPathResult(dijkstra(graph, pathFrom, pathTo));
  };

  const handleClearRoute = () => {
    setPathResult(null);
    setPathFrom("");
    setPathTo("");
  };

  return (
    <>
      <PageHeader
        eyebrow="Rede nacional"
        title="Visão Geral"
        subtitle="Propriedades globais do grafo de aeroportos brasileiros e exploração interativa da malha aérea."
      />

      {/* KPIs */}
      {!global ? (
        <SkeletonKpiGrid count={5} />
      ) : (
        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-label">Aeroportos</div>
            <div className="kpi-value">{global?.ordem ?? "—"}</div>
            <div className="kpi-unit">vértices</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Rotas</div>
            <div className="kpi-value">{global?.tamanho ?? "—"}</div>
            <div className="kpi-unit">arestas</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Densidade</div>
            <div className="kpi-value">
              {global ? (global.densidade * 100).toFixed(1) : "—"}
            </div>
            <div className="kpi-unit">%</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Hub principal</div>
            <div className="kpi-value kpi-value--compact">
              {rankings?.maior_grau?.aeroporto ?? "—"}
            </div>
            <div className="kpi-unit">grau {rankings?.maior_grau?.grau}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Ego mais denso</div>
            <div className="kpi-value kpi-value--compact">
              {rankings?.maior_densidade_ego?.aeroporto ?? "—"}
            </div>
            <div className="kpi-unit">
              dens. {rankings?.maior_densidade_ego?.densidade_ego?.toFixed(2)}
            </div>
          </div>
        </div>
      )}

      {/* Insights da rede */}
      {redeInsights.length > 0 && (
        <section className="section">
          <h2 className="section-title">
            <Lightbulb size={18} strokeWidth={1.75} aria-hidden="true" />
            Leitura da rede
          </h2>
          <p className="section-lead">
            Observações geradas a partir dos próprios dados — estrutura, geografia e rotas — e
            não de regras fixas.
          </p>
          <InsightGrid insights={redeInsights} />
        </section>
      )}

      {/* Top hubs */}
      {topHubs.length > 0 && (
        <section className="section">
          <h2 className="section-title">
            <TrendingUp size={18} strokeWidth={1.75} aria-hidden="true" />
            Hubs em Destaque
          </h2>
          <p className="section-lead">
            Os 5 aeroportos mais conectados da malha — concentram a maior parte das rotas diretas.
          </p>
          <div className="rank-list">
            {topHubs.map((h, i) => {
              const pct = (h.grau / topHubs[0].grau) * 100;
              const isTop = i < 3;
              return (
                <div key={h.id} className="rank-row">
                  <span className={`rank-pos${isTop ? " rank-pos--top" : ""}`}>
                    {i + 1}
                  </span>
                  <span className={`rank-code${isTop ? " rank-code--top" : ""}`}>
                    {h.id}
                  </span>
                  <div className="rank-bar-track">
                    <div className="rank-bar-fill" style={{ width: `${pct}%` }}>
                      {pct > 28 ? h.grau : ""}
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
                      {h.grau}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Grafo interativo */}
      <section className="section">
        <h2 className="section-title">
          <Network size={18} strokeWidth={1.75} aria-hidden="true" />
          Grafo Interativo — Aeroportos Brasileiros
        </h2>

        <div className="callout-grid">
          {GESTALT_LEGEND.map((p) => (
            <div
              key={p.title}
              className="callout"
              style={{ "--callout-color": p.color }}
            >
              <div className="callout-title">{p.title}</div>
              <div className="callout-desc">{p.desc}</div>
            </div>
          ))}
        </div>

        {/* Buscador de rota mínima */}
        {graphData && airportList.length > 0 && (
          <div className="route-finder">
            <div className="route-finder__label">
              <Route size={14} aria-hidden="true" />
              Encontrar rota mínima
            </div>
            <div className="route-finder__controls">
              <div className="form-field">
                <label className="form-label" htmlFor="geral-from">
                  De
                </label>
                <select
                  id="geral-from"
                  className="ctrl-input ctrl-select"
                  style={{ minWidth: 130 }}
                  value={pathFrom}
                  onChange={(e) => {
                    setPathFrom(e.target.value);
                    setPathResult(null);
                  }}
                >
                  <option value="">Origem</option>
                  {airportList.map((id) => (
                    <option key={id} value={id}>
                      {id}
                    </option>
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
                <ArrowRight size={20} strokeWidth={1.5} />
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="geral-to">
                  Para
                </label>
                <select
                  id="geral-to"
                  className="ctrl-input ctrl-select"
                  style={{ minWidth: 130 }}
                  value={pathTo}
                  onChange={(e) => {
                    setPathTo(e.target.value);
                    setPathResult(null);
                  }}
                >
                  <option value="">Destino</option>
                  {airportList.map((id) => (
                    <option key={id} value={id}>
                      {id}
                    </option>
                  ))}
                </select>
              </div>

              <AppButton
                variant="primary"
                size="sm"
                onClick={handleFindRoute}
                disabled={!pathFrom || !pathTo || pathFrom === pathTo}
              >
                Calcular
              </AppButton>

              {pathResult && (
                <AppButton
                  variant="ghost"
                  size="sm"
                  onClick={handleClearRoute}
                  aria-label="Limpar rota"
                >
                  <X size={14} aria-hidden="true" />
                  Limpar
                </AppButton>
              )}
            </div>

            {pathResult && pathResult.path.length > 0 && (
              <div style={{ marginTop: "var(--space-4)" }}>
                <div className="route-finder__path-meta">
                  <span>
                    Custo:{" "}
                    <strong style={{ color: "var(--color-primary)" }}>
                      {pathResult.cost.toFixed(1)}
                    </strong>
                  </span>
                  <span>
                    Saltos: <strong>{pathResult.path.length - 1}</strong>
                  </span>
                  {pathResult.path.length > 2 && (
                    <span>
                      Intermediários:{" "}
                      <strong>{pathResult.path.length - 2}</strong>
                    </span>
                  )}
                </div>
                <div
                  className="result-path"
                  style={{ marginTop: "var(--space-2)" }}
                >
                  {pathResult.path.map((node, i) => (
                    <span key={`${node}-${i}`}>
                      <strong
                        style={{
                          color:
                            i === 0
                              ? "var(--color-primary)"
                              : i === pathResult.path.length - 1
                                ? "var(--color-accent)"
                                : "var(--color-text)",
                        }}
                      >
                        {node}
                      </strong>
                      {i < pathResult.path.length - 1 && (
                        <span className="result-path-arrow">→</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {pathResult && pathResult.path.length === 0 && (
              <div
                className="alert alert--error"
                style={{ marginTop: "var(--space-3)" }}
              >
                Não existe caminho entre <strong>{pathFrom}</strong> e{" "}
                <strong>{pathTo}</strong> na malha atual.
              </div>
            )}

            {pathFrom && pathTo && pathFrom === pathTo && (
              <div
                className="alert alert--warning"
                style={{ marginTop: "var(--space-3)" }}
              >
                Origem e destino são iguais. Selecione aeroportos diferentes.
              </div>
            )}
          </div>
        )}

        {graphData ? (
          <GrafoVizPanel
            airports={graphData.airports}
            edges={graphData.edges}
            mandatoryPairs={graphData.mandatoryPairs}
            highlightPath={highlightPath}
            pathPairs={pathPairs}
            regionMap={regionMap}
            grauMap={grauMap}
          />
        ) : (
          <SkeletonGraph />
        )}
      </section>
    </>
  );
}