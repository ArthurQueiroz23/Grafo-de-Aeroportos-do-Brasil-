import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { Network } from "vis-network";
import { DataSet } from "vis-data";
import { Focus, X, Plus, Minus, Maximize2 } from "lucide-react";
import AppButton from "./ui/AppButton.jsx";
import { REGION_HEX, GRAPH } from "../constants/theme.js";
import { layoutAirports } from "./grafoLayout.js";

// ms entre cada nó na fase de exploração (mais rápido que a animação de caminho)
const EXPLORE_STEP_MS = 28;

const NETWORK_OPTIONS = {
  autoResize: true,
  nodes: {
    shape: "dot",
    borderWidth: 2,
    borderWidthSelected: 3,
    shadow: {
      enabled: true,
      color: "rgba(0,0,0,0.45)",
      size: 8,
      x: 0,
      y: 2,
    },
    font: {
      face: "DM Sans, sans-serif",
      color: GRAPH.text,
      strokeWidth: 4,
      strokeColor: GRAPH.labelStroke,
      align: "center",
    },
    scaling: { min: 14, max: 44 },
  },
  edges: {
    selectionWidth: 0,
    hoverWidth: 0,
    shadow: false,
    smooth: false,
    arrows: { to: { enabled: false } },
  },
  interaction: {
    hover: true,
    tooltipDelay: 120,
    hideEdgesOnDrag: false,
    hideEdgesOnZoom: false,
    dragNodes: true,
    dragView: true,
    zoomView: true,
    zoomSpeed: 0.35,
    multiselect: false,
    navigationButtons: false,
    keyboard: { enabled: false },
  },
  physics: { enabled: false },
  layout: { randomSeed: 42 },
};

// Delay entre segmentos na animação de traçado
const ANIM_STEP_MS = 260;

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

function edgeColorByWeight(weight, isMandatory) {
  if (isMandatory) return GRAPH.mandatory;
  if (weight >= 2.5) return GRAPH.inter;
  if (weight >= 1.8) return GRAPH.hub;
  return GRAPH.edgeDefault;
}

function buildTooltip(id, regiao, grau, regionColor, isHub) {
  const rgb = hexToRgb(regionColor);
  return [
    `<div style="background:#161d26;border:1px solid rgba(${rgb},0.5);`,
    `border-radius:10px;padding:12px 16px;font-family:'DM Sans',sans-serif;`,
    `box-shadow:0 12px 32px rgba(0,0,0,0.4);">`,
    `<div style="font-size:16px;font-weight:700;color:${regionColor};letter-spacing:0.04em;">${id}</div>`,
    regiao
      ? `<div style="font-size:11px;color:rgba(238,241,245,0.55);margin-top:6px;">${regiao}</div>`
      : "",
    `<div style="display:flex;gap:12px;margin-top:8px;font-size:11px;color:rgba(238,241,245,0.7);">`,
    `<span>Grau <strong style="color:#eef1f5;">${grau}</strong></span>`,
    isHub ? `<span style="color:${regionColor};">★ Hub</span>` : "",
    `</div></div>`,
  ].join("");
}

// Tooltip para arestas do caminho — mostra trecho, peso e posição no percurso
function buildEdgeTooltip(from, to, weight, step, total) {
  return [
    `<div style="background:#161d26;border:1px solid rgba(232,168,56,0.38);`,
    `border-radius:10px;padding:10px 14px;font-family:'DM Sans',sans-serif;`,
    `box-shadow:0 12px 32px rgba(0,0,0,0.45);min-width:160px;">`,
    `<div style="font-size:13px;font-weight:700;color:#e8a838;letter-spacing:0.04em;margin-bottom:6px;">`,
    `${from} <span style="opacity:0.55;font-weight:400;">›</span> ${to}`,
    `</div>`,
    `<div style="display:flex;gap:14px;font-size:11px;color:rgba(238,241,245,0.7);">`,
    `<span>Peso <strong style="color:#eef1f5;font-family:'JetBrains Mono',monospace;">${weight.toFixed(1)}</strong></span>`,
    `<span>Passo <strong style="color:#eef1f5;">${step}<span style="opacity:0.45">/${total}</span></strong></span>`,
    `</div>`,
    `</div>`,
  ].join("");
}

function buildNode(a, regionMap, grauMap, maxGrau) {
  const grau = grauMap[a.id] || 1;
  const regiao = regionMap[a.id] || "";
  const regionColor = REGION_HEX[regiao] || GRAPH.path;
  const rgb = hexToRgb(regionColor);
  const hasGraus = Object.keys(grauMap).length > 0;
  const isHub = hasGraus && grau >= maxGrau * 0.4;
  const size = hasGraus ? Math.round(16 + (grau / maxGrau) * 18) : 20;

  const color = {
    background: `rgba(${rgb},0.28)`,
    border: regionColor,
    highlight: { background: `rgba(${rgb},0.55)`, border: "#ffffff" },
    hover:     { background: `rgba(${rgb},0.45)`, border: "#ffffff" },
  };

  return {
    id: a.id,
    label: a.id,
    title: buildTooltip(a.id, regiao, grau, regionColor, isHub),
    x: a.x,
    y: a.y,
    physics: false,
    fixed: false,
    color,
    font: {
      size: isHub ? 12 : 10,
      color: GRAPH.text,
      strokeWidth: isHub ? 5 : 4,
      strokeColor: GRAPH.labelStroke,
      vadjust: Math.round(size * 0.55) + 10,
    },
    size: isHub ? size + 4 : size,
    borderWidth: isHub ? 2.5 : 2,
    shadow: isHub
      ? { enabled: true, color: `rgba(${rgb},0.5)`, size: 16, x: 0, y: 0 }
      : { enabled: true, color: "rgba(0,0,0,0.35)", size: 6, x: 0, y: 2 },
    _regiao: regiao,
    _grau: grau,
    _regionColor: regionColor,
    _baseColor: color,
    _baseSize: isHub ? size + 4 : size,
    _baseBorder: isHub ? 2.5 : 2,
    _baseShadow: isHub,
  };
}

