from __future__ import annotations

from collections import defaultdict
from typing import Dict, Iterator, List, Set, Tuple


class DiGraph:
    """Grafo dirigido ponderado (lista de adjacência de saída)."""

    def __init__(self) -> None:
        self._adj: Dict[int, Dict[int, float]] = defaultdict(dict)

    def add_edge(self, u: int, v: int, w: float) -> None:
        self._adj[u][v] = w

    def vertices(self) -> Set[int]:
        vs: Set[int] = set(self._adj.keys())
        for succ in self._adj.values():
            vs.update(succ.keys())
        return vs

    def out_neighbors(self, u: int) -> Dict[int, float]:
        return dict(self._adj.get(u, {}))

    def edges(self) -> List[Tuple[int, int, float]]:
        out: List[Tuple[int, int, float]] = []
        for u, mp in self._adj.items():
            for v, w in mp.items():
                out.append((u, v, w))
        return out

    def num_edges(self) -> int:
        return sum(len(s) for s in self._adj.values())

    def iter_edges(self) -> Iterator[Tuple[int, int, float]]:
        return iter(self.edges())
