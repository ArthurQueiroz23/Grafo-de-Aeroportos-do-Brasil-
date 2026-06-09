from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, Set

import pandas as pd

from .algorithms import shortest_path
from .io import iata_to_regiao, load_routes
from .outputs import arred, write_json, write_manifest


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

    # divide por 2 pq eh nao direcionado
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
        "densidade": arred(
            densidade(len(vertices), qtd_arestas)
        ),
    }

    write_json(
        out_dir / "global.json",
        global_metrics,
        parte="parte1",
        descricao=(
            "Métricas globais do grafo não direcionado de aeroportos: "
            "ordem (nº de vértices), tamanho (nº de arestas) e densidade."
        ),
    )

    # regioes
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

        # ordem das chaves pensada para leitura: regiao primeiro
        regioes_out.append(
            {
                "regiao": reg,
                "ordem": m["ordem"],
                "tamanho": m["tamanho"],
                "densidade": arred(m["densidade"]),
            }
        )

    write_json(
        out_dir / "regioes.json",
        regioes_out,
        parte="parte1",
        chave_conteudo="regioes",
        descricao=(
            "Métricas do subgrafo induzido de cada região do Brasil "
            "(ordem, tamanho e densidade)."
        ),
    )

    rows_ego = []

    graus_rows = []

    # roda aeroporto por aeroporto
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
    def _linha_limpa(serie):
        # converte numpy -> tipos nativos e arredonda floats
        return {
            k: arred(v.item() if hasattr(v, "item") else v)
            for k, v in serie.to_dict().items()
        }

    rk = {
        "maior_grau": _linha_limpa(df_graus.iloc[0]),
        "maior_densidade_ego": _linha_limpa(
            df_ego.sort_values(
                "densidade_ego",
                ascending=False
            ).iloc[0]
        ),
    }

    write_json(
        out_dir / "rankings.json",
        rk,
        parte="parte1",
        descricao=(
            "Destaques da rede: aeroporto de maior grau e ego-rede de maior "
            "densidade."
        ),
    )

    return global_metrics, regioes_out, df_ego


def escrever_manifesto_parte1(out_dir: Path):

    # catálogo de todos os arquivos de saída da Parte 1 (descoberta por
    # integrações). Chamado ao final do pipeline para refletir o estado real.
    return write_manifest(
        out_dir,
        parte="parte1",
        titulo="Parte 1 — Rede de Aeroportos do Brasil",
        arquivos=[
            {
                "arquivo": "global.json",
                "tipo": "json",
                "descricao": "Métricas globais do grafo (ordem, tamanho, densidade).",
            },
            {
                "arquivo": "regioes.json",
                "tipo": "json",
                "descricao": "Métricas por região (subgrafos induzidos).",
            },
            {
                "arquivo": "rankings.json",
                "tipo": "json",
                "descricao": "Maior grau e maior densidade de ego-rede.",
            },
            {
                "arquivo": "graus.csv",
                "tipo": "csv",
                "descricao": "Grau de cada aeroporto, ordenado de forma decrescente.",
                "colunas": ["aeroporto", "grau"],
            },
            {
                "arquivo": "ego_aeroportos.csv",
                "tipo": "csv",
                "descricao": "Métricas da ego-rede de cada aeroporto.",
                "colunas": [
                    "aeroporto",
                    "grau",
                    "ordem_ego",
                    "tamanho_ego",
                    "densidade_ego",
                ],
            },
            {
                "arquivo": "distancias_rotas.csv",
                "tipo": "csv",
                "descricao": "Menor caminho (Dijkstra) das rotas de interesse.",
                "colunas": ["origem", "destino", "custo", "caminho"],
            },
            {
                "arquivo": "viz_distribuicao_graus.png",
                "tipo": "imagem",
                "descricao": "Histograma da distribuição de graus.",
            },
            {
                "arquivo": "viz_bfs_camadas.png",
                "tipo": "imagem",
                "descricao": "Quantidade de aeroportos por camada de BFS a partir de GRU.",
            },
            {
                "arquivo": "viz_ranking_graus.png",
                "tipo": "imagem",
                "descricao": "Ranking dos aeroportos mais conectados.",
            },
            {
                "arquivo": "viz_regioes_metricas.png",
                "tipo": "imagem",
                "descricao": "Ordem e tamanho por região.",
            },
            {
                "arquivo": "viz_regioes_densidade.png",
                "tipo": "imagem",
                "descricao": "Densidade por região.",
            },
            {
                "arquivo": "viz_subgrafo_maior_grau.png",
                "tipo": "imagem",
                "descricao": "Subgrafo dos aeroportos mais conectados.",
            },
        ],
    )


def run_routes(
    graph: dict,
    routes_path: Path,
    out_dir: Path,
    origem_filtro: str | None = None,
    destino_filtro: str | None = None,
):

    # cria pasta
    out_dir.mkdir(
        parents=True,
        exist_ok=True
    )

    # le rotas
    routes = load_routes(routes_path)

    out_rows = []

    # calcula caminhos
    for origem, destino in routes:

        # filtra origem
        if origem_filtro:

            if origem != origem_filtro:
                continue

        # filtra destino
        if destino_filtro:

            if destino != destino_filtro:
                continue

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