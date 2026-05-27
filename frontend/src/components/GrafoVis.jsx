import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { Network } from "vis-network";
import { DataSet } from "vis-data";
import { Focus, X } from "lucide-react";
import AppButton from "./ui/AppButton.jsx";
import { REGION_HEX, GRAPH } from "../constants/theme.js";
import { layoutAirports } from "./grafoLayout.js";

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
    highlight: {
      background: `rgba(${rgb},0.55)`,
      border: "#ffffff",
    },
    hover: {
      background: `rgba(${rgb},0.45)`,
      border: "#ffffff",
    },
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
      ? {
          enabled: true,
          color: `rgba(${rgb},0.5)`,
          size: 16,
          x: 0,
          y: 0,
        }
      : {
          enabled: true,
          color: "rgba(0,0,0,0.35)",
          size: 6,
          x: 0,
          y: 2,
        },
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

function GraphLegend({ className = "" }) {
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
          Caminho Dijkstra
        </div>
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
  regionMap = {},
  grauMap = {},
}) {
  const containerRef = useRef(null);
  const networkRef = useRef(null);
  const nodesRef = useRef(null);
  const edgesRef = useRef(null);
  const selectedIdRef = useRef(null);
  const didDragRef = useRef(false);
  const isInitialFitRef = useRef(true);

  const highlightPathRef = useRef(highlightPath);
  const routesOnRef = useRef(true);

  const [searchVal, setSearchVal] = useState("");
  const [routesOn, setRoutesOn] = useState(true);

  highlightPathRef.current = highlightPath;
  routesOnRef.current = routesOn;

  const [filterRegion, setFilterRegion] = useState("");
  const [filterMinDegree, setFilterMinDegree] = useState(0);
  const [metrics, setMetrics] = useState({ nodes: 0, edges: 0, density: 0 });
  const [selectedId, setSelectedId] = useState(null);
  const [routeCount, setRouteCount] = useState(0);

  const maxGrau = useMemo(() => {
    const vals = Object.values(grauMap);
    return vals.length > 0 ? Math.max(...vals) : 1;
  }, [grauMap]);

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
          if (p) {
            xs.push(p.x);
            ys.push(p.y);
          }
        });
        if (!xs.length || !containerRef.current) return;
        const pad = 80;
        const minX = Math.min(...xs) - pad;
        const maxX = Math.max(...xs) + pad;
        const minY = Math.min(...ys) - pad;
        const maxY = Math.max(...ys) + pad;
        const { clientWidth: w, clientHeight: h } = containerRef.current;
        const scale =
          Math.min(w / (maxX - minX), h / (maxY - minY)) * 0.9;
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

  const syncEdgeStyles = useCallback((focusId, pathList, showMandatory) => {
    if (!edgesRef.current) return 0;

    const pathSet = new Set();
    if (pathList?.length > 1) {
      for (let i = 0; i < pathList.length - 1; i++) {
        pathSet.add(`${pathList[i]}__${pathList[i + 1]}`);
        pathSet.add(`${pathList[i + 1]}__${pathList[i]}`);
      }
    }

    let visibleRoutes = 0;

    edgesRef.current.update(
      edgesRef.current.get().map((e) => {
        if (e._filterHidden) {
          return { id: e.id, hidden: true, _selectionHidden: false };
        }

        const inPath =
          pathSet.has(`${e.from}__${e.to}`) ||
          pathSet.has(`${e.to}__${e.from}`);
        const connected =
          focusId && (e.from === focusId || e.to === focusId);
        const mandatory = e._mandatory && showMandatory;

        if (focusId && !connected && !inPath) {
          return {
            id: e.id,
            hidden: true,
            _selectionHidden: true,
          };
        }

        visibleRoutes += 1;

        if (inPath) {
          return {
            id: e.id,
            hidden: false,
            _selectionHidden: false,
            color: { color: GRAPH.path, opacity: 1 },
            width: 4,
            shadow: {
              enabled: true,
              color: GRAPH.pathGlow,
              size: 12,
              x: 0,
              y: 0,
            },
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
            shadow: {
              enabled: true,
              color: "rgba(232,168,56,0.25)",
              size: 6,
              x: 0,
              y: 0,
            },
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
          zIndex: mandatory ? 1 : 0,
        };
      })
    );

    return visibleRoutes;
  }, []);

  const syncNodeStyles = useCallback((focusId, pathList) => {
    if (!nodesRef.current || !edgesRef.current) return;

    const pathNodes = new Set(pathList || []);
    const neighborSet = focusId
      ? getNeighbors(edgesRef.current.get(), focusId)
      : null;

    nodesRef.current.update(
      nodesRef.current.get().map((n) => {
        if (n.hidden) return { id: n.id };

        const rgb = hexToRgb(n._regionColor || GRAPH.path);
        const onPath = pathNodes.has(n.id);
        const isSelected = focusId === n.id;
        const isNeighbor = neighborSet?.has(n.id);
        const dimmed = focusId && !isNeighbor;

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

        if (onPath) {
          return {
            id: n.id,
            opacity: 1,
            borderWidth: 3.5,
            size: n._baseSize + 6,
            color: {
              ...n._baseColor,
              border: GRAPH.path,
              background: `rgba(${rgb},0.5)`,
            },
            shadow: {
              enabled: true,
              color: GRAPH.pathGlow,
              size: 20,
              x: 0,
              y: 0,
            },
          };
        }

        return {
          id: n.id,
          opacity: 1,
          size: isSelected ? n._baseSize + 8 : n._baseSize,
          borderWidth: isSelected ? 3.5 : n._baseBorder,
          color: isSelected
            ? {
                ...n._baseColor,
                border: "#ffffff",
                background: `rgba(${rgb},0.55)`,
              }
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
                color: isSelected
                  ? "rgba(232,168,56,0.45)"
                  : `rgba(${rgb},0.45)`,
                size: isSelected ? 22 : 16,
                x: 0,
                y: 0,
              }
            : {
                enabled: true,
                color: "rgba(0,0,0,0.35)",
                size: 6,
                x: 0,
                y: 2,
              },
        };
      })
    );
  }, []);

  const applySelection = useCallback(
    (id) => {
      selectedIdRef.current = id;
      setSelectedId(id);

      const network = networkRef.current;
      if (network) {
        if (id) network.selectNodes([id]);
        else network.unselectAll();
      }

      const count = syncEdgeStyles(
        id,
        highlightPathRef.current,
        routesOnRef.current
      );
      setRouteCount(id ? count : 0);
      syncNodeStyles(id, highlightPathRef.current);
    },
    [syncEdgeStyles, syncNodeStyles]
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

  useEffect(() => {
    if (!containerRef.current || !airports?.length || !edges?.length) return;

    isInitialFitRef.current = true;
    selectedIdRef.current = null;
    setSelectedId(null);
    setRouteCount(0);

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
        network.setOptions({
          interaction: { ...NETWORK_OPTIONS.interaction, dragView: false },
        });
      }
    });

    network.on("dragging", (params) => {
      if (params.nodes?.length) didDragRef.current = true;
    });

    network.on("dragEnd", (params) => {
      network.setOptions({
        interaction: { ...NETWORK_OPTIONS.interaction, dragView: true },
      });
      if (!params.nodes?.length || !nodesRef.current) return;
      const id = params.nodes[0];
      const pos = network.getPositions([id])[id];
      if (pos) {
        nodesRef.current.update({
          id,
          x: pos.x,
          y: pos.y,
          physics: false,
          fixed: false,
        });
      }
    });

    network.on("click", (params) => {
      if (didDragRef.current) {
        didDragRef.current = false;
        return;
      }
      if (params.nodes.length > 0) {
        const id = params.nodes[0];
        const node = nodesRef.current?.get(id);
        if (node?.hidden) return;
        const next = selectedIdRef.current === id ? null : id;
        applySelectionRef.current(next);
      } else {
        applySelectionRef.current(null);
      }
    });

    return () => {
      network.destroy();
      networkRef.current = null;
    };
  }, [
    airports,
    edges,
    mandatoryPairs,
    regionMap,
    grauMap,
    maxGrau,
    fitNetwork,
  ]);

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

    const sel = selectedIdRef.current;
    if (sel && hiddenNodes.has(sel)) {
      applySelectionRef.current(null);
    }

    edgesRef.current.update(
      edgesRef.current.get().map((e) => {
        const filterHidden =
          hiddenNodes.has(e.from) || hiddenNodes.has(e.to);
        return { id: e.id, _filterHidden: filterHidden };
      })
    );

    const visNodes = nodeUpdates.filter((n) => !n.hidden).length;
    const allEdges = edgesRef.current.get();
    const visEdges = allEdges.filter(
      (e) => !e._filterHidden && !e._selectionHidden
    ).length;

    setMetrics({
      nodes: visNodes,
      edges: visEdges,
      density:
        visNodes >= 2 ? (2 * visEdges) / (visNodes * (visNodes - 1)) : 0,
    });

    requestAnimationFrame(() => {
      fitNetwork({ clearSelection: false });
      const id = selectedIdRef.current;
      const count = syncEdgeStyles(id, highlightPath, routesOn);
      setRouteCount(id ? count : 0);
      syncNodeStyles(id, highlightPath);
    });
  }, [
    filterRegion,
    filterMinDegree,
    fitNetwork,
    syncEdgeStyles,
    syncNodeStyles,
    highlightPath,
    routesOn,
  ]);

  useEffect(() => {
    const id = selectedIdRef.current;
    const count = syncEdgeStyles(id, highlightPath, routesOn);
    setRouteCount(id ? count : 0);
    syncNodeStyles(id, highlightPath);
  }, [highlightPath, routesOn, syncEdgeStyles, syncNodeStyles]);

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

  return (
    <div>
      <div className="graph-controls">
        <div className="form-field" style={{ flex: "1 1 160px", maxWidth: 200 }}>
          <label className="form-label" htmlFor="grafo-search">
            Buscar IATA
          </label>
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
            {iataList.map((id) => (
              <option key={id} value={id} />
            ))}
          </datalist>
        </div>

        <AppButton variant="primary" size="sm" onClick={handleSearch}>
          Buscar
        </AppButton>

        {selectedId && (
          <>
            <span className="graph-selection-badge">
              {selectedId}
              <span className="graph-selection-badge__count">
                {routeCount} rotas
              </span>
            </span>
            <AppButton
              variant="ghost"
              size="sm"
              onClick={() => focusNode(selectedId)}
            >
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
          <label className="form-label" htmlFor="grafo-regiao">
            Região
          </label>
          <select
            id="grafo-regiao"
            className="ctrl-input ctrl-select"
            style={{ minWidth: 160 }}
            value={filterRegion}
            onChange={(e) => setFilterRegion(e.target.value)}
          >
            <option value="">Todas as regiões</option>
            {Object.keys(REGION_HEX).map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        <div className="form-field">
          <label className="form-label" htmlFor="grafo-grau">
            Grau mínimo
          </label>
          <input
            id="grafo-grau"
            type="number"
            min={0}
            className="ctrl-input"
            style={{ width: 72 }}
            value={filterMinDegree}
            onChange={(e) =>
              setFilterMinDegree(Math.max(0, parseInt(e.target.value) || 0))
            }
          />
        </div>

        <AppButton variant="secondary" size="sm" onClick={handleToggleRoutes}>
          {routesOn ? "Suavizar obrigatórias" : "Destacar obrigatórias"}
        </AppButton>
      </div>

      <div className="graph-metrics">
        {[
          { label: "Nós visíveis", value: metrics.nodes },
          {
            label: selectedId ? "Rotas do aeroporto" : "Arestas visíveis",
            value: selectedId ? routeCount : metrics.edges,
          },
          {
            label: "Densidade",
            value: `${(metrics.density * 100).toFixed(2)}%`,
          },
        ].map((m) => (
          <div key={m.label} className="metric-pill">
            <span className="metric-pill-label">{m.label}</span>
            <span className="metric-pill-value">{m.value}</span>
          </div>
        ))}

        <div
          className="legend-row"
          style={{ marginLeft: "auto", marginBottom: 0 }}
        >
          {Object.entries(REGION_HEX).map(([r, c]) => (
            <button
              type="button"
              key={r}
              className={`legend-chip${
                filterRegion && filterRegion !== r ? " legend-chip--dimmed" : ""
              }`}
              onClick={() => setFilterRegion(filterRegion === r ? "" : r)}
              aria-pressed={filterRegion === r}
            >
              <span className="legend-dot" style={{ background: c }} />
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className={`graph-panel${selectedId ? " graph-panel--focused" : ""}`}>
        <span className="graph-hint">
          {selectedId
            ? `${selectedId}: ${routeCount} rotas — clique no fundo ou Limpar`
            : "Clique no aeroporto · Arraste para reposicionar · Fundo arrasta o mapa"}
        </span>

        <GraphLegend className="graph-legend-card--overlay" />

        <div className="graph-container" ref={containerRef} />
      </div>

      <GraphLegend className="graph-legend-card--below" />
    </div>
  );
}
