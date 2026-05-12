from __future__ import annotations

import heapq
from collections import deque
from typing import Dict, List, Optional, Set, Tuple


def iter_edges(graph):

    # evita repetir aresta
    visitadas = set()

    for u in graph:

        for v, w in graph[u].items():

            if (v, u) not in visitadas:

                visitadas.add((u, v))

                yield (u, v, w)


def bfs_distances(graph: dict, start: str) -> Dict[str, int]:

    # bfs normal
    if start not in graph:
        raise KeyError("vertice nao existe")

    dist = {start: 0}

    fila = deque([start])

    while fila:

        u = fila.popleft()

        # olha vizinhos
        for v in graph[u]:

            if v not in dist:

                dist[v] = dist[u] + 1

                fila.append(v)

    return dist


def bfs_order(graph: dict, start: str) -> List[str]:

    # ordem bfs
    if start not in graph:
        raise KeyError("vertice nao existe")

    visitados = set()

    fila = deque([start])

    ordem = []

    visitados.add(start)

    while fila:

        u = fila.popleft()

        ordem.append(u)

        for v in graph[u]:

            if v not in visitados:

                visitados.add(v)

                fila.append(v)

    return ordem


def dfs_order(graph: dict, start: str) -> List[str]:

    # dfs recursivo
    if start not in graph:
        raise KeyError("vertice nao existe")

    visitados = set()

    ordem = []

    def visitar(u):

        visitados.add(u)

        ordem.append(u)

        for v in sorted(graph[u].keys()):

            if v not in visitados:
                visitar(v)

    visitar(start)

    # pega os desconectados tbm
    for v in sorted(graph.keys()):

        if v not in visitados:
            visitar(v)

    return ordem


def dijkstra(
    graph: dict,
    start: str
) -> Tuple[Dict[str, float], Dict[str, Optional[str]]]:

    # inicia distancias
    dist = {
        v: float("inf")
        for v in graph
    }

    pred = {
        v: None
        for v in graph
    }

    dist[start] = 0.0

    heap = [(0.0, start)]

    visitados = set()

    while heap:

        d, u = heapq.heappop(heap)

        if u in visitados:
            continue

        visitados.add(u)

        # percorre vizinhos
        for v, peso in graph[u].items():

            nova_dist = d + peso

            if nova_dist < dist[v]:

                dist[v] = nova_dist

                pred[v] = u

                heapq.heappush(
                    heap,
                    (nova_dist, v)
                )

    return dist, pred


def shortest_path(
    graph: dict,
    start: str,
    end: str
) -> Tuple[float, List[str]]:

    # verifica vertices
    if start not in graph or end not in graph:
        raise KeyError("vertice invalido")

    dist, pred = dijkstra(graph, start)

    # sem caminho
    if dist[end] == float("inf"):
        return float("inf"), []

    caminho = []

    atual = end

    while atual is not None:

        caminho.append(atual)

        atual = pred[atual]

    caminho.reverse()

    return dist[end], caminho


def undirected_to_directed_edges(graph):

    # duplica arestas
    edges = []

    for u, v, w in iter_edges(graph):

        edges.append((u, v, w))
        edges.append((v, u, w))

    return edges


def bellman_ford(
    graph: dict,
    start: str
):

    vertices = list(graph.keys())

    dist = {
        v: float("inf")
        for v in vertices
    }

    pred = {
        v: None
        for v in vertices
    }

    dist[start] = 0.0

    edges = undirected_to_directed_edges(graph)

    n = len(vertices)

    # relaxa arestas
    for _ in range(n - 1):

        mudou = False

        for u, v, w in edges:

            if dist[u] + w < dist[v]:

                dist[v] = dist[u] + w

                pred[v] = u

                mudou = True

        if not mudou:
            break

    # detecta ciclo negativo
    negativo = False

    for u, v, w in edges:

        if dist[u] + w < dist[v]:

            negativo = True

            break

    return dist, pred, negativo