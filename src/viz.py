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
from pyvis.network import Network

from .graphs.algorithms import bfs_distances, shortest_path
from .graphs.graph import Graph
from .graphs.io import build_graph_from_adjacency_csv, iata_to_regiao, load_airports_table


def _edge_key(u: str, v: str) -> Tuple[str, str]:
    # padroniza a aresta
    return (u, v) if u < v else (v, u)


def _path_edges(path: List[str]) -> Set[Tuple[str, str]]:
    # pega as arestas de um caminho
    s: Set[Tuple[str, str]] = set()
    for i in range(len(path) - 1):
        s.add(_edge_key(path[i], path[i + 1]))
    return s


def _injetar_busca_toggle(html: str, pares: List[List[str]]) -> str:
    js_pares = json.dumps(pares)

    css = (
        "<style>\n"
        "#ui-grafo {\n"
        "    position: fixed; top: 12px; right: 12px; z-index: 9999;\n"
        "    display: flex; gap: 8px; align-items: center;\n"
        "    background: rgba(255,255,255,0.93);\n"
        "    padding: 8px 12px; border-radius: 8px;\n"
        "    box-shadow: 0 2px 8px rgba(0,0,0,0.15);\n"
        "    font-family: sans-serif;\n"
        "}\n"
        "#ui-grafo input {\n"
        "    padding: 5px 9px; border: 1px solid #ccc; border-radius: 5px;\n"
        "    font-size: 13px; width: 115px; outline: none;\n"
        "}\n"
        "#ui-grafo button {\n"
        "    padding: 5px 12px; border: none; border-radius: 5px;\n"
        "    cursor: pointer; font-size: 13px; font-weight: 600;\n"
        "}\n"
        "#btn-busca { background: #1f3a6e; color: #fff; }\n"
        "#btn-rotas { background: #e03030; color: #fff; }\n"
        "</style>\n"
    )

    ui = (
        "<div id='ui-grafo'>\n"
        "    <input id='iata-input' type='text' placeholder='Buscar IATA...'"
        " onkeydown=\"if(event.key==='Enter') buscarNo()\" />\n"
        "    <button id='btn-busca' onclick='buscarNo()'>Buscar</button>\n"
        "    <button id='btn-rotas' onclick='toggleRotas()'>Ocultar rotas</button>\n"
        "</div>\n"
    )

    js = (
        "<script>\n"
        "var _obrig = " + js_pares + ";\n"
        "var _rotasOn = true;\n"
        "function buscarNo() {\n"
        "    var cod = document.getElementById('iata-input').value.trim().toUpperCase();\n"
        "    if (!cod) return;\n"
        "    if (!nodes || !nodes.get(cod)) {\n"
        "        alert('Aeroporto \"' + cod + '\" nao encontrado.');\n"
        "        return;\n"
        "    }\n"
        "    network.focus(cod, {scale: 2.0, animation: {duration: 600}});\n"
        "    network.selectNodes([cod]);\n"
        "}\n"
        "function toggleRotas() {\n"
        "    _rotasOn = !_rotasOn;\n"
        "    var lista = edges.get();\n"
        "    var upd = [];\n"
        "    lista.forEach(function(e) {\n"
        "        var k1 = String(e.from) + '|' + String(e.to);\n"
        "        var k2 = String(e.to)  + '|' + String(e.from);\n"
        "        var eh = _obrig.some(function(p) {\n"
        "            return (p[0]+'|'+p[1]) === k1 || (p[0]+'|'+p[1]) === k2;\n"
        "        });\n"
        "        if (eh) {\n"
        "            upd.push({\n"
        "                id: e.id,\n"
        "                color: {color: _rotasOn ? '#e03030' : '#bbbbbb'},\n"
        "                width: _rotasOn ? 3 : 1\n"
        "            });\n"
        "        }\n"
        "    });\n"
        "    edges.update(upd);\n"
        "    document.getElementById('btn-rotas').textContent =\n"
        "        _rotasOn ? 'Ocultar rotas' : 'Mostrar rotas';\n"
        "}\n"
        "</script>\n"
    )

    return html.replace("</body>", css + ui + js + "</body>")


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


