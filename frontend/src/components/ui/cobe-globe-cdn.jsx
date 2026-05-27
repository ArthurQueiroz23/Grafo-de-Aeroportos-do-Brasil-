import { useEffect, useRef, useCallback } from "react";
import createGlobe from "cobe";
import { cn } from "@/lib/utils";

/** Visão fixa centrada no Brasil — sem rotação automática nem zoom pelo usuário */
const GLOBE_VIEW = {
  scale: 1.55,
  offset: [0, -0.1],
  phi: -0.95,
  theta: 0.3,
};

const defaultMarkers = [
  { id: "cdn-iad", location: [38.95, -77.45], region: "iad1" },
  { id: "cdn-sfo", location: [37.62, -122.38], region: "sfo1" },
  { id: "cdn-cdg", location: [49.01, 2.55], region: "cdg1" },
  { id: "cdn-hnd", location: [35.55, 139.78], region: "hnd1" },
  { id: "cdn-syd", location: [-33.95, 151.18], region: "syd1" },
  { id: "cdn-gru", location: [-23.43, -46.47], region: "gru1" },
  { id: "cdn-sin", location: [1.36, 103.99], region: "sin1" },
  { id: "cdn-arn", location: [59.65, 17.93], region: "arn1" },
  { id: "cdn-dub", location: [53.43, -6.25], region: "dub1" },
  { id: "cdn-bom", location: [19.09, 72.87], region: "bom1" },
];

const defaultArcs = [
  { id: "cdn-arc-1", from: [38.95, -77.45], to: [49.01, 2.55] },
  { id: "cdn-arc-2", from: [37.62, -122.38], to: [35.55, 139.78] },
  { id: "cdn-arc-3", from: [49.01, 2.55], to: [1.36, 103.99] },
  { id: "cdn-arc-4", from: [38.95, -77.45], to: [-23.43, -46.47] },
  { id: "cdn-arc-5", from: [35.55, 139.78], to: [-33.95, 151.18] },
  { id: "cdn-arc-6", from: [49.01, 2.55], to: [19.09, 72.87] },
];

