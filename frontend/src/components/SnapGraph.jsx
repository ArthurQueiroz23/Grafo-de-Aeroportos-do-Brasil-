import { useEffect, useRef, useState, useMemo } from "react";
import { Network } from "vis-network";
import { DataSet } from "vis-data";
import { GitFork, Layers, Ban, AlertTriangle } from "lucide-react";

/* ─── palette ─────────────────────────────────────────────── */
const C = {
  src: { bg: "rgba(232,168,56,0.42)", border: "#e8a838", glow: "rgba(232,168,56,0.5)" },
  node: { bg: "rgba(61,155,143,0.25)", border: "#3d9b8f", glow: "rgba(0,0,0,0.4)" },
  path: { bg: "rgba(232,168,56,0.55)", border: "#e8a838", glow: "rgba(232,168,56,0.55)" },
  dimBg: "rgba(30,40,55,0.3)",
  dimBorder: "rgba(80,100,130,0.3)",
  edgePos: "rgba(110,155,180,0.88)",
  edgeNeg: "#e88b84",
  edgePath: "#e8a838",
  edgePathGlow: "rgba(232,168,56,0.55)",
  text: "#eef1f5",
  labelStroke: "#060810",
};

/* ─── vis-network options ──────────────────────────────────── */
const NET_OPTS = {
  autoResize: true,
  nodes: {
    shape: "dot",
    font: { face: "DM Sans, sans-serif", color: C.text, strokeWidth: 4, strokeColor: C.labelStroke },
  },
  edges: {
    smooth: { type: "curvedCW", roundness: 0.2 },
    selectionWidth: 0,
    hoverWidth: 0,
  },
  interaction: {
    hover: true,
    tooltipDelay: 80,
    dragNodes: true,
    dragView: true,
    zoomView: true,
    zoomSpeed: 0.4,
    navigationButtons: false,
    keyboard: { enabled: false },
  },
  physics: {
    enabled: true,
    solver: "forceAtlas2Based",
    forceAtlas2Based: {
      gravitationalConstant: -90,
      centralGravity: 0.01,
      springLength: 130,
      springConstant: 0.08,
      damping: 0.4,
      avoidOverlap: 0.9,
    },
    stabilization: { enabled: true, iterations: 220, updateInterval: 20 },
  },
  layout: { randomSeed: 42 },
};

/* ─── helpers ─────────────────────────────────────────────── */
function nodeTooltip(id, isSource, bfDist, dijDist, dijRecusou) {
  const col = isSource ? "#e8a838" : "#3d9b8f";
  let html = `<div style="background:#161d26;border:1px solid rgba(61,155,143,0.4);border-radius:10px;padding:12px 16px;font-family:'DM Sans',sans-serif;box-shadow:0 12px 32px rgba(0,0,0,0.4);">`;
  html += `<div style="font-size:16px;font-weight:700;color:${col}">nó ${id}${isSource ? " ★" : ""}</div>`;
  if (isSource) html += `<div style="font-size:11px;color:rgba(238,241,245,0.5);margin-top:4px">Nó fonte</div>`;
  if (bfDist !== undefined && bfDist !== null)
    html += `<div style="margin-top:8px;font-size:11px;color:rgba(238,241,245,0.7)">BF: <strong style="color:#3d9b8f">${Number(bfDist).toFixed(2)}</strong></div>`;
  if (!dijRecusou && dijDist !== undefined && dijDist !== null)
    html += `<div style="font-size:11px;color:rgba(238,241,245,0.7)">Dijkstra: <strong style="color:#e8a838">${Number(dijDist).toFixed(2)}</strong></div>`;
  else if (dijRecusou)
    html += `<div style="font-size:11px;color:#e88b84">Dijkstra recusou (peso neg.)</div>`;
  html += `</div>`;
  return html;
}

