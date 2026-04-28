import unittest
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from src.graphs.algorithms import dijkstra, shortest_path
from src.graphs.graph import Graph


class TestDijkstra(unittest.TestCase):
    def test_triangle(self) -> None:
        g = Graph()
        g.add_edge("A", "B", 1.0)
        g.add_edge("B", "C", 2.0)
        g.add_edge("A", "C", 10.0)
        d, _ = dijkstra(g, "A")
        self.assertAlmostEqual(d["C"], 3.0)
        cost, path = shortest_path(g, "A", "C")
        self.assertAlmostEqual(cost, 3.0)
        self.assertEqual(path, ["A", "B", "C"])


if __name__ == "__main__":
    unittest.main()
