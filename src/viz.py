from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Dict, List, Set, Tuple

import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import pandas as pd
from pyvis.network import Network

from .graphs.algorithms import bfs_distances, shortest_path
from .graphs.graph import Graph
from .graphs.io import iata_to_regiao, load_airports_table


def _edge_key(u: str, v: str) -> Tuple[str, str]:
    # padroniza a aresta
    return (u, v) if u < v else (v, u)


def _path_edges(path: List[str]) -> Set[Tuple[str, str]]:
    # pega as arestas de um caminho
    s: Set[Tuple[str, str]] = set()
    for i in range(len(path) - 1):
        s.add(_edge_key(path[i], path[i + 1]))
    return s


def _matplotlib_style() -> None:
    # estilo padrão dos gráficos
    plt.rcParams.update(
        {
            "figure.facecolor": "white",
            "axes.facecolor": "#fafafa",
            "axes.grid": True,
            "grid.alpha": 0.25,
            "font.size": 10,
        }
    )


def plot_distribuicao_graus(out_path: Path, df_graus: pd.DataFrame) -> None:
    _matplotlib_style()
    fig, ax = plt.subplots(figsize=(8, 5))

    # histograma dos graus
    ax.hist(df_graus["grau"], bins=range(0, int(df_graus["grau"].max()) + 2),
            color="#4c72b0", edgecolor="white")

    ax.set_title("Distribuição dos graus dos aeroportos (exploratória)")
    ax.set_xlabel("Grau")
    ax.set_ylabel("Quantidade")
    ax.legend(handles=[mpatches.Patch(color="#4c72b0", label="Contagem")], loc="upper right")

    fig.tight_layout()
    fig.savefig(out_path, dpi=150)
    plt.close(fig)


def plot_ranking_graus(out_path: Path, df_graus: pd.DataFrame, top_n: int = 12) -> None:
    _matplotlib_style()

    # pega os maiores graus
    d = df_graus.sort_values("grau", ascending=True).tail(top_n)

    fig, ax = plt.subplots(figsize=(8, 6))
    ax.barh(d["aeroporto"], d["grau"], color="#55a868")

    ax.set_title("Aeroportos mais conectados")
    ax.set_xlabel("Grau")
    ax.set_ylabel("IATA")

    fig.tight_layout()
    fig.savefig(out_path, dpi=150)
    plt.close(fig)


def plot_regioes_metricas(out_path: Path, regioes_json: Path) -> None:
    _matplotlib_style()

    # lê dados das regiões
    data = json.loads(regioes_json.read_text(encoding="utf-8"))

    regs = [x["regiao"] for x in data]
    ordem = [x["ordem"] for x in data]
    tamanho = [x["tamanho"] for x in data]

    x = range(len(regs))
    w = 0.25

    fig, ax = plt.subplots(figsize=(9, 5))

    ax.bar([i - w for i in x], ordem, width=w, label="Ordem", color="#4c72b0")
    ax.bar(x, tamanho, width=w, label="Tamanho", color="#dd8452")

    ax.set_xticks(list(x))
    ax.set_xticklabels(regs, rotation=15)

    ax.set_title("Comparação entre regiões")
    ax.set_xlabel("Região")
    ax.set_ylabel("Valor")
    ax.legend(loc="upper left")

    fig.tight_layout()
    fig.savefig(out_path, dpi=150)
    plt.close(fig)


def plot_regioes_densidade(out_path: Path, regioes_json: Path) -> None:
    _matplotlib_style()

    data = json.loads(regioes_json.read_text(encoding="utf-8"))

    regs = [x["regiao"] for x in data]
    dens = [x["densidade"] for x in data]

    fig, ax = plt.subplots(figsize=(8, 5))
    ax.bar(regs, dens, color="#8172b3")

    ax.set_title("Densidade por região")
    ax.set_xlabel("Região")
    ax.set_ylabel("Densidade")

    for i, v in enumerate(dens):
        ax.text(i, v + 0.002, f"{v:.3f}", ha="center", va="bottom", fontsize=9)

    fig.tight_layout()
    fig.savefig(out_path, dpi=150)
    plt.close(fig)


def plot_bfs_camadas(out_path: Path, graph: Graph, fonte: str = "GRU") -> None:
    _matplotlib_style()

    # calcula distâncias
    dist = bfs_distances(graph, fonte)

    layers: Dict[int, int] = {}
    for d in dist.values():
        layers[d] = layers.get(d, 0) + 1

    xs = sorted(layers.keys())
    ys = [layers[k] for k in xs]

    fig, ax = plt.subplots(figsize=(8, 5))
    ax.bar([str(k) for k in xs], ys, color="#ccb974")

    ax.set_title(f"BFS a partir de {fonte}")
    ax.set_xlabel("Distância")
    ax.set_ylabel("Qtd de aeroportos")

    fig.tight_layout()
    fig.savefig(out_path, dpi=150)
    plt.close(fig)