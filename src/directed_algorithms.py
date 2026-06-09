from __future__ import annotations

import heapq
from collections import deque


def iter_edges(graph):

    # percorre arestas
    for u in graph:

        for v, w in graph[u].items():

            yield (u, v, w)


def bfs_order_digraph(graph, start):

    # bfs dirigido
    if start not in graph:
        raise KeyError("vertice nao existe")

    visitados = set()

    ordem = []

    fila = deque()

    def run_from(s):

        fila.clear()

        fila.append(s)

        visitados.add(s)

        while fila:

            u = fila.popleft()

            ordem.append(u)

            for v in graph[u]:

                if v not in visitados:

                    visitados.add(v)

                    fila.append(v)

    run_from(start)

    # pega desconectados tbm
    for v in sorted(graph.keys()):

        if v not in visitados:

            run_from(v)

    return ordem


def dfs_order_digraph(graph, start):

    # dfs dirigido
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

    # pega desconectados
    for v in sorted(graph.keys()):

        if v not in visitados:

            visitar(v)

    return ordem


def bfs_tree_digraph(graph, start):

    # arvore de BFS (dirigida) a partir de start
    # percorre apenas o que e alcancavel a partir da fonte
    if start not in graph:
        raise KeyError("vertice nao existe")

    pai = {start: None}

    profundidade = {start: 0}

    ordem = [start]

    visitados = {start}

    fila = deque([start])

    while fila:

        u = fila.popleft()

        # ordena os vizinhos pra arvore ser deterministica
        for v in sorted(graph[u].keys()):

            if v not in visitados:

                visitados.add(v)

                pai[v] = u

                profundidade[v] = profundidade[u] + 1

                ordem.append(v)

                fila.append(v)

    return ordem, pai, profundidade


def dfs_tree_digraph(graph, start):

    # arvore de DFS (dirigida) a partir de start
    # so percorre o componente alcancavel a partir da fonte
    if start not in graph:
        raise KeyError("vertice nao existe")

    pai = {}

    profundidade = {}

    ordem = []

    visitados = set()

    def visitar(u, p, d):

        visitados.add(u)

        pai[u] = p

        profundidade[u] = d

        ordem.append(u)

        for v in sorted(graph[u].keys()):

            if v not in visitados:

                visitar(v, u, d + 1)

    visitar(start, None, 0)

    return ordem, pai, profundidade


def dijkstra_digraph(graph, start):

    # verifica peso negativo
    for u, v, w in iter_edges(graph):

        if w < 0:
            raise ValueError(
                "dijkstra nao aceita peso negativo"
            )

    dist = {}

    pred = {}

    for v in graph:

        dist[v] = float("inf")

        pred[v] = None

    dist[start] = 0.0

    heap = [(0.0, start)]

    visitados = set()

    while heap:

        d, u = heapq.heappop(heap)

        if u in visitados:
            continue

        visitados.add(u)

        for v, w in graph[u].items():

            nova_dist = d + w

            if nova_dist < dist[v]:

                dist[v] = nova_dist

                pred[v] = u

                heapq.heappush(
                    heap,
                    (nova_dist, v)
                )

    return dist, pred


def shortest_path_dijkstra_digraph(
    graph,
    start,
    end
):

    # menor caminho dijkstra
    if start not in graph or end not in graph:
        raise KeyError("vertice invalido")

    dist, pred = dijkstra_digraph(
        graph,
        start
    )

    if dist[end] == float("inf"):
        return float("inf"), []

    path = []

    atual = end

    while atual is not None:

        path.append(atual)

        atual = pred[atual]

    path.reverse()

    return dist[end], path


def bellman_ford_digraph(
    graph,
    start
):

    # bellman ford
    vertices = list(graph.keys())

    dist = {}

    pred = {}

    for v in vertices:

        dist[v] = float("inf")

        pred[v] = None

    dist[start] = 0.0

    edges = list(iter_edges(graph))

    n = len(vertices)

    # relaxa arestas
    for _ in range(max(n - 1, 0)):

        mudou = False

        for u, v, w in edges:

            if dist[u] + w < dist[v]:

                dist[v] = dist[u] + w

                pred[v] = u

                mudou = True

        if not mudou:
            break

    # detecta ciclo negativo
    neg = False

    for u, v, w in edges:

        if dist[u] + w < dist[v]:

            neg = True

            break

    return dist, pred, neg


def shortest_path_bellman_ford_digraph(
    graph,
    start,
    end
):

    # menor caminho bf
    dist, pred, neg = bellman_ford_digraph(
        graph,
        start
    )

    if neg:
        raise RuntimeError(
            "ciclo negativo detectado"
        )

    if dist[end] == float("inf"):
        return float("inf"), []

    path = []

    atual = end

    while atual is not None:

        path.append(atual)

        atual = pred[atual]

    path.reverse()

    return dist[end], path 