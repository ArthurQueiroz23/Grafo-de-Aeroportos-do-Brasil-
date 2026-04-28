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
    return (u, v) if u < v else (v, u)


def _path_edges(path: List[str]) -> Set[Tuple[str, str]]:
    s: Set[Tuple[str, str]] = set()
    for i in range(len(path) - 1):
        s.add(_edge_key(path[i], path[i + 1]))
    return s


def _matplotlib_style() -> None:
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
    ax.hist(df_graus["grau"], bins=range(0, int(df_graus["grau"].max()) + 2), color="#4c72b0", edgecolor="white")
    ax.set_title("Distribuição dos graus dos aeroportos (exploratória)")
    ax.set_xlabel("Grau (número de conexões)")
    ax.set_ylabel("Quantidade de aeroportos")
    ax.legend(handles=[mpatches.Patch(color="#4c72b0", label="Contagem por bin")], loc="upper right")
    fig.tight_layout()
    fig.savefig(out_path, dpi=150)
    plt.close(fig)


def plot_ranking_graus(out_path: Path, df_graus: pd.DataFrame, top_n: int = 12) -> None:
    _matplotlib_style()
    d = df_graus.sort_values("grau", ascending=True).tail(top_n)
    fig, ax = plt.subplots(figsize=(8, 6))
    ax.barh(d["aeroporto"], d["grau"], color="#55a868")
    ax.set_title("Aeroportos com maior conectividade (explicativa)")
    ax.set_xlabel("Grau (interconexões)")
    ax.set_ylabel("Código IATA")
    fig.tight_layout()
    fig.savefig(out_path, dpi=150)
    plt.close(fig)


def plot_regioes_metricas(out_path: Path, regioes_json: Path) -> None:
    _matplotlib_style()
    data = json.loads(regioes_json.read_text(encoding="utf-8"))
    regs = [x["regiao"] for x in data]
    ordem = [x["ordem"] for x in data]
    tamanho = [x["tamanho"] for x in data]
    x = range(len(regs))
    w = 0.25
    fig, ax = plt.subplots(figsize=(9, 5))
    ax.bar([i - w for i in x], ordem, width=w, label="Ordem |V|", color="#4c72b0")
    ax.bar(x, tamanho, width=w, label="Tamanho |E|", color="#dd8452")
    ax.set_xticks(list(x))
    ax.set_xticklabels(regs, rotation=15)
    ax.set_title("Comparação entre regiões: ordem e tamanho do subgrafo induzido (explicativa)")
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
    ax.set_title("Densidade por região (subgrafo induzido)")
    ax.set_xlabel("Região")
    ax.set_ylabel("Densidade")
    for i, v in enumerate(dens):
        ax.text(i, v + 0.002, f"{v:.3f}", ha="center", va="bottom", fontsize=9)
    fig.tight_layout()
    fig.savefig(out_path, dpi=150)
    plt.close(fig)


def plot_bfs_camadas(out_path: Path, graph: Graph, fonte: str = "GRU") -> None:
    _matplotlib_style()
    dist = bfs_distances(graph, fonte)
    layers: Dict[int, int] = {}
    for d in dist.values():
        layers[d] = layers.get(d, 0) + 1
    xs = sorted(layers.keys())
    ys = [layers[k] for k in xs]
    fig, ax = plt.subplots(figsize=(8, 5))
    ax.bar([str(k) for k in xs], ys, color="#ccb974")
    ax.set_title(f"Camadas BFS a partir de {fonte} (distância em arestas) — exploratória")
    ax.set_xlabel("Distância (saltos)")
    ax.set_ylabel("Número de aeroportos na camada")
    fig.tight_layout()
    fig.savefig(out_path, dpi=150)
    plt.close(fig)