export function GlobeCdn({
  markers = defaultMarkers,
  arcs = defaultArcs,
  className = "",
  dark = true,
  showLabels = true,
  selectedMarkerId = null,
  onMarkerSelect,
}) {
  const canvasRef = useRef(null);
  const pointerInteracting = useRef(null);
  const dragOffset = useRef({ phi: 0, theta: 0 });
  const basePhiRef = useRef(GLOBE_VIEW.phi);
  const baseThetaRef = useRef(GLOBE_VIEW.theta);
  const phiOffsetRef = useRef(0);
  const thetaOffsetRef = useRef(0);

  const handlePointerDown = useCallback((e) => {
    if (e.target !== canvasRef.current) return;
    pointerInteracting.current = { x: e.clientX, y: e.clientY };
    if (canvasRef.current) canvasRef.current.style.cursor = "grabbing";
  }, []);

  const handlePointerUp = useCallback(() => {
    if (pointerInteracting.current !== null) {
      phiOffsetRef.current += dragOffset.current.phi;
      thetaOffsetRef.current += dragOffset.current.theta;
      dragOffset.current = { phi: 0, theta: 0 };
    }
    pointerInteracting.current = null;
    if (canvasRef.current) canvasRef.current.style.cursor = "grab";
  }, []);

  useEffect(() => {
    const handlePointerMove = (e) => {
      if (pointerInteracting.current !== null) {
        dragOffset.current = {
          phi: (e.clientX - pointerInteracting.current.x) / 300,
          theta: (e.clientY - pointerInteracting.current.y) / 1000,
        };
      }
    };
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerup", handlePointerUp, { passive: true });
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [handlePointerUp]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    let globe = null;
    let animationId;

    function init() {
      const width = canvas.offsetWidth;
      if (width === 0 || globe) return;

      globe = createGlobe(canvas, {
        devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
        width,
        height: width,
        phi: GLOBE_VIEW.phi,
        theta: GLOBE_VIEW.theta,
        dark: dark ? 1 : 0,
        diffuse: 1.4,
        mapSamples: 16000,
        mapBrightness: dark ? 6 : 10,
        baseColor: dark ? [0.06, 0.08, 0.12] : [1, 1, 1],
        markerColor: dark ? [0.91, 0.66, 0.22] : [0, 0, 0],
        glowColor: dark ? [0.12, 0.15, 0.22] : [0.94, 0.93, 0.91],
        markerElevation: 0.02,
        markers: markers.map((m) => ({
          location: m.location,
          size: m.size ?? 0.012,
          id: m.id,
          color: m.color,
        })),
        arcs: arcs.map((a) => ({
          from: a.from,
          to: a.to,
          id: a.id,
          color: a.color,
        })),
        arcColor: dark ? [0.55, 0.62, 0.72] : [0, 0, 0],
        arcWidth: 0.48,
        arcHeight: 0.24,
        opacity: 0.88,
        scale: GLOBE_VIEW.scale,
        offset: GLOBE_VIEW.offset,
      });

      function animate() {
        globe.update({
          phi:
            basePhiRef.current +
            phiOffsetRef.current +
            dragOffset.current.phi,
          theta:
            baseThetaRef.current +
            thetaOffsetRef.current +
            dragOffset.current.theta,
          scale: GLOBE_VIEW.scale,
          offset: GLOBE_VIEW.offset,
        });
        animationId = requestAnimationFrame(animate);
      }
      animate();
      setTimeout(() => {
        if (canvas) canvas.style.opacity = "1";
      }, 80);
    }

    if (canvas.offsetWidth > 0) {
      init();
    } else {
      const ro = new ResizeObserver((entries) => {
        if (entries[0]?.contentRect.width > 0) {
          ro.disconnect();
          init();
        }
      });
      ro.observe(canvas);
    }

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      if (globe) globe.destroy();
    };
  }, [markers, arcs, dark]);

  const labelFg = dark ? "#eef1f5" : "#111";
  const labelBg = dark ? "rgba(22, 29, 38, 0.92)" : "#fff";

  return (
    <div className={cn("relative aspect-square w-full select-none", className)}>
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        style={{
          width: "100%",
          height: "100%",
          cursor: "grab",
          opacity: 0,
          transition: "opacity 1.2s ease",
          borderRadius: "50%",
          touchAction: "none",
        }}
        aria-label="Globo 3D com rotas de voo"
      />
      {showLabels &&
        markers.map((m) => {
          const isSelected =
            selectedMarkerId === m.id || m.selected === true;
          return (
            <div
              key={m.id}
              style={{
                position: "absolute",
                positionAnchor: `--cobe-${m.id}`,
                bottom: "anchor(top)",
                left: "anchor(center)",
                translate: "-50% 0",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                pointerEvents: "auto",
                opacity: `var(--cobe-visible-${m.id}, 0)`,
                filter: `blur(calc((1 - var(--cobe-visible-${m.id}, 0)) * 6px))`,
                transition: "opacity 0.3s, filter 0.3s",
                zIndex: isSelected ? 4 : 2,
              }}
            >
              <button
                type="button"
                className={`globe-marker-label${isSelected ? " globe-marker-label--selected" : ""}`}
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "0.6rem",
                  fontWeight: 700,
                  color: labelFg,
                  background: isSelected
                    ? "rgba(232, 168, 56, 0.22)"
                    : labelBg,
                  padding: "3px 8px",
                  borderRadius: 4,
                  letterSpacing: "0.06em",
                  whiteSpace: "nowrap",
                  boxShadow: isSelected
                    ? "0 0 12px rgba(232, 168, 56, 0.45)"
                    : "0 2px 8px rgba(0,0,0,0.35)",
                  border: isSelected
                    ? "1.5px solid #e8a838"
                    : dark
                      ? "1px solid rgba(255,255,255,0.08)"
                      : "none",
                  cursor: "pointer",
                }}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkerSelect?.(m.id);
                }}
                aria-pressed={isSelected}
                aria-label={`Aeroporto ${m.region}${isSelected ? ", selecionado" : ""}`}
              >
                {m.region}
              </button>
            </div>
          );
        })}
    </div>
  );
}