function buildDemoNodes(demo) {
  const ids = new Set();
  (demo.arestas || []).forEach(([u, v]) => { ids.add(String(u)); ids.add(String(v)); });
  const fonte = String(demo.fonte);
  const bfD = demo.bellman_ford?.distancias || {};
  const dijD = demo.dijkstra?.distancias || {};
  const dijRec = demo.dijkstra?.recusou === true;

  return Array.from(ids).map((id) => {
    const isSrc = id === fonte;
    const cfg = isSrc ? C.src : C.node;
    return {
      id,
      label: `nó ${id}`,
      title: nodeTooltip(id, isSrc, bfD[id], dijD[id], dijRec),
      shape: "dot",
      size: isSrc ? 28 : 20,
      color: {
        background: cfg.bg,
        border: cfg.border,
        highlight: { background: isSrc ? "rgba(232,168,56,0.7)" : "rgba(61,155,143,0.6)", border: "#fff" },
        hover: { background: isSrc ? "rgba(232,168,56,0.55)" : "rgba(61,155,143,0.45)", border: "#fff" },
      },
      font: {
        size: isSrc ? 14 : 12,
        color: C.text,
        face: "DM Sans, sans-serif",
        strokeWidth: isSrc ? 5 : 4,
        strokeColor: C.labelStroke,
      },
      borderWidth: isSrc ? 2.5 : 2,
      shadow: { enabled: true, color: cfg.glow, size: isSrc ? 20 : 7, x: 0, y: isSrc ? 0 : 2 },
      _isSrc: isSrc,
    };
  });
}

function buildDemoEdges(demo) {
  return (demo.arestas || []).map(([u, v, w], i) => {
    const neg = w < 0;
    return {
      id: `e${i}`,
      from: String(u),
      to: String(v),
      label: String(w),
      arrows: { to: { enabled: true, scaleFactor: 0.9, type: "arrow" } },
      color: { color: neg ? C.edgeNeg : C.edgePos, highlight: "#fff", hover: "#fff", opacity: 0.92 },
      width: neg ? 2.8 : 2,
      font: {
        color: neg ? "#e88b84" : "rgba(238,241,245,0.75)",
        size: 12,
        face: "DM Sans, sans-serif",
        strokeWidth: 3,
        strokeColor: C.labelStroke,
        align: "middle",
      },
      _w: w,
      _neg: neg,
    };
  });
}

function runBF(arestas, fonte) {
  const ids = new Set();
  arestas.forEach(([u, v]) => { ids.add(String(u)); ids.add(String(v)); });
  const list = Array.from(ids);
  const dist = {};
  const prev = {};
  list.forEach((n) => { dist[n] = Infinity; });
  dist[String(fonte)] = 0;

  for (let i = 0; i < list.length - 1; i++) {
    let changed = false;
    for (const [u, v, w] of arestas) {
      const su = String(u), sv = String(v);
      if (dist[su] !== Infinity && dist[su] + w < dist[sv]) {
        dist[sv] = dist[su] + w;
        prev[sv] = su;
        changed = true;
      }
    }
    if (!changed) break;
  }
  return { dist, prev };
}

function getPath(prev, target) {
  const path = [];
  let cur = target;
  const seen = new Set();
  while (cur !== undefined && !seen.has(cur)) {
    seen.add(cur);
    path.unshift(cur);
    cur = prev[cur];
  }
  return path.length > 1 ? path : null;
}

/* ─── PathDisplay ─────────────────────────────────────────── */
function PathDisplay({ path, label }) {
  if (!path || path.length < 2) return null;
  const hops = path.length - 1;
  const intermediaries = path.length - 2;
  return (
    <div>
      {label && (
        <div
          style={{
            fontSize: "var(--text-label)",
            fontWeight: 700,
            color: "var(--color-text-subtle)",
            textTransform: "uppercase",
            letterSpacing: "var(--tracking-wide)",
            marginBottom: "var(--space-2)",
          }}
        >
          {label}
        </div>
      )}
      <div className="result-path">
        {path.map((n, i) => (
          <span key={`${n}-${i}`}>
            <strong
              style={{
                color:
                  i === 0
                    ? "var(--color-primary)"
                    : i === path.length - 1
                      ? "var(--color-accent)"
                      : "var(--color-text)",
              }}
            >
              nó {n}
            </strong>
            {i < path.length - 1 && <span className="result-path-arrow">→</span>}
          </span>
        ))}
        <span
          style={{
            marginLeft: "var(--space-5)",
            fontSize: "var(--text-caption)",
            color: "var(--color-text-muted)",
            fontFamily: "var(--font-body)",
          }}
        >
          {hops} salto{hops !== 1 ? "s" : ""}
          {intermediaries > 0 && ` · ${intermediaries} intermediário${intermediaries !== 1 ? "s" : ""}`}
        </span>
      </div>
    </div>
  );
}

