import { AIRPORT_GEO } from "@/components/grafoLayout.js";
import { REGION_HEX } from "@/constants/theme.js";

function hexToRgb01(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return [r, g, b];
}

export function airportLocation(iata) {
  const g = AIRPORT_GEO[iata];
  if (!g) return null;
  return [g.lat, g.lon];
}

export function filterEdgesByAirport(edges, airportId) {
  if (!airportId) {
    return { edges, visibleIds: null, routeCount: edges.length };
  }
  const filtered = edges.filter(
    (e) => e.from === airportId || e.to === airportId
  );
  const visibleIds = new Set([airportId]);
  filtered.forEach((e) => {
    visibleIds.add(e.from);
    visibleIds.add(e.to);
  });
  return { edges: filtered, visibleIds, routeCount: filtered.length };
}

export function buildGlobeMarkers(
  airports,
  regionMap = {},
  grauMap = {},
  { selectedId = null, visibleIds = null } = {}
) {
  const graus = Object.values(grauMap);
  const maxGrau = graus.length ? Math.max(...graus, 1) : 1;

  return airports
    .map((a) => {
      if (visibleIds && !visibleIds.has(a.id)) return null;
      const location = airportLocation(a.id);
      if (!location) return null;
      const grau = grauMap[a.id] || 1;
      const regiao = regionMap[a.id] || "";
      const hex = REGION_HEX[regiao] || "#9aa8b8";
      const isSelected = selectedId === a.id;
      const baseSize = 0.012 + (grau / maxGrau) * 0.020;
      return {
        id: a.id,
        location,
        region: a.id,
        size: isSelected ? baseSize * 1.45 : baseSize,
        color: hexToRgb01(hex),
        selected: isSelected,
      };
    })
    .filter(Boolean);
}

export function buildGlobeArcs(edges, mandatoryPairs = [], pathPairs = []) {
  const mandSet = new Set(
    mandatoryPairs.flatMap(([from, to]) => [`${from}__${to}`, `${to}__${from}`])
  );
  const pathSet = new Set(
    pathPairs.flatMap(([from, to]) => [`${from}__${to}`, `${to}__${from}`])
  );

  return edges
    .map((e) => {
      const from = airportLocation(e.from);
      const to = airportLocation(e.to);
      if (!from || !to) return null;

      const key = `${e.from}__${e.to}`;
      const w = e.weight || 1;
      let color;

      if (pathSet.has(key)) {
        color = hexToRgb01("#f2be5a");
      } else if (mandSet.has(key)) {
        color = hexToRgb01("#e88b84");
      } else if (w >= 2.5) {
        color = hexToRgb01("#4db8aa");
      } else if (w >= 1.8) {
        color = hexToRgb01("#f0b545");
      } else {
        color = [0.52, 0.60, 0.72];
      }

      return {
        id: `arc-${e.from}-${e.to}`,
        from,
        to,
        color,
      };
    })
    .filter(Boolean);
}
