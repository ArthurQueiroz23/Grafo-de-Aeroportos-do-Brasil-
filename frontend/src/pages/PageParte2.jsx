import { useEffect, useState } from "react";
import { Microscope, Terminal, Network } from "lucide-react";
import PageHeader from "../components/ui/PageHeader.jsx";
import { InteractiveListTable } from "../components/ui/interactive-logs-table-shadcnui.jsx";
import { mapComparacaoBfDijkstra } from "../lib/interactive-list-adapters.js";
import Modal from "../components/ui/Modal.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import ChartSequence from "../components/ChartSequence.jsx";
import { LoadingCenter, SkeletonKpiGrid } from "../components/ui/LoadingState.jsx";
import SnapGraph from "../components/SnapGraph.jsx";
import { CHART } from "../constants/theme.js";

const VIZ_IMAGES = [
  {
    src: "/out/parte2/viz_parte2_grau_saida.png",
    label: "Distribuição do grau de saída",
    cat: "Exploratória",
    variant: "accent",
    desc: "Quantos nós da rede possuem cada quantidade de arestas de saída.",
  },
  {
    src: "/out/parte2/viz_parte2_bfs_camadas.png",
    label: "Camadas BFS (subgrafo SNAP)",
    cat: "Exploratória",
    variant: "accent",
    desc: "Quantos nós estão a cada distância (em saltos) da fonte do BFS.",
  },
];

function TimeBarchart({ label, dijVal, bfVal, gradId }) {
  const [hover, setHover] = useState(null);
  if (dijVal == null || bfVal == null) return null;
  const W = 300, H = 210, PL = 64, PT = 24, PR = 20, PB = 52;
  const plotW = W - PL - PR;
  const plotH = H - PT - PB;
  const maxVal = Math.max(dijVal, bfVal) * 1.2 || 1;
  const barW = plotW * 0.26;
  const gap = plotW * 0.08;
  const cx = PL + plotW / 2;
  const dijH = (dijVal / maxVal) * plotH;
  const bfH = (bfVal / maxVal) * plotH;

  return (
    <div style={{ flex: 1, minWidth: 240 }}>
      <div
        style={{
          fontSize: "var(--text-caption)",
          color: "var(--color-text-muted)",
          textAlign: "center",
          marginBottom: "var(--space-3)",
          fontWeight: 600,
        }}
      >
        {label}
      </div>
      <svg
        width="100%"
        viewBox={`0 0 ${W} ${H}`}
        style={{ fontFamily: "var(--font-body)", overflow: "visible" }}
        role="img"
        aria-label={label}
      >
        <defs>
          <linearGradient id={`dg_${gradId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART.dijkstra} />
            <stop offset="100%" stopColor="#b8862a" />
          </linearGradient>
          <linearGradient id={`bg_${gradId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART.bellmanFord} />
            <stop offset="100%" stopColor="#2d7a72" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1.0].map((frac) => {
          const y = PT + (1 - frac) * plotH;
          const v = frac * maxVal;
          return (
            <g key={frac}>
              <line x1={PL} y1={y} x2={W - PR} y2={y} stroke={CHART.grid} />
              {frac > 0 && (
                <text x={PL - 5} y={y + 4} textAnchor="end" fontSize={11} fill={CHART.label}>
                  {v < 0.001 ? v.toExponential(1) : v.toFixed(3)}
                </text>
              )}
            </g>
          );
        })}

        <g
          onMouseEnter={() => setHover("dij")}
          onMouseLeave={() => setHover(null)}
          style={{ cursor: "pointer" }}
        >
          <rect x={cx - barW - gap / 2} y={PT} width={barW} height={plotH} fill="transparent" />
          <rect
            x={cx - barW - gap / 2}
            y={PT + plotH - dijH}
            width={barW}
            height={dijH}
            fill={`url(#dg_${gradId})`}
            rx={3}
            opacity={hover === "bf" ? 0.45 : 1}
            stroke={hover === "dij" ? CHART.dijkstra : "transparent"}
            strokeWidth={hover === "dij" ? 1.5 : 0}
            style={{ transition: "opacity 120ms ease" }}
          />
          <text
            x={cx - barW / 2 - gap / 2}
            y={PT + plotH - dijH - 6}
            textAnchor="middle"
            fontSize={hover === "dij" ? 13 : 11}
            fontWeight={hover === "dij" ? 700 : 400}
            fill={CHART.dijkstra}
          >
            {dijVal.toFixed(4)}
          </text>
          <text x={cx - barW / 2 - gap / 2} y={PT + plotH + 18} textAnchor="middle" fontSize={12} fill={CHART.dijkstra} fontWeight="700">
            Dijkstra
          </text>
        </g>

        <g
          onMouseEnter={() => setHover("bf")}
          onMouseLeave={() => setHover(null)}
          style={{ cursor: "pointer" }}
        >
          <rect x={cx + gap / 2} y={PT} width={barW} height={plotH} fill="transparent" />
          <rect
            x={cx + gap / 2}
            y={PT + plotH - bfH}
            width={barW}
            height={bfH}
            fill={`url(#bg_${gradId})`}
            rx={3}
            opacity={hover === "dij" ? 0.45 : 1}
            stroke={hover === "bf" ? CHART.bellmanFord : "transparent"}
            strokeWidth={hover === "bf" ? 1.5 : 0}
            style={{ transition: "opacity 120ms ease" }}
          />
          <text
            x={cx + barW / 2 + gap / 2}
            y={PT + plotH - bfH - 6}
            textAnchor="middle"
            fontSize={hover === "bf" ? 13 : 11}
            fontWeight={hover === "bf" ? 700 : 400}
            fill={CHART.bellmanFord}
          >
            {bfVal.toFixed(4)}
          </text>
          <text x={cx + barW / 2 + gap / 2} y={PT + plotH + 18} textAnchor="middle" fontSize={12} fill={CHART.bellmanFord} fontWeight="700">
            Bellman-Ford
          </text>
        </g>

        <line x1={PL} y1={PT} x2={PL} y2={PT + plotH} stroke={CHART.axis} />
        <line x1={PL} y1={PT + plotH} x2={W - PR} y2={PT + plotH} stroke={CHART.axis} />
        <text
          x={14}
          y={PT + plotH / 2}
          textAnchor="middle"
          fontSize={11}
          fill={CHART.label}
          transform={`rotate(-90, 14, ${PT + plotH / 2})`}
        >
          segundos
        </text>
      </svg>
    </div>
  );
}

