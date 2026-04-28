from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Set, Tuple

import pandas as pd

from .graphs.algorithms import shortest_path
from .graphs.graph import Graph
from .graphs.io import iata_to_regiao


def densidade(ordem: int, tamanho: int) -> float:
    # calcula a densidade do grafo
    if ordem < 2:
        return 0.0
    return (2.0 * tamanho) / (ordem * (ordem - 1))


def metricas_subgrafo_vertices(graph: Graph, verts: Set[str]) -> Dict[str, Any]:
    # calcula métricas de um subgrafo
    elocal = 0
    edges_seen: Set[Tuple[str, str]] = set()

    for u, v, _ in graph.iter_edges():
        if u not in verts or v not in verts:
            continue

        a, b = (u, v) if u < v else (v, u)

        if (a, b) not in edges_seen:
            edges_seen.add((a, b))
            elocal += 1

    nloc = len(verts)

    return {
        "ordem": nloc,
        "tamanho": elocal,
        "densidade": densidade(nloc, elocal),
    }


def ego_subgraph_vertices(graph: Graph, v: str) -> Set[str]:
    # pega o vértice + vizinhos
    s: Set[str] = {v}
    s.update(graph.neighbors(v).keys())
    return s


def run_metrics(
    graph: Graph,
    airports: pd.DataFrame,
    out_dir: Path,
) -> Tuple[Dict[str, Any], List[Dict[str, Any]], pd.DataFrame]:

    # cria pasta de saída
    out_dir.mkdir(parents=True, exist_ok=True)

    regiao_por_iata = iata_to_regiao(airports)
    V = graph.vertices()
    e_count = graph.num_edges()

    # métricas gerais
    global_metrics = {
        "ordem": len(V),
        "tamanho": e_count,
        "densidade": densidade(len(V), e_count),
    }

    (out_dir / "global.json").write_text(
        json.dumps(global_metrics, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    # métricas por região
    regioes_lista = ["Norte", "Nordeste", "Centro-Oeste", "Sudeste", "Sul"]
    regioes_out: List[Dict[str, Any]] = []

    for reg in regioes_lista:
        verts = {iata for iata, rg in regiao_por_iata.items() if rg == reg and iata in V}
        m = metricas_subgrafo_vertices(graph, verts)
        m["regiao"] = reg
        regioes_out.append(m)

    (out_dir / "regioes.json").write_text(
        json.dumps(regioes_out, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    rows_ego: List[Dict[str, Any]] = []
    graus_rows: List[Dict[str, Any]] = []

    # calcula ego e grau de cada aeroporto
    for iata in sorted(V):
        gdeg = graph.degree(iata)
        ego = ego_subgraph_vertices(graph, iata)
        m_ego = metricas_subgrafo_vertices(graph, ego)

        rows_ego.append(
            {
                "aeroporto": iata,
                "grau": gdeg,
                "ordem_ego": m_ego["ordem"],
                "tamanho_ego": m_ego["tamanho"],
                "densidade_ego": m_ego["densidade"],
            }
        )

        graus_rows.append({"aeroporto": iata, "grau": gdeg})

    df_ego = pd.DataFrame(rows_ego)
    df_ego.to_csv(out_dir / "ego_aeroportos.csv", index=False, encoding="utf-8")

    df_graus = pd.DataFrame(graus_rows).sort_values("grau", ascending=False)
    df_graus.to_csv(out_dir / "graus.csv", index=False, encoding="utf-8")

    # rankings simples
    rk = {
        "maior_grau": df_graus.iloc[0].to_dict(),
        "maior_densidade_ego": df_ego.sort_values("densidade_ego", ascending=False).iloc[0].to_dict(),
    }

    (out_dir / "rankings.json").write_text(
        json.dumps(rk, indent=2, ensure_ascii=False),
        encoding="utf-8"
    )

    return global_metrics, regioes_out, df_ego


def run_routes(
    graph: Graph,
    routes_path: Path,
    out_dir: Path,
) -> pd.DataFrame:

    # cria pasta de saída
    out_dir.mkdir(parents=True, exist_ok=True)

    from .graphs.io import load_routes

    routes = load_routes(routes_path)
    out_rows: List[Dict[str, Any]] = []

    # calcula menor caminho pra cada rota
    for o, d in routes:
        custo, caminho = shortest_path(graph, o, d)

        caminho_str = "→".join(caminho) if caminho else ""

        out_rows.append(
            {
                "origem": o,
                "destino": d,
                "custo": custo if custo != float("inf") else None,
                "caminho": caminho_str,
            }
        )

    df = pd.DataFrame(out_rows)
    df.to_csv(out_dir / "distancias_rotas.csv", index=False, encoding="utf-8")

    return df