def plot_top_grau_induzido_esquema(
    out_path: Path,
    graph: Graph,
    df_graus: pd.DataFrame,
    k: int = 4,
) -> None:
    """Desenho em círculo do subgrafo induzido pelos k aeroportos de maior grau (sem networkx)."""
    _matplotlib_style()
    top = list(df_graus.sort_values("grau", ascending=False).head(k)["aeroporto"])
    sset = set(top)
    sub_edges: List[Tuple[str, str]] = []
    for u, v, _ in graph.iter_edges():
        if u in sset and v in sset:
            sub_edges.append((u, v))
    n = len(top)
    ang = {top[i]: 2 * math.pi * i / n for i in range(n)}
    pos: Dict[str, Tuple[float, float]] = {a: (math.cos(ang[a]), math.sin(ang[a])) for a in top}
    fig, ax = plt.subplots(figsize=(6, 6))
    for u, v in sub_edges:
        x1, y1 = pos[u]
        x2, y2 = pos[v]
        ax.plot([x1, x2], [y1, y2], color="#888888", linewidth=1.2, zorder=1)
    for a in top:
        x, y = pos[a]
        deg = int(df_graus.set_index("aeroporto").loc[a, "grau"])
        ax.scatter([x], [y], s=320, c="#4c72b0", zorder=2, edgecolors="white")
        ax.text(x * 1.18, y * 1.18, f"{a}\n(g={deg})", ha="center", va="center", fontsize=9)
    ax.set_title(f"Subgrafo induzido pelos {k} aeroportos de maior grau")
    ax.axis("off")
    ax.set_aspect("equal")
    fig.tight_layout()
    fig.savefig(out_path, dpi=150)
    plt.close(fig)


def build_pyvis_network(
    graph: Graph,
    df_ego: pd.DataFrame,
    regiao_por: Dict[str, str],
    highlight_edges: Set[Tuple[str, str]],
    height: str = "640px",
) -> Network:
    net = Network(height=height, width="100%", bgcolor="#ffffff", font_color="#222222", select_menu=True)
    net.toggle_physics(True)
    ego_by = df_ego.set_index("aeroporto")
    for v in sorted(graph.vertices()):
        row = ego_by.loc[v]
        title = (
            f"<b>{v}</b><br>Região: {regiao_por.get(v, '?')}<br>"
            f"Grau: {int(row['grau'])}<br>Densidade ego: {float(row['densidade_ego']):.4f}"
        )
        net.add_node(v, label=v, title=title, borderWidth=1)
    for u, v, w in graph.iter_edges():
        ek = _edge_key(u, v)
        is_hi = ek in highlight_edges
        net.add_edge(
            u,
            v,
            value=float(w),
            color="#c0392b" if is_hi else "#95a5a6",
            width=4 if is_hi else 1.2,
        )
    return net


def write_grafo_interativo(
    out_html: Path,
    graph: Graph,
    airports: pd.DataFrame,
    df_ego: pd.DataFrame,
    path_recpoa: List[str],
    path_maosp: List[str],
) -> None:
    regiao = iata_to_regiao(airports)
    hi = _path_edges(path_recpoa) | _path_edges(path_maosp)
    net = build_pyvis_network(graph, df_ego, regiao, hi)
    out_html.parent.mkdir(parents=True, exist_ok=True)
    net.write_html(str(out_html))


def write_arvore_percurso(
    out_html: Path,
    graph: Graph,
    airports: pd.DataFrame,
    df_ego: pd.DataFrame,
    path_recpoa: List[str],
    path_maosp: List[str],
) -> None:
    regiao = iata_to_regiao(airports)
    nodes: Set[str] = set()
    for p in (path_recpoa, path_maosp):
        nodes.update(p)
    sub_edges: Set[Tuple[str, str]] = _path_edges(path_recpoa) | _path_edges(path_maosp)
    # subgrafo explícito: só nós e arestas dos caminhos
    net = Network(height="520px", width="100%", bgcolor="#ffffff", font_color="#222222", select_menu=True)
    net.toggle_physics(True)
    ego_by = df_ego.set_index("aeroporto")
    for v in sorted(nodes):
        row = ego_by.loc[v]
        title = (
            f"<b>{v}</b><br>Região: {regiao.get(v, '?')}<br>"
            f"Grau: {int(row['grau'])}<br>Densidade ego: {float(row['densidade_ego']):.4f}"
        )
        net.add_node(v, label=v, title=title, borderWidth=1)
    for a, b in sub_edges:
        w = graph.edge_weight(a, b) if graph.has_edge(a, b) else 0.0
        in_re = _edge_key(a, b) in _path_edges(path_recpoa)
        in_ms = _edge_key(a, b) in _path_edges(path_maosp)
        if in_re and in_ms:
            col = "#8e44ad"
        elif in_re:
            col = "#e67e22"
        elif in_ms:
            col = "#2980b9"
        else:
            col = "#7f8c8d"
        net.add_edge(a, b, value=float(w), color=col, width=3)
    out_html.parent.mkdir(parents=True, exist_ok=True)
    net.write_html(str(out_html))