def plot_subgrafo_maior_grau(out_path: Path, graph: Graph, df_graus: pd.DataFrame, top_k: int = 8) -> None:
    _matplotlib_style()

    top = df_graus.sort_values("grau", ascending=False).head(top_k)["aeroporto"].tolist()
    top_set = set(top)

    sub_edges = []
    for u, v, w in graph.iter_edges():
        if u in top_set and v in top_set:
            sub_edges.append((u, v, w))

    n = len(top)
    angles = [2 * math.pi * i / n for i in range(n)]
    pos = {}
    for i, iata in enumerate(top):
        pos[iata] = (math.cos(angles[i]), math.sin(angles[i]))

    graus = {iata: graph.degree(iata) for iata in top}

    fig, ax = plt.subplots(figsize=(9, 9))

    for u, v, w in sub_edges:
        x0, y0 = pos[u]
        x1, y1 = pos[v]
        ax.plot([x0, x1], [y0, y1], color="#cccccc", lw=1.0 + w * 0.5, zorder=1)
        mx = (x0 + x1) / 2
        my = (y0 + y1) / 2
        ax.text(mx, my, f"{w:.1f}", fontsize=7, ha="center", va="center",
                bbox=dict(boxstyle="round,pad=0.1", fc="white", alpha=0.8))

    for iata, (x, y) in pos.items():
        s = 300 + graus[iata] * 120
        ax.scatter(x, y, s=s, color="#4c72b0", zorder=2, edgecolors="#2c4880", lw=1.5)
        ax.text(x, y, iata, ha="center", va="center", fontsize=9,
                fontweight="bold", color="white", zorder=3)
        ax.text(x, y - 0.18, f"grau {graus[iata]}", ha="center", va="top",
                fontsize=7, color="#444")

    ax.set_title(f"Subgrafo: top {top_k} aeroportos por grau")
    ax.set_xlim(-1.6, 1.6)
    ax.set_ylim(-1.6, 1.6)
    ax.axis("off")
    fig.tight_layout()
    fig.savefig(out_path, dpi=150)
    plt.close(fig)


def _pyvis_grafo_completo(graph: Graph, airports: pd.DataFrame, df_graus: pd.DataFrame,
                          ego_csv: Path, out_dir: Path) -> None:
    cores = {
        "Norte": "#f0a500",
        "Nordeste": "#e05c5c",
        "Centro-Oeste": "#5cb85c",
        "Sudeste": "#4c72b0",
        "Sul": "#9b59b6",
    }

    reg = {}
    cid = {}
    for _, row in airports.iterrows():
        reg[row["iata"]] = row["regiao"]
        cid[row["iata"]] = row["cidade"]

    graus_map = df_graus.set_index("aeroporto")["grau"].to_dict()

    ego_info = {}
    if ego_csv.exists():
        df_ego = pd.read_csv(ego_csv, encoding="utf-8")
        for _, row in df_ego.iterrows():
            ego_info[row["aeroporto"]] = row.to_dict()

    caminhos_obrig: Set[Tuple[str, str]] = set()
    pares_obrig: List[List[str]] = []
    for o, d in [("MAO", "GRU"), ("REC", "POA")]:
        if o in graph.vertices() and d in graph.vertices():
            _, path = shortest_path(graph, o, d)
            caminhos_obrig.update(_path_edges(path))
            for i in range(len(path) - 1):
                pares_obrig.append([path[i], path[i + 1]])

    net = Network(height="700px", width="100%", notebook=False)

    for iata in sorted(graph.vertices()):
        regiao = reg.get(iata, "?")
        cidade = cid.get(iata, iata)
        grau = int(graus_map.get(iata, 0))
        cor = cores.get(regiao, "#aaa")

        tooltip = f"<b>{iata}</b> — {cidade}<br>Região: {regiao}<br>Grau: {grau}"
        if iata in ego_info:
            ei = ego_info[iata]
            tooltip += f"<br>Ordem ego: {int(ei['ordem_ego'])}<br>Dens. ego: {float(ei['densidade_ego']):.3f}"

        net.add_node(iata, label=iata, title=tooltip, color=cor, size=15 + grau * 4)

    for u, v, w in graph.iter_edges():
        ek = _edge_key(u, v)
        destaque = ek in caminhos_obrig
        net.add_edge(u, v, value=float(w), title=f"peso: {w:.1f}",
                     color="#e03030" if destaque else "#bbb",
                     width=3 if destaque else 1)

    html = net.generate_html()
    html = _injetar_busca_toggle(html, pares_obrig)
    (out_dir / "grafo_interativo.html").write_text(html, encoding="utf-8")