export default function PageParte2() {
  const [sub, setSub] = useState(null);
  const [cmpRows, setCmpRows] = useState([]);
  const [timing, setTiming] = useState(null);
  const [exploracao, setExploracao] = useState(null);
  const [demos, setDemos] = useState(null);
  const [modal, setModal] = useState(null);
  const [vizDisponiveis, setVizDisponiveis] = useState(null);

  useEffect(() => {
    fetch("/out/parte2/subgrafo_metricas.json")
      .then((r) => r.json())
      .then(setSub)
      .catch(() => {});

    fetch("/out/parte2/demos_pesos_negativos.json")
      .then((r) => r.json())
      .then((j) => setDemos(Array.isArray(j) ? j : j.demos ?? []))
      .catch(() => {});

    fetch("/out/parte2/exploracao_bfs_dfs.json")
      .then((r) => r.json())
      .then(setExploracao)
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

    Promise.all(
      VIZ_IMAGES.map((img) =>
        fetch(img.src, { method: "HEAD" })
          .then((r) => (r.ok ? img : null))
          .catch(() => null)
      )
    ).then((found) => setVizDisponiveis(found.filter(Boolean)));
  }, []);

  const dij = timing?.dijkstra;
  const bf = timing?.bf;
  const hasSnapGraph = (demos && demos.length > 0) || (exploracao && (exploracao.bfs?.length > 0 || exploracao.dfs?.length > 0));

  return (
    <div className="page-parte2">
      <PageHeader
        eyebrow="SNAP RoadNet-CA"
        title="Parte 2 — SNAP RoadNet-CA"
        subtitle="Análise do subgrafo de estradas da Califórnia: benchmarking Dijkstra × Bellman-Ford, exploração BFS/DFS e grafo interativo com rotas completas."
      />

      {/* ── KPIs ─────────────────────────────────── */}
      {!sub ? (
        <SkeletonKpiGrid count={5} />
      ) : (
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
      )}

      {/* ── Grafo Interativo SNAP ─────────────── */}
      <section className="section">
        <h2 className="section-title">
          <Network size={18} strokeWidth={1.75} aria-hidden="true" />
          Grafo Interativo — SNAP RoadNet-CA
        </h2>
        <p className="section-lead">
          Visualize os grafos de demonstração de pesos negativos e explore a estrutura de camadas BFS/DFS do subgrafo.
          Clique em qualquer nó para ver o caminho completo a partir da fonte.
        </p>
        {hasSnapGraph ? (
          <SnapGraph demos={demos} exploracao={exploracao} />
        ) : (
          <EmptyState
            icon={Terminal}
            title="Grafo não disponível"
            description="Execute python -m src.cli parte2 no terminal do projeto para gerar os dados."
          />
        )}
      </section>

      {/* ── Visualizações PNG ──────────────────── */}
      <section className="section">
        <h2 className="section-title">
          <Microscope size={18} strokeWidth={1.75} aria-hidden="true" />
          Visualizações — subgrafo SNAP
        </h2>
        <p className="section-lead">
          Gráficos exploratórios gerados pela análise da Parte 2. Clique em uma imagem para ampliar.
        </p>
        {vizDisponiveis === null ? (
          <LoadingCenter label="Verificando visualizações…" />
        ) : vizDisponiveis.length > 0 ? (
          <ChartSequence images={vizDisponiveis} onOpen={setModal} />
        ) : (
          <EmptyState
            icon={Terminal}
            title="Nenhuma visualização encontrada"
            description="Execute python -m src.cli parte2 no terminal do projeto para gerar os gráficos do subgrafo SNAP."
          />
        )}
      </section>

      {/* ── BFS/DFS amostras (texto) ─────────── */}
      {exploracao && (exploracao.bfs?.length > 0 || exploracao.dfs?.length > 0) && (
        <div className="two-col">
          {exploracao.bfs?.length > 0 && (
            <section className="section" style={{ marginBottom: 0 }}>
              <h2 className="section-title">BFS dirigido — resumo</h2>
              {exploracao.bfs.map((b) => (
                <div key={b.fonte} style={{ marginBottom: "var(--space-5)" }}>
                  <div className="info-row">
                    <span className="info-key">Fonte</span>
                    <span className="info-val mono">{b.fonte}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-key">Nós alcançados</span>
                    <span className="info-val">{b.nos_alcancados?.toLocaleString()}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-key">Camadas (dist → qtd)</span>
                    <span className="info-val mono">
                      {Object.entries(b.camadas || {})
                        .map(([d, n]) => `${d}:${n}`)
                        .join(" · ")}
                    </span>
                  </div>
                </div>
              ))}
            </section>
          )}
          {exploracao.dfs?.length > 0 && (
            <section className="section" style={{ marginBottom: 0 }}>
              <h2 className="section-title">DFS dirigido — resumo</h2>
              {exploracao.dfs.map((d) => (
                <div key={d.fonte} style={{ marginBottom: "var(--space-5)" }}>
                  <div className="info-row">
                    <span className="info-key">Fonte</span>
                    <span className="info-val mono">{d.fonte}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-key">Nós visitados</span>
                    <span className="info-val">{d.nos_visitados?.toLocaleString()}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-key">Amostra da ordem</span>
                    <span className="info-val mono">
                      {(d.amostra_dfs || []).join(" → ")}
                    </span>
                  </div>
                </div>
              ))}
            </section>
          )}
        </div>
      )}

      {/* ── Tempos individuais ─────────────────── */}
      <div className="two-col">
        <section className="section">
          <h2 className="section-title">Dijkstra (SSSP)</h2>
          <div className="info-row">
            <span className="info-key">Fontes distintas</span>
            <span className="info-val">{timing?.fontes ?? "—"}</span>
          </div>
          <div className="info-row">
            <span className="info-key">Tempo total</span>
            <span className="info-val" style={{ color: "var(--color-primary)", fontWeight: 700 }}>
              {dij?.total?.toFixed(4) ?? "—"} s
            </span>
          </div>
          <div className="info-row">
            <span className="info-key">Tempo médio por fonte</span>
            <span className="info-val">{dij?.medio?.toFixed(4) ?? "—"} s</span>
          </div>
        </section>
        <section className="section">
          <h2 className="section-title">Bellman-Ford (SSSP)</h2>
          <div className="info-row">
            <span className="info-key">Fontes distintas</span>
            <span className="info-val">{timing?.fontes ?? "—"}</span>
          </div>
          <div className="info-row">
            <span className="info-key">Tempo total</span>
            <span className="info-val" style={{ color: "var(--color-accent)", fontWeight: 700 }}>
              {bf?.total?.toFixed(4) ?? "—"} s
            </span>
          </div>
          <div className="info-row">
            <span className="info-key">Tempo médio por fonte</span>
            <span className="info-val">{bf?.medio?.toFixed(4) ?? "—"} s</span>
          </div>
        </section>
      </div>

      {/* ── Benchmarking ──────────────────────── */}
      <section className="section">
        <h2 className="section-title">Benchmarking — Dijkstra × Bellman-Ford</h2>
        <p className="section-lead">
          Comparação de performance com escalas padronizadas por métrica.{" "}
          <span style={{ color: "var(--color-primary)" }}>■ Dijkstra</span> vs{" "}
          <span style={{ color: "var(--color-accent)" }}>■ Bellman-Ford</span>.
          Em grafos sem pesos negativos, Dijkstra é sistematicamente mais eficiente.
        </p>
        <div
          style={{
            display: "flex",
            gap: "var(--space-8)",
            justifyContent: "center",
            flexWrap: "wrap",
            paddingTop: "var(--space-2)",
          }}
        >
          <TimeBarchart label="Tempo Total (s)" dijVal={dij?.total} bfVal={bf?.total} gradId="total" />
          <TimeBarchart label="Tempo Médio por Fonte (s)" dijVal={dij?.medio} bfVal={bf?.medio} gradId="medio" />
        </div>
        {dij && bf && (
          <div className="insight-box" style={{ marginTop: "var(--space-6)" }}>
            Dijkstra foi{" "}
            <strong style={{ color: "var(--color-primary)" }}>
              {bf.total > 0 ? (bf.total / dij.total).toFixed(1) : "—"}×
            </strong>{" "}
            mais rápido no total. Coincidência de resultados:{" "}
            <strong style={{ color: "var(--color-success)" }}>
              {timing?.coincidencias}/{timing?.pares} pares
            </strong>
            .
          </div>
        )}
      </section>

      {/* ── Comparação tabela ─────────────────── */}
      <section className="section">
        <h2 className="section-title">Comparação BF × Dijkstra (primeiros 20 pares)</h2>
        {cmpRows.length === 0 ? (
          <LoadingCenter label="Carregando comparação…" />
        ) : (
          <InteractiveListTable
            title="Comparação BF × Dijkstra"
            items={mapComparacaoBfDijkstra(cmpRows)}
            searchPlaceholder="Buscar par origem–destino…"
            filterLabels={{ level: "Resultado", service: "Origem", status: "Destino" }}
          />
        )}
      </section>

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        caption={modal ? `${modal.label} — Esc para fechar` : ""}
      >
        {modal && <img src={modal.src} alt={modal.label} />}
      </Modal>
    </div>
  );
}
