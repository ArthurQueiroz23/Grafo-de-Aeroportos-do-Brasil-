from __future__ import annotations

import csv
from pathlib import Path
from typing import Dict, List, Tuple

import pandas as pd


def add_edge(graph, u, v, peso):

    # cria vertices se precisar
    if u not in graph:
        graph[u] = {}

    if v not in graph:
        graph[v] = {}

    # add pros 2 lados
    graph[u][v] = peso
    graph[v][u] = peso


def load_airports_table(path: str | Path) -> pd.DataFrame:

    # le tabela dos aeroportos
    path = Path(path)

    df = pd.read_csv(path, encoding="utf-8")

    required = {"iata", "cidade", "regiao"}

    # verifica colunas
    if not required.issubset(df.columns):
        raise ValueError("csv faltando coluna")

    # limpa espacos
    df["iata"] = df["iata"].astype(str).str.strip()

    # evita repetido
    if df["iata"].duplicated().any():
        raise ValueError("iata duplicado")

    return df


def build_graph_from_adjacency_csv(path: str | Path):

    # grafo em lista de adj
    graph = {}

    path = Path(path)

    with path.open(encoding="utf-8", newline="") as f:

        reader = csv.DictReader(f)

        for row in reader:

            u = str(row.get("origem", "")).strip()
            v = str(row.get("destino", "")).strip()

            # pega peso
            peso = float(
                str(row.get("peso", "0")).replace(",", ".")
            )

            add_edge(graph, u, v, peso)

    return graph


def load_routes(path: str | Path) -> List[Tuple[str, str]]:

    # le rotas origem destino
    path = Path(path)

    rotas = []

    with path.open(encoding="utf-8", newline="") as f:

        reader = csv.DictReader(f)

        for row in reader:

            origem = str(row.get("origem", "")).strip()
            destino = str(row.get("destino", "")).strip()

            if origem and destino:
                rotas.append((origem, destino))

    return rotas


def iata_to_regiao(airports: pd.DataFrame) -> Dict[str, str]:

    # mapa iata -> regiao
    mapa = {}

    for _, row in airports.iterrows():

        mapa[str(row["iata"])] = str(row["regiao"])

    return mapa   