def save_arvore_percurso_png(
    out_path: Path,
    path_recpoa: List[str],
    path_maosp: List[str],
) -> None:
    """Dois trilhos (uma linha por percurso obrigatório), legenda e ênfase nas arestas."""
    _matplotlib_style()
    fig, ax = plt.subplots(figsize=(14, 4.2))

    def desenhar_trilho(p: List[str], y: float, cor: str, nome: str) -> None:
        m = len(p)
        if m == 0:
            return
        xs = [i / max(m - 1, 1) for i in range(m)]
        ax.plot(xs, [y] * m, color=cor, linewidth=4, alpha=0.35, solid_capstyle="round")
        for i in range(m - 1):
            ax.plot([xs[i], xs[i + 1]], [y, y], color=cor, linewidth=3, label=nome if i == 0 else None)
        for i, nod in enumerate(p):
            ax.scatter([xs[i]], [y], s=220, c=cor, zorder=2, edgecolors="white", linewidths=1.2)
            ax.text(xs[i], y + 0.12, nod, ha="center", va="bottom", fontsize=9, fontweight="bold")

    desenhar_trilho(path_recpoa, 1.0, "#e67e22", "Recife → Porto Alegre (custo mínimo)")
    desenhar_trilho(path_maosp, 0.0, "#2980b9", "Manaus → GRU / São Paulo (custo mínimo)")
    handles, labels = ax.get_legend_handles_labels()
    ax.legend(handles[:2], labels[:2], loc="lower center", ncol=2, bbox_to_anchor=(0.5, -0.02))
    ax.set_title("Percursos mínimos (Dijkstra): comparando saltos entre aeroportos")
    ax.set_xlabel("Sequência do caminho (normalizada)")
    ax.set_ylabel("Trilho do percurso")
    ax.set_yticks([0.0, 1.0])
    ax.set_yticklabels(["Manaus → São Paulo", "Recife → Porto Alegre"])
    ax.set_ylim(-0.35, 1.35)
    ax.set_xlim(-0.05, 1.05)
    fig.tight_layout()
    fig.savefig(out_path, dpi=150, bbox_inches="tight")
    plt.close(fig)


def run_all_visualizations(
    project_root: Path,
) -> None:
    data = project_root / "data"
    outd = project_root / "out"
    g = graph_from_project(data)
    ap = load_airports_table(data / "aeroportos_data.csv")
    df_ego = pd.read_csv(outd / "ego_aeroportos.csv", encoding="utf-8")
    df_graus = pd.read_csv(outd / "graus.csv", encoding="utf-8")
    _matplotlib_style()
    plot_distribuicao_graus(outd / "viz_exploratoria_distribuicao_graus.png", df_graus)
    plot_ranking_graus(outd / "viz_explanatoria_ranking_conectividade.png", df_graus)
    plot_regioes_metricas(outd / "viz_explanatoria_regioes_ordem_tamanho.png", outd / "regioes.json")
    plot_regioes_densidade(outd / "viz_explanatoria_regioes_densidade.png", outd / "regioes.json")
    plot_bfs_camadas(outd / "viz_exploratoria_bfs_camadas.png", g, "GRU")
    plot_top_grau_induzido_esquema(outd / "viz_subgrafo_maior_grau.png", g, df_graus, k=4)
    _, path_recpoa = shortest_path(g, "REC", "POA")
    _, path_maosp = shortest_path(g, "MAO", "GRU")
    write_arvore_percurso(outd / "arvore_percurso.html", g, ap, df_ego, path_recpoa, path_maosp)
    save_arvore_percurso_png(outd / "arvore_percurso.png", path_recpoa, path_maosp)
    write_grafo_interativo(outd / "grafo_interativo.html", g, ap, df_ego, path_recpoa, path_maosp)


def graph_from_project(data_dir: Path) -> Graph:
    from .graphs.io import build_graph_from_adjacency_csv

    return build_graph_from_adjacency_csv(data_dir / "adjacencias_aeroportos.csv")
