from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Dict, List, Set, Tuple

import matplotlib
matplotlib.use("Agg")

import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import pandas as pd

from .algorithms import (
    bfs_distances,
    iter_edges,
)

from .io import (
    build_graph_from_adjacency_csv,
    load_airports_table,
)


def _edge_key(u: str, v: str) -> Tuple[str, str]:

    if u < v:
        return (u, v)

    return (v, u)


def _path_edges(path: List[str]) -> Set[Tuple[str, str]]:

    edges = set()

    for i in range(len(path) - 1):

        u = path[i]
        v = path[i + 1]

        edges.add(_edge_key(u, v))

    return edges


def _matplotlib_style():

    # estilo simples
    plt.rcParams.update(
        {
            "figure.facecolor": "white",
            "axes.facecolor": "#fafafa",
            "axes.grid": True,
            "grid.alpha": 0.25,
            "font.size": 10,
        }
    )


def plot_distribuicao_graus(
    out_path: Path,
    df_graus: pd.DataFrame,
):

    _matplotlib_style()

    fig, ax = plt.subplots(figsize=(8, 5))

    maior = int(df_graus["grau"].max())

    ax.hist(
        df_graus["grau"],
        bins=range(0, maior + 2),
        color="#4c72b0",
        edgecolor="white",
    )

    ax.set_title("Distribuição dos Graus")

    ax.set_xlabel("Grau")

    ax.set_ylabel("Quantidade")

    legenda = mpatches.Patch(
        color="#4c72b0",
        label="Quantidade de aeroportos",
    )

    ax.legend(handles=[legenda])

    fig.tight_layout()

    fig.savefig(out_path, dpi=150)

    plt.close(fig)


def plot_ranking_graus(
    out_path: Path,
    df_graus: pd.DataFrame,
    top_n: int = 12,
):

    _matplotlib_style()

    top = (
        df_graus
        .sort_values("grau", ascending=False)
        .head(top_n)
    )

    fig, ax = plt.subplots(figsize=(8, 6))

    ax.barh(
        top["aeroporto"],
        top["grau"],
        color="#55a868",
    )

    ax.set_title("Aeroportos Mais Conectados")

    ax.set_xlabel("Grau")

    ax.set_ylabel("Aeroporto")

    fig.tight_layout()

    fig.savefig(out_path, dpi=150)

    plt.close(fig)


def plot_regioes_metricas(
    out_path: Path,
    regioes_json: Path,
):

    _matplotlib_style()

    data = json.loads(
        regioes_json.read_text(
            encoding="utf-8"
        )
    )

    regioes = []
    ordens = []
    tamanhos = []

    for item in data:

        regioes.append(item["regiao"])
        ordens.append(item["ordem"])
        tamanhos.append(item["tamanho"])

    x = range(len(regioes))

    fig, ax = plt.subplots(figsize=(9, 5))

    largura = 0.3

    ax.bar(
        [i - largura / 2 for i in x],
        ordens,
        width=largura,
        label="Ordem",
    )

    ax.bar(
        [i + largura / 2 for i in x],
        tamanhos,
        width=largura,
        label="Tamanho",
    )

    ax.set_xticks(list(x))

    ax.set_xticklabels(regioes)

    ax.set_title(
        "Ordem e Tamanho por Região"
    )

    ax.legend()

    fig.tight_layout()

    fig.savefig(out_path, dpi=150)

    plt.close(fig)


def plot_regioes_densidade(
    out_path: Path,
    regioes_json: Path,
):

    _matplotlib_style()

    data = json.loads(
        regioes_json.read_text(
            encoding="utf-8"
        )
    )

    regioes = []
    densidades = []

    for item in data:

        regioes.append(item["regiao"])
        densidades.append(item["densidade"])

    fig, ax = plt.subplots(figsize=(8, 5))

    ax.bar(
        regioes,
        densidades,
        color="#8172b3",
    )

    ax.set_title("Densidade por Região")

    ax.set_xlabel("Região")

    ax.set_ylabel("Densidade")

    for i in range(len(densidades)):

        ax.text(
            i,
            densidades[i] + 0.002,
            f"{densidades[i]:.3f}",
            ha="center",
        )

    fig.tight_layout()

    fig.savefig(out_path, dpi=150)

    plt.close(fig)


