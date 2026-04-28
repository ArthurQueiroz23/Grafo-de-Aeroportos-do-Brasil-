import unittest
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from src.graphs.algorithms import dfs_order
from src.graphs.graph import Graph


class TestDFS(unittest.TestCase):
    def test_dfs_tree(self) -> None:
        g = Graph()
        g.add_edge("A", "B", 1.0)
        g.add_edge("A", "C", 2.0)
        g.add_edge("B", "D", 3.0)
        o = dfs_order(g, "A")
        self.assertEqual(o[0], "A")
        self.assertEqual(len(o), 4)
        self.assertTrue(set(o) == {"A", "B", "C", "D"})


if __name__ == "__main__":
    unittest.main()
