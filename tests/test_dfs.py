import unittest
from pathlib import Path
import sys

# pegando a raiz 
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from src.graphs.algorithms import dfs_order
from src.graphs.graph import Graph


class TestDFS(unittest.TestCase):

    def test_detectaCiclo(self) -> None:
        g = Graph()
        g.add_edge("A","B",1.0)
        g.add_edge("B","C",2.0)
        g.add_edge("C","A",3.0 )

        self.assertGreaterEqual(g.num_edges(),len(g.vertices()))
        o = dfs_order(g,"A")

        self.assertEqual(o[0],"A" )
        self.assertEqual(len(o),3)
        self.assertTrue(set(o) == {"A","B","C"})
        g2 = Graph()
        g2.add_edge("A", "B", 1.0)
        g2.add_edge("A", "C", 2.0)
        self.assertEqual(g2.num_edges(), len(g2.vertices()) - 1)

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