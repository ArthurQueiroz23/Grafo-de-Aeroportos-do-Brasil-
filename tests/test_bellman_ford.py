import unittest
from pathlib import Path
import sys

# raiz do proj
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from src.algorithms import bellman_ford, shortest_path
from src.directed_algorithms import bellman_ford_digraph


class Grafo:
    def __init__(self):
        self.adj = {}

    def add_edge(self, u, v, w=1.0):
        self.adj.setdefault(u, {})
        self.adj.setdefault(v, {})

        self.adj[u][v] = w
        self.adj[v][u] = w

    def vertices(self):
        return list(self.adj.keys())

    def neighbors(self, u):
        return self.adj.get(u, {}).items()


class DiGrafo:
    def __init__(self):
        self.adj = {}

    def add_edge(self, u, v, w=1.0):
        self.adj.setdefault(u, {})
        self.adj.setdefault(v, {})

        self.adj[u][v] = w

    def vertices(self):
        return list(self.adj.keys())

    def neighbors(self, u):
        return self.adj.get(u, {}).items()


class TestBellmanFord(unittest.TestCase):

    def test_cicloNegativo(self):
        g = DiGrafo()

        g.add_edge(0, 1, 2.0)
        g.add_edge(1, 2, -3.0)
        g.add_edge(2, 0, -1.0)

        _, _, neg = bellman_ford_digraph(g, 0)

        self.assertTrue(neg)

    def test_pesoNegativoSemCiclo(self):
        g = DiGrafo()

        g.add_edge(0, 1, 2.0)
        g.add_edge(1, 2, -3.0)
        g.add_edge(0, 2, 100.0)

        dist_bf, _, neg = bellman_ford_digraph(g, 0)

        self.assertFalse(neg)
        self.assertAlmostEqual(dist_bf[2], -1.0)

    def test_matches_dijkstra_when_nonneg(self):
        g = Grafo()

        # grafo simples
        g.add_edge("A", "B", 2.0)
        g.add_edge("B", "C", 3.0)
        g.add_edge("A", "C", 100.0)

        dist_bf, _, neg = bellman_ford(g, "A")

        self.assertFalse(neg)

        cost_d, path_d = shortest_path(g, "A", "C")

        self.assertAlmostEqual(dist_bf["C"], cost_d)

        # menor caminho tem q dar 5
        self.assertAlmostEqual(dist_bf["C"], 5.0)


if __name__ == "__main__":
    unittest.main() 