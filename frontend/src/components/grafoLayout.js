/**
 * Layout geográfico (lon/lat → plano) com escala ampla e
 * afastamentos manuais nos clusters metropolitanos.
 */
export const AIRPORT_GEO = {
  MAO: { lat: -3.04, lon: -60.05 },
  BEL: { lat: -1.39, lon: -48.48 },
  PVH: { lat: -8.71, lon: -63.9 },
  RBR: { lat: -9.87, lon: -67.81 },
  BSB: { lat: -15.87, lon: -47.92 },
  GYN: { lat: -16.63, lon: -49.22 },
  CNF: { lat: -19.63, lon: -43.97 },
  GRU: { lat: -23.43, lon: -46.47 },
  CGH: { lat: -23.63, lon: -46.66 },
  GIG: { lat: -22.81, lon: -43.25 },
  SDU: { lat: -22.91, lon: -43.17 },
  CWB: { lat: -25.53, lon: -49.18 },
  FLN: { lat: -27.67, lon: -48.55 },
  POA: { lat: -29.99, lon: -51.17 },
  SSA: { lat: -12.91, lon: -38.33 },
  REC: { lat: -8.13, lon: -34.92 },
  FOR: { lat: -3.78, lon: -38.54 },
  NAT: { lat: -5.91, lon: -35.25 },
  JPA: { lat: -7.15, lon: -34.85 },
  THE: { lat: -5.06, lon: -42.82 },
  VIX: { lat: -20.26, lon: -40.29 },
};

/** Afastamento extra (px) após projeção */
const NUDGE = {
  MAO: { dx: -22, dy: 4 },
  BEL: { dx: 16, dy: -12 },
  PVH: { dx: -28, dy: 16 },
  RBR: { dx: -34, dy: 22 },
  BSB: { dx: 40, dy: -40 },
  GYN: { dx: -82, dy: 62 },
  CNF: { dx: -102, dy: 38 },
  GRU: { dx: 36, dy: -52 },
  CGH: { dx: -92, dy: 78 },
  GIG: { dx: 78, dy: -52 },
  SDU: { dx: 108, dy: -68 },
  VIX: { dx: 68, dy: 24 },
  CWB: { dx: -52, dy: 88 },
  FLN: { dx: 22, dy: 128 },
  POA: { dx: -58, dy: 168 },
  SSA: { dx: 28, dy: -18 },
  REC: { dx: -62, dy: 48 },
  FOR: { dx: -32, dy: -48 },
  NAT: { dx: 52, dy: -38 },
  JPA: { dx: 8, dy: 72 },
  THE: { dx: -68, dy: -28 },
};

const BOUNDS = { minLon: -67, maxLon: -34, minLat: -33, maxLat: 2 };
const SPREAD = { x: 1180, y: 680 };

function project(lat, lon) {
  const x =
    ((lon - BOUNDS.minLon) / (BOUNDS.maxLon - BOUNDS.minLon) - 0.5) * SPREAD.x;
  const y =
    (0.5 - (lat - BOUNDS.minLat) / (BOUNDS.maxLat - BOUNDS.minLat)) * SPREAD.y;
  return { x, y };
}

export function layoutAirports(airports) {
  return airports.map((a) => {
    const g = AIRPORT_GEO[a.id];
    let x = 0;
    let y = 0;
    if (g) {
      ({ x, y } = project(g.lat, g.lon));
      const n = NUDGE[a.id];
      if (n) {
        x += n.dx;
        y += n.dy;
      }
    }
    return { ...a, x, y };
  });
}