/* ─── DemoVis ─────────────────────────────────────────────── */
function DemoVis({ demo }) {
  const containerRef = useRef(null);
  const networkRef = useRef(null);
  const nodesRef = useRef(null);
  const edgesRef = useRef(null);

  const [selectedId, setSelectedId] = useState(null);
  const [ready, setReady] = useState(false);

  const nodeData = useMemo(() => buildDemoNodes(demo), [demo]);
  const edgeData = useMemo(() => buildDemoEdges(demo), [demo]);
  const fonte = String(demo.fonte);

  const { prev: bfPrev } = useMemo(
    () => runBF(demo.arestas || [], demo.fonte),
    [demo]
  );

  const pathToSelected = useMemo(() => {
    if (!selectedId || selectedId === fonte) return null;
    return getPath(bfPrev, selectedId);
  }, [selectedId, fonte, bfPrev]);

  useEffect(() => {
    if (!containerRef.current || !nodeData.length) return;
    setSelectedId(null);
    setReady(false);

    nodesRef.current = new DataSet(nodeData);
    edgesRef.current = new DataSet(edgeData);

    const network = new Network(
      containerRef.current,
      { nodes: nodesRef.current, edges: edgesRef.current },
      NET_OPTS
    );
    networkRef.current = network;

    network.once("stabilizationIterationsDone", () => {
      network.setOptions({ physics: { enabled: false } });
      network.fit({ animation: { duration: 500, easingFunction: "easeInOutQuad" } });
      setReady(true);
    });

    network.on("click", ({ nodes: ns }) => {
      setSelectedId(ns.length > 0 ? ns[0] : null);
    });

    return () => {
      network.destroy();
      networkRef.current = null;
    };
  }, [nodeData, edgeData]);

  useEffect(() => {
    if (!nodesRef.current || !edgesRef.current || !ready) return;

    const pathSet = new Set();
    const pathNodes = new Set(pathToSelected || []);
    if (pathToSelected) {
      for (let i = 0; i < pathToSelected.length - 1; i++)
        pathSet.add(`${pathToSelected[i]}__${pathToSelected[i + 1]}`);
    }
    const hasSel = !!selectedId;

    const nodeUpdates = nodesRef.current.get().map((n) => {
      const onPath = pathNodes.has(n.id);
      const dimmed = hasSel && !pathNodes.has(n.id) && n.id !== fonte;
      const cfg = n._isSrc ? C.src : C.node;
      return {
        id: n.id,
        opacity: dimmed ? 0.18 : 1,
        color: onPath
          ? { background: C.path.bg, border: C.path.border, highlight: { background: "rgba(232,168,56,0.75)", border: "#fff" } }
          : dimmed
            ? { background: C.dimBg, border: C.dimBorder }
            : { background: cfg.bg, border: cfg.border },
        shadow: {
          enabled: true,
          color: onPath ? C.path.glow : cfg.glow,
          size: onPath ? 22 : n._isSrc ? 20 : 7,
          x: 0,
          y: onPath || n._isSrc ? 0 : 2,
        },
      };
    });

    const edgeUpdates = edgesRef.current.get().map((e) => {
      const onPath = pathSet.has(`${e.from}__${e.to}`);
      const base = e._neg ? C.edgeNeg : C.edgePos;
      return {
        id: e.id,
        color: onPath
          ? { color: C.edgePath, opacity: 1 }
          : { color: base, opacity: hasSel ? 0.16 : 0.92 },
        width: onPath ? 4.5 : e._neg ? 2.8 : 2,
        shadow: onPath
          ? { enabled: true, color: C.edgePathGlow, size: 14, x: 0, y: 0 }
          : false,
      };
    });

    nodesRef.current.update(nodeUpdates);
    edgesRef.current.update(edgeUpdates);
  }, [pathToSelected, selectedId, ready, fonte]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <div className="graph-panel" style={{ position: "relative" }}>
        <span className="graph-hint">
          {selectedId && selectedId !== fonte
            ? `nó ${selectedId} selecionado — caminho BF destacado em âmbar`
            : selectedId === fonte
              ? "Nó fonte selecionado — clique em outro nó para ver o caminho"
              : "Clique em um nó para ver o caminho mínimo (BF) · Arraste · Zoom"}
        </span>
        <div
          ref={containerRef}
          className="graph-container"
          style={{ height: "min(500px, 62vh)", minHeight: 300 }}
        />
      </div>

      {pathToSelected && (
        <PathDisplay
          path={pathToSelected}
          label={`Caminho BF: fonte (nó ${fonte}) → nó ${selectedId}`}
        />
      )}

      {selectedId === fonte && (
        <div className="alert alert--info">
          Este é o nó fonte. Selecione outro nó para visualizar o caminho mínimo até ele.
        </div>
      )}
    </div>
  );
}

