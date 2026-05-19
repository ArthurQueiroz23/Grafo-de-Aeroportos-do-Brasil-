import { useEffect, useState } from "react";
import GrafoVis from "../components/GrafoVis.jsx";

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

export default function PageGeral() {
  const [global, setGlobal] = useState(null);
  const [rankings, setRankings] = useState(null);
  const [graphData, setGraphData] = useState(null);

  useEffect(() => {
    fetch("/out/global.json").then((r) => r.json()).then(setGlobal);
    fetch("/out/rankings.json").then((r) => r.json()).then(setRankings);

    Promise.all([
      fetch("/data/adjacencias_aeroportos.csv").then((r) => r.text()),
      fetch("/out/distancias_rotas.csv").then((r) => r.text()),
    ]).then(([adjText, rotasText]) => {
      const adjRows = parseCSV(adjText);
      const airports = new Set();
      adjRows.forEach((r) => { airports.add(r.origem); airports.add(r.destino); });
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

  return (
    <div>
      <div className="page-title">Visão Geral</div>
      <div className="page-subtitle">Propriedades globais do grafo de aeroportos brasileiros</div>

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
          <div className="kpi-value">{global ? (global.densidade * 100).toFixed(1) : "—"}</div>
          <div className="kpi-unit">%</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Hub principal</div>
          <div className="kpi-value" style={{ fontSize: 22 }}>
            {rankings?.maior_grau?.aeroporto ?? "—"}
          </div>
          <div className="kpi-unit">grau {rankings?.maior_grau?.grau}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Ego mais denso</div>
          <div className="kpi-value" style={{ fontSize: 22 }}>
            {rankings?.maior_densidade_ego?.aeroporto ?? "—"}
          </div>
          <div className="kpi-unit">dens. {rankings?.maior_densidade_ego?.densidade_ego?.toFixed(2)}</div>
        </div>
      </div>

      <div className="section">
        <div className="section-title">Grafo Interativo — Aeroportos Brasileiros</div>
        {graphData ? (
          <GrafoVis
            airports={graphData.airports}
            edges={graphData.edges}
            mandatoryPairs={graphData.mandatoryPairs}
          />
        ) : (
          <div style={{ color: "var(--muted)", padding: "60px 0", textAlign: "center", fontSize: 13 }}>
            Carregando grafo…
          </div>
        )}
      </div>
    </div>
  );
}
