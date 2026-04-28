import unittest
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from src.graphs.algorithms import bellman_ford, shortest_path
from src.graphs.graph import Graph


class TestBellmanFord(unittest.TestCase):
    def test_matches_dijkstra_when_nonneg(self) -> None:
        g = Graph()
        g.add_edge("A", "B", 2.0)
        g.add_edge("B", "C", 3.0)
        g.add_edge("A", "C", 100.0)
        dist_bf, _, neg = bellman_ford(g, "A")
        self.assertFalse(neg)
        cost_d, path_d = shortest_path(g, "A", "C")
        self.assertAlmostEqual(dist_bf["C"], cost_d)
        self.assertAlmostEqual(dist_bf["C"], 5.0)


if __name__ == "__main__":
    unittest.main()
