from __future__ import annotations

import argparse
from pathlib import Path

from .graphs.io import build_graph_from_adjacency_csv, load_airports_table
from .solve import run_metrics, run_routes
from .viz import run_all_visualizations


def _root() -> Path:
    return Path(__file__).resolve().parents[1]


def main() -> None:
    root = _root()
    data = root / "data"
    out = root / "out"
    ap_path = data / "aeroportos_data.csv"
    adj_path = data / "adjacencias_aeroportos.csv"
    rotas_path = data / "rotas.csv"

    parser = argparse.ArgumentParser(
        description="Grafo de aeroportos (Parte 1) + RoadNet-CA / Parte 2 (SNAP)"
    )
    parser.add_argument(
        "comando",
        choices=["metricas", "rotas", "viz", "tudo", "parte2"],
        help="Parte 1: metricas, rotas, viz, tudo. Parte 2: parte2 (roadNet-CA + BF vs Dijkstra).",
    )
    parser.add_argument(
        "--max-nodes",
        type=int,
        default=3000,
        help="Parte 2: tamanho máximo do subgrafo conexo (nós).",
    )
    parser.add_argument(
        "--max-lines",
        type=int,
        default=600_000,
        help="Parte 2: limite de linhas lidas do .gz (amostra do grafo completo).",
    )
    parser.add_argument(
        "--peso",
        choices=["unit", "synthetic_km"],
        default="synthetic_km",
        help="Parte 2: modo de peso quando o SNAP não traz distância.",
    )

    args = parser.parse_args()

    if args.comando == "parte2":
        from .solve_parte2 import run_parte2

        run_parte2(
            root,
            max_vertices=args.max_nodes,
            max_lines_read=args.max_lines,
            weight_mode=args.peso,
        )
        return

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
        need = [out / "ego_aeroportos.csv", out / "graus.csv", out / "regioes.json"]
        for p in need:
            if not p.exists():
                raise SystemExit("Execute 'metricas' antes de 'viz' ou use 'tudo'.")
        run_all_visualizations(root)
        print(f"Visualizações gravadas em {out}")


if __name__ == "__main__":
    main()
