from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Iterator, List, Set, Tuple


@dataclass(frozen=True)
class UndirectedEdge:
    u: str
    v: str
    weight: float

    @staticmethod
    def normalize(u: str, v: str) -> Tuple[str, str]:
        # só garante uma ordem padrão
        return (u, v) if u < v else (v, u)


class Graph:
    # grafo não direcionado com pesos

    def __init__(self) -> None:
        # lista de adjacência
        self._adj: Dict[str, Dict[str, float]] = {}

    def add_vertex(self, v: str) -> None:
        # adiciona vértice se não existir
        self._adj.setdefault(v, {})

    def add_edge(self, u: str, v: str, w: float) -> None:
        # adiciona aresta entre u e v
        if u == v:
            raise ValueError("Self-loop não permitido.")
        if w < 0:
            raise ValueError("Peso negativo não permitido neste dataset da Parte 1.")

        self.add_vertex(u)
        self.add_vertex(v)

        self._adj[u][v] = w
        self._adj[v][u] = w

    def vertices(self) -> Set[str]:
        # retorna os vértices
        return set(self._adj.keys())

    def neighbors(self, v: str) -> Dict[str, float]:
        # vizinhos de um vértice
        return dict(self._adj.get(v, {}))

    def degree(self, v: str) -> int:
        # quantidade de conexões
        return len(self._adj.get(v, {}))

    def edge_weight(self, u: str, v: str) -> float:
        # peso da aresta
        return self._adj[u][v]

    def undirected_edges(self) -> Set[Tuple[str, str, float]]:
        # lista de arestas sem repetir
        out: Set[Tuple[str, str, float]] = set()
        for u in self._adj:
            for v, w in self._adj[u].items():
                a, b = UndirectedEdge.normalize(u, v)
                if u == a:
                    out.add((a, b, w))
        return out

    def num_edges(self) -> int:
        # quantidade de arestas
        return len(self.undirected_edges())

    def iter_edges(self) -> Iterator[Tuple[str, str, float]]:
        # iterador de arestas
        return iter(self.undirected_edges())

    def has_edge(self, u: str, v: str) -> bool:
        # verifica se existe aresta
        return v in self._adj.get(u, {})