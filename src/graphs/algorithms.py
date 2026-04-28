from __future__ import annotations

import heapq
from collections import deque
from typing import Dict, List, Optional, Set, Tuple

from .graph import Graph


def bfs_distances(graph: Graph, start: str) -> Dict[str, int]:
    # calcula distância usando bfs
    if start not in graph.vertices():
        raise KeyError(f"Vértice inexistente: {start}")
    dist: Dict[str, int] = {start: 0}
    fila: deque[str] = deque([start])
    while fila:
        u = fila.popleft()
        for v in graph.neighbors(u):
            if v not in dist:
                dist[v] = dist[u] + 1
                fila.append(v)
    return dist


def bfs_order(graph: Graph, start: str) -> List[str]:
    # ordem de visita no bfs
    if start not in graph.vertices():
        raise KeyError(f"Vértice inexistente: {start}")
    visitados: Set[str] = set()
    fila: deque[str] = deque([start])
    ordem: List[str] = []
    visitados.add(start)
    while fila:
        u = fila.popleft()
        ordem.append(u)
        for v in graph.neighbors(u):
            if v not in visitados:
                visitados.add(v)
                fila.append(v)
    return ordem


def dfs_order(graph: Graph, start: str) -> List[str]:
    # ordem de visita no dfs
    if start not in graph.vertices():
        raise KeyError(f"Vértice inexistente: {start}")
    visitados: Set[str] = set()
    ordem: List[str] = []

    def _visit(u: str) -> None:
        visitados.add(u)
        ordem.append(u)
        for v in sorted(graph.neighbors(u).keys()):
            if v not in visitados:
                _visit(v)

    _visit(start)

    # pega os que não foram visitados
    for v in sorted(graph.vertices()):
        if v not in visitados:
            _visit(v)

    return ordem


def dijkstra(graph: Graph, start: str) -> Tuple[Dict[str, float], Dict[str, Optional[str]]]:
    # menor caminho com prioridade
    dist: Dict[str, float] = {v: float("inf") for v in graph.vertices()}
    pred: Dict[str, Optional[str]] = {v: None for v in graph.vertices()}
    dist[start] = 0.0
    heap: List[Tuple[float, str]] = [(0.0, start)]
    done: Set[str] = set()

    while heap:
        d, u = heapq.heappop(heap)

        if u in done:
            continue

        done.add(u)

        for v, w in graph.neighbors(u).items():
            nd = d + w
            if nd < dist[v]:
                dist[v] = nd
                pred[v] = u
                heapq.heappush(heap, (nd, v))

    return dist, pred


def shortest_path(graph: Graph, start: str, end: str) -> Tuple[float, List[str]]:
    # monta o caminho final
    if start not in graph.vertices() or end not in graph.vertices():
        raise KeyError("origem/destino devem existir no grafo")

    dist, pred = dijkstra(graph, start)

    if dist[end] == float("inf"):
        return float("inf"), []

    path: List[str] = []
    cur: Optional[str] = end

    while cur is not None:
        path.append(cur)
        cur = pred[cur]

    path.reverse()
    return dist[end], path


def _undirected_to_directed_edge_list(graph: Graph) -> List[Tuple[str, str, float]]:
    # transforma em lista de arestas direcionadas
    edges: List[Tuple[str, str, float]] = []
    for u, v, w in graph.undirected_edges():
        edges.append((u, v, w))
        edges.append((v, u, w))
    return edges


def bellman_ford(graph: Graph, start: str) -> Tuple[Dict[str, float], Dict[str, Optional[str]], bool]:
    # calcula menor caminho com bellman-ford
    vertices = list(graph.vertices())
    dist: Dict[str, float] = {v: float("inf") for v in vertices}
    pred: Dict[str, Optional[str]] = {v: None for v in vertices}
    dist[start] = 0.0

    edges = _undirected_to_directed_edge_list(graph)
    n = len(vertices)

    # relaxa as arestas
    for _ in range(n - 1):
        updated = False
        for u, v, w in edges:
            if dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
                pred[v] = u
                updated = True
        if not updated:
            break

    # checa ciclo negativo
    neg = False
    for u, v, w in edges:
        if dist[u] + w < dist[v]:
            neg = True
            break

    return dist, pred, neg