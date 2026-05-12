from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Set, Tuple

import pandas as pd

from .algorithms import shortest_path
from .io import iata_to_regiao, load_routes


def iter_edges(graph):

    # evita repetir aresta
    visitadas = set()

    for u in graph:

        for v, w in graph[u].items():

            if (v, u) not in visitadas:

                visitadas.add((u, v))

                yield (u, v, w)


def num_edges(graph):

    total = 0

    for u in graph:
        total += len(graph[u])

    # divide por 2 pq é nao direcionado
    return total // 2


def densidade(ordem: int, tamanho: int) -> float:

    # calc densidade
    if ordem < 2:
        return 0.0

    return (2.0 * tamanho) / (ordem * (ordem - 1))


def metricas_subgrafo_vertices(
    graph: dict,
    verts: Set[str]
) -> Dict[str, Any]:

    # metricas do subgrafo
    elocal = 0

    visitadas = set()

    for u, v, _ in iter_edges(graph):

        if u not in verts or v not in verts:
            continue

        a, b = (u, v) if u < v else (v, u)

        if (a, b) not in visitadas:

            visitadas.add((a, b))

            elocal += 1

    nloc = len(verts)

    return {
        "ordem": nloc,
        "tamanho": elocal,
        "densidade": densidade(nloc, elocal),
    }


def ego_subgraph_vertices(
    graph: dict,
    v: str
) -> Set[str]:

    # vertice + vizinhos
    s = {v}

    s.update(graph[v].keys())

    return s


def run_metrics(
    graph: dict,
    airports: pd.DataFrame,
    out_dir: Path,
):

    # cria pasta
    out_dir.mkdir(
        parents=True,
        exist_ok=True
    )

    regiao_por_iata = iata_to_regiao(airports)

    vertices = set(graph.keys())

    qtd_arestas = num_edges(graph)

    # metricas gerais
    global_metrics = {
        "ordem": len(vertices),
        "tamanho": qtd_arestas,
        "densidade": densidade(
            len(vertices),
            qtd_arestas
        ),
    }

    (out_dir / "global.json").write_text(
        json.dumps(
            global_metrics,
            indent=2,
            ensure_ascii=False
        ),
        encoding="utf-8",
    )

    # metricas regioes
    regioes_lista = [
        "Norte",
        "Nordeste",
        "Centro-Oeste",
        "Sudeste",
        "Sul"
    ]

    regioes_out = []

    for reg in regioes_lista:

        verts = {
            iata
            for iata, rg in regiao_por_iata.items()
            if rg == reg and iata in vertices
        }

        m = metricas_subgrafo_vertices(
            graph,
            verts
        )

        m["regiao"] = reg

        regioes_out.append(m)

    (out_dir / "regioes.json").write_text(
        json.dumps(
            regioes_out,
            indent=2,
            ensure_ascii=False
        ),
        encoding="utf-8",
    )

    rows_ego = []

    graus_rows = []

    # metricas por aeroporto
    for iata in sorted(vertices):

        grau = len(graph[iata])

        ego = ego_subgraph_vertices(
            graph,
            iata
        )

        m_ego = metricas_subgrafo_vertices(
            graph,
            ego
        )

        rows_ego.append(
            {
                "aeroporto": iata,
                "grau": grau,
                "ordem_ego": m_ego["ordem"],
                "tamanho_ego": m_ego["tamanho"],
                "densidade_ego": m_ego["densidade"],
            }
        )

        graus_rows.append(
            {
                "aeroporto": iata,
                "grau": grau
            }
        )

    df_ego = pd.DataFrame(rows_ego)

    df_ego.to_csv(
        out_dir / "ego_aeroportos.csv",
        index=False,
        encoding="utf-8"
    )

    df_graus = pd.DataFrame(
        graus_rows
    ).sort_values(
        "grau",
        ascending=False
    )

    df_graus.to_csv(
        out_dir / "graus.csv",
        index=False,
        encoding="utf-8"
    )

    # rankings
    rk = {
        "maior_grau": df_graus.iloc[0].to_dict(),

        "maior_densidade_ego":
            df_ego.sort_values(
                "densidade_ego",
                ascending=False
            ).iloc[0].to_dict(),
    }

    (out_dir / "rankings.json").write_text(
        json.dumps(
            rk,
            indent=2,
            ensure_ascii=False
        ),
        encoding="utf-8"
    )

    return global_metrics, regioes_out, df_ego


def run_routes(
    graph: dict,
    routes_path: Path,
    out_dir: Path,
):

    # cria pasta
    out_dir.mkdir(
        parents=True,
        exist_ok=True
    )

    routes = load_routes(routes_path)

    out_rows = []

    # calcula caminhos
    for origem, destino in routes:

        custo, caminho = shortest_path(
            graph,
            origem,
            destino
        )

        caminho_str = (
            "→".join(caminho)
            if caminho
            else ""
        )

        out_rows.append(
            {
                "origem": origem,
                "destino": destino,
                "custo":
                    custo
                    if custo != float("inf")
                    else None,

                "caminho": caminho_str,
            }
        )

    df = pd.DataFrame(out_rows)

    df.to_csv(
        out_dir / "distancias_rotas.csv",
        index=False,
        encoding="utf-8"
    )

    return df