from pathlib import Path
import sys
import json

import matplotlib
matplotlib.use("Agg")

import matplotlib.pyplot as plt
import pandas as pd
import streamlit as st
import streamlit.components.v1 as components

from pyvis.network import Network

ROOT = Path(__file__).resolve().parent

sys.path.insert(0, str(ROOT))

from src.graphs.io import (
    build_graph_from_adjacency_csv,
    load_airports_table,
)

from src.graphs.algorithms import shortest_path

from src.viz import (
    _edge_key,
    _path_edges,
)

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
    page_title="Analises Aeroportos BR",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.markdown(
    """
<style>

section[data-testid="stSidebar"] {
    background: #1f3a6e;
}

section[data-testid="stSidebar"] * {
    color: white !important;
}

</style>
""",
    unsafe_allow_html=True,
)


@st.cache_resource
def carregar_grafo():

    grafo = build_graph_from_adjacency_csv(
        DATA / "adjacencias_aeroportos.csv"
    )

    aeroportos = load_airports_table(
        DATA / "aeroportos_data.csv"
    )

    return grafo, aeroportos


@st.cache_data
def carregar_metricas():

    global_json = json.loads(
        (OUT / "global.json").read_text(
            encoding="utf-8"
        )
    )

    regioes_json = json.loads(
        (OUT / "regioes.json").read_text(
            encoding="utf-8"
        )
    )

    ego_df = pd.read_csv(
        OUT / "ego_aeroportos.csv",
        encoding="utf-8"
    )

    graus_df = pd.read_csv(
        OUT / "graus.csv",
        encoding="utf-8"
    )

    rankings_json = json.loads(
        (OUT / "rankings.json").read_text(
            encoding="utf-8"
        )
    )

    return (
        global_json,
        regioes_json,
        ego_df,
        graus_df,
        rankings_json,
    )


def pyvis_rota(
    grafo,
    aeroportos,
    df_graus,
    caminho,
):

    regiao_por_iata = {}

    cidade_por_iata = {}

    for _, row in aeroportos.iterrows():

        regiao_por_iata[row["iata"]] = row["regiao"]

        cidade_por_iata[row["iata"]] = row["cidade"]

    graus_map = df_graus.set_index(
        "aeroporto"
    )["grau"].to_dict()

    arestas_destaque = set()

    for i in range(len(caminho) - 1):

        arestas_destaque.add(
            _edge_key(
                caminho[i],
                caminho[i + 1],
            )
        )

    net = Network(
        height="460px",
        width="100%",
        notebook=False,
    )

    for aeroporto in sorted(grafo.vertices()):

        regiao = regiao_por_iata.get(
            aeroporto,
            "?",
        )

        grau = int(
            graus_map.get(aeroporto, 0)
        )

        cor = CORES_REGIAO.get(
            regiao,
            "#aaaaaa",
        )

        titulo = (
            f"{aeroporto} - "
            f"{cidade_por_iata.get(aeroporto, aeroporto)}"
            f"<br>Grau: {grau}"
        )

        net.add_node(
            aeroporto,
            label=aeroporto,
            title=titulo,
            color=cor,
            size=15 + grau * 4,
        )

    for origem, destino, peso in grafo.iter_edges():

        chave = _edge_key(
            origem,
            destino,
        )

        destaque = chave in arestas_destaque

        net.add_edge(
            origem,
            destino,
            value=float(peso),
            title=f"peso: {peso:.1f}",
            color="#e03030" if destaque else "#bbbbbb",
            width=4 if destaque else 1,
        )

    return net.generate_html()


grafo, aeroportos = carregar_grafo()

tem_metricas = (
    OUT / "global.json"
).exists()

if tem_metricas:

    (
        gm,
        regioes,
        df_ego,
        df_graus,
        rankings,
    ) = carregar_metricas()


with st.sidebar:

    st.markdown(
        "## 📊 Analises Estatisticas"
    )

    st.markdown("---")

    pagina = st.radio(
        "Pagina",
        [
            "Metricas",
            "Calculadora de Rotas",
        ],
        label_visibility="collapsed",
    )

    st.markdown("---")

    st.caption(
        "Teoria dos Grafos · 2025"
    )


