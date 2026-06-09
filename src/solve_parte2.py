from __future__ import annotations

import csv
import sys
import time
from collections import Counter, defaultdict, deque
from pathlib import Path
from typing import Dict, List, Sequence, Tuple

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt

from .directed_algorithms import (
    bellman_ford_digraph,
    dijkstra_digraph,
    dfs_order_digraph,
    bfs_tree_digraph,
    dfs_tree_digraph,
)

from .snap_road import build_snap_ca_subgraph

from .outputs import arred, write_json, write_manifest

from .viz import (
    _matplotlib_style,
    _save,
    _rotulos_barras_v,
    _C_ACCENT,
)


def _densidade_dirigida(n: int, m: int) -> float:

    if n < 2:
        return 0.0

    return m / (n * (n - 1))


def _pares_rota(vertices: Sequence[int]) -> List[Tuple[int, int]]:

    vs = sorted(vertices)

    if len(vs) < 2:
        return []

    vistos = set()

    pares = []

    def add(s, t):

        if s == t:
            return

        if (s, t) not in vistos:

            vistos.add((s, t))

            pares.append((s, t))

    add(vs[0], vs[-1])

    if len(vs) > 4:

        add(vs[0], vs[len(vs) // 2])

        add(vs[len(vs) // 4], vs[3 * len(vs) // 4])

    mid = len(vs) // 2

    add(vs[mid - 1], vs[mid])

    if len(vs) > 10:
        add(vs[2], vs[-3])

    i = 0

    while len(pares) < 8 and i + 1 < len(vs):

        add(vs[i], vs[i + 1])

        i += 1

    return pares[:10]


def _plot_grau_saida(out_path: Path, graus: Counter):

    _matplotlib_style()

    fig, ax = plt.subplots(figsize=(9, 5.5))

    xs = sorted(graus.keys())

    ys = [graus[k] for k in xs]

    ax.bar([str(x) for x in xs], ys, color=_C_ACCENT)

    ax.set_title("Distribuição do Grau de Saída")

    ax.set_xlabel("Grau de saída")

    ax.set_ylabel("Quantidade de nós")

    if ys:
        ax.set_ylim(0, max(ys) * 1.18)

    _rotulos_barras_v(ax, ys)

    _save(fig, out_path)


def _plot_bfs_camadas(out_path: Path, camadas: dict, fonte: int):

    _matplotlib_style()

    fig, ax = plt.subplots(figsize=(9, 5.5))

    xs = sorted(int(k) for k in camadas.keys())

    ys = [camadas[str(k)] for k in xs]

    ax.bar([str(x) for x in xs], ys, color=_C_ACCENT)

    ax.set_title(f"BFS dirigido — camadas a partir do nó {fonte}")

    ax.set_xlabel("Distância (camada)")

    ax.set_ylabel("Quantidade de nós")

    if ys:
        ax.set_ylim(0, max(ys) * 1.18)

    if len(ys) <= 15:
        _rotulos_barras_v(ax, ys)

    _save(fig, out_path)


def _grafo_demo_neg():

    g = {}

    g[0] = {
        1: 2.0,
        2: 1.0
    }

    g[1] = {
        2: -5.0
    }

    g[2] = {}

    return g


def _grafo_demo_ciclo():

    g = {}

    g[0] = {
        1: 1.0,
        3: 5.0
    }

    g[1] = {
        2: -2.0
    }

    g[2] = {
        1: 0.5
    }

    g[3] = {}

    return g


def _num_json(x):

    if x == float("inf"):
        return None

    return x


def _arestas_lista(g):

    out = []

    for u in g:

        for v, w in g[u].items():

            out.append([u, v, w])

    return out


def _rodar_uma_demo(g, fonte, id_demo, titulo, descricao):

    item = {
        "id": id_demo,
        "titulo": titulo,
        "descricao": descricao,
        "fonte": fonte,
        "arestas": _arestas_lista(g),
    }

    dist_bf, _, neg = bellman_ford_digraph(g, fonte)

    item["bellman_ford"] = {
        "tem_ciclo_negativo": neg,
        "distancias": {
            str(k): _num_json(v)
            for k, v in sorted(dist_bf.items())
        },
    }

    try:

        dist_dj, _ = dijkstra_digraph(g, fonte)

        item["dijkstra"] = {
            "recusou": False,
            "distancias": {
                str(k): _num_json(v)
                for k, v in sorted(dist_dj.items())
            },
        }

    except ValueError as e:

        item["dijkstra"] = {
            "recusou": True,
            "motivo": str(e),
        }

    return item


def _rodar_demos_pesos_negativos():

    demos = []

    demos.append(
        _rodar_uma_demo(
            _grafo_demo_neg(),
            fonte=0,
            id_demo="aresta_negativa",
            titulo="Aresta de peso negativo (sem ciclo)",
            descricao=(
                "Existe uma aresta negativa (1 → 2 = -5), mas nenhum ciclo "
                "negativo. Bellman-Ford calcula a distancia correta "
                "(0 → 1 → 2 = -3, mais curto que 0 → 2 = 1). Dijkstra recusa "
                "o grafo porque sua precondicao (pesos nao negativos) foi "
                "violada."
            ),
        )
    )

    demos.append(
        _rodar_uma_demo(
            _grafo_demo_ciclo(),
            fonte=0,
            id_demo="ciclo_negativo",
            titulo="Ciclo de peso negativo",
            descricao=(
                "O ciclo 1 → 2 → 1 soma peso negativo (-2 + 0.5 = -1.5), "
                "entao nao existe caminho minimo bem definido. Bellman-Ford "
                "detecta o ciclo negativo; Dijkstra recusa pesos negativos."
            ),
        )
    )

    return demos


def _bfs_camadas(g, fonte):

    dist = {
        fonte: 0
    }

    fila = deque([fonte])

    while fila:

        u = fila.popleft()

        for v in g[u]:

            if v not in dist:

                dist[v] = dist[u] + 1

                fila.append(v)

    camadas = {}

    for v, d in dist.items():

        if d not in camadas:
            camadas[d] = []

        camadas[d].append(v)

    return dist, camadas


def _subgrafo_induzido(g, nos):

    sub = {}

    nos_set = set(nos)

    for u in nos_set:

        sub[u] = {}

        if u not in g:
            continue

        for v, w in g[u].items():

            if v in nos_set:

                sub[u][v] = w

    return sub


# nº de nós da amostra usada para desenhar as árvores BFS/DFS nó a nó.
# Pequeno o suficiente para a árvore caber na tela com legibilidade.
AMOSTRA_ARVORE = 48


def _amostra_conexa(g, fonte, k):

    # coleta os primeiros k nós alcançáveis a partir de `fonte` (BFS dirigido).
    # Como cada nó entra por uma aresta direta de um nó já visitado, o subgrafo
    # induzido preserva conectividade a partir da fonte.
    fila = deque([fonte])

    vistos = {fonte}

    ordem = [fonte]

    while fila and len(ordem) < k:

        u = fila.popleft()

        for v in sorted(g[u].keys()):

            if v not in vistos:

                vistos.add(v)

                ordem.append(v)

                fila.append(v)

                if len(ordem) >= k:
                    break

    return vistos


def _arvore_json(fonte, ordem, pai, prof):

    # serializa uma árvore de busca (BFS ou DFS) no formato consumido pelo front
    nos = []

    for i, v in enumerate(ordem):

        nos.append(
            {
                "id": v,
                "pai": pai.get(v),
                "profundidade": prof.get(v, 0),
                "ordem": i,
            }
        )

    return {
        "fonte": fonte,
        "n_nos": len(ordem),
        "n_arestas_arvore": max(0, len(ordem) - 1),
        "profundidade_maxima": max(prof.values()) if prof else 0,
        "nos": nos,
    }


def _montar_arvores_amostra(g, fonte):

    # constrói, sobre uma MESMA amostra conexa, a árvore BFS e a árvore DFS —
    # permitindo comparar lado a lado a forma "larga e rasa" do BFS com a
    # "profunda e estreita" do DFS.
    nos = _amostra_conexa(g, fonte, AMOSTRA_ARVORE)

    sub = _subgrafo_induzido(g, nos)

    arestas_sub = sum(len(sub[u]) for u in sub)

    contexto = {
        "ordem": len(nos),
        "arestas_dirigidas": arestas_sub,
    }

    ordem_b, pai_b, prof_b = bfs_tree_digraph(sub, fonte)

    ordem_d, pai_d, prof_d = dfs_tree_digraph(sub, fonte)

    arvore_bfs = _arvore_json(fonte, ordem_b, pai_b, prof_b)
    arvore_bfs["subgrafo"] = contexto

    arvore_dfs = _arvore_json(fonte, ordem_d, pai_d, prof_d)
    arvore_dfs["subgrafo"] = contexto

    return arvore_bfs, arvore_dfs


def _rodar_bfs_dfs(g, fontes):

    bfs_res = []

    for f in fontes:

        dist, camadas = _bfs_camadas(g, f)

        bfs_res.append(
            {
                "fonte": f,
                "nos_alcancados": len(dist),
                "camadas": {
                    str(k): len(v)
                    for k, v in sorted(camadas.items())
                },
                "amostra_bfs": sorted(dist.keys())[:10],
            }
        )

    vs_dfs = sorted(g.keys())[:200]

    g_dfs = _subgrafo_induzido(g, vs_dfs)

    fontes_dfs = []

    for f in fontes:

        if f in vs_dfs:
            fontes_dfs.append(f)

    if len(fontes_dfs) < 3:
        fontes_dfs = vs_dfs[:3]

    dfs_res = []

    lim_ant = sys.getrecursionlimit()

    sys.setrecursionlimit(max(lim_ant, 8000))

    try:

        for f in fontes_dfs[:3]:

            ordem = dfs_order_digraph(g_dfs, f)

            dfs_res.append(
                {
                    "fonte": f,
                    "nos_visitados": len(ordem),
                    "amostra_dfs": ordem[:10],
                }
            )

    finally:

        sys.setrecursionlimit(lim_ant)

    return bfs_res, dfs_res


def run_parte2(
    project_root: Path,
    *,
    max_vertices: int = 3000,
    max_lines_read: int = 600_000,
    weight_mode: str = "synthetic_km",
):

    data_p2 = (
        project_root
        / "data"
        / "dataset_parte2"
        / "roadNet-CA.txt.gz"
    )

    if not data_p2.exists():

        raise SystemExit(
            "dataset faltando"
        )

    g, meta = build_snap_ca_subgraph(
        data_p2,
        max_vertices=max_vertices,
        max_lines_read=max_lines_read,
        weight_mode=weight_mode,
    )

    out = project_root / "out" / "parte2"

    out.mkdir(
        parents=True,
        exist_ok=True
    )

    V = set(g.keys())

    n = len(V)

    m = 0

    for u in g:
        m += len(g[u])

    d = _densidade_dirigida(n, m)

    metrics = {
        **meta,
        "ordem": n,
        "tamanho_arestas_dirigidas": m,
        "densidade_dirigida": arred(d),
    }

    write_json(
        out / "subgrafo_metricas.json",
        metrics,
        parte="parte2",
        descricao=(
            "Métricas do subgrafo dirigido extraído do SNAP roadNet-CA "
            "(amostra da maior componente conexa)."
        ),
    )

    grau_saida = Counter()

    for u in V:

        grau_saida[len(g[u])] += 1

    _plot_grau_saida(
        out / "viz_parte2_grau_saida.png",
        grau_saida
    )

    vs_sorted = sorted(V)

    fontes = [
        vs_sorted[0],
        vs_sorted[len(vs_sorted) // 2],
        vs_sorted[-1]
    ]

    bfs_res, dfs_res = _rodar_bfs_dfs(
        g,
        fontes
    )

    # árvores BFS e DFS (nó a nó) sobre uma mesma amostra conexa, enraizadas
    # na mesma fonte usada pelo resumo de camadas do BFS.
    arvore_bfs, arvore_dfs = _montar_arvores_amostra(
        g,
        fontes[0],
    )

    write_json(
        out / "exploracao_bfs_dfs.json",
        {
            "bfs": bfs_res,
            "dfs": dfs_res,
            "arvore_bfs": arvore_bfs,
            "arvore_dfs": arvore_dfs,
        },
        parte="parte2",
        descricao=(
            "Exploração do subgrafo: resumo de camadas do BFS, amostra da "
            "ordem do DFS e as árvores BFS/DFS (nó a nó) de uma amostra conexa."
        ),
    )

    if bfs_res:
        _plot_bfs_camadas(
            out / "viz_parte2_bfs_camadas.png",
            bfs_res[0]["camadas"],
            bfs_res[0]["fonte"],
        )

    demos_neg = _rodar_demos_pesos_negativos()

    write_json(
        out / "demos_pesos_negativos.json",
        demos_neg,
        parte="parte2",
        chave_conteudo="demos",
        descricao=(
            "Grafos didáticos de pesos negativos: comparam Bellman-Ford "
            "(aceita pesos negativos / detecta ciclo negativo) com Dijkstra."
        ),
    )

    pares = _pares_rota(list(V))

    rows = []

    by_src = defaultdict(list)

    for s, t in pares:

        if s != t:
            by_src[s].append(t)

    t_bf_total = 0.0
    t_dj_total = 0.0

    for s, alvos in by_src.items():

        t0 = time.perf_counter()

        dist_bf, _, neg = bellman_ford_digraph(g, s)

        t_bf = time.perf_counter() - t0

        t_bf_total += t_bf

        if neg:
            raise RuntimeError("ciclo negativo")

        t0 = time.perf_counter()

        dist_dj, _ = dijkstra_digraph(g, s)

        t_dj = time.perf_counter() - t0

        t_dj_total += t_dj

        for t in alvos:

            dbf = dist_bf.get(t, float("inf"))

            ddj = dist_dj.get(t, float("inf"))

            if dbf == float("inf") and ddj == float("inf"):

                dif = 0.0

                ok = True

            elif dbf == float("inf") or ddj == float("inf"):

                dif = float("nan")

                ok = False

            else:

                dif = abs(dbf - ddj)

                ok = dif < 1e-6

            rows.append(
                {
                    "origem": s,
                    "destino": t,
                    "distancia_bellman_ford": dbf,
                    "distancia_dijkstra": ddj,
                    "diferenca_abs": dif,
                    "coincide": ok,
                    "tempo_bf": t_bf,
                    "tempo_dijkstra": t_dj,
                }
            )

    cmp_path = out / "comparacao_bf_dijkstra.csv"

    if rows:

        with cmp_path.open(
            "w",
            encoding="utf-8",
            newline=""
        ) as f:

            w = csv.DictWriter(
                f,
                fieldnames=list(rows[0].keys())
            )

            w.writeheader()

            w.writerows(rows)

    else:

        cmp_path.write_text(
            "sem dados",
            encoding="utf-8"
        )

    # catálogo dos arquivos de saída da Parte 2
    write_manifest(
        out,
        parte="parte2",
        titulo="Parte 2 — SNAP roadNet-CA",
        arquivos=[
            {
                "arquivo": "subgrafo_metricas.json",
                "tipo": "json",
                "descricao": "Métricas do subgrafo dirigido extraído do SNAP.",
            },
            {
                "arquivo": "exploracao_bfs_dfs.json",
                "tipo": "json",
                "descricao": (
                    "Camadas BFS, amostra DFS e árvores BFS/DFS nó a nó."
                ),
            },
            {
                "arquivo": "demos_pesos_negativos.json",
                "tipo": "json",
                "descricao": "Grafos didáticos de pesos/ciclos negativos.",
            },
            {
                "arquivo": "comparacao_bf_dijkstra.csv",
                "tipo": "csv",
                "descricao": "Comparação Bellman-Ford × Dijkstra (custo e tempo).",
                "colunas": list(rows[0].keys()) if rows else [],
            },
            {
                "arquivo": "viz_parte2_grau_saida.png",
                "tipo": "imagem",
                "descricao": "Distribuição do grau de saída do subgrafo.",
            },
            {
                "arquivo": "viz_parte2_bfs_camadas.png",
                "tipo": "imagem",
                "descricao": "Quantidade de nós por camada de BFS.",
            },
        ],
    )

    print("parte 2 concluida")
    print(f"nos: {n}")
    print(f"arestas: {m}")
    print(f"pares: {len(rows)}")