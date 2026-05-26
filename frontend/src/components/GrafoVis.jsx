import { useEffect, useRef, useState, useMemo } from "react";
import { Network } from "vis-network";
import { DataSet } from "vis-data";

const REGION_COLOR = {
  Norte: "#7c5cff",
  Nordeste: "#4da3ff",
  "Centro-Oeste": "#f5c542",
  Sudeste: "#2ecc71",
  Sul: "#e74c3c",
};

const AIRPORT_COORDS = {
  GRU: { x: 180, y: 120 }, CGH: { x: 170, y: 130 }, GIG: { x: 190, y: 110 },
  SDU: { x: 195, y: 105 }, BSB: { x: 80, y: 30 },  CNF: { x: 160, y: 100 },
  SSA: { x: 270, y: -20 }, REC: { x: 340, y: -60 }, FOR: { x: 300, y: -130 },
  NAT: { x: 360, y: -100 }, JPA: { x: 370, y: -70 }, THE: { x: 260, y: -150 },
  MAO: { x: -200, y: -120 }, BEL: { x: 0, y: -100 }, PVH: { x: -150, y: -60 },
  CWB: { x: 120, y: 200 }, FLN: { x: 150, y: 250 }, POA: { x: 120, y: 320 },
  RBR: { x: -180, y: -30 }, GYN: { x: 60, y: 50 },
};

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

