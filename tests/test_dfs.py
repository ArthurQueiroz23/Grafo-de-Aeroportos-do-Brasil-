import unittest
from pathlib import Path
import sys

# pegando a raiz 
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from src.graphs.algorithms import dfs_order
from src.graphs.graph import Graph


class TestDFS(unittest.TestCase):

    def test_dfs_tree(self) -> None:
        g = Graph()

        # montando o grafo
        g.add_edge("A", "B", 1.0)
        g.add_edge("A", "C", 2.0)
        g.add_edge("B", "D", 3.0)

        # rodando o dfs a partir do A
        o = dfs_order(g, "A")

        # vendo se começa pelo A
        self.assertEqual(o[0], "A")

        # tem que visitar 4 nós
        self.assertEqual(len(o), 4)

        # conferindo se passou por todos
        self.assertTrue(set(o) == {"A", "B", "C", "D"})


if __name__ == "__main__":
    unittest.main()