from __future__ import annotations

import csv
import json
import sys
import time
from collections import Counter, defaultdict, deque
from pathlib import Path
from typing import Dict, List, Sequence, Tuple

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt

from .directed_algorithms import (
    bellman_ford_digraph,
    dijkstra_digraph,
    dfs_order_digraph,
)

from .snap_road import build_snap_ca_subgraph


def _densidade_dirigida(n: int, m: int) -> float:

    # calc densidade
    if n < 2:
        return 0.0

    return m / (n * (n - 1))


def _pares_rota(vertices: Sequence[int]) -> List[Tuple[int, int]]:

    # gera pares teste
    vs = sorted(vertices)

    if len(vs) < 2:
        return []

    vistos = set()

    pares = []

    def add(s, t):

        if s == t:
            return

        if (s, t) not in vistos:

            vistos.add((s, t))

            pares.append((s, t))

    add(vs[0], vs[-1])

    if len(vs) > 4:

        add(vs[0], vs[len(vs) // 2])

        add(vs[len(vs) // 4], vs[3 * len(vs) // 4])

    mid = len(vs) // 2

    add(vs[mid - 1], vs[mid])

    if len(vs) > 10:
        add(vs[2], vs[-3])

    i = 0

    while len(pares) < 8 and i + 1 < len(vs):

        add(vs[i], vs[i + 1])

        i += 1

    return pares[:10]


def _plot_grau_saida(out_path: Path, graus: Counter):

    # grafico graus
    fig, ax = plt.subplots(figsize=(8, 5))

    xs = sorted(graus.keys())

    ys = [graus[k] for k in xs]

    ax.bar([str(x) for x in xs], ys)

    ax.set_title("Distribuicao grau saida")

    ax.set_xlabel("Grau")

    ax.set_ylabel("Qtd nos")

    fig.tight_layout()

    fig.savefig(out_path, dpi=150)

    plt.close(fig)


def _grafo_demo_neg():

    # teste peso negativo
    g = {}

    g[0] = {
        1: 4.0,
        2: 5.0
    }

    g[1] = {
        2: 1.0,
        3: -2.0
    }

    g[2] = {
        3: 1.0
    }

    g[3] = {}

    return g


def _grafo_demo_ciclo():

    # teste ciclo negativo
    g = {}

    g[0] = {
        1: 1.0,
        3: 5.0
    }

    g[1] = {
        2: -2.0
    }

    g[2] = {
        1: 0.5
    }

    g[3] = {}

    return g


def _bfs_camadas(g, fonte):

    # bfs normal
    dist = {
        fonte: 0
    }

    fila = deque([fonte])

    while fila:

        u = fila.popleft()

        for v in g[u]:

            if v not in dist:

                dist[v] = dist[u] + 1

                fila.append(v)

    camadas = {}

    for v, d in dist.items():

        if d not in camadas:
            camadas[d] = []

        camadas[d].append(v)

    return dist, camadas


def _subgrafo_induzido(g, nos):

    # cria subgrafo
    sub = {}

    nos_set = set(nos)

    for u in nos_set:

        sub[u] = {}

        if u not in g:
            continue

        for v, w in g[u].items():

            if v in nos_set:

                sub[u][v] = w

    return sub


def _rodar_bfs_dfs(g, fontes):

    bfs_res = []

    for f in fontes:

        dist, camadas = _bfs_camadas(g, f)

        bfs_res.append(
            {
                "fonte": f,
                "nos_alcancados": len(dist),
                "camadas": {
                    str(k): len(v)
                    for k, v in sorted(camadas.items())
                },
                "amostra_bfs": sorted(dist.keys())[:10],
            }
        )

    vs_dfs = sorted(g.keys())[:200]

    g_dfs = _subgrafo_induzido(g, vs_dfs)

    fontes_dfs = []

    for f in fontes:

        if f in vs_dfs:
            fontes_dfs.append(f)

    if len(fontes_dfs) < 3:
        fontes_dfs = vs_dfs[:3]

    dfs_res = []

    lim_ant = sys.getrecursionlimit()

    sys.setrecursionlimit(max(lim_ant, 8000))

    try:

        for f in fontes_dfs[:3]:

            ordem = dfs_order_digraph(g_dfs, f)

            dfs_res.append(
                {
                    "fonte": f,
                    "nos_visitados": len(ordem),
                    "amostra_dfs": ordem[:10],
                }
            )

    finally:

        sys.setrecursionlimit(lim_ant)

    return bfs_res, dfs_res


def run_parte2(
    project_root: Path,
    *,
    max_vertices: int = 3000,
    max_lines_read: int = 600_000,
    weight_mode: str = "synthetic_km",
):

    data_p2 = (
        project_root
        / "data"
        / "dataset_parte2"
        / "roadNet-CA.txt.gz"
    )

    if not data_p2.exists():

        raise SystemExit(
            "dataset faltando"
        )

    g, meta = build_snap_ca_subgraph(
        data_p2,
        max_vertices=max_vertices,
        max_lines_read=max_lines_read,
        weight_mode=weight_mode,
    )

    out = project_root / "out" / "parte2"

    out.mkdir(
        parents=True,
        exist_ok=True
    )

    V = set(g.keys())

    n = len(V)

    m = 0

    for u in g:
        m += len(g[u])

    d = _densidade_dirigida(n, m)

    metrics = {
        **meta,
        "ordem": n,
        "tamanho_arestas_dirigidas": m,
        "densidade_dirigida": d,
    }

    (out / "subgrafo_metricas.json").write_text(
        json.dumps(
            metrics,
            indent=2,
            ensure_ascii=False
        ),
        encoding="utf-8",
    )

    grau_saida = Counter()

    for u in V:

        grau_saida[len(g[u])] += 1

    _plot_grau_saida(
        out / "viz_parte2_grau_saida.png",
        grau_saida
    )

    vs_sorted = sorted(V)

    fontes = [
        vs_sorted[0],
        vs_sorted[len(vs_sorted) // 2],
        vs_sorted[-1]
    ]

    bfs_res, dfs_res = _rodar_bfs_dfs(
        g,
        fontes
    )

    pares = _pares_rota(list(V))

    rows = []

    by_src = defaultdict(list)

    for s, t in pares:

        if s != t:
            by_src[s].append(t)

    t_bf_total = 0.0
    t_dj_total = 0.0

    for s, alvos in by_src.items():

        t0 = time.perf_counter()

        dist_bf, _, neg = bellman_ford_digraph(g, s)

        t_bf = time.perf_counter() - t0

        t_bf_total += t_bf

        if neg:
            raise RuntimeError("ciclo negativo")

        t0 = time.perf_counter()

        dist_dj, _ = dijkstra_digraph(g, s)

        t_dj = time.perf_counter() - t0

        t_dj_total += t_dj

        for t in alvos:

            dbf = dist_bf.get(t, float("inf"))

            ddj = dist_dj.get(t, float("inf"))

            if dbf == float("inf") and ddj == float("inf"):

                dif = 0.0

                ok = True

            elif dbf == float("inf") or ddj == float("inf"):

                dif = float("nan")

                ok = False

            else:

                dif = abs(dbf - ddj)

                ok = dif < 1e-6

            rows.append(
                {
                    "origem": s,
                    "destino": t,
                    "distancia_bellman_ford": dbf,
                    "distancia_dijkstra": ddj,
                    "diferenca_abs": dif,
                    "coincide": ok,
                    "tempo_bf": t_bf,
                    "tempo_dijkstra": t_dj,
                }
            )

    cmp_path = out / "comparacao_bf_dijkstra.csv"

    if rows:

        with cmp_path.open(
            "w",
            encoding="utf-8",
            newline=""
        ) as f:

            w = csv.DictWriter(
                f,
                fieldnames=list(rows[0].keys())
            )

            w.writeheader()

            w.writerows(rows)

    else:

        cmp_path.write_text(
            "sem dados",
            encoding="utf-8"
        )

    print("parte 2 concluida")
    print(f"nos: {n}")
    print(f"arestas: {m}")
    print(f"pares: {len(rows)}")