function scaleCoords(airports) {
  const xs = airports.map((a) => (AIRPORT_COORDS[a.id] || { x: 0 }).x);
  const ys = airports.map((a) => (AIRPORT_COORDS[a.id] || { y: 0 }).y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const rangeX = maxX - minX || 1, rangeY = maxY - minY || 1;
  return airports.map((a) => {
    const raw = AIRPORT_COORDS[a.id] || { x: 0, y: 0 };
    return {
      ...a,
      x: ((raw.x - minX) / rangeX - 0.5) * 900,
      y: ((raw.y - minY) / rangeY - 0.5) * 500,
    };
  });
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

  const [searchVal, setSearchVal] = useState("");
  const [routesOn, setRoutesOn] = useState(true);
  const [filterRegion, setFilterRegion] = useState("");
  const [filterMinDegree, setFilterMinDegree] = useState(0);
  const [metrics, setMetrics] = useState({ nodes: 0, edges: 0, density: 0 });

  const maxGrau = useMemo(() => {
    const vals = Object.values(grauMap);
    return vals.length > 0 ? Math.max(...vals) : 1;
  }, [grauMap]);

  // Build network when data changes
  useEffect(() => {
    if (!containerRef.current || !airports || !edges) return;

    const mandatorySet = new Set(
      (mandatoryPairs || []).map(([a, b]) => `${a}__${b}`)
    );

    const weights = edges.map((e) => e.weight || 1);
    const minW = Math.min(...weights);
    const maxW = Math.max(...weights);
    const rangeW = maxW - minW || 1;

    const scaledAirports = scaleCoords(airports);
    const hasRegions = Object.keys(regionMap).length > 0;
    const hasGraus = Object.keys(grauMap).length > 0;

    const nodeData = scaledAirports.map((a) => {
      const grau = grauMap[a.id] || 1;
      const regiao = regionMap[a.id] || "";
      const regionColor = REGION_COLOR[regiao] || "#4da3ff";
      const rgb = hexToRgb(regionColor);
      const isHub = hasGraus && grau >= maxGrau * 0.4;
      const nodeSize = hasGraus
        ? Math.max(16, Math.min(40, 16 + (grau / maxGrau) * 24))
        : 22;

      return {
        id: a.id,
        label: a.id,
        title: [
          `<div style="background:#0d1e35;border:1px solid rgba(${rgb},0.5);border-radius:8px;`,
          `padding:10px 14px;font-family:'Segoe UI',sans-serif;font-size:13px;color:#dde8f5;">`,
          `<strong style="color:${regionColor};font-size:15px;">${a.id}</strong>`,
          regiao ? `<div style="font-size:11px;color:rgba(221,232,245,0.6);margin-top:4px;">Região: ${regiao}</div>` : "",
          grau > 1 ? `<div style="font-size:11px;color:rgba(221,232,245,0.6);margin-top:2px;">Grau: ${grau}</div>` : "",
          isHub ? `<div style="font-size:10px;color:${regionColor};margin-top:4px;font-weight:700;">★ Hub</div>` : "",
          `</div>`,
        ].join(""),
        x: a.x,
        y: a.y,
        physics: false,
        color: {
          background: `rgba(${rgb},${hasRegions ? "0.18" : "0.12"})`,
          border: regionColor,
          highlight: { background: regionColor, border: "#ffffff" },
          hover: { background: `rgba(${rgb},0.35)`, border: "#ffffff" },
        },
        font: {
          color: "#dde8f5",
          size: isHub ? 13 : 11,
          face: "Segoe UI",
        },
        shape: "ellipse",
        size: nodeSize,
        borderWidth: isHub ? 3 : 2,
        shadow: isHub
          ? { enabled: true, color: `rgba(${rgb},0.5)`, size: 14, x: 0, y: 0 }
          : false,
        _regiao: regiao,
        _grau: grau,
      };
    });

    const edgeData = edges.map((e, idx) => {
      const key = `${e.from}__${e.to}`;
      const isMandatory = mandatorySet.has(key);
      const normW = (e.weight - minW) / rangeW;
      const alpha = isMandatory ? 1.0 : 0.12 + normW * 0.55;
      return {
        id: idx,
        from: e.from,
        to: e.to,
        color: { color: isMandatory ? "#e74c3c" : `rgba(77,163,255,${alpha.toFixed(2)})` },
        width: isMandatory ? 3 : Math.max(1, 1 + normW * 1.8),
        arrows: { to: { enabled: true, scaleFactor: 0.55 } },
        font: { size: 9, color: "rgba(221,232,245,0.25)", align: "middle" },
        _mandatory: isMandatory,
        _normW: normW,
      };
    });

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

    const options = {
      interaction: { hover: true, tooltipDelay: 80, zoomView: true },
      physics: false,
      layout: { randomSeed: 42 },
      edges: { smooth: { type: "curvedCW", roundness: 0.15 } },
    };

    networkRef.current = new Network(
      containerRef.current,
      { nodes: nodesRef.current, edges: edgesRef.current },
      options
    );

    return () => {
      if (networkRef.current) {
        networkRef.current.destroy();
        networkRef.current = null;
      }
    };
  }, [airports, edges, mandatoryPairs, regionMap, grauMap]);

  // Dynamic filter: region + min degree
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
    const edgeUpdates = edgesRef.current.get().map((e) => ({
      id: e.id,
      hidden: hiddenNodes.has(e.from) || hiddenNodes.has(e.to),
    }));
    edgesRef.current.update(edgeUpdates);

    const visNodes = nodeUpdates.filter((n) => !n.hidden).length;
    const visEdges = edgeUpdates.filter((e) => !e.hidden).length;
    setMetrics({
      nodes: visNodes,
      edges: visEdges,
      density:
        visNodes >= 2 ? (2 * visEdges) / (visNodes * (visNodes - 1)) : 0,
    });
  }, [filterRegion, filterMinDegree]);

  // Highlight path with glow
  useEffect(() => {
    if (!edgesRef.current || !nodesRef.current) return;

    const pathSet = new Set();
    if (highlightPath && highlightPath.length > 1) {
      for (let i = 0; i < highlightPath.length - 1; i++) {
        pathSet.add(`${highlightPath[i]}__${highlightPath[i + 1]}`);
        pathSet.add(`${highlightPath[i + 1]}__${highlightPath[i]}`);
      }
    }

    const edgeUpdates = edgesRef.current.get().map((e) => {
      const inPath =
        pathSet.has(`${e.from}__${e.to}`) ||
        pathSet.has(`${e.to}__${e.from}`);
      const alpha = (e._normW || 0) * 0.55 + 0.12;
      return {
        id: e.id,
        color: {
          color: inPath
            ? "#f5c542"
            : e._mandatory
            ? "#e74c3c"
            : `rgba(77,163,255,${alpha.toFixed(2)})`,
        },
        width: inPath ? 5 : e._mandatory ? 3 : Math.max(1, 1 + (e._normW || 0) * 1.8),
        shadow: inPath
          ? { enabled: true, color: "rgba(245,197,66,0.75)", size: 18, x: 0, y: 0 }
          : false,
      };
    });
    edgesRef.current.update(edgeUpdates);

    // Glow on path nodes
    if (highlightPath.length > 0) {
      const pathNodes = new Set(highlightPath);
      const nodeUpdates = nodesRef.current
        .get()
        .filter((n) => pathNodes.has(n.id))
        .map((n) => ({
          id: n.id,
          borderWidth: 4,
          color: { ...n.color, border: "#f5c542" },
          shadow: { enabled: true, color: "rgba(245,197,66,0.65)", size: 18, x: 0, y: 0 },
        }));
      if (nodeUpdates.length > 0) nodesRef.current.update(nodeUpdates);
    }
  }, [highlightPath]);

  const handleSearch = () => {
    const val = searchVal.trim().toUpperCase();
    if (!val || !networkRef.current) return;
    const node = nodesRef.current && nodesRef.current.get(val);
    if (node) {
      networkRef.current.focus(val, {
        scale: 2.4,
        animation: { duration: 600, easingFunction: "easeInOutQuad" },
      });
      networkRef.current.selectNodes([val]);
    }
  };

  const handleToggleRoutes = () => {
    if (!edgesRef.current) return;
    const next = !routesOn;
    setRoutesOn(next);
    const updates = edgesRef.current.get().map((e) => {
      const alpha = (e._normW || 0) * 0.55 + 0.12;
      return {
        id: e.id,
        color: {
          color:
            e._mandatory && next
              ? "#e74c3c"
              : `rgba(77,163,255,${alpha.toFixed(2)})`,
        },
        width:
          e._mandatory && next ? 3 : Math.max(1, 1 + (e._normW || 0) * 1.8),
        shadow: false,
      };
    });
    edgesRef.current.update(updates);
  };

  const iataList = airports ? airports.map((a) => a.id) : [];

  return (
    <div>
      {/* Filter controls */}
      <div className="graph-controls">
        <div>
          <input
            className="ctrl-input"
            list="iata-autocomplete"
            placeholder="Buscar aeroporto (ex: GRU)"
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <datalist id="iata-autocomplete">
            {iataList.map((id) => (
              <option key={id} value={id} />
            ))}
          </datalist>
        </div>
        <button className="btn" onClick={handleSearch}>
          Buscar
        </button>

        <select
          className="ctrl-input ctrl-select"
          style={{ width: 160 }}
          value={filterRegion}
          onChange={(e) => setFilterRegion(e.target.value)}
        >
          <option value="">Todas as regiões</option>
          {Object.keys(REGION_COLOR).map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label
            style={{
              fontSize: 11,
              color: "var(--muted)",
              whiteSpace: "nowrap",
            }}
          >
            Grau ≥
          </label>
          <input
            type="number"
            min={0}
            className="ctrl-input"
            style={{ width: 70 }}
            value={filterMinDegree}
            onChange={(e) =>
              setFilterMinDegree(Math.max(0, parseInt(e.target.value) || 0))
            }
          />
        </div>

        <button className="btn btn-outline" onClick={handleToggleRoutes}>
          {routesOn ? "Ocultar rotas" : "Mostrar rotas"}
        </button>
      </div>

      {/* Real-time metrics panel + region legend */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          marginBottom: 12,
          alignItems: "center",
        }}
      >
        {[
          { label: "Nós visíveis", value: metrics.nodes },
          { label: "Arestas visíveis", value: metrics.edges },
          {
            label: "Densidade",
            value: (metrics.density * 100).toFixed(2) + "%",
          },
        ].map((m) => (
          <div
            key={m.label}
            style={{
              background: "rgba(77,163,255,0.07)",
              border: "1px solid rgba(77,163,255,0.18)",
              borderRadius: 8,
              padding: "5px 14px",
              display: "flex",
              gap: 10,
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: 10,
                color: "var(--muted)",
                textTransform: "uppercase",
                letterSpacing: "0.6px",
              }}
            >
              {m.label}
            </span>
            <span
              style={{ fontSize: 14, fontWeight: 700, color: "var(--blue)" }}
            >
              {m.value}
            </span>
          </div>
        ))}

        {/* Clickable region legend */}
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          {Object.entries(REGION_COLOR).map(([r, c]) => (
            <span
              key={r}
              onClick={() => setFilterRegion(filterRegion === r ? "" : r)}
              style={{
                cursor: "pointer",
                fontSize: 11,
                color: c,
                display: "flex",
                alignItems: "center",
                gap: 5,
                opacity: filterRegion && filterRegion !== r ? 0.35 : 1,
                transition: "opacity 0.2s",
                userSelect: "none",
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: c,
                  display: "inline-block",
                  flexShrink: 0,
                }}
              />
              {r}
            </span>
          ))}
        </div>
      </div>

      {/* Edge legend */}
      <div
        style={{
          display: "flex",
          gap: 18,
          marginBottom: 10,
          fontSize: 11,
          color: "var(--muted)",
          flexWrap: "wrap",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span
            style={{
              display: "inline-block",
              width: 22,
              height: 3,
              background: "#e74c3c",
              borderRadius: 2,
            }}
          />
          Rotas obrigatórias
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span
            style={{
              display: "inline-block",
              width: 22,
              height: 4,
              background: "#f5c542",
              borderRadius: 2,
              boxShadow: "0 0 6px rgba(245,197,66,0.7)",
            }}
          />
          Caminho calculado (Dijkstra)
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span
            style={{
              display: "inline-block",
              width: 22,
              height: 2,
              background:
                "linear-gradient(90deg, rgba(77,163,255,0.2), rgba(77,163,255,0.8))",
              borderRadius: 2,
            }}
          />
          Espessura ∝ peso da aresta
        </span>
      </div>

      <div className="graph-container" ref={containerRef} />
    </div>
  );
}
