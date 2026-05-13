import unittest
from pathlib import Path
import sys

# pegando a raiz
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from src.algorithms import bfs_distances, bfs_order


class Grafo:
    def __init__(self):
        self.adj = {}

    def add_edge(self, u, v, w=1.0):
        self.adj.setdefault(u, {})
        self.adj.setdefault(v, {})

        # como é grafo normal vai pros 2 lados
        self.adj[u][v] = w
        self.adj[v][u] = w

    def neighbors(self, u):
        return self.adj.get(u, {}).items()

    def vertices(self):
        return list(self.adj.keys())


class TestBFS(unittest.TestCase):

    def test_bfs_order_path(self):
        g = Grafo()

        # montando o grafo
        g.add_edge("A", "B", 1.0)
        g.add_edge("B", "C", 1.0)
        g.add_edge("C", "D", 1.0)

        # rodando bfs
        o = bfs_order(g, "A")

        # tem q começar no A
        self.assertEqual(o[0], "A")

        # conferindo os vertices
        self.assertEqual(set(o), {"A", "B", "C", "D"})

        # distancias saindo do A
        d = bfs_distances(g, "A")

        # A -> D = 3 arestas
        self.assertEqual(d["D"], 3)


if __name__ == "__main__":
    unittest.main()