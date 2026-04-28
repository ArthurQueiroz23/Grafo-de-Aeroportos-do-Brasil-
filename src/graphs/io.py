from __future__ import annotations

import csv
from pathlib import Path
from typing import Dict, List, Tuple

import pandas as pd

from .graph import Graph


def load_airports_table(path: str | Path) -> pd.DataFrame:
    # carrega a tabela de aeroportos
    path = Path(path)
    df = pd.read_csv(path, encoding="utf-8")

    required = {"iata", "cidade", "regiao"}

    # checa se tem as colunas necessárias
    if not required.issubset(df.columns):
        raise ValueError(f"CSV de aeroportos deve conter colunas: {required}")

    df["iata"] = df["iata"].astype(str).str.strip()

    # não pode ter iata repetido
    if df["iata"].duplicated().any():
        raise ValueError("Códigos IATA duplicados no CSV de aeroportos.")

    return df


def build_graph_from_adjacency_csv(path: str | Path) -> Graph:
    # monta o grafo a partir do csv
    g = Graph()
    path = Path(path)

    with path.open(encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)

        for row in reader:
            u = str(row.get("origem", "")).strip()
            v = str(row.get("destino", "")).strip()

            # ajusta o peso (caso venha com vírgula)
            w = float(str(row.get("peso", "0")).replace(",", "."))

            g.add_edge(u, v, w)

    return g


def load_routes(path: str | Path) -> List[Tuple[str, str]]:
    # carrega pares origem-destino
    path = Path(path)
    out: List[Tuple[str, str]] = []

    with path.open(encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)

        for row in reader:
            o = str(row.get("origem", "")).strip()
            d = str(row.get("destino", "")).strip()

            if o and d:
                out.append((o, d))

    return out


def iata_to_regiao(airports: pd.DataFrame) -> Dict[str, str]:
    # cria mapa iata -> regiao
    m: Dict[str, str] = {}

    for _, r in airports.iterrows():
        m[str(r["iata"])] = str(r["regiao"])

    return m