function buildEdges(edges, mandatorySet, minW, rangeW) {
  return edges.map((e, idx) => {
    const isMandatory =
      mandatorySet.has(`${e.from}__${e.to}`) ||
      mandatorySet.has(`${e.to}__${e.from}`);
    const normW = (e.weight - minW) / rangeW;
    const w = e.weight || 1;
    const color = edgeColorByWeight(w, isMandatory);
    const width = isMandatory ? 3 : 1.8 + normW * 2.4;

    return {
      id: idx,
      from: e.from,
      to: e.to,
      color: {
        color,
        highlight: color,
        hover: GRAPH.edgeHover,
        opacity: isMandatory ? 1 : 0.85,
      },
      width,
      smooth: false,
      arrows: { to: { enabled: false } },
      _mandatory: isMandatory,
      _weight: w,
      _normW: normW,
      _baseWidth: width,
      _baseColor: color,
      _baseOpacity: isMandatory ? 1 : 0.85,
    };
  });
}

function getNeighbors(edgeList, nodeId) {
  const set = new Set([nodeId]);
  edgeList.forEach((e) => {
    if (e._filterHidden) return;
    if (e.from === nodeId) set.add(e.to);
    if (e.to === nodeId) set.add(e.from);
  });
  return set;
}

const PATH_DEST_COLOR = "#3d9b8f";
const PATH_DEST_GLOW  = "rgba(61,155,143,0.55)";

function GraphLegend({ className = "", algoLabel = "Caminho mínimo", showExplore = false }) {
  return (
    <div className={`graph-legend-card ${className}`.trim()}>
      <div className="graph-legend-title">Legenda</div>
      <div className="graph-legend-items">
        <div className="graph-legend-item">
          <span
            className="graph-legend-swatch graph-legend-swatch--line"
            style={{ background: GRAPH.mandatory }}
          />
          Rotas obrigatórias
        </div>
        <div className="graph-legend-item">
          <span
            className="graph-legend-swatch graph-legend-swatch--line graph-legend-swatch--path"
            style={{ background: GRAPH.path }}
          />
          {algoLabel} — origem
        </div>
        <div className="graph-legend-item">
          <span
            className="graph-legend-swatch graph-legend-swatch--line graph-legend-swatch--path"
            style={{ background: PATH_DEST_COLOR, boxShadow: `0 0 8px ${PATH_DEST_GLOW}` }}
          />
          {algoLabel} — destino
        </div>
        {showExplore && (
          <div className="graph-legend-item">
            <span
              className="graph-legend-swatch graph-legend-swatch--line graph-legend-swatch--explore"
            />
            Nós explorados
          </div>
        )}
        <div className="graph-legend-item">
          <span
            className="graph-legend-swatch graph-legend-swatch--line"
            style={{ background: GRAPH.hub }}
          />
          Rotas hub / longo alcance
        </div>
        <div className="graph-legend-item">
          <span className="graph-legend-swatch graph-legend-swatch--line graph-legend-swatch--gradient" />
          Malha regional
        </div>
      </div>
    </div>
  );
}

