from __future__ import annotations

import gzip
from collections import defaultdict, deque


def snap_edge_weight(u, v, mode):

    # cria peso fake pras arestas
    if mode == "unit":

        return 1.0

    if mode == "synthetic_km":

        return (
            0.05 +
            (abs(u ^ v) % 50000) / 10000.0
        )

    raise ValueError(
        "modo de peso invalido"
    )


def _read_snap_edges_gzip(
    path,
    max_lines
):

    # le arestas do dataset
    edges = []

    if str(path).endswith(".gz"):

        ctx = gzip.open(
            path,
            "rt",
            encoding="utf-8",
            errors="replace"
        )

    else:

        ctx = open(
            path,
            "r",
            encoding="utf-8",
            errors="replace"
        )

    with ctx as f:

        for line in f:

            line = line.strip()

            # ignora comentario
            if not line:
                continue

            if line.startswith("#"):
                continue

            parts = line.split()

            if len(parts) < 2:
                continue

            u = int(parts[0])

            v = int(parts[1])

            edges.append((u, v))

            if len(edges) >= max_lines:
                break

    return edges


def _largest_wcc_nodes_undirected(
    edge_pairs
):

    # acha maior componente conexa
    adj = defaultdict(set)

    for u, v in edge_pairs:

        adj[u].add(v)

        adj[v].add(u)

    nodes = set(adj.keys())

    melhor = set()

    visitados = set()

    for inicio in nodes:

        if inicio in visitados:
            continue

        pilha = [inicio]

        comp = set()

        while pilha:

            x = pilha.pop()

            if x in visitados:
                continue

            visitados.add(x)

            comp.add(x)

            for y in adj[x]:

                if y not in visitados:

                    pilha.append(y)

        if len(comp) > len(melhor):

            melhor = comp

    return melhor


def _bfs_primeiros_k(
    adj,
    seed,
    k
):

    # bfs simples
    if k <= 0:
        return set()

    fila = deque([seed])

    vistos = {seed}

    ordem = [seed]

    while fila and len(ordem) < k:

        u = fila.popleft()

        for v in adj[u]:

            if v not in vistos:

                vistos.add(v)

                ordem.append(v)

                fila.append(v)

                if len(ordem) >= k:
                    break

    return vistos


def build_snap_ca_subgraph(
    gz_path,
    max_vertices=3000,
    max_lines_read=600000,
    weight_mode="synthetic_km"
):

    # le dataset
    raw = _read_snap_edges_gzip(
        gz_path,
        max_lines_read
    )

    if not raw:

        raise ValueError(
            f"nenhuma aresta lida de {gz_path}"
        )

    # pega maior componente
    comp = _largest_wcc_nodes_undirected(
        raw
    )

    adj_u = defaultdict(set)

    for u, v in raw:

        if u in comp and v in comp:

            adj_u[u].add(v)

            adj_u[v].add(u)

    seed = min(comp)

    nos = _bfs_primeiros_k(
        adj_u,
        seed,
        max_vertices
    )

    # agora cria grafo manual
    g = {}

    for no in nos:

        g[no] = {}

    kept = 0

    for u, v in raw:

        if u in nos and v in nos:

            w = snap_edge_weight(
                u,
                v,
                weight_mode
            )

            g[u][v] = w

            kept += 1

    meta = {

        "arquivo": str(gz_path),

        "linhas_lidas_amostra": len(raw),

        "wcc_tamanho_amostra": len(comp),

        "max_vertices": max_vertices,

        "vertices_subgrafo": len(nos),

        "arestas_dirigidas_subgrafo": kept,

        "peso_modo": weight_mode,
    }

    return g, meta