def _pyvis_arvore_percurso(graph: Graph, airports: pd.DataFrame, out_dir: Path) -> None:
    cid = {}
    reg = {}
    for _, row in airports.iterrows():
        cid[row["iata"]] = row["cidade"]
        reg[row["iata"]] = row["regiao"]

    rotas = [
        ("MAO", "GRU", "Manaus → São Paulo", "#e05c5c"),
        ("REC", "POA", "Recife → Porto Alegre", "#4c72b0"),
    ]

    calculados = []
    for o, d, label, cor in rotas:
        if o in graph.vertices() and d in graph.vertices():
            custo, path = shortest_path(graph, o, d)
            if path:
                calculados.append((o, d, label, cor, custo, path))

    net = Network(height="600px", width="100%", notebook=False)

    nos: Set[str] = set()
    for *_, path in calculados:
        nos.update(path)

    cor_no: Dict[str, str] = {}
    for _, _, _, cor, _, path in calculados:
        for iata in path:
            cor_no.setdefault(iata, cor)

    for iata in nos:
        cidade = cid.get(iata, iata)
        regiao = reg.get(iata, "?")
        net.add_node(iata, label=iata,
                     title=f"<b>{iata}</b> — {cidade}<br>{regiao}",
                     color=cor_no.get(iata, "#aaa"), size=22)

    arestas_vistas: Set[Tuple[str, str]] = set()
    for _, _, label, cor, _, path in calculados:
        for i in range(len(path) - 1):
            u, v = path[i], path[i + 1]
            ek = _edge_key(u, v)
            if ek not in arestas_vistas:
                arestas_vistas.add(ek)
                w = graph.edge_weight(u, v)
                net.add_edge(u, v, title=f"{label} | peso {w:.1f}", color=cor, width=3)

    html = net.generate_html()
    (out_dir / "arvore_percurso.html").write_text(html, encoding="utf-8")

    # png estático dos caminhos
    _matplotlib_style()
    fig, axes = plt.subplots(1, len(calculados), figsize=(7 * len(calculados), 5))
    if len(calculados) == 1:
        axes = [axes]

    for ax, (o, d, label, cor, custo, path) in zip(axes, calculados):
        n = len(path)
        xs = list(range(n))
        ax.plot(xs, [0] * n, color=cor, lw=2, zorder=1)
        for i, (x, iata) in enumerate(zip(xs, path)):
            ax.scatter(x, 0, s=500, color=cor, zorder=2, edgecolors="white", lw=1.5)
            ax.text(x, 0.12, iata, ha="center", va="bottom", fontsize=10, fontweight="bold")
            ax.text(x, -0.14, cid.get(iata, iata), ha="center", va="top", fontsize=7, color="#666")
            if i < n - 1:
                w = graph.edge_weight(path[i], path[i + 1])
                ax.text(x + 0.5, 0.04, f"{w:.1f}", ha="center", va="bottom", fontsize=8, color="#555")
        ax.set_title(f"{label}\nCusto: {custo:.1f}", color=cor, fontsize=11)
        ax.set_xlim(-0.5, n - 0.5)
        ax.set_ylim(-0.5, 0.6)
        ax.axis("off")

    fig.suptitle("Percursos mínimos obrigatórios", fontsize=13, fontweight="bold")
    fig.tight_layout()
    fig.savefig(out_dir / "arvore_percurso.png", dpi=150)
    plt.close(fig)


def run_all_visualizations(root: Path) -> None:
    data_dir = root / "data"
    out_dir = root / "out"
    out_dir.mkdir(parents=True, exist_ok=True)

    g = build_graph_from_adjacency_csv(data_dir / "adjacencias_aeroportos.csv")
    ap = load_airports_table(data_dir / "aeroportos_data.csv")
    df_graus = pd.read_csv(out_dir / "graus.csv", encoding="utf-8")

    print("gerando graficos estaticos...")
    plot_distribuicao_graus(out_dir / "viz_exploratoria_distribuicao_graus.png", df_graus)
    plot_bfs_camadas(out_dir / "viz_exploratoria_bfs_camadas.png", g, fonte="GRU")
    plot_ranking_graus(out_dir / "viz_explanatoria_ranking_conectividade.png", df_graus)
    plot_regioes_metricas(out_dir / "viz_explanatoria_regioes_ordem_tamanho.png", out_dir / "regioes.json")
    plot_regioes_densidade(out_dir / "viz_explanatoria_regioes_densidade.png", out_dir / "regioes.json")
    plot_subgrafo_maior_grau(out_dir / "viz_subgrafo_maior_grau.png", g, df_graus)

    print("gerando htmls interativos...")
    _pyvis_grafo_completo(g, ap, df_graus, out_dir / "ego_aeroportos.csv", out_dir)
    _pyvis_arvore_percurso(g, ap, out_dir)

    print("pronto!")
