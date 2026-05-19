import unittest
from pathlib import Path
import sys

# pegando a raiz
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from src.algorithms import dfs_order


class Grafo:
    def __init__(self):
        self.adj = {}

    def add_edge(self, u, v, w=1.0):
        self.adj.setdefault(u, {})
        self.adj.setdefault(v, {})

        # indo e voltando
        self.adj[u][v] = w
        self.adj[v][u] = w

    def neighbors(self, u):
        return self.adj.get(u, {}).items()

    def vertices(self):
        return list(self.adj.keys())

    def num_edges(self):
        total = 0

        for viz in self.adj.values():
            total += len(viz)

        # divide pq salvou dos 2 lados
        return total // 2

    def __iter__(self):
        return iter(self.adj)

    def __contains__(self, item):
        return item in self.adj

    def __getitem__(self, item):
        return self.adj[item]

    def keys(self):
        return self.adj.keys()


class TestDFS(unittest.TestCase):

    def test_detectaCiclo(self):
        g = Grafo()

        g.add_edge("A", "B", 1.0)
        g.add_edge("B", "C", 2.0)
        g.add_edge("C", "A", 3.0)

        self.assertGreaterEqual(g.num_edges(), len(g.vertices()))

        o = dfs_order(g, "A")

        self.assertEqual(o[0], "A")
        self.assertEqual(len(o), 3)

        self.assertTrue(set(o) == {"A", "B", "C"})

        g2 = Grafo()

        g2.add_edge("A", "B", 1.0)
        g2.add_edge("A", "C", 2.0)

        self.assertEqual(g2.num_edges(), len(g2.vertices()) - 1)

    def test_dfs_tree(self):
        g = Grafo()

        # montando o grafo
        g.add_edge("A", "B", 1.0)
        g.add_edge("A", "C", 2.0)
        g.add_edge("B", "D", 3.0)

        # rodando dfs
        o = dfs_order(g, "A")

        # tem q começar no A
        self.assertEqual(o[0], "A")

        # visitou os 4
        self.assertEqual(len(o), 4)

        # conferindo os nós
        self.assertTrue(set(o) == {"A", "B", "C", "D"})


if __name__ == "__main__":
    unittest.main()