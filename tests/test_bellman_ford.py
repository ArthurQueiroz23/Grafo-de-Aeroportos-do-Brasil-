import unittest
from pathlib import Path
import sys

# pegando a raiz 
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from src.graphs.algorithms import bellman_ford, shortest_path
from src.graphs.graph import Graph
from src.graphs.digraph import DiGraph
from src.graphs.directed_algorithms import bellman_ford_digraph



class TestBellmanFord(unittest.TestCase):
    
    def test_pesoNegativoSemCiclo(self ) -> None:
        g = DiGraph()

        g.add_edge(0, 1, 2.0)
        g.add_edge(1, 2, -3.0)
        g.add_edge(0, 2, 100.0)
        dist_bf, _, neg = bellman_ford_digraph(g, 0)
        self.assertFalse(neg)
        self.assertAlmostEqual(dist_bf[2], -1.0)


    def test_matches_dijkstra_when_nonneg(self) -> None:
        g = Graph()

        # montando o grafo
        g.add_edge("A", "B", 2.0)
        g.add_edge("B", "C", 3.0)
        g.add_edge("A", "C", 100.0)

        # rodando bellman-ford
        dist_bf, _, neg = bellman_ford(g, "A")

        # não deve ter ciclo negativo
        self.assertFalse(neg)

        # comparando com o menor caminho normal
        cost_d, path_d = shortest_path(g, "A", "C")

        self.assertAlmostEqual(dist_bf["C"], cost_d)

        # conferindo o valor esperado
        self.assertAlmostEqual(dist_bf["C"], 5.0)


if __name__ == "__main__":
    unittest.main()