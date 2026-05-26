import { useEffect, useState } from "react";

function TimeBarchart({ label, dijVal, bfVal, gradId }) {
  if (dijVal == null || bfVal == null) return null;
  const W = 240, H = 170, PL = 52, PT = 18, PR = 16, PB = 42;
  const plotW = W - PL - PR, plotH = H - PT - PB;
  const maxVal = Math.max(dijVal, bfVal) * 1.2 || 1;
  const barW = plotW * 0.26;
  const gap = plotW * 0.08;
  const cx = PL + plotW / 2;
  const dijH = (dijVal / maxVal) * plotH;
  const bfH = (bfVal / maxVal) * plotH;

  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 11, color: "var(--muted)", textAlign: "center", marginBottom: 4, fontWeight: 600 }}>
        {label}
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ fontFamily: "Segoe UI, sans-serif", overflow: "visible" }}>
        <defs>
          <linearGradient id={`dg_${gradId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4da3ff" /><stop offset="100%" stopColor="#2a7ad4" />
          </linearGradient>
          <linearGradient id={`bg_${gradId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7c5cff" /><stop offset="100%" stopColor="#5a3dcf" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1.0].map((frac) => {
          const y = PT + (1 - frac) * plotH;
          const v = frac * maxVal;
          return (
            <g key={frac}>
              <line x1={PL} y1={y} x2={W - PR} y2={y} stroke="rgba(255,255,255,0.06)" />
              {frac > 0 && (
                <text x={PL - 4} y={y + 4} textAnchor="end" fontSize={9} fill="rgba(221,232,245,0.38)">
                  {v < 0.001 ? v.toExponential(1) : v.toFixed(3)}
                </text>
              )}
            </g>
          );
        })}
        <rect x={cx - barW - gap / 2} y={PT + plotH - dijH} width={barW} height={dijH}
          fill={`url(#dg_${gradId})`} rx={3} />
        <text x={cx - barW / 2 - gap / 2} y={PT + plotH - dijH - 5} textAnchor="middle" fontSize={9} fill="#4da3ff">
          {dijVal.toFixed(4)}
        </text>
        <text x={cx - barW / 2 - gap / 2} y={PT + plotH + 14} textAnchor="middle" fontSize={10} fill="#4da3ff" fontWeight="700">
          Dijkstra
        </text>
        <rect x={cx + gap / 2} y={PT + plotH - bfH} width={barW} height={bfH}
          fill={`url(#bg_${gradId})`} rx={3} />
        <text x={cx + barW / 2 + gap / 2} y={PT + plotH - bfH - 5} textAnchor="middle" fontSize={9} fill="#7c5cff">
          {bfVal.toFixed(4)}
        </text>
        <text x={cx + barW / 2 + gap / 2} y={PT + plotH + 14} textAnchor="middle" fontSize={10} fill="#7c5cff" fontWeight="700">
          BF
        </text>
        <line x1={PL} y1={PT} x2={PL} y2={PT + plotH} stroke="rgba(255,255,255,0.15)" />
        <line x1={PL} y1={PT + plotH} x2={W - PR} y2={PT + plotH} stroke="rgba(255,255,255,0.15)" />
        <text x={12} y={PT + plotH / 2} textAnchor="middle" fontSize={9} fill="rgba(221,232,245,0.38)"
          transform={`rotate(-90, 12, ${PT + plotH / 2})`}>segundos</text>
      </svg>
    </div>
  );
}

