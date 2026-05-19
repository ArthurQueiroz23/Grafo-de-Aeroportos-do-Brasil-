import unittest
from pathlib import Path
import sys

# pegando a raiz
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from src.algorithms import dijkstra, shortest_path


class Grafo:
    def __init__(self):
        self.adj = {}

    def add_edge(self, u, v, w=1.0):
        self.adj.setdefault(u, {})
        self.adj.setdefault(v, {})

        # grafo normal
        self.adj[u][v] = w
        self.adj[v][u] = w

    def neighbors(self, u):
        return self.adj.get(u, {}).items()

    def vertices(self):
        return list(self.adj.keys())

    def __iter__(self):
        return iter(self.adj)

    def __contains__(self, item):
        return item in self.adj

    def __getitem__(self, item):
        return self.adj[item]

    def keys(self):
        return self.adj.keys()


class TestDijkstra(unittest.TestCase):

    def test_triangle(self):
        g = Grafo()

        # criando o grafo
        g.add_edge("A", "B", 1.0)
        g.add_edge("B", "C", 2.0)
        g.add_edge("A", "C", 10.0)

        # rodando dijkstra
        d, _ = dijkstra(g, "A")

        # menor caminho A -> B -> C
        self.assertAlmostEqual(d["C"], 3.0)

        # testando o caminho completo
        cost, path = shortest_path(g, "A", "C")

        self.assertAlmostEqual(cost, 3.0)
        self.assertEqual(path, ["A", "B", "C"])


if __name__ == "__main__":
    unittest.main()