# ====================================
# PAGINA METRICAS
# ====================================

if pagina == "Metricas":

    st.title(
        "Metricas Estatisticas do Grafo"
    )

    if not tem_metricas:

        st.warning(
            "Execute: python -m src.cli metricas"
        )

        st.stop()

    c1, c2, c3 = st.columns(3)

    c1.metric(
        "Ordem (vertices)",
        gm["ordem"],
    )

    c2.metric(
        "Tamanho (arestas)",
        gm["tamanho"],
    )

    c3.metric(
        "Densidade",
        f"{gm['densidade']:.4f}",
    )

    st.markdown("---")

    aba1, aba2, aba3 = st.tabs(
        [
            "Por Regiao",
            "Ego-redes",
            "Ranking",
        ]
    )

    # =========================
    # REGIOES
    # =========================

    with aba1:

        st.subheader(
            "Subgrafos Regionais"
        )

        df_reg = pd.DataFrame(regioes)[
            [
                "regiao",
                "ordem",
                "tamanho",
                "densidade",
            ]
        ]

        df_reg.columns = [
            "Regiao",
            "Ordem",
            "Tamanho",
            "Densidade",
        ]

        st.dataframe(
            df_reg,
            use_container_width=True,
            hide_index=True,
        )

    # =========================
    # EGO REDES
    # =========================

    with aba2:

        st.subheader(
            "Ego-redes por Aeroporto"
        )

        st.caption(
            "Ego-rede = aeroporto + vizinhos"
        )

        df_show = df_ego.copy()

        df_show.columns = [
            "Aeroporto",
            "Grau",
            "Ordem Ego",
            "Tamanho Ego",
            "Densidade Ego",
        ]

        st.dataframe(
            df_show,
            use_container_width=True,
            hide_index=True,
        )

    # =========================
    # RANKING
    # =========================

    with aba3:

        st.subheader(
            "Ranking de Conectividade"
        )

        top = df_graus.head(10).sort_values(
            "grau"
        )

        fig, ax = plt.subplots(
            figsize=(8, 5)
        )

        ax.barh(
            top["aeroporto"],
            top["grau"],
        )

        ax.set_xlabel("Grau")

        ax.set_title(
            "Top aeroportos conectados"
        )

        fig.tight_layout()

        st.pyplot(fig)

        plt.close(fig)


# ====================================
# PAGINA ROTAS
# ====================================

elif pagina == "Calculadora de Rotas":

    st.title(
        "Calculadora de Rotas"
    )

    st.markdown(
        "Calcula menor caminho usando Dijkstra."
    )

    vertices = sorted(grafo.vertices())

    col1, col2 = st.columns(2)

    origem = col1.selectbox(
        "Origem",
        vertices,
        index=vertices.index("REC")
        if "REC" in vertices else 0,
    )

    destino = col2.selectbox(
        "Destino",
        vertices,
        index=vertices.index("POA")
        if "POA" in vertices else 1,
    )

    st.markdown("---")

    if origem == destino:

        st.warning(
            "Origem e destino iguais."
        )

    else:

        custo, caminho = shortest_path(
            grafo,
            origem,
            destino,
        )

        if not caminho:

            st.error(
                f"Nao existe caminho entre {origem} e {destino}"
            )

        else:

            c1, c2, c3 = st.columns(3)

            c1.metric(
                "Custo total",
                f"{custo:.1f}",
            )

            c2.metric(
                "Arestas",
                len(caminho) - 1,
            )

            c3.metric(
                "Paradas",
                max(0, len(caminho) - 2),
            )

            st.success(
                " -> ".join(caminho)
            )

            if tem_metricas:

                with st.spinner(
                    "Renderizando grafo..."
                ):

                    html = pyvis_rota(
                        grafo,
                        aeroportos,
                        df_graus,
                        caminho,
                    )

                components.html(
                    html,
                    height=480,
                    scrolling=False,
                ) 