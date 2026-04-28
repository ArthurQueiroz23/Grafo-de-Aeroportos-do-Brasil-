import unittest
from pathlib import Path
import sys

# pegando a raiz
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from src.graphs.algorithms import bfs_distances, bfs_order
from src.graphs.graph import Graph


class TestBFS(unittest.TestCase):

    def test_bfs_order_path(self) -> None:
        g = Graph()

        # montando o grafo
        g.add_edge("A", "B", 1.0)
        g.add_edge("B", "C", 1.0)
        g.add_edge("C", "D", 1.0)

        # rodando bfs
        o = bfs_order(g, "A")

        # tem que começar pelo A
        self.assertEqual(o[0], "A")

        # conferindo se passou por todos
        self.assertEqual(set(o), {"A", "B", "C", "D"})

        # vendo as distâncias a partir do A
        d = bfs_distances(g, "A")

        # distância de A até D deve ser 3
        self.assertEqual(d["D"], 3)


if __name__ == "__main__":
    unittest.main()