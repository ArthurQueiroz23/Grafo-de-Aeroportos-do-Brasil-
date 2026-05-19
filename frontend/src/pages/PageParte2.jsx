import { useEffect, useState } from "react";

export default function PageParte2() {
  const [report, setReport] = useState(null);
  const [cmpRows, setCmpRows] = useState([]);

  useEffect(() => {
    fetch("/out/parte2_report.json").then((r) => r.json()).then(setReport);
    fetch("/out/parte2/comparacao_bf_dijkstra.csv")
      .then((r) => r.text())
      .then((text) => {
        const [header, ...lines] = text.trim().split("\n");
        const keys = header.split(",");
        const rows = lines.slice(0, 20).map((l) => {
          const vals = l.split(",");
          const obj = {};
          keys.forEach((k, i) => { obj[k.trim()] = vals[i] ? vals[i].trim() : ""; });
          return obj;
        });
        setCmpRows(rows);
      });
  }, []);

  const sub = report?.subgrafo;
  const dij = report?.dijkstra;
  const bf = report?.bellman_ford;
  const bfsArr = report?.bfs || [];
  const dfsArr = report?.dfs || [];
  const demoNeg = report?.bf_demo_peso_negativo_sem_ciclo;
  const demoCiclo = report?.bf_demo_ciclo_negativo;

  return (
    <div>
      <div className="page-title">Parte 2 — SNAP RoadNet-CA</div>
      <div className="page-subtitle">Análise do subgrafo de estradas da Califórnia (SNAP)</div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Vértices (subgrafo)</div>
          <div className="kpi-value">{sub?.ordem?.toLocaleString() ?? "—"}</div>
          <div className="kpi-unit">nós</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Arestas dirigidas</div>
          <div className="kpi-value">{sub?.tamanho_arestas_dirigidas?.toLocaleString() ?? "—"}</div>
          <div className="kpi-unit">arestas</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Densidade dirigida</div>
          <div className="kpi-value">{sub ? (sub.densidade_dirigida * 100).toFixed(3) : "—"}</div>
          <div className="kpi-unit">%</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Pares avaliados</div>
          <div className="kpi-value">{dij?.pares_avaliados ?? "—"}</div>
          <div className="kpi-unit">origem–destino</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">BF = Dijkstra</div>
          <div className="kpi-value">{bf?.coincidencias_com_dijkstra ?? "—"}</div>
          <div className="kpi-unit">de {bf?.pares_avaliados ?? "—"} pares</div>
        </div>
      </div>

      <div className="two-col">
        <div className="section">
          <div className="section-title">Dijkstra (SSSP)</div>
          <div className="info-row">
            <span className="info-key">Fontes distintas</span>
            <span className="info-val">{dij?.fontes_distintas ?? "—"}</span>
          </div>
          <div className="info-row">
            <span className="info-key">Tempo total</span>
            <span className="info-val" style={{ color: "var(--blue)", fontWeight: 700 }}>
              {dij?.tempo_total_s?.toFixed(4) ?? "—"} s
            </span>
          </div>
          <div className="info-row">
            <span className="info-key">Tempo médio por fonte</span>
            <span className="info-val">{dij?.tempo_medio_por_fonte_s?.toFixed(4) ?? "—"} s</span>
          </div>
        </div>
        <div className="section">
          <div className="section-title">Bellman-Ford (SSSP)</div>
          <div className="info-row">
            <span className="info-key">Fontes distintas</span>
            <span className="info-val">{bf?.fontes_distintas ?? "—"}</span>
          </div>
          <div className="info-row">
            <span className="info-key">Tempo total</span>
            <span className="info-val" style={{ color: "var(--purple)", fontWeight: 700 }}>
              {bf?.tempo_total_s?.toFixed(4) ?? "—"} s
            </span>
          </div>
          <div className="info-row">
            <span className="info-key">Tempo médio por fonte</span>
            <span className="info-val">{bf?.tempo_medio_por_fonte_s?.toFixed(4) ?? "—"} s</span>
          </div>
        </div>
      </div>

      <div className="two-col">
        <div className="section">
          <div className="section-title">BFS — resultados por fonte</div>
          {bfsArr.map((b, i) => (
            <div key={i} style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 700, color: "var(--blue)", marginBottom: 6, fontSize: 13 }}>
                Fonte: {b.fonte}
              </div>
              <div className="info-row">
                <span className="info-key">Nós alcançados</span>
                <span className="info-val">{b.nos_alcancados?.toLocaleString()}</span>
              </div>
              <div className="info-row">
                <span className="info-key">Camadas</span>
                <span className="info-val">{Object.keys(b.camadas || {}).length}</span>
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4, fontFamily: "monospace" }}>
                {(b.amostra_bfs || []).slice(0, 5).join(", ")}…
              </div>
            </div>
          ))}
        </div>
        <div className="section">
          <div className="section-title">DFS — resultados por fonte</div>
          {dfsArr.map((d, i) => (
            <div key={i} style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 700, color: "var(--purple)", marginBottom: 6, fontSize: 13 }}>
                Fonte: {d.fonte}
              </div>
              <div className="info-row">
                <span className="info-key">Nós visitados</span>
                <span className="info-val">{d.nos_visitados?.toLocaleString()}</span>
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4, fontFamily: "monospace" }}>
                {(d.amostra_dfs || []).slice(0, 5).join(", ")}…
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="two-col">
        <div className="section">
          <div className="section-title">Demo BF — peso negativo sem ciclo</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12 }}>
            Arestas: {(demoNeg?.arestas || []).map(([u, v, w]) => `${u}→${v}(${w})`).join(", ")}
          </div>
          {Object.entries(demoNeg?.distancias_de_0 || {}).map(([k, v]) => (
            <div key={k} className="info-row">
              <span className="info-key">Nó {k}</span>
              <span className="info-val">{v ?? "∞"}</span>
            </div>
          ))}
          <div className="info-row">
            <span className="info-key">Ciclo negativo detectado</span>
            <span className="info-val">
              <span className={`badge ${demoNeg?.ciclo_negativo_detectado ? "badge-red" : "badge-green"}`}>
                {demoNeg?.ciclo_negativo_detectado ? "Sim" : "Não"}
              </span>
            </span>
          </div>
        </div>
        <div className="section">
          <div className="section-title">Demo BF — ciclo negativo detectado</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12 }}>
            Arestas: {(demoCiclo?.arestas || []).map(([u, v, w]) => `${u}→${v}(${w})`).join(", ")}
          </div>
          <div className="info-row">
            <span className="info-key">Ciclo negativo detectado</span>
            <span className="info-val">
              <span className={`badge ${demoCiclo?.ciclo_negativo_detectado ? "badge-green" : "badge-red"}`}>
                {demoCiclo?.ciclo_negativo_detectado ? "Sim ✓" : "Não"}
              </span>
            </span>
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 14, lineHeight: 1.6 }}>
            Ciclo: 1→2(−2), 2→1(0.5) — soma = −1.5 por iteração
          </div>
        </div>
      </div>

      <div className="section">
        <div className="section-title">Comparação BF × Dijkstra (primeiros 20 pares)</div>
        <table>
          <thead>
            <tr>
              <th>Origem</th>
              <th>Destino</th>
              <th>Dist. BF</th>
              <th>Dist. Dijkstra</th>
              <th>Diferença</th>
              <th>Coincide</th>
            </tr>
          </thead>
          <tbody>
            {cmpRows.map((r, i) => (
              <tr key={i}>
                <td style={{ fontFamily: "monospace" }}>{r.origem}</td>
                <td style={{ fontFamily: "monospace" }}>{r.destino}</td>
                <td>{parseFloat(r.distancia_bellman_ford).toFixed(2)}</td>
                <td>{parseFloat(r.distancia_dijkstra).toFixed(2)}</td>
                <td style={{ color: "var(--muted)", fontFamily: "monospace", fontSize: 11 }}>
                  {parseFloat(r.diferenca_abs || 0).toExponential(2)}
                </td>
                <td>
                  <span className={`badge ${r.coincide === "True" ? "badge-green" : "badge-red"}`}>
                    {r.coincide === "True" ? "Sim" : "Não"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="section">
        <div className="section-title">Distribuição do grau de saída (subgrafo SNAP)</div>
        <img
          src="/out/parte2/viz_parte2_grau_saida.png"
          alt="Distribuição grau saída"
          style={{ maxWidth: "100%", borderRadius: 8 }}
        />
      </div>
    </div>
  );
}
