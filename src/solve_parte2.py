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

from .graphs.digraph import DiGraph
from .graphs.directed_algorithms import (
    bellman_ford_digraph,
    dijkstra_digraph,
    dfs_order_digraph,
)
from .snap_road import build_snap_ca_subgraph


def _densidade_dirigida(n: int, m: int) -> float:
    if n < 2:
        return 0.0
    return m / (n * (n - 1))


def _pares_rota(vertices: Sequence[int]) -> List[Tuple[int, int]]:
    vs = sorted(vertices)
    if len(vs) < 2:
        return []
    vistos: set[Tuple[int, int]] = set()
    pares: List[Tuple[int, int]] = []

    def add(s: int, t: int) -> None:
        if s == t:
            return
        k = (s, t)
        if k not in vistos:
            vistos.add(k)
            pares.append(k)

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


def _plot_grau_saida(out_path: Path, graus: Counter) -> None:
    fig, ax = plt.subplots(figsize=(8, 5))
    xs = sorted(graus.keys())
    ys = [graus[k] for k in xs]
    ax.bar([str(x) for x in xs], ys, color="#2c3e50")
    ax.set_title("RoadNet-CA (subgrafo): distribuição do grau de saída")
    ax.set_xlabel("Grau de saída")
    ax.set_ylabel("Número de nós")
    fig.tight_layout()
    fig.savefig(out_path, dpi=150)
    plt.close(fig)


def _grafo_demo_neg() -> DiGraph:
    g = DiGraph()
    g.add_edge(0, 1, 4.0)
    g.add_edge(0, 2, 5.0)
    g.add_edge(1, 2, 1.0)
    g.add_edge(1, 3, -2.0)
    g.add_edge(2, 3, 1.0)
    return g


def _grafo_demo_ciclo() -> DiGraph:
    g = DiGraph()
    g.add_edge(0, 1, 1.0)
    g.add_edge(1, 2, -2.0)
    g.add_edge(2, 1, 0.5)
    g.add_edge(0, 3, 5.0)
    return g


def _bfs_camadas(g: DiGraph, fonte: int) -> Tuple[Dict[int, int], Dict[int, List[int]]]:
    dist: Dict[int, int] = {fonte: 0}
    fila: deque[int] = deque([fonte])
    while fila:
        u = fila.popleft()
        for v in g.out_neighbors(u):
            if v not in dist:
                dist[v] = dist[u] + 1
                fila.append(v)
    camadas: Dict[int, List[int]] = {}
    for v, d in dist.items():
        camadas.setdefault(d, []).append(v)
    return dist, camadas


def _subgrafo_induzido(g: DiGraph, nos: List[int]) -> DiGraph:
    nos_set = set(nos)
    sub = DiGraph()
    for u, v, w in g.iter_edges():
        if u in nos_set and v in nos_set:
            sub.add_edge(u, v, w)
    return sub


def _rodar_bfs_dfs(
    g: DiGraph, fontes: List[int]
) -> Tuple[List[Dict], List[Dict]]:
    bfs_res = []
    for f in fontes:
        dist, camadas = _bfs_camadas(g, f)
        bfs_res.append({
            "fonte": f,
            "nos_alcancados": len(dist),
            "camadas": {str(k): len(v) for k, v in sorted(camadas.items())},
            "amostra_bfs": sorted(dist.keys())[:10],
        })

    vs_dfs = sorted(g.vertices())[:200]
    g_dfs = _subgrafo_induzido(g, vs_dfs)
    fontes_dfs = []
    for f in fontes:
        if f in set(vs_dfs):
            fontes_dfs.append(f)
    if len(fontes_dfs) < 3:
        fontes_dfs = sorted(set(vs_dfs))[:3]

    dfs_res = []
    lim_ant = sys.getrecursionlimit()
    sys.setrecursionlimit(max(lim_ant, 8000))
    try:
        for f in fontes_dfs[:3]:
            ordem = dfs_order_digraph(g_dfs, f)
            dfs_res.append({
                "fonte": f,
                "nos_visitados": len(ordem),
                "amostra_dfs": ordem[:10],
            })
    finally:
        sys.setrecursionlimit(lim_ant)

    return bfs_res, dfs_res