export default function GrafoVis({
  airports,
  edges,
  mandatoryPairs,
  highlightPath = [],
  explorationOrder = [],
  regionMap = {},
  grauMap = {},
  algoLabel = "Caminho mínimo",
}) {
  const containerRef    = useRef(null);
  const networkRef      = useRef(null);
  const nodesRef        = useRef(null);
  const edgesRef        = useRef(null);
  const selectedIdRef   = useRef(null);
  const didDragRef      = useRef(false);
  const isInitialFitRef = useRef(true);
  const animTimersRef   = useRef([]);       // timers da animação de traçado
  const prevPathRef     = useRef([]);       // detecta mudança real de rota

  const highlightPathRef = useRef(highlightPath);
  const routesOnRef      = useRef(true);

  const [searchVal, setSearchVal]           = useState("");
  const [routesOn, setRoutesOn]             = useState(true);
  const [filterRegion, setFilterRegion]     = useState("");
  const [filterMinDegree, setFilterMinDegree] = useState(0);
  const [metrics, setMetrics]               = useState({ nodes: 0, edges: 0, density: 0 });
  const [selectedId, setSelectedId]         = useState(null);
  const [routeCount, setRouteCount]         = useState(0);

  highlightPathRef.current = highlightPath;
  routesOnRef.current      = routesOn;

  const maxGrau = useMemo(() => {
    const vals = Object.values(grauMap);
    return vals.length > 0 ? Math.max(...vals) : 1;
  }, [grauMap]);

  // ── Cancela todos os timers de animação pendentes ───────────────────────────
  const clearAnimTimers = useCallback(() => {
    animTimersRef.current.forEach(clearTimeout);
    animTimersRef.current = [];
  }, []);

  const fitNetwork = useCallback((options = {}) => {
    const { clearSelection = false } = options;
    const network = networkRef.current;
    if (!network || !nodesRef.current) return;

    if (clearSelection) {
      selectedIdRef.current = null;
      setSelectedId(null);
      setRouteCount(0);
      network.unselectAll();
    }

    const ids = nodesRef.current
      .get({ filter: (n) => !n.hidden })
      .map((n) => n.id);

    if (!ids.length) return;

    requestAnimationFrame(() => {
      try {
        network.fit({
          nodes: ids,
          animation: {
            duration: isInitialFitRef.current ? 0 : 400,
            easingFunction: "easeInOutQuad",
          },
        });
      } catch {
        const positions = network.getPositions(ids);
        const xs = [];
        const ys = [];
        ids.forEach((id) => {
          const p = positions[id];
          if (p) { xs.push(p.x); ys.push(p.y); }
        });
        if (!xs.length || !containerRef.current) return;
        const pad = 80;
        const minX = Math.min(...xs) - pad;
        const maxX = Math.max(...xs) + pad;
        const minY = Math.min(...ys) - pad;
        const maxY = Math.max(...ys) + pad;
        const { clientWidth: w, clientHeight: h } = containerRef.current;
        const scale = Math.min(w / (maxX - minX), h / (maxY - minY)) * 0.9;
        network.moveTo({
          position: { x: (minX + maxX) / 2, y: (minY + maxY) / 2 },
          scale: Math.max(0.15, Math.min(2.5, scale)),
          animation: {
            duration: isInitialFitRef.current ? 0 : 400,
            easingFunction: "easeInOutQuad",
          },
        });
      }
      isInitialFitRef.current = false;
    });
  }, []);

  const zoomBy = useCallback((factor) => {
    const network = networkRef.current;
    if (!network) return;
    const scale = network.getScale();
    network.moveTo({
      scale: Math.max(0.1, Math.min(4, scale * factor)),
      animation: { duration: 220, easingFunction: "easeInOutQuad" },
    });
  }, []);

  // ── Estilos de arestas + tooltips nas arestas do caminho ───────────────────
  const syncEdgeStyles = useCallback((focusId, pathList, showMandatory) => {
    if (!edgesRef.current) return 0;

    // Mapa passo→aresta para tooltip: guarda a direção canônica do path
    const pathEdgeStepMap = new Map();
    if (pathList?.length > 1) {
      const total = pathList.length - 1;
      for (let i = 0; i < pathList.length - 1; i++) {
        const info = { from: pathList[i], to: pathList[i + 1], step: i + 1, total };
        pathEdgeStepMap.set(`${pathList[i]}__${pathList[i + 1]}`, info);
        pathEdgeStepMap.set(`${pathList[i + 1]}__${pathList[i]}`, info);
      }
    }

    let visibleRoutes = 0;

    edgesRef.current.update(
      edgesRef.current.get().map((e) => {
        if (e._filterHidden) {
          return { id: e.id, hidden: true, _selectionHidden: false };
        }

        const inPath = pathEdgeStepMap.has(`${e.from}__${e.to}`);
        const connected = focusId && (e.from === focusId || e.to === focusId);
        const mandatory = e._mandatory && showMandatory;

        if (focusId && !connected && !inPath) {
          return { id: e.id, hidden: true, _selectionHidden: true, title: null };
        }

        visibleRoutes += 1;

        if (inPath) {
          const info = pathEdgeStepMap.get(`${e.from}__${e.to}`);
          return {
            id: e.id,
            hidden: false,
            _selectionHidden: false,
            color: { color: GRAPH.path, opacity: 1 },
            width: 4.5,
            shadow: { enabled: true, color: GRAPH.pathGlow, size: 14, x: 0, y: 0 },
            title: buildEdgeTooltip(info.from, info.to, e._weight, info.step, info.total),
            zIndex: 3,
          };
        }

        if (focusId && connected) {
          return {
            id: e.id,
            hidden: false,
            _selectionHidden: false,
            color: { color: e._baseColor, opacity: 1 },
            width: e._baseWidth + 1.2,
            shadow: { enabled: true, color: "rgba(232,168,56,0.25)", size: 6, x: 0, y: 0 },
            title: null,
            zIndex: 2,
          };
        }

        if (!showMandatory && mandatory) {
          return {
            id: e.id,
            hidden: false,
            _selectionHidden: false,
            color: { color: e._baseColor, opacity: e._baseOpacity * 0.35 },
            width: e._baseWidth * 0.7,
            shadow: false,
            title: null,
            zIndex: 0,
          };
        }

        return {
          id: e.id,
          hidden: false,
          _selectionHidden: false,
          color: {
            color: mandatory ? GRAPH.mandatory : e._baseColor,
            opacity: mandatory ? 1 : e._baseOpacity,
          },
          width: mandatory ? e._baseWidth + 0.5 : e._baseWidth,
          shadow: false,
          title: null,
          zIndex: mandatory ? 1 : 0,
        };
      })
    );

    return visibleRoutes;
  }, []);

  // ── Estilos de nós ─────────────────────────────────────────────────────────
  const syncNodeStyles = useCallback((focusId, pathList) => {
    if (!nodesRef.current || !edgesRef.current) return;

    const pathNodes  = new Set(pathList || []);
    const pathOrigin = pathList?.length > 0 ? pathList[0] : null;
    const pathDest   = pathList?.length > 1 ? pathList[pathList.length - 1] : null;

    const neighborSet = focusId
      ? getNeighbors(edgesRef.current.get(), focusId)
      : null;

    nodesRef.current.update(
      nodesRef.current.get().map((n) => {
        if (n.hidden) return { id: n.id };

        const rgb        = hexToRgb(n._regionColor || GRAPH.path);
        const onPath     = pathNodes.has(n.id);
        const isOrigin   = onPath && n.id === pathOrigin;
        const isDest     = onPath && n.id === pathDest;
        const isSelected = focusId === n.id;
        const isNeighbor = neighborSet?.has(n.id);

        // Nós do caminho nunca ficam opacos — têm prioridade sobre o foco
        const dimmed = focusId && !isNeighbor && !onPath;

        if (dimmed) {
          return {
            id: n.id,
            opacity: 0.18,
            font: { color: "rgba(238,241,245,0.25)" },
            color: {
              ...n._baseColor,
              background: `rgba(${rgb},0.08)`,
              border: `rgba(${rgb},0.35)`,
            },
          };
        }

        if (isOrigin) {
          return {
            id: n.id,
            opacity: 1,
            borderWidth: 4,
            size: n._baseSize + 12,
            color: {
              background: "rgba(232,168,56,0.32)",
              border: GRAPH.path,
              highlight: { background: "rgba(232,168,56,0.55)", border: "#fff" },
              hover:     { background: "rgba(232,168,56,0.45)", border: "#fff" },
            },
            font: {
              size: 13,
              color: GRAPH.text,
              strokeWidth: 5,
              strokeColor: GRAPH.labelStroke,
              vadjust: Math.round((n._baseSize + 12) * 0.55) + 10,
            },
            shadow: { enabled: true, color: GRAPH.pathGlow, size: 30, x: 0, y: 0 },
          };
        }

        if (isDest) {
          return {
            id: n.id,
            opacity: 1,
            borderWidth: 4,
            size: n._baseSize + 12,
            color: {
              background: "rgba(61,155,143,0.32)",
              border: PATH_DEST_COLOR,
              highlight: { background: "rgba(61,155,143,0.55)", border: "#fff" },
              hover:     { background: "rgba(61,155,143,0.45)", border: "#fff" },
            },
            font: {
              size: 13,
              color: GRAPH.text,
              strokeWidth: 5,
              strokeColor: GRAPH.labelStroke,
              vadjust: Math.round((n._baseSize + 12) * 0.55) + 10,
            },
            shadow: { enabled: true, color: PATH_DEST_GLOW, size: 30, x: 0, y: 0 },
          };
        }

        if (onPath) {
          return {
            id: n.id,
            opacity: 1,
            borderWidth: 3,
            size: n._baseSize + 6,
            color: {
              ...n._baseColor,
              border: "#c8d4e4",
              background: `rgba(${rgb},0.5)`,
            },
            font: {
              size: 12,
              color: GRAPH.text,
              strokeWidth: 5,
              strokeColor: GRAPH.labelStroke,
              vadjust: Math.round((n._baseSize + 6) * 0.55) + 10,
            },
            shadow: { enabled: true, color: "rgba(200,212,228,0.35)", size: 18, x: 0, y: 0 },
          };
        }

        return {
          id: n.id,
          opacity: 1,
          size: isSelected ? n._baseSize + 8 : n._baseSize,
          borderWidth: isSelected ? 3.5 : n._baseBorder,
          color: isSelected
            ? { ...n._baseColor, border: "#ffffff", background: `rgba(${rgb},0.55)` }
            : n._baseColor,
          font: {
            size: isSelected ? 12 : n.font?.size || 10,
            color: GRAPH.text,
            strokeWidth: isSelected ? 5 : 4,
            strokeColor: GRAPH.labelStroke,
            vadjust: Math.round(n._baseSize * 0.55) + 10,
          },
          shadow: isSelected || n._baseShadow
            ? {
                enabled: true,
                color: isSelected ? "rgba(232,168,56,0.45)" : `rgba(${rgb},0.45)`,
                size: isSelected ? 22 : 16,
                x: 0, y: 0,
              }
            : { enabled: true, color: "rgba(0,0,0,0.35)", size: 6, x: 0, y: 2 },
        };
      })
    );
  }, []);

  // ── Animação de traçado da rota — revela aresta por aresta ─────────────────
  const animatePathReveal = useCallback((pathList) => {
    clearAnimTimers();

    if (!pathList || pathList.length < 2 || !edgesRef.current || !nodesRef.current) {
      const id = selectedIdRef.current;
      syncEdgeStyles(id, pathList || [], routesOnRef.current);
      syncNodeStyles(id, pathList || []);
      return;
    }

    // Aplica o estado final completo primeiro — garante que flags hidden/_selectionHidden
    // estejam corretas para a nova rota e limpa qualquer destaque de rota anterior.
    // Tudo acontece antes do próximo render, então o usuário não vê este estado intermediário.
    const focusId = selectedIdRef.current;
    syncEdgeStyles(focusId, pathList, routesOnRef.current);
    syncNodeStyles(focusId, pathList);

    const pathNodeSet = new Set(pathList);
    const total = pathList.length - 1;

    // Pré-estado de animação: arestas do caminho aparecem fracas/tracejadas
    const pathEdgeKeys = new Set();
    for (let i = 0; i < pathList.length - 1; i++) {
      pathEdgeKeys.add(`${pathList[i]}__${pathList[i + 1]}`);
      pathEdgeKeys.add(`${pathList[i + 1]}__${pathList[i]}`);
    }

    edgesRef.current.update(
      edgesRef.current.get()
        .filter((e) => pathEdgeKeys.has(`${e.from}__${e.to}`))
        .map((e) => ({
          id: e.id,
          color: { color: GRAPH.path, opacity: 0.1 },
          width: 1.5,
          shadow: false,
          title: null,
        }))
    );

    // Origem revelada imediatamente, demais nós do caminho começam opacos
    nodesRef.current.update(
      nodesRef.current.get()
        .filter((n) => pathNodeSet.has(n.id) && !n.hidden)
        .map((n) => {
          if (n.id === pathList[0]) {
            // Origem — estilo completo desde o início
            return {
              id: n.id,
              opacity: 1,
              borderWidth: 4,
              size: n._baseSize + 12,
              color: {
                background: "rgba(232,168,56,0.32)",
                border: GRAPH.path,
                highlight: { background: "rgba(232,168,56,0.55)", border: "#fff" },
                hover:     { background: "rgba(232,168,56,0.45)", border: "#fff" },
              },
              font: {
                size: 13,
                color: GRAPH.text,
                strokeWidth: 5,
                strokeColor: GRAPH.labelStroke,
                vadjust: Math.round((n._baseSize + 12) * 0.55) + 10,
              },
              shadow: { enabled: true, color: GRAPH.pathGlow, size: 30, x: 0, y: 0 },
            };
          }
          // Intermediários e destino — opacos até chegarem na sequência
          const rgb = hexToRgb(n._regionColor || GRAPH.path);
          return {
            id: n.id,
            opacity: 0.1,
            size: n._baseSize,
            borderWidth: n._baseBorder,
            color: { ...n._baseColor, background: `rgba(${rgb},0.04)`, border: `rgba(${rgb},0.15)` },
            shadow: false,
          };
        })
    );

    // Revela cada segmento com delay acumulado
    for (let step = 0; step < total; step++) {
      const from       = pathList[step];
      const to         = pathList[step + 1];
      const stepNum    = step + 1;
      const isLastStep = step === total - 1;

      const timer = setTimeout(() => {
        if (!edgesRef.current || !nodesRef.current) return;

        // Revela a aresta deste segmento
        const edge = edgesRef.current.get().find(
          (e) => (e.from === from && e.to === to) || (e.from === to && e.to === from)
        );
        if (edge) {
          edgesRef.current.update({
            id: edge.id,
            color: { color: GRAPH.path, opacity: 1 },
            width: 4.5,
            shadow: { enabled: true, color: GRAPH.pathGlow, size: 14, x: 0, y: 0 },
            title: buildEdgeTooltip(from, to, edge._weight, stepNum, total),
            zIndex: 3,
          });
        }

        // Revela o nó de chegada deste segmento
        const node = nodesRef.current.get(to);
        if (node && !node.hidden) {
          const rgb = hexToRgb(node._regionColor || GRAPH.path);
          if (isLastStep) {
            nodesRef.current.update({
              id: to,
              opacity: 1,
              borderWidth: 4,
              size: node._baseSize + 12,
              color: {
                background: "rgba(61,155,143,0.32)",
                border: PATH_DEST_COLOR,
                highlight: { background: "rgba(61,155,143,0.55)", border: "#fff" },
                hover:     { background: "rgba(61,155,143,0.45)", border: "#fff" },
              },
              font: {
                size: 13,
                color: GRAPH.text,
                strokeWidth: 5,
                strokeColor: GRAPH.labelStroke,
                vadjust: Math.round((node._baseSize + 12) * 0.55) + 10,
              },
              shadow: { enabled: true, color: PATH_DEST_GLOW, size: 30, x: 0, y: 0 },
            });
          } else {
            nodesRef.current.update({
              id: to,
              opacity: 1,
              borderWidth: 3,
              size: node._baseSize + 6,
              color: { ...node._baseColor, border: "#c8d4e4", background: `rgba(${rgb},0.5)` },
              font: {
                size: 12,
                color: GRAPH.text,
                strokeWidth: 5,
                strokeColor: GRAPH.labelStroke,
                vadjust: Math.round((node._baseSize + 6) * 0.55) + 10,
              },
              shadow: { enabled: true, color: "rgba(200,212,228,0.35)", size: 18, x: 0, y: 0 },
            });
          }
        }

        // Após o último segmento, chama sync completo para garantir estado final
        // (lida com edge cases: nós ocultos por filtro, seleção ativa, etc.)
        if (isLastStep) {
          const finalTimer = setTimeout(() => {
            const id = selectedIdRef.current;
            syncEdgeStyles(id, pathList, routesOnRef.current);
            syncNodeStyles(id, pathList);
          }, 60);
          animTimersRef.current.push(finalTimer);
        }
      }, step * ANIM_STEP_MS);

      animTimersRef.current.push(timer);
    }
  }, [clearAnimTimers, syncEdgeStyles, syncNodeStyles]);

  // ── Animação de exploração — ilumina nós na ordem de visita do algoritmo ──────
  // Roda ANTES de animatePathReveal; onComplete dispara a fase de caminho.
  const animateExploration = useCallback(
    (order, onComplete) => {
      clearAnimTimers();
      if (!order.length || !nodesRef.current) {
        onComplete?.();
        return;
      }

      // Não anima nós que serão destacados como caminho (ficam para a fase seguinte)
      const pathSet = new Set(highlightPathRef.current);
      const nodesToAnimate = order.filter((id) => !pathSet.has(id));

      if (!nodesToAnimate.length) {
        onComplete?.();
        return;
      }

      nodesToAnimate.forEach((id, i) => {
        const timer = setTimeout(() => {
          if (!nodesRef.current) return;
          const node = nodesRef.current.get(id);
          if (!node || node.hidden) return;
          nodesRef.current.update({
            id,
            opacity: 0.92,
            size: node._baseSize + 4,
            color: {
              background: "rgba(107, 153, 200, 0.26)",
              border: GRAPH.explore,
              highlight: { background: "rgba(107, 153, 200, 0.48)", border: "#ffffff" },
              hover:     { background: "rgba(107, 153, 200, 0.38)", border: "#ffffff" },
            },
            shadow: {
              enabled: true,
              color: GRAPH.exploreGlow,
              size: 14,
              x: 0,
              y: 0,
            },
          });
        }, i * EXPLORE_STEP_MS);
        animTimersRef.current.push(timer);
      });

      // Breve pausa após exploração antes de revelar o caminho
      const pauseTimer = setTimeout(
        () => onComplete?.(),
        nodesToAnimate.length * EXPLORE_STEP_MS + 220
      );
      animTimersRef.current.push(pauseTimer);
    },
    [clearAnimTimers]
  );

  const applySelection = useCallback(
    (id) => {
      clearAnimTimers(); // seleção cancela qualquer animação em andamento
      selectedIdRef.current = id;
      setSelectedId(id);

      const network = networkRef.current;
      if (network) {
        if (id) network.selectNodes([id]);
        else network.unselectAll();
      }

      const count = syncEdgeStyles(id, highlightPathRef.current, routesOnRef.current);
      setRouteCount(id ? count : 0);
      syncNodeStyles(id, highlightPathRef.current);
    },
    [clearAnimTimers, syncEdgeStyles, syncNodeStyles]
  );

  const applySelectionRef = useRef(applySelection);
  applySelectionRef.current = applySelection;

  const focusNode = useCallback((id) => {
    if (!networkRef.current || !id) return;
    networkRef.current.focus(id, {
      scale: 1.55,
      animation: { duration: 480, easingFunction: "easeInOutQuad" },
    });
  }, []);

  // ── Inicialização da rede vis-network ──────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || !airports?.length || !edges?.length) return;

    isInitialFitRef.current = true;
    selectedIdRef.current = null;
    setSelectedId(null);
    setRouteCount(0);
    clearAnimTimers();

    const mandatorySet = new Set(
      (mandatoryPairs || []).map(([a, b]) => `${a}__${b}`)
    );

    const weights = edges.map((e) => e.weight || 1);
    const minW = Math.min(...weights);
    const maxW = Math.max(...weights);
    const rangeW = maxW - minW || 1;

    const scaledAirports = layoutAirports(airports);
    const nodeData = scaledAirports.map((a) =>
      buildNode(a, regionMap, grauMap, maxGrau)
    );
    const edgeData = buildEdges(edges, mandatorySet, minW, rangeW);

    nodesRef.current = new DataSet(nodeData);
    edgesRef.current = new DataSet(edgeData);

    setMetrics({
      nodes: nodeData.length,
      edges: edgeData.length,
      density:
        nodeData.length >= 2
          ? (2 * edgeData.length) / (nodeData.length * (nodeData.length - 1))
          : 0,
    });

    const network = new Network(
      containerRef.current,
      { nodes: nodesRef.current, edges: edgesRef.current },
      NETWORK_OPTIONS
    );
    networkRef.current = network;

    network.once("afterDrawing", () => fitNetwork());

    network.on("dragStart", (params) => {
      didDragRef.current = false;
      if (params.nodes?.length) {
        network.setOptions({ interaction: { ...NETWORK_OPTIONS.interaction, dragView: false } });
      }
    });

    network.on("dragging", (params) => {
      if (params.nodes?.length) didDragRef.current = true;
    });

    network.on("dragEnd", (params) => {
      network.setOptions({ interaction: { ...NETWORK_OPTIONS.interaction, dragView: true } });
      if (!params.nodes?.length || !nodesRef.current) return;
      const id = params.nodes[0];
      const pos = network.getPositions([id])[id];
      if (pos) {
        nodesRef.current.update({ id, x: pos.x, y: pos.y, physics: false, fixed: false });
      }
    });

    network.on("click", (params) => {
      if (didDragRef.current) { didDragRef.current = false; return; }
      if (params.nodes.length > 0) {
        const id = params.nodes[0];
        const node = nodesRef.current?.get(id);
        if (node?.hidden) return;
        applySelectionRef.current(selectedIdRef.current === id ? null : id);
      } else {
        applySelectionRef.current(null);
      }
    });

    return () => {
      clearAnimTimers();
      network.destroy();
      networkRef.current = null;
    };
  }, [airports, edges, mandatoryPairs, regionMap, grauMap, maxGrau, fitNetwork, clearAnimTimers]);

  // ── Filtros de região / grau ───────────────────────────────────────────────
  useEffect(() => {
    if (!nodesRef.current || !edgesRef.current) return;

    const nodeUpdates = nodesRef.current.get().map((n) => {
      const regionMatch = !filterRegion || n._regiao === filterRegion;
      const degreeMatch = (n._grau || 0) >= filterMinDegree;
      return { id: n.id, hidden: !(regionMatch && degreeMatch) };
    });
    nodesRef.current.update(nodeUpdates);

    const hiddenNodes = new Set(
      nodeUpdates.filter((n) => n.hidden).map((n) => n.id)
    );

    if (selectedIdRef.current && hiddenNodes.has(selectedIdRef.current)) {
      applySelectionRef.current(null);
    }

    edgesRef.current.update(
      edgesRef.current.get().map((e) => ({
        id: e.id,
        _filterHidden: hiddenNodes.has(e.from) || hiddenNodes.has(e.to),
      }))
    );

    const visNodes = nodeUpdates.filter((n) => !n.hidden).length;
    const allEdges = edgesRef.current.get();
    const visEdges = allEdges.filter((e) => !e._filterHidden && !e._selectionHidden).length;

    setMetrics({
      nodes: visNodes,
      edges: visEdges,
      density: visNodes >= 2 ? (2 * visEdges) / (visNodes * (visNodes - 1)) : 0,
    });

    requestAnimationFrame(() => {
      clearAnimTimers();
      fitNetwork({ clearSelection: false });
      const id = selectedIdRef.current;
      // Usa refs para evitar stale closure e não adicionar highlightPath/routesOn nas deps
      const count = syncEdgeStyles(id, highlightPathRef.current, routesOnRef.current);
      setRouteCount(id ? count : 0);
      syncNodeStyles(id, highlightPathRef.current);
    });
  }, [filterRegion, filterMinDegree, fitNetwork, syncEdgeStyles, syncNodeStyles, clearAnimTimers]);

  // ── Reação ao highlightPath, explorationOrder e routesOn ──────────────────
  // Quando o caminho muda: (1) animação de exploração, (2) animação do caminho.
  // Quando só routesOn muda: sincroniza estilos instantaneamente.
  useEffect(() => {
    const prev = prevPathRef.current;
    const pathChanged =
      highlightPath.length !== prev.length ||
      highlightPath.some((n, i) => n !== prev[i]);
    prevPathRef.current = highlightPath;

    if (pathChanged && highlightPath.length > 1) {
      if (explorationOrder.length > 0) {
        animateExploration(explorationOrder, () => animatePathReveal(highlightPath));
      } else {
        animatePathReveal(highlightPath);
      }
    } else {
      clearAnimTimers();
      const id = selectedIdRef.current;
      const count = syncEdgeStyles(id, highlightPath, routesOn);
      setRouteCount(id ? count : 0);
      syncNodeStyles(id, highlightPath);
    }
  }, [highlightPath, explorationOrder, routesOn, syncEdgeStyles, syncNodeStyles, animatePathReveal, animateExploration, clearAnimTimers]);

  const handleSearch = () => {
    const val = searchVal.trim().toUpperCase();
    if (!val) return;
    const node = nodesRef.current?.get(val);
    if (node && !node.hidden) {
      applySelection(val);
      focusNode(val);
    }
  };

  const handleToggleRoutes = () => setRoutesOn((v) => !v);
  const iataList = airports?.map((a) => a.id) ?? [];

  const pathOrigin = highlightPath.length > 0 ? highlightPath[0] : null;
  const pathDest   = highlightPath.length > 1 ? highlightPath[highlightPath.length - 1] : null;
  const hasRoute   = highlightPath.length > 1;

  const hasExploration = explorationOrder.length > 0;
  const hintText = hasRoute
    ? `${algoLabel}: ${highlightPath.join(" → ")} — ${highlightPath.length - 1} salto${highlightPath.length - 1 !== 1 ? "s" : ""}${hasExploration ? ` · ${explorationOrder.length} nós explorados` : ""}`
    : selectedId
      ? `${selectedId}: ${routeCount} rota${routeCount !== 1 ? "s" : ""} direta${routeCount !== 1 ? "s" : ""} — clique no fundo ou em Limpar`
      : "Clique num aeroporto para explorar · Arraste para navegar · Scroll para zoom";

  return (
    <div>
      <div className="graph-controls">
        <div className="form-field" style={{ flex: "1 1 160px", maxWidth: 200 }}>
          <label className="form-label" htmlFor="grafo-search">Buscar IATA</label>
          <input
            id="grafo-search"
            className="ctrl-input"
            list="iata-autocomplete"
            placeholder="ex: GRU"
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <datalist id="iata-autocomplete">
            {iataList.map((id) => <option key={id} value={id} />)}
          </datalist>
        </div>

        <AppButton variant="primary" size="sm" onClick={handleSearch}>
          Buscar
        </AppButton>

        {selectedId && (
          <>
            <span className="graph-selection-badge">
              {selectedId}
              <span className="graph-selection-badge__count">{routeCount} rotas</span>
            </span>
            <AppButton variant="ghost" size="sm" onClick={() => focusNode(selectedId)}>
              <Focus size={14} aria-hidden="true" />
              Centralizar
            </AppButton>
            <AppButton
              variant="ghost"
              size="sm"
              onClick={() => applySelection(null)}
              aria-label="Limpar seleção"
            >
              <X size={14} aria-hidden="true" />
              Limpar
            </AppButton>
          </>
        )}

        <div className="form-field">
          <label className="form-label" htmlFor="grafo-regiao">Região</label>
          <select
            id="grafo-regiao"
            className="ctrl-input ctrl-select"
            style={{ minWidth: 160 }}
            value={filterRegion}
            onChange={(e) => setFilterRegion(e.target.value)}
          >
            <option value="">Todas as regiões</option>
            {Object.keys(REGION_HEX).map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        <div className="form-field">
          <label className="form-label" htmlFor="grafo-grau">Grau mínimo</label>
          <input
            id="grafo-grau"
            type="number"
            min={0}
            className="ctrl-input"
            style={{ width: 72 }}
            value={filterMinDegree}
            onChange={(e) => setFilterMinDegree(Math.max(0, parseInt(e.target.value) || 0))}
          />
        </div>

        <AppButton variant="secondary" size="sm" onClick={handleToggleRoutes}>
          {routesOn ? "Suavizar obrigatórias" : "Destacar obrigatórias"}
        </AppButton>
      </div>

      {/* Breadcrumb visual da rota */}
      {hasRoute && (
        <div className="graph-path-banner">
          <span className="graph-path-banner__label">Rota</span>
          <div className="graph-path-banner__nodes">
            {highlightPath.map((node, i) => (
              <span key={`${node}-${i}`} className="graph-path-banner__step">
                <span
                  className={
                    i === 0
                      ? "graph-path-node graph-path-node--origin"
                      : i === highlightPath.length - 1
                        ? "graph-path-node graph-path-node--dest"
                        : "graph-path-node graph-path-node--mid"
                  }
                >
                  {node}
                </span>
                {i < highlightPath.length - 1 && (
                  <span className="graph-path-banner__arrow">›</span>
                )}
              </span>
            ))}
          </div>
          <span className="graph-path-banner__meta">
            {highlightPath.length - 1} salto{highlightPath.length - 1 !== 1 ? "s" : ""}
            {" · "}
            {Math.max(0, highlightPath.length - 2)} intermediário{Math.max(0, highlightPath.length - 2) !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      <div className="graph-metrics">
        {[
          { label: "Nós visíveis", value: metrics.nodes },
          {
            label: selectedId ? "Rotas do aeroporto" : "Arestas visíveis",
            value: selectedId ? routeCount : metrics.edges,
          },
          { label: "Densidade", value: `${(metrics.density * 100).toFixed(2)}%` },
        ].map((m) => (
          <div key={m.label} className="metric-pill">
            <span className="metric-pill-label">{m.label}</span>
            <span className="metric-pill-value">{m.value}</span>
          </div>
        ))}

        {hasRoute && (
          <div className="metric-pill metric-pill--route">
            <span className="metric-pill-dot" style={{ background: GRAPH.path }} />
            <span className="metric-pill-label">Origem</span>
            <span className="metric-pill-value metric-pill-value--origin">{pathOrigin}</span>
            <span className="metric-pill-sep">→</span>
            <span className="metric-pill-label">Destino</span>
            <span className="metric-pill-dot" style={{ background: PATH_DEST_COLOR }} />
            <span className="metric-pill-value metric-pill-value--dest">{pathDest}</span>
          </div>
        )}

        <div className="legend-row" style={{ marginLeft: "auto", marginBottom: 0 }}>
          {Object.entries(REGION_HEX).map(([r, c]) => (
            <button
              type="button"
              key={r}
              className={`legend-chip${filterRegion && filterRegion !== r ? " legend-chip--dimmed" : ""}`}
              onClick={() => setFilterRegion(filterRegion === r ? "" : r)}
              aria-pressed={filterRegion === r}
            >
              <span className="legend-dot" style={{ background: c }} />
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className={`graph-panel${selectedId ? " graph-panel--focused" : ""}${hasRoute ? " graph-panel--route" : ""}`}>
        <span className="graph-hint">{hintText}</span>

        <GraphLegend
          className="graph-legend-card--overlay"
          algoLabel={algoLabel}
          showExplore={explorationOrder.length > 0}
        />

        <div className="graph-zoom-toolbar" aria-label="Controles de zoom">
          <button type="button" className="graph-zoom-btn" title="Ampliar" aria-label="Ampliar" onClick={() => zoomBy(1.3)}>
            <Plus size={16} aria-hidden="true" />
          </button>
          <div className="graph-zoom-divider" />
          <button type="button" className="graph-zoom-btn" title="Reduzir" aria-label="Reduzir" onClick={() => zoomBy(0.77)}>
            <Minus size={16} aria-hidden="true" />
          </button>
          <div className="graph-zoom-divider" />
          <button type="button" className="graph-zoom-btn" title="Ajustar à tela" aria-label="Ajustar à tela" onClick={() => fitNetwork({ clearSelection: false })}>
            <Maximize2 size={15} aria-hidden="true" />
          </button>
        </div>

        <div className="graph-container" ref={containerRef} />
      </div>

      <GraphLegend
        className="graph-legend-card--below"
        algoLabel={algoLabel}
        showExplore={explorationOrder.length > 0}
      />
    </div>
  );
}
