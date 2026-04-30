from __future__ import annotations

import gzip
from collections import defaultdict, deque
from pathlib import Path
from typing import Dict, List, Set, Tuple

from .graphs.digraph import DiGraph


def snap_edge_weight(u: int, v: int, mode: str) -> float:
    """
    O arquivo SNAP roadNet-CA não inclui distâncias.
    - unit: cada aresta custo 1 (saltos topológicos).
    - synthetic_km: proxy positivo determinístico (útil para stress BF/Dijkstra), não é km real.
    """
    if mode == "unit":
        return 1.0
    if mode == "synthetic_km":
        return 0.05 + (abs(u ^ v) % 50_000) / 10_000.0
    raise ValueError(f"Modo de peso desconhecido: {mode}")


def _read_snap_edges_gzip(
    path: Path,
    max_lines: int,
) -> List[Tuple[int, int]]:
    edges: List[Tuple[int, int]] = []
    if str(path).endswith(".gz"):
        ctx = gzip.open(path, "rt", encoding="utf-8", errors="replace")
    else:
        ctx = open(path, "r", encoding="utf-8", errors="replace")
    with ctx as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            parts = line.split()
            if len(parts) < 2:
                continue
            u, v = int(parts[0]), int(parts[1])
            edges.append((u, v))
            if len(edges) >= max_lines:
                break
    return edges


def _largest_wcc_nodes_undirected(edge_pairs: List[Tuple[int, int]]) -> Set[int]:
    adj: Dict[int, Set[int]] = defaultdict(set)
    for u, v in edge_pairs:
        adj[u].add(v)
        adj[v].add(u)
    nodes = set(adj.keys())
    melhor: Set[int] = set()
    visitados: Set[int] = set()
    for inicio in nodes:
        if inicio in visitados:
            continue
        pilha = [inicio]
        comp: Set[int] = set()
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


def _bfs_primeiros_k(adj: Dict[int, Set[int]], seed: int, k: int) -> Set[int]:
    if k <= 0:
        return set()
    q: deque[int] = deque([seed])
    vistos: Set[int] = {seed}
    ordem: List[int] = [seed]
    while q and len(ordem) < k:
        u = q.popleft()
        for v in adj[u]:
            if v not in vistos and len(ordem) < k:
                vistos.add(v)
                ordem.append(v)
                q.append(v)
    return vistos


def build_snap_ca_subgraph(
    gz_path: Path,
    *,
    max_vertices: int = 3000,
    max_lines_read: int = 600_000,
    weight_mode: str = "synthetic_km",
) -> Tuple[DiGraph, Dict[str, object]]:
    """
    Lê uma amostra do roadNet-CA (grafo enorme), extrai a maior WCC na amostra e
    um subconjunto conexo de até `max_vertices` nós (BFS a partir do menor id da WCC).
    """
    raw = _read_snap_edges_gzip(gz_path, max_lines_read)
    if not raw:
        raise ValueError(f"Nenhuma aresta lida de {gz_path}")

    comp = _largest_wcc_nodes_undirected(raw)
    adj_u: Dict[int, Set[int]] = defaultdict(set)
    for u, v in raw:
        if u in comp and v in comp:
            adj_u[u].add(v)
            adj_u[v].add(u)

    seed = min(comp)
    nos = _bfs_primeiros_k(adj_u, seed, max_vertices)
    g = DiGraph()
    kept = 0
    for u, v in raw:
        if u in nos and v in nos:
            w = snap_edge_weight(u, v, weight_mode)
            g.add_edge(u, v, w)
            kept += 1

    meta: Dict[str, object] = {
        "arquivo": str(gz_path),
        "linhas_lidas_amostra": len(raw),
        "wcc_tamanho_amostra": len(comp),
        "max_vertices": max_vertices,
        "vertices_subgrafo": len(nos),
        "arestas_dirigidas_subgrafo": kept,
        "peso_modo": weight_mode,
    }
    return g, meta
