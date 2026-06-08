import { describe, it, expect } from "vitest";
import {
  parseCSV,
  buildGraph,
  dijkstra,
  bellmanFord,
  bfs,
  dfs,
  computeGraphStats,
} from "./graphUtils.js";

// ── Grafo auxiliar para os testes ─────────────────────────────────────────────
//
//   A ──1── B ──1── C
//   │               │
//   └──────3────────┘
//
// Menor caminho A→C por peso: A→B→C (custo 2)
// Menor caminho A→C por saltos: A→C direto (1 salto, custo 3)
//
const ROWS_SIMPLE = [
  { origem: "A", destino: "B", peso: "1" },
  { origem: "B", destino: "C", peso: "1" },
  { origem: "A", destino: "C", peso: "3" },
];

//   A ──1── B ──1── C ──1── D
//   │                       │
//   └──────────5─────────────┘
const ROWS_LINEAR = [
  { origem: "A", destino: "B", peso: "1" },
  { origem: "B", destino: "C", peso: "1" },
  { origem: "C", destino: "D", peso: "1" },
  { origem: "A", destino: "D", peso: "5" },
];

// Grafo desconexo: {A-B} e {C-D} isolados
const ROWS_DISCONNECTED = [
  { origem: "A", destino: "B", peso: "1" },
  { origem: "C", destino: "D", peso: "1" },
];

// ── parseCSV ──────────────────────────────────────────────────────────────────
describe("parseCSV", () => {
  it("interpreta header e linhas corretamente", () => {
    const csv = "origem,destino,peso\nA,B,1.5\nB,C,2";
    const rows = parseCSV(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ origem: "A", destino: "B", peso: "1.5" });
    expect(rows[1]).toEqual({ origem: "B", destino: "C", peso: "2" });
  });

  it("lida com uma única linha de dados", () => {
    const csv = "origem,destino,peso\nX,Y,0.5";
    const rows = parseCSV(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].peso).toBe("0.5");
  });
});

// ── buildGraph ────────────────────────────────────────────────────────────────
describe("buildGraph", () => {
  it("cria grafo não-direcionado corretamente", () => {
    const g = buildGraph(ROWS_SIMPLE);
    expect(g["A"]["B"]).toBe(1);
    expect(g["B"]["A"]).toBe(1);
    expect(g["A"]["C"]).toBe(3);
    expect(g["C"]["A"]).toBe(3);
  });

  it("usa peso 1 como fallback quando peso inválido", () => {
    const g = buildGraph([{ origem: "X", destino: "Y", peso: "abc" }]);
    expect(g["X"]["Y"]).toBe(1);
  });
});

// ── Dijkstra ──────────────────────────────────────────────────────────────────
describe("dijkstra", () => {
  it("encontra o caminho de menor custo", () => {
    const g = buildGraph(ROWS_SIMPLE);
    const r = dijkstra(g, "A", "C");
    expect(r.cost).toBe(2);
    expect(r.path).toEqual(["A", "B", "C"]);
  });

  it("retorna path vazio quando não há caminho", () => {
    const g = buildGraph(ROWS_DISCONNECTED);
    const r = dijkstra(g, "A", "C");
    expect(r.path).toHaveLength(0);
    expect(r.cost).toBe(Infinity);
  });

  it("retorna steps com custo acumulado correto", () => {
    const g = buildGraph(ROWS_LINEAR);
    const r = dijkstra(g, "A", "D");
    expect(r.cost).toBe(3);
    expect(r.steps).toHaveLength(3);
    expect(r.steps[2].accumulated).toBe(3);
  });

  it("inclui visitedOrder não vazio", () => {
    const g = buildGraph(ROWS_SIMPLE);
    const r = dijkstra(g, "A", "C");
    expect(r.visitedOrder.length).toBeGreaterThan(0);
    expect(r.visitedOrder[0]).toBe("A");
  });

  it("caminho de origem para si mesmo retorna null via guard", () => {
    // O guard em PageCalculadora impede chamar com start === end,
    // mas se chamado diretamente o algoritmo deve funcionar sem travar.
    const g = buildGraph(ROWS_SIMPLE);
    // Não deve lançar exceção
    expect(() => dijkstra(g, "A", "A")).not.toThrow();
  });
});

// ── Bellman-Ford ──────────────────────────────────────────────────────────────
describe("bellmanFord", () => {
  it("converge para o mesmo resultado que Dijkstra em grafos com pesos positivos", () => {
    const g = buildGraph(ROWS_SIMPLE);
    const dij = dijkstra(g, "A", "C");
    const bf  = bellmanFord(g, "A", "C");
    expect(bf.cost).toBe(dij.cost);
    expect(bf.path).toEqual(dij.path);
  });

  it("retorna path vazio quando não há caminho", () => {
    const g = buildGraph(ROWS_DISCONNECTED);
    const r = bellmanFord(g, "A", "D");
    expect(r.path).toHaveLength(0);
  });

  it("inclui visitedOrder começando pela origem", () => {
    const g = buildGraph(ROWS_LINEAR);
    const r = bellmanFord(g, "A", "D");
    expect(r.visitedOrder[0]).toBe("A");
  });
});