def run_parte2(
    project_root: Path,
    *,
    max_vertices: int = 3000,
    max_lines_read: int = 600_000,
    weight_mode: str = "synthetic_km",
) -> None:
    data_p2 = project_root / "data" / "dataset_parte2" / "roadNet-CA.txt.gz"
    if not data_p2.exists():
        raise SystemExit(
            "Dataset ausente. Execute:\n"
            f"  python scripts/download_roadnet_ca.py\n"
            f"  (arquivo esperado: {data_p2})"
        )

    g, meta = build_snap_ca_subgraph(
        data_p2,
        max_vertices=max_vertices,
        max_lines_read=max_lines_read,
        weight_mode=weight_mode,
    )

    out = project_root / "out" / "parte2"
    out.mkdir(parents=True, exist_ok=True)

    V = g.vertices()
    n = len(V)
    m = g.num_edges()
    d = _densidade_dirigida(n, m)

    metrics = {
        **meta,
        "ordem": n,
        "tamanho_arestas_dirigidas": m,
        "densidade_dirigida": d,
    }
    (out / "subgrafo_metricas.json").write_text(
        json.dumps(metrics, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    grau_saida: Counter = Counter()
    for u in V:
        grau_saida[len(g.out_neighbors(u))] += 1
    _plot_grau_saida(out / "viz_parte2_grau_saida.png", grau_saida)

    vs_sorted = sorted(V)
    fontes = [vs_sorted[0], vs_sorted[len(vs_sorted) // 2], vs_sorted[-1]]
    bfs_res, dfs_res = _rodar_bfs_dfs(g, fontes)

    pares = _pares_rota(list(V))
    rows: List[Dict] = []
    by_src: Dict[int, List[int]] = defaultdict(list)
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
            raise RuntimeError("Ciclo negativo inesperado (pesos >= 0).")

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
            rows.append({
                "origem": s,
                "destino": t,
                "distancia_bellman_ford": dbf,
                "distancia_dijkstra": ddj,
                "diferenca_abs": dif,
                "coincide": ok,
                "tempo_s_sssp_bf_s": t_bf,
                "tempo_s_sssp_dijkstra_s": t_dj,
            })

    cmp_path = out / "comparacao_bf_dijkstra.csv"
    if rows:
        with cmp_path.open("w", encoding="utf-8", newline="") as f:
            w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
            w.writeheader()
            w.writerows(rows)
    else:
        cmp_path.write_text(
            "origem,destino,nota\n,,sem_pares_subgrafo_pequeno_demais\n",
            encoding="utf-8",
        )

    (out / "nota_pesos.txt").write_text(
        "roadNet-CA (SNAP) nao fornece distancia geodesica por aresta.\n"
        "Modo 'unit': peso 1 (contagem de arestas).\n"
        "Modo 'synthetic_km': peso positivo sintetico derivado dos ids (comparavel entre algoritmos, nao e km real).\n",
        encoding="utf-8",
    )

    g_neg = _grafo_demo_neg()
    dist_neg, _, ciclo_neg = bellman_ford_digraph(g_neg, 0)

    g_ciclo = _grafo_demo_ciclo()
    _, _, ciclo_detectado = bellman_ford_digraph(g_ciclo, 0)

    def _safe(v):
        if v == float("inf") or v == float("-inf"):
            return None
        if v != v:
            return None
        return v

    n_ok = sum(1 for r in rows if r["coincide"])
    n_fontes = len(by_src)

    report = {
        "dataset": "roadNet-CA (SNAP) — subgrafo",
        "subgrafo": {
            "ordem": n,
            "tamanho_arestas_dirigidas": m,
            "densidade_dirigida": round(d, 8),
        },
        "bfs": bfs_res,
        "dfs": dfs_res,
        "dijkstra": {
            "fontes_distintas": n_fontes,
            "pares_avaliados": len(rows),
            "tempo_total_s": round(t_dj_total, 6),
            "tempo_medio_por_fonte_s": round(t_dj_total / max(n_fontes, 1), 6),
        },
        "bellman_ford": {
            "fontes_distintas": n_fontes,
            "pares_avaliados": len(rows),
            "tempo_total_s": round(t_bf_total, 6),
            "tempo_medio_por_fonte_s": round(t_bf_total / max(n_fontes, 1), 6),
            "coincidencias_com_dijkstra": n_ok,
        },
        "bf_demo_peso_negativo_sem_ciclo": {
            "nos": 4,
            "arestas": [[0, 1, 4], [0, 2, 5], [1, 2, 1], [1, 3, -2], [2, 3, 1]],
            "distancias_de_0": {str(k): _safe(v) for k, v in dist_neg.items()},
            "ciclo_negativo_detectado": ciclo_neg,
        },
        "bf_demo_ciclo_negativo": {
            "nos": 4,
            "arestas": [[0, 1, 1], [1, 2, -2], [2, 1, 0.5], [0, 3, 5]],
            "ciclo_negativo_detectado": ciclo_detectado,
        },
    }

    (project_root / "out" / "parte2_report.json").write_text(
        json.dumps(report, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    print(f"Parte 2 concluida. Saidas em {out}")
    print(f"  Nos: {n}, Arestas dir.: {m}, Pares avaliados: {len(rows)}")
