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

function buildSteps(path, graph) {
  const steps = [];
  let accumulated = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const edgeWeight = graph[path[i]]?.[path[i + 1]] ?? 1;
    accumulated += edgeWeight;
    steps.push({ from: path[i], to: path[i + 1], edgeWeight, accumulated });
  }
  return steps;
}

// Dijkstra — caminho de menor custo.
// visitedOrder: ordem em que nós são FINALIZADOS (saem da fila com menor dist).
export function dijkstra(graph, start, end) {
  const dist = {};
  const prev = {};
  const visited = new Set();
  const visitedOrder = [];

  for (const n of Object.keys(graph)) dist[n] = Infinity;
  dist[start] = 0;
  const pq = [[0, start]];

  while (pq.length > 0) {
    pq.sort((a, b) => a[0] - b[0]);
    const [d, u] = pq.shift();
    if (visited.has(u)) continue;
    visited.add(u);
    visitedOrder.push(u);
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

  if (dist[end] === Infinity) return { cost: Infinity, path: [], steps: [], visitedOrder };
  const path = [];
  let cur = end;
  while (cur !== undefined) {
    path.unshift(cur);
    cur = prev[cur];
  }
  return { cost: dist[end], path, steps: buildSteps(path, graph), visitedOrder };
}

// Bellman-Ford — suporta pesos negativos.
// visitedOrder: ordem de PRIMEIRA melhoria de distância por nó.
export function bellmanFord(graph, start, end) {
  const nodes = Object.keys(graph);
  const dist = {};
  const prev = {};
  const firstImproved = new Set([start]);
  const visitedOrder = [start];

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
          if (!firstImproved.has(v)) {
            firstImproved.add(v);
            visitedOrder.push(v);
          }
        }
      }
    }
    if (!updated) break;
  }

  if (dist[end] === Infinity) return { cost: Infinity, path: [], steps: [], visitedOrder };
  const path = [];
  let cur = end;
  while (cur !== undefined) {
    path.unshift(cur);
    cur = prev[cur];
  }
  return { cost: dist[end], path, steps: buildSteps(path, graph), visitedOrder };
}

// BFS — garante o caminho com MENOR número de saltos.
// visitedOrder: ordem em que nós são DESENFILEIRADOS (camadas, layer by layer).
export function bfs(graph, start, end) {
  const prev = {};
  const visited = new Set([start]);
  const queue = [start];
  const visitedOrder = [];

  while (queue.length > 0) {
    const u = queue.shift();
    visitedOrder.push(u);
    if (u === end) break;
    for (const v of Object.keys(graph[u] || {})) {
      if (!visited.has(v)) {
        visited.add(v);
        prev[v] = u;
        queue.push(v);
      }
    }
  }

  if (prev[end] === undefined) return { cost: Infinity, path: [], steps: [], visitedOrder };
  const path = [];
  let cur = end;
  while (cur !== undefined) {
    path.unshift(cur);
    cur = prev[cur];
  }
  if (path[0] !== start) return { cost: Infinity, path: [], steps: [], visitedOrder };
  const steps = buildSteps(path, graph);
  return { cost: steps.at(-1)?.accumulated ?? 0, path, steps, visitedOrder };
}

// DFS iterativo — encontra um caminho possível, não necessariamente o mais curto.
// visitedOrder: ordem em que nós são DESEMPILHADOS (explora em profundidade).
export function dfs(graph, start, end) {
  const prev = {};
  const visited = new Set([start]);
  const stack = [start];
  const visitedOrder = [];

  while (stack.length > 0) {
    const u = stack.pop();
    visitedOrder.push(u);
    if (u === end) break;
    for (const v of Object.keys(graph[u] || {})) {
      if (!visited.has(v)) {
        visited.add(v);
        prev[v] = u;
        stack.push(v);
      }
    }
  }

  if (prev[end] === undefined) return { cost: Infinity, path: [], steps: [], visitedOrder };
  const path = [];
  let cur = end;
  while (cur !== undefined) {
    path.unshift(cur);
    cur = prev[cur];
  }
  if (path[0] !== start) return { cost: Infinity, path: [], steps: [], visitedOrder };
  const steps = buildSteps(path, graph);
  return { cost: steps.at(-1)?.accumulated ?? 0, path, steps, visitedOrder };
}

// Estatísticas globais do grafo (undirected).
export function computeGraphStats(graph) {
  const nodes = Object.keys(graph);
  const n = nodes.length;
  if (n === 0) return { nodes: 0, edges: 0, avgDegree: 0, density: 0, components: 0 };

  let degreeSum = 0;
  for (const u of nodes) {
    degreeSum += Object.keys(graph[u] || {}).length;
  }

  // Cada aresta é contada duas vezes no grafo não-direcionado
  const edges = degreeSum / 2;
  const avgDegree = degreeSum / n;
  const density = n >= 2 ? (2 * edges) / (n * (n - 1)) : 0;

  // Componentes conectados — BFS a partir de cada nó não visitado
  const seen = new Set();
  let components = 0;
  for (const start of nodes) {
    if (seen.has(start)) continue;
    components++;
    const queue = [start];
    seen.add(start);
    while (queue.length > 0) {
      const u = queue.shift();
      for (const v of Object.keys(graph[u] || {})) {
        if (!seen.has(v)) {
          seen.add(v);
          queue.push(v);
        }
      }
    }
  }

  return { nodes: n, edges, avgDegree, density, components };
}
