from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Dict, List, Set, Tuple

import matplotlib
matplotlib.use("Agg")

import matplotlib.pyplot as plt
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


_C_BG = "#0f1419"
_C_TEXT = "#eef1f5"
_C_MUTED = "#8b929b"
_C_GRID = "#222b36"
_C_PRIMARY = "#e8a838"
_C_ACCENT = "#3d9b8f"

_REGION_COLORS = {
    "Norte": "#6b9fd4",
    "Nordeste": "#3d9b8f",
    "Centro-Oeste": "#e8a838",
    "Sudeste": "#9aa8b8",
    "Sul": "#d4716a",
}


def _matplotlib_style():

    plt.rcParams.update(
        {
            "figure.facecolor": _C_BG,
            "axes.facecolor": _C_BG,
            "savefig.facecolor": _C_BG,
            "axes.grid": False,
            "font.family": "sans-serif",
            "font.sans-serif": [
                "DM Sans",
                "Segoe UI",
                "Arial",
                "DejaVu Sans",
            ],
            "font.size": 16,
            "text.color": _C_TEXT,
            "axes.titlesize": 24,
            "axes.titleweight": "bold",
            "axes.titlecolor": _C_TEXT,
            "axes.titlepad": 12,
            "axes.labelsize": 19,
            "axes.labelweight": "bold",
            "axes.labelcolor": _C_TEXT,
            "axes.edgecolor": _C_GRID,
            "xtick.labelsize": 16,
            "ytick.labelsize": 16,
            "xtick.color": _C_MUTED,
            "ytick.color": _C_MUTED,
            "legend.fontsize": 16,
            "axes.spines.top": False,
            "axes.spines.right": False,
        }
    )


def _save(fig, out_path):

    fig.tight_layout(pad=0.3)

    fig.savefig(
        out_path,
        dpi=150,
        bbox_inches="tight",
        pad_inches=0.12,
        facecolor=_C_BG,
    )

    plt.close(fig)


def _rotulos_barras_v(ax, valores, *, fmt="{:.0f}", dy=0.01):

    if not len(valores):
        return

    topo = max(valores)

    for retangulo, val in zip(ax.patches, valores):

        x = retangulo.get_x() + retangulo.get_width() / 2

        ax.text(
            x,
            retangulo.get_height() + topo * dy,
            fmt.format(val),
            ha="center",
            va="bottom",
            fontsize=15,
            fontweight="bold",
            color=_C_TEXT,
        )


def plot_distribuicao_graus(
    out_path: Path,
    df_graus: pd.DataFrame,
):

    _matplotlib_style()

    fig, ax = plt.subplots(figsize=(9, 5.5))

    maior = int(df_graus["grau"].max())

    counts, _, _ = ax.hist(
        df_graus["grau"],
        bins=range(0, maior + 2),
        color=_C_ACCENT,
        edgecolor=_C_BG,
        linewidth=1.5,
    )

    ax.set_title("Distribuição dos Graus")

    ax.set_xlabel("Grau")

    ax.set_ylabel("Quantidade de aeroportos")

    ax.margins(x=0.01)

    _rotulos_barras_v(ax, counts)

    _save(fig, out_path)


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

    fig, ax = plt.subplots(figsize=(9, 7))

    ax.barh(
        top["aeroporto"],
        top["grau"],
        color=_C_PRIMARY,
    )

    ax.invert_yaxis()

    ax.set_title("Aeroportos Mais Conectados")

    ax.set_xlabel("Grau")

    ax.set_ylabel("Aeroporto")

    ax.margins(y=0.01)

    graus_top = list(top["grau"])

    for retangulo, val in zip(ax.patches, graus_top):

        ax.text(
            retangulo.get_width() + max(graus_top) * 0.01,
            retangulo.get_y() + retangulo.get_height() / 2,
            str(int(val)),
            va="center",
            fontsize=15,
            fontweight="bold",
            color=_C_TEXT,
        )

    _save(fig, out_path)


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

    fig, ax = plt.subplots(figsize=(10, 5.5))

    largura = 0.38

    ax.bar(
        [i - largura / 2 for i in x],
        ordens,
        width=largura,
        label="Ordem",
        color=_C_PRIMARY,
    )

    ax.bar(
        [i + largura / 2 for i in x],
        tamanhos,
        width=largura,
        label="Tamanho",
        color=_C_ACCENT,
    )

    ax.set_xticks(list(x))

    ax.set_xticklabels(regioes)

    ax.set_title(
        "Ordem e Tamanho por Região"
    )

    ax.set_ylabel("Quantidade")

    ax.margins(x=0.02)

    _rotulos_barras_v(ax, ordens + tamanhos)

    ax.legend(
        facecolor="#161d26",
        edgecolor=_C_GRID,
        labelcolor=_C_TEXT,
    )

    _save(fig, out_path)


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

    fig, ax = plt.subplots(figsize=(9, 5.5))

    cores = [
        _REGION_COLORS.get(r, _C_ACCENT)
        for r in regioes
    ]

    ax.bar(
        regioes,
        densidades,
        color=cores,
    )

    ax.set_title("Densidade por Região")

    ax.set_xlabel("Região")

    ax.set_ylabel("Densidade")

    if densidades:
        ax.set_ylim(0, max(densidades) * 1.18)

    _rotulos_barras_v(
        ax,
        densidades,
        fmt="{:.3f}",
        dy=0.02,
    )

    _save(fig, out_path)


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

    fig, ax = plt.subplots(figsize=(9, 5.5))

    ax.bar(
        [str(x) for x in xs],
        ys,
        color=_C_ACCENT,
    )

    ax.set_title(
        f"BFS a partir de {fonte}"
    )

    ax.set_xlabel("Distância (saltos)")

    ax.set_ylabel(
        "Quantidade de aeroportos"
    )

    if ys:
        ax.set_ylim(0, max(ys) * 1.18)

    _rotulos_barras_v(ax, ys)

    _save(fig, out_path)


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
        figsize=(8.5, 8.5)
    )

    for u, v, w in arestas:

        x0, y0 = posicoes[u]
        x1, y1 = posicoes[v]

        ax.plot(
            [x0, x1],
            [y0, y1],
            lw=1.5 + w * 0.8,
            color="#5d6b7d",
        )

    for aeroporto in top:

        x, y = posicoes[aeroporto]

        tamanho = (
            900 + graus[aeroporto] * 220
        )

        ax.scatter(
            x,
            y,
            s=tamanho,
            color=_C_PRIMARY,
            edgecolors=_C_BG,
            linewidths=2,
            zorder=3,
        )

        ax.text(
            x,
            y,
            aeroporto,
            ha="center",
            va="center",
            color=_C_BG,
            fontweight="bold",
            fontsize=17,
            zorder=4,
        )

    ax.set_title(
        "Subgrafo dos Aeroportos Mais Conectados"
    )

    ax.set_aspect("equal")

    ax.set_xlim(-1.25, 1.25)

    ax.set_ylim(-1.25, 1.25)

    ax.axis("off")

    _save(fig, out_path)


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