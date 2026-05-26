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

        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          {[
            { color: "var(--blue)",   title: "Gestalt — Similaridade",  desc: "Cor do nó identifica a região geográfica" },
            { color: "var(--purple)", title: "Gestalt — Conectividade", desc: "Espessura e opacidade da aresta ∝ peso" },
            { color: "var(--gold)",   title: "Hierarquia Visual",       desc: "Hubs são maiores e têm glow de destaque" },
            { color: "var(--green)",  title: "Figura-Fundo",            desc: "Fundo escuro destaca caminhos coloridos" },
          ].map((p) => (
            <div key={p.title} style={{
              background: "rgba(255,255,255,0.03)",
              border: `1px solid ${p.color}25`,
              borderLeft: `3px solid ${p.color}`,
              borderRadius: 8,
              padding: "8px 14px",
              flex: "1 1 180px",
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: p.color, marginBottom: 2 }}>{p.title}</div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>{p.desc}</div>
            </div>
          ))}
        </div>

        {graphData ? (
          <GrafoVis
            airports={graphData.airports}
            edges={graphData.edges}
            mandatoryPairs={graphData.mandatoryPairs}
            regionMap={regionMap}
            grauMap={grauMap}
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
