import sys
import json
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd
import streamlit as st
import streamlit.components.v1 as components

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from src.graphs.io import build_graph_from_adjacency_csv, load_airports_table
from src.graphs.algorithms import shortest_path
from src.viz import _edge_key, _path_edges

DATA = ROOT / "data"
OUT = ROOT / "out"

CORES_REGIAO = {
    "Norte": "#f0a500",
    "Nordeste": "#e05c5c",
    "Centro-Oeste": "#5cb85c",
    "Sudeste": "#4c72b0",
    "Sul": "#9b59b6",
}

st.set_page_config(
    page_title="Análises — Aeroportos BR",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.markdown("""
<style>
    section[data-testid="stSidebar"] { background: #1f3a6e; }
    section[data-testid="stSidebar"] * { color: white !important; }
</style>
""", unsafe_allow_html=True)


@st.cache_resource
def carregar_grafo():
    g = build_graph_from_adjacency_csv(DATA / "adjacencias_aeroportos.csv")
    ap = load_airports_table(DATA / "aeroportos_data.csv")
    return g, ap


@st.cache_data
def carregar_metricas():
    gm = json.loads((OUT / "global.json").read_text(encoding="utf-8"))
    regioes = json.loads((OUT / "regioes.json").read_text(encoding="utf-8"))
    df_ego = pd.read_csv(OUT / "ego_aeroportos.csv", encoding="utf-8")
    df_graus = pd.read_csv(OUT / "graus.csv", encoding="utf-8")
    rankings = json.loads((OUT / "rankings.json").read_text(encoding="utf-8"))
    return gm, regioes, df_ego, df_graus, rankings


def pyvis_rota(g, ap, df_graus, caminho):
    from pyvis.network import Network

    reg = {}
    cid = {}
    for _, row in ap.iterrows():
        reg[row["iata"]] = row["regiao"]
        cid[row["iata"]] = row["cidade"]

    graus_map = df_graus.set_index("aeroporto")["grau"].to_dict()
    hl_edges = set()
    for i in range(len(caminho) - 1):
        hl_edges.add(_edge_key(caminho[i], caminho[i + 1]))

    net = Network(height="460px", width="100%", notebook=False)

    for iata in sorted(g.vertices()):
        regiao = reg.get(iata, "?")
        grau = int(graus_map.get(iata, 0))
        cor = CORES_REGIAO.get(regiao, "#aaa")
        net.add_node(iata, label=iata, title=f"{iata} — {cid.get(iata, iata)}<br>Grau: {grau}",
                     color=cor, size=15 + grau * 4)

    for u, v, w in g.iter_edges():
        destaque = _edge_key(u, v) in hl_edges
        net.add_edge(u, v, value=float(w), title=f"peso: {w:.1f}",
                     color="#e03030" if destaque else "#bbb",
                     width=4 if destaque else 1)

    return net.generate_html()


grafo, aeroportos = carregar_grafo()
tem_metricas = (OUT / "global.json").exists()
if tem_metricas:
    gm, regioes, df_ego, df_graus, rankings = carregar_metricas()

with st.sidebar:
    st.markdown("## 📊 Análises Estatísticas")
    st.markdown("---")
    pagina = st.radio(
        "Página",
        ["Métricas", "Calculadora de Rotas"],
        label_visibility="collapsed",
    )
    st.markdown("---")
    st.caption("Teoria dos Grafos · 2025")


if pagina == "Métricas":
    st.title("Métricas Estatísticas do Grafo")

    if not tem_metricas:
        st.warning("Execute `python -m src.cli metricas` primeiro.")
        st.stop()

    c1, c2, c3 = st.columns(3)
    c1.metric("Ordem (vértices)", gm["ordem"])
    c2.metric("Tamanho (arestas)", gm["tamanho"])
    c3.metric("Densidade", f"{gm['densidade']:.4f}")

    st.markdown("---")
    aba1, aba2, aba3 = st.tabs(["Por Região", "Ego-redes", "Ranking"])

    with aba1:
        st.subheader("Subgrafos Regionais")
        df_reg = pd.DataFrame(regioes)[["regiao", "ordem", "tamanho", "densidade"]]
        df_reg.columns = ["Região", "Ordem", "Tamanho", "Densidade"]
        st.dataframe(df_reg, use_container_width=True, hide_index=True)

        fig, axes = plt.subplots(1, 2, figsize=(12, 4))
        regs = df_reg["Região"].tolist()
        x = range(len(regs))
        w = 0.3
        axes[0].bar([i - w / 2 for i in x], df_reg["Ordem"], width=w, label="Ordem", color="#4c72b0")
        axes[0].bar([i + w / 2 for i in x], df_reg["Tamanho"], width=w, label="Tamanho", color="#dd8452")
        axes[0].set_xticks(list(x))
        axes[0].set_xticklabels(regs, rotation=15)
        axes[0].set_title("Ordem vs Tamanho por Região")
        axes[0].legend()
        axes[1].bar(regs, df_reg["Densidade"], color="#8172b3")
        for i, v in enumerate(df_reg["Densidade"]):
            axes[1].text(i, v + 0.003, f"{v:.3f}", ha="center", fontsize=8)
        axes[1].set_title("Densidade por Região")
        axes[1].tick_params(axis="x", rotation=15)
        fig.tight_layout()
        st.pyplot(fig)
        plt.close(fig)

    with aba2:
        st.subheader("Ego-redes por Aeroporto")
        st.caption("Ego-rede = aeroporto + seus vizinhos diretos.")
        df_show = df_ego.copy()
        df_show.columns = ["Aeroporto", "Grau", "Ordem Ego", "Tamanho Ego", "Densidade Ego"]
        st.dataframe(df_show, use_container_width=True, hide_index=True)

        selecionado = st.selectbox("Detalhar ego-rede de:", df_ego["aeroporto"].tolist())
        linha = df_ego[df_ego["aeroporto"] == selecionado].iloc[0]
        c1, c2, c3, c4 = st.columns(4)
        c1.metric("Grau", int(linha["grau"]))
        c2.metric("Ordem ego", int(linha["ordem_ego"]))
        c3.metric("Tamanho ego", int(linha["tamanho_ego"]))
        c4.metric("Densidade ego", f"{float(linha['densidade_ego']):.4f}")

    with aba3:
        st.subheader("Ranking de Conectividade")
        top = df_graus.head(10).sort_values("grau")
        fig, ax = plt.subplots(figsize=(8, 5))
        ax.barh(top["aeroporto"], top["grau"], color="#55a868")
        ax.set_xlabel("Grau")
        ax.set_title("Top 10 aeroportos mais conectados")
        fig.tight_layout()
        st.pyplot(fig)
        plt.close(fig)

        c1, c2 = st.columns(2)
        c1.metric("Maior grau", rankings["maior_grau"]["aeroporto"],
                  f"grau {int(rankings['maior_grau']['grau'])}")
        c2.metric("Maior densidade ego", rankings["maior_densidade_ego"]["aeroporto"],
                  f"{rankings['maior_densidade_ego']['densidade_ego']:.3f}")


elif pagina == "Calculadora de Rotas":
    st.title("Calculadora de Rotas — Dijkstra")
    st.markdown("Calcule o caminho mínimo entre quaisquer dois aeroportos do grafo.")

    vertices = sorted(grafo.vertices())
    col1, col2 = st.columns(2)
    origem = col1.selectbox("Origem", vertices,
                            index=vertices.index("REC") if "REC" in vertices else 0)
    destino = col2.selectbox("Destino", vertices,
                             index=vertices.index("POA") if "POA" in vertices else 1)

    st.markdown("---")

    if origem == destino:
        st.warning("Origem e destino são iguais.")
    else:
        custo, caminho = shortest_path(grafo, origem, destino)

        if not caminho:
            st.error(f"Não existe caminho entre {origem} e {destino}.")
        else:
            c1, c2, c3 = st.columns(3)
            c1.metric("Custo total", f"{custo:.1f}")
            c2.metric("Arestas percorridas", len(caminho) - 1)
            c3.metric("Paradas intermediárias", max(0, len(caminho) - 2))

            st.success(" → ".join(caminho))

            if tem_metricas:
                with st.spinner("Renderizando grafo com rota destacada..."):
                    html = pyvis_rota(grafo, aeroportos, df_graus, caminho)
                components.html(html, height=480, scrolling=False)
