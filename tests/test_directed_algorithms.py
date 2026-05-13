import unittest
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from src.directed_algorithms import (
    bellman_ford_digraph,
    dijkstra_digraph,
    shortest_path_bellman_ford_digraph,
    shortest_path_dijkstra_digraph,
)


class DiGrafo:
    def __init__(self):
        self.adj = {}

    def add_edge(self, u, v, w=1.0):
        self.adj.setdefault(u, {})
        self.adj.setdefault(v, {})

        # direção unica
        self.adj[u][v] = w

    def neighbors(self, u):
        return self.adj.get(u, {}).items()

    def vertices(self):
        return list(self.adj.keys())


class TestDirected(unittest.TestCase):

    def test_bf_equals_dijkstra_nonneg(self):
        g = DiGrafo()

        g.add_edge(0, 1, 2.0)
        g.add_edge(1, 2, 3.0)
        g.add_edge(0, 2, 100.0)

        d_bf, _, neg = bellman_ford_digraph(g, 0)

        self.assertFalse(neg)

        d_dj, _ = dijkstra_digraph(g, 0)

        self.assertAlmostEqual(d_bf[2], d_dj[2])
        self.assertAlmostEqual(d_bf[2], 5.0)

        c1, p1 = shortest_path_dijkstra_digraph(g, 0, 2)
        c2, p2 = shortest_path_bellman_ford_digraph(g, 0, 2)

        self.assertAlmostEqual(c1, c2)


if __name__ == "__main__":
    unittest.main()