def plot_bfs_camadas(
    out_path: Path,
    graph: dict,
    fonte: str = "GRU",
):

    _matplotlib_style()

    distancias = bfs_distances(
        graph,
        fonte,
    )

    camadas = {}

    for dist in distancias.values():

        if dist not in camadas:
            camadas[dist] = 0

        camadas[dist] += 1

    xs = sorted(camadas.keys())

    ys = []

    for x in xs:
        ys.append(camadas[x])

    fig, ax = plt.subplots(figsize=(8, 5))

    ax.bar(
        [str(x) for x in xs],
        ys,
        color="#ccb974",
    )

    ax.set_title(
        f"BFS a partir de {fonte}"
    )

    ax.set_xlabel("Distância")

    ax.set_ylabel(
        "Quantidade de aeroportos"
    )

    fig.tight_layout()

    fig.savefig(out_path, dpi=150)

    plt.close(fig)


def plot_subgrafo_maior_grau(
    out_path: Path,
    graph: dict,
    df_graus: pd.DataFrame,
    top_k: int = 8,
):

    _matplotlib_style()

    top = (
        df_graus
        .sort_values(
            "grau",
            ascending=False,
        )
        .head(top_k)["aeroporto"]
        .tolist()
    )

    top_set = set(top)

    arestas = []

    for u, v, w in iter_edges(graph):

        if u in top_set and v in top_set:

            arestas.append(
                (u, v, w)
            )

    n = len(top)

    posicoes = {}

    for i in range(n):

        angulo = (
            2 * math.pi * i / n
        )

        posicoes[top[i]] = (
            math.cos(angulo),
            math.sin(angulo),
        )

    graus = {}

    for aeroporto in top:

        graus[aeroporto] = len(
            graph[aeroporto]
        )

    fig, ax = plt.subplots(
        figsize=(9, 9)
    )

    for u, v, w in arestas:

        x0, y0 = posicoes[u]
        x1, y1 = posicoes[v]

        ax.plot(
            [x0, x1],
            [y0, y1],
            lw=1 + w * 0.5,
            color="#cccccc",
        )

    for aeroporto in top:

        x, y = posicoes[aeroporto]

        tamanho = (
            300 + graus[aeroporto] * 120
        )

        ax.scatter(
            x,
            y,
            s=tamanho,
            color="#4c72b0",
        )

        ax.text(
            x,
            y,
            aeroporto,
            ha="center",
            va="center",
            color="white",
            fontweight="bold",
        )

    ax.set_title(
        "Subgrafo dos Aeroportos Mais Conectados"
    )

    ax.axis("off")

    fig.tight_layout()

    fig.savefig(out_path, dpi=150)

    plt.close(fig)


def run_all_visualizations(root: Path):

    data_dir = root / "data"

    out_dir = root / "out"

    out_dir.mkdir(
        parents=True,
        exist_ok=True,
    )

    grafo = build_graph_from_adjacency_csv(
        data_dir / "adjacencias_aeroportos.csv"
    )

    load_airports_table(
        data_dir / "aeroportos_data.csv"
    )

    df_graus = pd.read_csv(
        out_dir / "graus.csv",
        encoding="utf-8",
    )

    print("gerando visualizações...")

    plot_distribuicao_graus(
        out_dir / "viz_distribuicao_graus.png",
        df_graus,
    )

    plot_bfs_camadas(
        out_dir / "viz_bfs_camadas.png",
        grafo,
    )

    plot_ranking_graus(
        out_dir / "viz_ranking_graus.png",
        df_graus,
    )

    plot_regioes_metricas(
        out_dir / "viz_regioes_metricas.png",
        out_dir / "regioes.json",
    )

    plot_regioes_densidade(
        out_dir / "viz_regioes_densidade.png",
        out_dir / "regioes.json",
    )

    plot_subgrafo_maior_grau(
        out_dir / "viz_subgrafo_maior_grau.png",
        grafo,
        df_graus,
    )

    print("pronto!")