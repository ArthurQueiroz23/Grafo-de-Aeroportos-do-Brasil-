from __future__ import annotations

import heapq
from collections import deque
from typing import Dict, List, Optional, Set, Tuple

from .digraph import DiGraph


def bfs_order_digraph(graph: DiGraph, start: int) -> List[int]:
    verts = graph.vertices()
    if start not in verts:
        raise KeyError(f"Vértice inexistente: {start}")
    visitados: Set[int] = set()
    ordem: List[int] = []
    fila: deque[int] = deque()

    def _run_from(s: int) -> None:
        fila.clear()
        fila.append(s)
        visitados.add(s)
        while fila:
            u = fila.popleft()
            ordem.append(u)
            for v in graph.out_neighbors(u):
                if v not in visitados:
                    visitados.add(v)
                    fila.append(v)

    _run_from(start)
    for v in sorted(verts):
        if v not in visitados:
            _run_from(v)
    return ordem


def dfs_order_digraph(graph: DiGraph, start: int) -> List[int]:
    if start not in graph.vertices():
        raise KeyError(f"Vértice inexistente: {start}")
    visitados: Set[int] = set()
    ordem: List[int] = []

    def _visit(u: int) -> None:
        visitados.add(u)
        ordem.append(u)
        for v in sorted(graph.out_neighbors(u).keys()):
            if v not in visitados:
                _visit(v)

    _visit(start)
    for v in sorted(graph.vertices()):
        if v not in visitados:
            _visit(v)
    return ordem


def dijkstra_digraph(graph: DiGraph, start: int) -> Tuple[Dict[int, float], Dict[int, Optional[int]]]:
    for _, _, w in graph.iter_edges():
        if w < 0:
            raise ValueError("Dijkstra exige pesos não negativos nas arestas.")
    verts = graph.vertices()
    dist: Dict[int, float] = {v: float("inf") for v in verts}
    pred: Dict[int, Optional[int]] = {v: None for v in verts}
    dist[start] = 0.0
    heap: List[Tuple[float, int]] = [(0.0, start)]
    done: Set[int] = set()
    while heap:
        d, u = heapq.heappop(heap)
        if u in done:
            continue
        done.add(u)
        for v, w in graph.out_neighbors(u).items():
            nd = d + w
            if nd < dist[v]:
                dist[v] = nd
                pred[v] = u
                heapq.heappush(heap, (nd, v))
    return dist, pred


def shortest_path_dijkstra_digraph(
    graph: DiGraph, start: int, end: int
) -> Tuple[float, List[int]]:
    if start not in graph.vertices() or end not in graph.vertices():
        raise KeyError("origem/destino devem existir no grafo")
    dist, pred = dijkstra_digraph(graph, start)
    if dist[end] == float("inf"):
        return float("inf"), []
    path: List[int] = []
    cur: Optional[int] = end
    while cur is not None:
        path.append(cur)
        cur = pred[cur]
    path.reverse()
    return dist[end], path


def bellman_ford_digraph(
    graph: DiGraph, start: int
) -> Tuple[Dict[int, float], Dict[int, Optional[int]], bool]:
    verts = list(graph.vertices())
    dist: Dict[int, float] = {v: float("inf") for v in verts}
    pred: Dict[int, Optional[int]] = {v: None for v in verts}
    dist[start] = 0.0
    edges = graph.edges()
    n = len(verts)
    for _ in range(max(n - 1, 0)):
        updated = False
        for u, v, w in edges:
            if dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
                pred[v] = u
                updated = True
        if not updated:
            break
    neg = False
    for u, v, w in edges:
        if dist[u] + w < dist[v]:
            neg = True
            break
    return dist, pred, neg


def shortest_path_bellman_ford_digraph(
    graph: DiGraph, start: int, end: int
) -> Tuple[float, List[int]]:
    dist, pred, neg = bellman_ford_digraph(graph, start)
    if neg:
        raise RuntimeError("Ciclo negativo alcançável; caminho mínimo não definido.")
    if dist[end] == float("inf"):
        return float("inf"), []
    path: List[int] = []
    cur: Optional[int] = end
    while cur is not None:
        path.append(cur)
        cur = pred[cur]
    path.reverse()
    return dist[end], path
