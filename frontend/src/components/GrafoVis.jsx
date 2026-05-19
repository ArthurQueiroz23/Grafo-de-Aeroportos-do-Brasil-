import { useEffect, useRef, useState } from "react";
import { Network } from "vis-network";
import { DataSet } from "vis-data";

const AIRPORT_COORDS = {
  GRU: { x: 180, y: 120 }, CGH: { x: 170, y: 130 }, GIG: { x: 190, y: 110 },
  SDU: { x: 195, y: 105 }, BSB: { x: 80, y: 30 },  CNF: { x: 160, y: 100 },
  SSA: { x: 270, y: -20 }, REC: { x: 340, y: -60 }, FOR: { x: 300, y: -130 },
  NAT: { x: 360, y: -100 }, JPA: { x: 370, y: -70 }, THE: { x: 260, y: -150 },
  MAO: { x: -200, y: -120 }, BEL: { x: 0, y: -100 }, PVH: { x: -150, y: -60 },
  CWB: { x: 120, y: 200 }, FLN: { x: 150, y: 250 }, POA: { x: 120, y: 320 },
  RBR: { x: -180, y: -30 }, GYN: { x: 60, y: 50 },
};

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

export default function GrafoVis({ airports, edges, mandatoryPairs, highlightPath = [] }) {
  const containerRef = useRef(null);
  const networkRef = useRef(null);
  const nodesRef = useRef(null);
  const edgesRef = useRef(null);
  const [searchVal, setSearchVal] = useState("");
  const [routesOn, setRoutesOn] = useState(true);

  useEffect(() => {
    if (!containerRef.current || !airports || !edges) return;

    const mandatorySet = new Set(
      (mandatoryPairs || []).map(([a, b]) => `${a}__${b}`)
    );

    const nodeData = scaleCoords(airports).map((a) => ({
      id: a.id,
      label: a.id,
      title: `<div style="background:#0d1e35;border:1px solid rgba(77,163,255,0.3);border-radius:8px;padding:8px 12px;font-family:'Segoe UI',sans-serif;font-size:13px;color:#dde8f5;"><strong style="color:#4da3ff;">${a.id}</strong></div>`,
      x: a.x,
      y: a.y,
      physics: false,
      color: {
        background: "#0d1e35",
        border: "#4da3ff",
        highlight: { background: "#4da3ff", border: "#ffffff" },
        hover: { background: "#162e50", border: "#7c5cff" },
      },
      font: { color: "#dde8f5", size: 13, face: "Segoe UI" },
      shape: "ellipse",
      size: 24,
      borderWidth: 2,
    }));

    const edgeData = edges.map((e, idx) => {
      const key = `${e.from}__${e.to}`;
      const isMandatory = mandatorySet.has(key);
      return {
        id: idx,
        from: e.from,
        to: e.to,
        label: String(e.weight),
        color: { color: isMandatory ? "#e74c3c" : "rgba(77,163,255,0.45)" },
        width: isMandatory ? 3 : 1.5,
        arrows: { to: { enabled: true, scaleFactor: 0.65 } },
        font: { size: 10, color: "rgba(221,232,245,0.4)", align: "middle" },
        _mandatory: isMandatory,
      };
    });

    nodesRef.current = new DataSet(nodeData);
    edgesRef.current = new DataSet(edgeData);

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
  }, [airports, edges, mandatoryPairs]);

  useEffect(() => {
    if (!edgesRef.current) return;

    const pathSet = new Set();
    if (highlightPath && highlightPath.length > 1) {
      for (let i = 0; i < highlightPath.length - 1; i++) {
        pathSet.add(`${highlightPath[i]}__${highlightPath[i + 1]}`);
        pathSet.add(`${highlightPath[i + 1]}__${highlightPath[i]}`);
      }
    }

    const updates = edgesRef.current.get().map((e) => {
      const inPath = pathSet.has(`${e.from}__${e.to}`) || pathSet.has(`${e.to}__${e.from}`);
      const isMandatory = e._mandatory;
      return {
        id: e.id,
        color: {
          color: isMandatory ? "#e74c3c" : inPath ? "#f5c542" : "rgba(77,163,255,0.45)",
        },
        width: inPath ? 4.5 : isMandatory ? 3 : 1.5,
      };
    });

    edgesRef.current.update(updates);
  }, [highlightPath]);

  const handleSearch = () => {
    const val = searchVal.trim().toUpperCase();
    if (!val || !networkRef.current) return;
    const node = nodesRef.current && nodesRef.current.get(val);
    if (node) {
      networkRef.current.focus(val, { scale: 2.4, animation: { duration: 600, easingFunction: "easeInOutQuad" } });
      networkRef.current.selectNodes([val]);
    }
  };

  const handleToggleRoutes = () => {
    if (!edgesRef.current) return;
    const next = !routesOn;
    setRoutesOn(next);
    const updates = edgesRef.current.get().map((e) => ({
      id: e.id,
      color: {
        color: e._mandatory && next ? "#e74c3c" : "rgba(77,163,255,0.45)",
      },
      width: e._mandatory && next ? 3 : 1.5,
    }));
    edgesRef.current.update(updates);
  };

  return (
    <div>
      <div className="graph-controls">
        <input
          className="ctrl-input"
          placeholder="Buscar aeroporto (ex: GRU)"
          value={searchVal}
          onChange={(e) => setSearchVal(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <button className="btn" onClick={handleSearch}>Buscar</button>
        <button className="btn btn-outline" onClick={handleToggleRoutes}>
          {routesOn ? "Ocultar rotas" : "Mostrar rotas"}
        </button>
        <span style={{ fontSize: 11, color: "rgba(221,232,245,0.3)", marginLeft: 4 }}>
          Arestas vermelhas = rotas obrigatórias (MAO→GRU, REC→POA)
        </span>
      </div>
      <div className="graph-container" ref={containerRef} />
    </div>
  );
}