export default function PageParte2() {
  const [sub, setSub] = useState(null);
  const [cmpRows, setCmpRows] = useState([]);
  const [timing, setTiming] = useState(null);

  useEffect(() => {
    fetch("/out/parte2/subgrafo_metricas.json")
      .then((r) => r.json())
      .then(setSub)
      .catch(() => {});

    fetch("/out/parte2/comparacao_bf_dijkstra.csv")
      .then((r) => r.text())
      .then((text) => {
        const [header, ...lines] = text.trim().split("\n");
        if (header === "sem dados" || !lines.length) return;
        const keys = header.split(",").map((k) => k.trim());
        const rows = lines.map((l) => {
          const vals = l.split(",");
          const obj = {};
          keys.forEach((k, i) => { obj[k] = vals[i] ? vals[i].trim() : ""; });
          return obj;
        });
        setCmpRows(rows.slice(0, 20));

        // Aggregate timing by unique source (each source = one BF/Dijkstra run)
        const seenSrc = new Set();
        let tBfTotal = 0, tDjTotal = 0, srcCount = 0, coincidencias = 0;
        rows.forEach((r) => {
          if (!seenSrc.has(r.origem)) {
            seenSrc.add(r.origem);
            tBfTotal += parseFloat(r.tempo_bf) || 0;
            tDjTotal += parseFloat(r.tempo_dijkstra) || 0;
            srcCount++;
          }
          if (r.coincide === "True") coincidencias++;
        });
        setTiming({
          fontes: srcCount,
          pares: rows.length,
          coincidencias,
          dijkstra: { total: tDjTotal, medio: srcCount > 0 ? tDjTotal / srcCount : 0 },
          bf: { total: tBfTotal, medio: srcCount > 0 ? tBfTotal / srcCount : 0 },
        });
      })
      .catch(() => {});
  }, []);

  const dij = timing?.dijkstra;
  const bf = timing?.bf;

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
          <div className="kpi-value">{timing?.pares ?? "—"}</div>
          <div className="kpi-unit">origem–destino</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">BF = Dijkstra</div>
          <div className="kpi-value">{timing?.coincidencias ?? "—"}</div>
          <div className="kpi-unit">de {timing?.pares ?? "—"} pares</div>
        </div>
      </div>

      <div className="two-col">
        <div className="section">
          <div className="section-title">Dijkstra (SSSP)</div>
          <div className="info-row">
            <span className="info-key">Fontes distintas</span>
            <span className="info-val">{timing?.fontes ?? "—"}</span>
          </div>
          <div className="info-row">
            <span className="info-key">Tempo total</span>
            <span className="info-val" style={{ color: "var(--blue)", fontWeight: 700 }}>
              {dij?.total?.toFixed(4) ?? "—"} s
            </span>
          </div>
          <div className="info-row">
            <span className="info-key">Tempo médio por fonte</span>
            <span className="info-val">{dij?.medio?.toFixed(4) ?? "—"} s</span>
          </div>
        </div>
        <div className="section">
          <div className="section-title">Bellman-Ford (SSSP)</div>
          <div className="info-row">
            <span className="info-key">Fontes distintas</span>
            <span className="info-val">{timing?.fontes ?? "—"}</span>
          </div>
          <div className="info-row">
            <span className="info-key">Tempo total</span>
            <span className="info-val" style={{ color: "var(--purple)", fontWeight: 700 }}>
              {bf?.total?.toFixed(4) ?? "—"} s
            </span>
          </div>
          <div className="info-row">
            <span className="info-key">Tempo médio por fonte</span>
            <span className="info-val">{bf?.medio?.toFixed(4) ?? "—"} s</span>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="section-title">Benchmarking Visual — Dijkstra × Bellman-Ford</div>
        <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 16, lineHeight: 1.6 }}>
          Comparação de performance com <strong style={{ color: "var(--blue)" }}>escalas padronizadas por métrica</strong> e
          cores consistentes: <span style={{ color: "var(--blue)" }}>■ Dijkstra</span> vs{" "}
          <span style={{ color: "var(--purple)" }}>■ Bellman-Ford</span>.
          Insight: em grafos sem pesos negativos, Dijkstra é sistematicamente mais eficiente.
        </p>
        <div style={{ display: "flex", gap: 24, justifyContent: "center", flexWrap: "wrap" }}>
          <TimeBarchart
            label="Tempo Total (s)"
            dijVal={dij?.total}
            bfVal={bf?.total}
            gradId="total"
          />
          <TimeBarchart
            label="Tempo Médio por Fonte (s)"
            dijVal={dij?.medio}
            bfVal={bf?.medio}
            gradId="medio"
          />
        </div>
        {dij && bf && (
          <div style={{
            marginTop: 16,
            padding: "10px 16px",
            background: "rgba(77,163,255,0.06)",
            border: "1px solid rgba(77,163,255,0.18)",
            borderRadius: 8,
            fontSize: 12,
            color: "var(--muted)",
          }}>
            Dijkstra foi{" "}
            <strong style={{ color: "var(--blue)" }}>
              {bf.total > 0 ? (bf.total / dij.total).toFixed(1) : "—"}×
            </strong>{" "}
            mais rápido no total.
            Coincidência de resultados:{" "}
            <strong style={{ color: "var(--green)" }}>
              {timing?.coincidencias}/{timing?.pares} pares
            </strong>.
          </div>
        )}
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