/* ─── BFSExplorer ─────────────────────────────────────────── */
function BFSExplorer({ exploracao }) {
  const containerRef = useRef(null);
  const networkRef = useRef(null);

  const bfs = exploracao?.bfs?.[0];
  const dfs = exploracao?.dfs?.[0];

  const { nodes, edges } = useMemo(() => {
    if (!bfs?.camadas) return { nodes: [], edges: [] };

    const entries = Object.entries(bfs.camadas)
      .map(([d, n]) => [Number(d), n])
      .sort((a, b) => a[0] - b[0]);

    const nodesArr = [
      {
        id: "src",
        label: `Fonte\nnó ${bfs.fonte}`,
        level: 0,
        shape: "dot",
        size: 28,
        color: { background: C.src.bg, border: C.src.border },
        font: { color: C.text, size: 13, face: "DM Sans, sans-serif", multi: true, strokeWidth: 4, strokeColor: C.labelStroke },
        shadow: { enabled: true, color: C.src.glow, size: 18, x: 0, y: 0 },
      },
    ];

    const edgesArr = [];

    entries.forEach(([depth, count]) => {
      const id = `L${depth}`;
      const fade = Math.max(80, 155 - depth * 14);
      const fadeB = Math.max(55, 143 - depth * 10);
      nodesArr.push({
        id,
        label: `Camada ${depth}\n${count.toLocaleString()} nós`,
        level: depth,
        shape: "dot",
        size: Math.max(13, Math.min(12 + Math.log10(count + 1) * 13, 36)),
        color: {
          background: `rgba(61,${fade},${fadeB},0.32)`,
          border: `rgba(61,${fade},${fadeB},0.85)`,
        },
        font: { color: C.text, size: 11, face: "DM Sans, sans-serif", multi: true, strokeWidth: 3, strokeColor: C.labelStroke },
      });

      const prev = depth === 1 ? "src" : `L${depth - 1}`;
      edgesArr.push({
        id: `e${depth}`,
        from: prev,
        to: id,
        label: `${count.toLocaleString()}`,
        arrows: { to: { enabled: true, scaleFactor: 0.8 } },
        color: { color: "rgba(61,155,143,0.72)", opacity: 0.88 },
        width: 2,
        font: { color: "rgba(238,241,245,0.62)", size: 10, face: "DM Sans, sans-serif", strokeWidth: 3, strokeColor: C.labelStroke },
        smooth: { type: "cubicBezier", forceDirection: "vertical", roundness: 0.38 },
      });
    });

    return { nodes: nodesArr, edges: edgesArr };
  }, [bfs]);

  useEffect(() => {
    if (!containerRef.current || !nodes.length) return;

    const network = new Network(
      containerRef.current,
      { nodes: new DataSet(nodes), edges: new DataSet(edges) },
      {
        ...NET_OPTS,
        layout: {
          hierarchical: {
            enabled: true,
            direction: "UD",
            sortMethod: "directed",
            levelSeparation: 90,
            nodeSpacing: 220,
          },
        },
        physics: { enabled: false },
      }
    );
    networkRef.current = network;
    network.fit({ animation: { duration: 400, easingFunction: "easeInOutQuad" } });

    return () => {
      network.destroy();
      networkRef.current = null;
    };
  }, [nodes, edges]);

  const dfsOrder = dfs?.amostra_dfs?.slice(0, 20) || [];
  const dfsExtra = dfs?.nos_visitados > 20 ? dfs.nos_visitados - 20 : 0;

  return (
    <div>
      {bfs && (
        <>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "var(--space-6)",
              marginBottom: "var(--space-5)",
            }}
          >
            <div className="info-row" style={{ flex: "1 1 180px", border: "none", paddingTop: 0 }}>
              <span className="info-key">Fonte BFS</span>
              <span className="info-val mono">nó {bfs.fonte}</span>
            </div>
            <div className="info-row" style={{ flex: "1 1 180px", border: "none", paddingTop: 0 }}>
              <span className="info-key">Nós alcançados</span>
              <span className="info-val">{bfs.nos_alcancados?.toLocaleString()}</span>
            </div>
            <div className="info-row" style={{ flex: "1 1 180px", border: "none", paddingTop: 0 }}>
              <span className="info-key">Camadas</span>
              <span className="info-val">{Object.keys(bfs.camadas || {}).length}</span>
            </div>
          </div>

          <div className="graph-panel" style={{ position: "relative" }}>
            <span className="graph-hint">
              Árvore BFS — cada camada mostra quantos nós estão a essa distância da fonte
            </span>
            <div
              ref={containerRef}
              className="graph-container"
              style={{ height: "min(440px, 55vh)", minHeight: 260 }}
            />
          </div>

          <div
            style={{
              marginTop: "var(--space-4)",
              padding: "var(--space-3) var(--space-5)",
              background: "var(--color-primary-muted)",
              border: "1px solid rgba(232,168,56,0.2)",
              borderRadius: "var(--radius-md)",
              fontSize: "var(--text-body)",
              color: "var(--color-text-muted)",
            }}
          >
            A partir do nó fonte, o BFS alcança{" "}
            <strong style={{ color: "var(--color-text)" }}>
              {bfs.nos_alcancados?.toLocaleString()}
            </strong>{" "}
            nós em{" "}
            <strong style={{ color: "var(--color-primary)" }}>
              {Object.keys(bfs.camadas || {}).length} camadas
            </strong>
            . Cada camada representa um conjunto de nós equidistantes da fonte.
          </div>
        </>
      )}

      {dfsOrder.length > 0 && (
        <div style={{ marginTop: "var(--space-8)" }}>
          <h3
            className="section-title"
            style={{
              fontSize: "var(--text-h3)",
              paddingBottom: "var(--space-3)",
              marginBottom: "var(--space-4)",
            }}
          >
            DFS dirigido — sequência de visita
          </h3>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "var(--space-6)",
              marginBottom: "var(--space-4)",
            }}
          >
            <div className="info-row" style={{ flex: "1 1 180px", border: "none", paddingTop: 0 }}>
              <span className="info-key">Fonte DFS</span>
              <span className="info-val mono">nó {dfs.fonte}</span>
            </div>
            <div className="info-row" style={{ flex: "1 1 180px", border: "none", paddingTop: 0 }}>
              <span className="info-key">Nós visitados</span>
              <span className="info-val">{dfs.nos_visitados?.toLocaleString()}</span>
            </div>
          </div>

          <div
            style={{
              fontSize: "var(--text-label)",
              fontWeight: 700,
              color: "var(--color-text-subtle)",
              textTransform: "uppercase",
              letterSpacing: "var(--tracking-wide)",
              marginBottom: "var(--space-2)",
            }}
          >
            Primeiros {dfsOrder.length} nós na ordem de visita
          </div>
          <div className="result-path">
            {dfsOrder.map((n, i) => (
              <span key={`${n}-${i}`}>
                <strong
                  style={{
                    color:
                      i === 0
                        ? "var(--color-primary)"
                        : i === dfsOrder.length - 1 && !dfsExtra
                          ? "var(--color-accent)"
                          : "var(--color-text)",
                  }}
                >
                  {n}
                </strong>
                {i < dfsOrder.length - 1 && <span className="result-path-arrow">→</span>}
              </span>
            ))}
            {dfsExtra > 0 && (
              <span
                style={{
                  marginLeft: "var(--space-3)",
                  fontSize: "var(--text-caption)",
                  color: "var(--color-text-muted)",
                }}
              >
                + {dfsExtra.toLocaleString()} nós…
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── SnapGraph (export) ──────────────────────────────────── */
const TABS = [
  { id: "demo", label: "Grafos Demo — Pesos Negativos", Icon: GitFork },
  { id: "bfs", label: "Exploração BFS / DFS", Icon: Layers },
];

export default function SnapGraph({ demos, exploracao }) {
  const [tab, setTab] = useState("demo");
  const [demoIdx, setDemoIdx] = useState(0);

  const hasDemos = demos && demos.length > 0;
  const hasExp =
    exploracao && (exploracao.bfs?.length > 0 || exploracao.dfs?.length > 0);

  const currentDemo = hasDemos ? demos[demoIdx] : null;

  return (
    <div>
      <div
        className="tabs"
        role="tablist"
        aria-label="Modos do grafo SNAP"
        style={{ marginBottom: "var(--space-6)" }}
      >
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={`tab-btn${tab === id ? " tab-btn--active" : ""}`}
            onClick={() => setTab(id)}
          >
            <Icon size={12} style={{ marginRight: 4 }} aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Demo tab ─────────────────────────── */}
      {tab === "demo" && (
        hasDemos ? (
          <div>
            {demos.length > 1 && (
              <div className="graph-controls" style={{ marginBottom: "var(--space-5)" }}>
                <div className="form-field">
                  <label className="form-label" htmlFor="snap-demo-sel">
                    Cenário
                  </label>
                  <select
                    id="snap-demo-sel"
                    className="ctrl-input ctrl-select"
                    style={{ minWidth: 260 }}
                    value={demoIdx}
                    onChange={(e) => {
                      setDemoIdx(Number(e.target.value));
                    }}
                  >
                    {demos.map((d, i) => (
                      <option key={d.id || i} value={i}>
                        {d.titulo}
                      </option>
                    ))}
                  </select>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "var(--space-5)",
                    alignItems: "center",
                    flexWrap: "wrap",
                    fontSize: "var(--text-caption)",
                    color: "var(--color-text-muted)",
                  }}
                >
                  {[
                    { color: C.edgeNeg, label: "Peso negativo" },
                    { color: C.edgePos, label: "Peso positivo" },
                    { color: C.edgePath, label: "Caminho BF" },
                  ].map(({ color, label }) => (
                    <span
                      key={label}
                      style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}
                    >
                      <span
                        style={{
                          display: "inline-block",
                          width: 20,
                          height: 3,
                          borderRadius: 2,
                          background: color,
                          flexShrink: 0,
                        }}
                      />
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {currentDemo && (
              <>
                <p
                  className="section-lead"
                  style={{ marginBottom: "var(--space-5)", maxWidth: "72ch" }}
                >
                  {currentDemo.descricao}
                </p>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "var(--space-6)",
                    marginBottom: "var(--space-5)",
                  }}
                >
                  <div className="info-row" style={{ flex: "1 1 120px", paddingTop: 0, border: "none" }}>
                    <span className="info-key">Nó fonte</span>
                    <span className="info-val mono">nó {currentDemo.fonte}</span>
                  </div>
                  <div
                    className="info-row"
                    style={{ flex: "2 1 320px", paddingTop: 0, border: "none", alignItems: "flex-start" }}
                  >
                    <span className="info-key" style={{ paddingTop: 2 }}>
                      Arestas
                    </span>
                    <span
                      className="info-val mono"
                      style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)" }}
                    >
                      {(currentDemo.arestas || []).map(([u, v, w], i) => (
                        <span
                          key={i}
                          style={{ color: w < 0 ? "var(--color-danger)" : "inherit" }}
                        >
                          {u}→{v}: {w > 0 ? "+" : ""}
                          {w}
                        </span>
                      ))}
                    </span>
                  </div>
                </div>

                <div className="two-col" style={{ marginBottom: "var(--space-6)" }}>
                  <div className="kpi-card" style={{ borderTop: "2px solid var(--color-primary)" }}>
                    <div className="kpi-label" style={{ color: "var(--color-primary)" }}>
                      Dijkstra
                    </div>
                    {currentDemo.dijkstra?.recusou ? (
                      <div
                        style={{
                          display: "flex",
                          gap: "var(--space-2)",
                          alignItems: "center",
                          color: "var(--color-danger)",
                          fontSize: "var(--text-body)",
                          marginTop: "var(--space-3)",
                          fontWeight: 600,
                        }}
                      >
                        <Ban size={15} aria-hidden="true" />
                        Recusou — requer pesos ≥ 0
                      </div>
                    ) : (
                      <div
                        style={{
                          marginTop: "var(--space-3)",
                          fontSize: "var(--text-caption)",
                          color: "var(--color-text-muted)",
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "var(--space-3)",
                        }}
                      >
                        {Object.entries(currentDemo.dijkstra?.distancias || {}).map(([n, d]) => (
                          <span key={n} className="mono">
                            nó {n}: {Number(d).toFixed(1)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="kpi-card" style={{ borderTop: "2px solid var(--color-accent)" }}>
                    <div className="kpi-label" style={{ color: "var(--color-accent)" }}>
                      Bellman-Ford
                    </div>
                    {currentDemo.bellman_ford?.tem_ciclo_negativo ? (
                      <div
                        style={{
                          display: "flex",
                          gap: "var(--space-2)",
                          alignItems: "center",
                          color: "var(--color-warning)",
                          fontSize: "var(--text-body)",
                          marginTop: "var(--space-3)",
                          fontWeight: 600,
                        }}
                      >
                        <AlertTriangle size={15} aria-hidden="true" />
                        Ciclo negativo detectado
                      </div>
                    ) : (
                      <div
                        style={{
                          marginTop: "var(--space-3)",
                          fontSize: "var(--text-caption)",
                          color: "var(--color-text-muted)",
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "var(--space-3)",
                        }}
                      >
                        {Object.entries(currentDemo.bellman_ford?.distancias || {}).map(([n, d]) => (
                          <span key={n} className="mono">
                            nó {n}: {Number(d).toFixed(1)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <DemoVis key={`demo-${demoIdx}`} demo={currentDemo} />
              </>
            )}
          </div>
        ) : (
          <div className="alert alert--info">
            Dados dos demos não disponíveis. Execute{" "}
            <code>python -m src.cli parte2</code> para gerar.
          </div>
        )
      )}

      {/* ── BFS tab ──────────────────────────── */}
      {tab === "bfs" && (
        hasExp ? (
          <BFSExplorer exploracao={exploracao} />
        ) : (
          <div className="alert alert--info">
            Dados de exploração BFS/DFS não disponíveis. Execute{" "}
            <code>python -m src.cli parte2</code> para gerar.
          </div>
        )
      )}
    </div>
  );
}
