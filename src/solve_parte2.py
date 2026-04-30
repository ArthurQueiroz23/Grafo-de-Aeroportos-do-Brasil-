from __future__ import annotations

import csv
import json
import time
from collections import Counter, defaultdict
from pathlib import Path
from typing import Dict, List, Sequence, Tuple

import matplotlib.pyplot as plt

from .graphs.directed_algorithms import bellman_ford_digraph, dijkstra_digraph
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
    metrics = {
        **meta,
        "ordem": n,
        "tamanho_arestas_dirigidas": m,
        "densidade_dirigida": _densidade_dirigida(n, m),
    }
    (out / "subgrafo_metricas.json").write_text(
        json.dumps(metrics, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    grau_saida: Counter = Counter()
    for u in V:
        grau_saida[len(g.out_neighbors(u))] += 1
    _plot_grau_saida(out / "viz_parte2_grau_saida.png", grau_saida)

    pares = _pares_rota(list(V))
    rows: List[Dict[str, object]] = []
    by_src: Dict[int, List[int]] = defaultdict(list)
    for s, t in pares:
        if s != t:
            by_src[s].append(t)

    for s, alvos in by_src.items():
        t0 = time.perf_counter()
        dist_bf, _, neg = bellman_ford_digraph(g, s)
        t_bf = time.perf_counter() - t0
        if neg:
            raise RuntimeError("Ciclo negativo inesperado (pesos ≥ 0).")
        t0 = time.perf_counter()
        dist_dj, _ = dijkstra_digraph(g, s)
        t_dj = time.perf_counter() - t0
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
                    "tempo_s_sssp_bf_s": t_bf,
                    "tempo_s_sssp_dijkstra_s": t_dj,
                }
            )

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
        "roadNet-CA (SNAP) não fornece distância geodésica por aresta.\n"
        "Modo 'unit': peso 1 (contagem de arestas).\n"
        "Modo 'synthetic_km': peso positivo sintético derivado dos ids (comparável entre algoritmos, não é km real).\n",
        encoding="utf-8",
    )

    print(f"Parte 2 concluída. Saídas em {out}")
    print(f"  Nós: {n}, Arestas dir.: {m}, Pares avaliados: {len(rows)}")