// ── BFS ───────────────────────────────────────────────────────────────────────
describe("bfs", () => {
  it("encontra o caminho com menor número de saltos", () => {
    const g = buildGraph(ROWS_LINEAR);
    // Dijkstra: A→B→C→D (3 saltos, custo 3). BFS: A→D (1 salto, custo 5)
    const r = bfs(g, "A", "D");
    expect(r.path.length - 1).toBe(1);
    expect(r.path).toEqual(["A", "D"]);
  });

  it("no grafo simples encontra o mesmo nó destino", () => {
    const g = buildGraph(ROWS_SIMPLE);
    const r = bfs(g, "A", "C");
    expect(r.path[0]).toBe("A");
    expect(r.path[r.path.length - 1]).toBe("C");
  });

  it("retorna path vazio quando não há caminho", () => {
    const g = buildGraph(ROWS_DISCONNECTED);
    const r = bfs(g, "A", "C");
    expect(r.path).toHaveLength(0);
  });

  it("visitedOrder reflete visita em camadas", () => {
    const g = buildGraph(ROWS_LINEAR);
    const r = bfs(g, "A", "D");
    // A está antes de seus vizinhos
    expect(r.visitedOrder.indexOf("A")).toBeLessThan(r.visitedOrder.indexOf("B"));
  });
});

// ── DFS ───────────────────────────────────────────────────────────────────────
describe("dfs", () => {
  it("encontra algum caminho válido (origem → destino)", () => {
    const g = buildGraph(ROWS_SIMPLE);
    const r = dfs(g, "A", "C");
    expect(r.path[0]).toBe("A");
    expect(r.path[r.path.length - 1]).toBe("C");
  });

  it("retorna path vazio quando não há caminho", () => {
    const g = buildGraph(ROWS_DISCONNECTED);
    const r = dfs(g, "A", "D");
    expect(r.path).toHaveLength(0);
  });

  it("custo calculado é coerente com os steps", () => {
    const g = buildGraph(ROWS_LINEAR);
    const r = dfs(g, "A", "D");
    if (r.path.length > 0) {
      const sumFromSteps = r.steps.at(-1)?.accumulated ?? 0;
      expect(Math.abs(r.cost - sumFromSteps)).toBeLessThan(1e-9);
    }
  });

  it("inclui visitedOrder com pelo menos o destino", () => {
    const g = buildGraph(ROWS_SIMPLE);
    const r = dfs(g, "A", "C");
    expect(r.visitedOrder).toContain("C");
  });
});

// ── computeGraphStats ─────────────────────────────────────────────────────────
describe("computeGraphStats", () => {
  it("conta vértices e arestas corretamente", () => {
    const g = buildGraph(ROWS_SIMPLE);
    const s = computeGraphStats(g);
    expect(s.nodes).toBe(3);
    expect(s.edges).toBe(3);
  });

  it("identifica grafo conexo com 1 componente", () => {
    const g = buildGraph(ROWS_SIMPLE);
    const s = computeGraphStats(g);
    expect(s.components).toBe(1);
  });

  it("identifica grafo desconexo com 2 componentes", () => {
    const g = buildGraph(ROWS_DISCONNECTED);
    const s = computeGraphStats(g);
    expect(s.components).toBe(2);
  });

  it("calcula grau médio correto", () => {
    // ROWS_SIMPLE: A tem grau 2, B tem grau 2, C tem grau 2 → grau médio = 2
    const g = buildGraph(ROWS_SIMPLE);
    const s = computeGraphStats(g);
    expect(s.avgDegree).toBeCloseTo(2);
  });

  it("densidade de grafo completo K3 = 1", () => {
    const g = buildGraph(ROWS_SIMPLE); // triângulo A-B-C = K3
    const s = computeGraphStats(g);
    expect(s.density).toBeCloseTo(1);
  });

  it("retorna zeros para grafo vazio", () => {
    const s = computeGraphStats({});
    expect(s.nodes).toBe(0);
    expect(s.edges).toBe(0);
    expect(s.components).toBe(0);
  });
});

// ── Validação cruzada: Dijkstra × Bellman-Ford ────────────────────────────────
describe("validação cruzada Dijkstra × Bellman-Ford", () => {
  const GRAFOS = [ROWS_SIMPLE, ROWS_LINEAR];

  GRAFOS.forEach((rows, idx) => {
    it(`grafo ${idx + 1}: custo idêntico entre Dijkstra e BF`, () => {
      const g = buildGraph(rows);
      const nodes = Object.keys(g);
      for (const src of nodes.slice(0, 3)) {
        for (const dst of nodes.slice(0, 3)) {
          if (src === dst) continue;
          const dij = dijkstra(g, src, dst);
          const bf  = bellmanFord(g, src, dst);
          expect(Math.abs(dij.cost - bf.cost)).toBeLessThan(1e-9);
        }
      }
    });
  });
});
