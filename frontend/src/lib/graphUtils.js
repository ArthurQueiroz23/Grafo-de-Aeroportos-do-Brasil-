// Essa lógica precisa permanecer sincronizada com os algoritmos em src/algorithms.py.
// Se mudar aqui e esquecer lá (ou vice-versa), os resultados podem divergir.

export function parseCSV(text) {
  const [header, ...lines] = text.trim().split("\n");
  const keys = header.split(",");
  return lines.map((l) => {
    const vals = l.split(",");
    const obj = {};
    keys.forEach((k, i) => {
      obj[k.trim()] = vals[i] ? vals[i].trim() : "";
    });
    return obj;
  });
}

export function buildGraph(rows) {
  const g = {};
  for (const { origem, destino, peso } of rows) {
    const w = parseFloat(peso) || 1;
    if (!g[origem]) g[origem] = {};
    if (!g[destino]) g[destino] = {};
    g[origem][destino] = w;
    g[destino][origem] = w;
  }
  return g;
}

export function dijkstra(graph, start, end) {
  const dist = {};
  const prev = {};
  const visited = new Set();
  for (const n of Object.keys(graph)) dist[n] = Infinity;
  dist[start] = 0;
  const pq = [[0, start]];

  while (pq.length > 0) {
    pq.sort((a, b) => a[0] - b[0]);
    const [d, u] = pq.shift();
    if (visited.has(u)) continue;
    visited.add(u);
    if (u === end) break;
    for (const [v, w] of Object.entries(graph[u] || {})) {
      const nd = d + w;
      if (nd < (dist[v] ?? Infinity)) {
        dist[v] = nd;
        prev[v] = u;
        pq.push([nd, v]);
      }
    }
  }

  if (dist[end] === Infinity) return { cost: Infinity, path: [] };
  const path = [];
  let cur = end;
  while (cur !== undefined) {
    path.unshift(cur);
    cur = prev[cur];
  }
  return { cost: dist[end], path };
}

export function bellmanFord(graph, start, end) {
  const nodes = Object.keys(graph);
  const dist = {};
  const prev = {};
  for (const n of nodes) dist[n] = Infinity;
  dist[start] = 0;

  for (let i = 0; i < nodes.length - 1; i++) {
    let updated = false;
    for (const u of nodes) {
      if (dist[u] === Infinity) continue;
      for (const [v, w] of Object.entries(graph[u] || {})) {
        const nd = dist[u] + w;
        if (nd < dist[v]) {
          dist[v] = nd;
          prev[v] = u;
          updated = true;
        }
      }
    }
    if (!updated) break;
  }

  if (dist[end] === Infinity) return { cost: Infinity, path: [] };
  const path = [];
  let cur = end;
  while (cur !== undefined) {
    path.unshift(cur);
    cur = prev[cur];
  }
  return { cost: dist[end], path };
}
