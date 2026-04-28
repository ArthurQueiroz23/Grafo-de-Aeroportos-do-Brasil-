from __future__ import annotations

import argparse
from pathlib import Path

from .graphs.io import build_graph_from_adjacency_csv, load_airports_table
from .solve import run_metrics, run_routes
from .viz import run_all_visualizations


def _root() -> Path:
    # pega a pasta raiz do projeto
    return Path(__file__).resolve().parents[1]


def main() -> None:
    root = _root()

    # caminhos dos arquivos
    data = root / "data"
    out = root / "out"
    ap_path = data / "aeroportos_data.csv"
    adj_path = data / "adjacencias_aeroportos.csv"
    rotas_path = data / "rotas.csv"

    # argumentos do terminal
    parser = argparse.ArgumentParser(description="Grafo de aeroportos — Parte 1")
    parser.add_argument(
        "comando",
        choices=["metricas", "rotas", "viz", "tudo"],
        help="metricas: métricas; rotas: caminhos; viz: gráficos; tudo: roda tudo",
    )

    args = parser.parse_args()

    # carrega os dados
    graph = build_graph_from_adjacency_csv(adj_path)
    airports = load_airports_table(ap_path)

    if args.comando in ("metricas", "tudo"):
        run_metrics(graph, airports, out)
        print(f"Métricas gravadas em {out}")

    if args.comando in ("rotas", "tudo"):
        if not rotas_path.exists():
            raise SystemExit(f"Arquivo ausente: {rotas_path}")

        run_routes(graph, rotas_path, out)
        print(f"Distâncias gravadas em {out / 'distancias_rotas.csv'}")

    if args.comando in ("viz", "tudo"):
        # verifica se já rodou métricas antes
        need = [out / "ego_aeroportos.csv", out / "graus.csv", out / "regioes.json"]
        for p in need:
            if not p.exists():
                raise SystemExit("Execute 'metricas' antes ou use 'tudo'.")

        run_all_visualizations(root)
        print(f"Visualizações gravadas em {out}")


if __name__ == "__main__":
    main()