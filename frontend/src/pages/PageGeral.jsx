import { useEffect, useState, useMemo } from "react";
import { Network, TrendingUp } from "lucide-react";
import GrafoVizPanel from "../components/GrafoVizPanel.jsx";
import PageHeader from "../components/ui/PageHeader.jsx";
import { SkeletonGraph, SkeletonKpiGrid } from "../components/ui/LoadingState.jsx";

function parseCSV(text) {
  const [header, ...lines] = text.trim().split("\n");
  const keys = header.split(",");
  return lines.map((l) => {
    const vals = l.split(",");
    const obj = {};
    keys.forEach((k, i) => {
      obj[k.trim()] = vals[i] ? vals[i].trim() : "";
    });
    return obj;
  });
}

const GESTALT_LEGEND = [
  {
    color: "var(--region-nordeste)",
    title: "Gestalt — Similaridade",
    desc: "Cor do nó identifica a região geográfica",
  },
  {
    color: "var(--color-primary)",
    title: "Gestalt — Conectividade",
    desc: "Espessura e opacidade da aresta ∝ peso",
  },
  {
    color: "var(--color-accent)",
    title: "Hierarquia Visual",
    desc: "Hubs são maiores e têm destaque luminoso",
  },
  {
    color: "var(--region-sul)",
    title: "Figura-Fundo",
    desc: "Fundo escuro destaca caminhos coloridos",
  },
];

export default function PageGeral() {
  const [global, setGlobal] = useState(null);
  const [rankings, setRankings] = useState(null);
  const [graphData, setGraphData] = useState(null);
  const [regionMap, setRegionMap] = useState({});
  const [grauMap, setGrauMap] = useState({});

  useEffect(() => {
    fetch("/out/global.json").then((r) => r.json()).then(setGlobal);
    fetch("/out/rankings.json").then((r) => r.json()).then(setRankings);

    Promise.all([
      fetch("/data/adjacencias_aeroportos.csv").then((r) => r.text()),
      fetch("/out/distancias_rotas.csv").then((r) => r.text()),
      fetch("/data/aeroportos_data.csv").then((r) => r.text()),
      fetch("/out/graus.csv").then((r) => r.text()),
    ]).then(([adjText, rotasText, aeroportosText, grausText]) => {
      const aerRows = parseCSV(aeroportosText);
      const rMap = {};
      aerRows.forEach((r) => {
        rMap[r.iata] = r.regiao;
      });
      setRegionMap(rMap);

      const grausRows = parseCSV(grausText);
      const gMap = {};
      grausRows.forEach((r) => {
        gMap[r.aeroporto] = parseInt(r.grau) || 1;
      });
      setGrauMap(gMap);

      const adjRows = parseCSV(adjText);
      const airports = new Set();
      adjRows.forEach((r) => {
        airports.add(r.origem);
        airports.add(r.destino);
      });
      const edges = adjRows.map((r) => ({
        from: r.origem,
        to: r.destino,
        weight: parseFloat(r.peso) || 1,
      }));

      const rotasRows = parseCSV(rotasText);
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
      });
    });
  }, []);

  const topHubs = useMemo(() => {
    if (!grauMap || Object.keys(grauMap).length === 0) return [];
    return Object.entries(grauMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([id, grau]) => ({ id, grau }));
  }, [grauMap]);

  const loadingKpis = !global;

  return (
    <>
      <PageHeader
        eyebrow="Rede nacional"
        title="Visão Geral"
        subtitle="Propriedades globais do grafo de aeroportos brasileiros e exploração interativa da malha."
      />

      {loadingKpis ? (
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
                    <div
                      className="rank-bar-fill"
                      style={{ width: `${pct}%` }}
                    >
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

        {graphData ? (
          <GrafoVizPanel
            airports={graphData.airports}
            edges={graphData.edges}
            mandatoryPairs={graphData.mandatoryPairs}
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
