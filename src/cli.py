from pathlib import Path
import argparse

from .graphs.io import (
    build_graph_from_adjacency_csv,
    load_airports_table,
)

from .solve import (
    run_metrics,
    run_routes,
)

from .viz import run_all_visualizations


def get_root() -> Path:
    return Path(__file__).resolve().parents[1]


def main():
    root = get_root()

    data_dir = root / "data"
    out_dir = root / "out"

    aeroportos_csv = data_dir / "aeroportos_data.csv"
    adj_csv = data_dir / "adjacencias_aeroportos.csv"
    rotas_csv = data_dir / "rotas.csv"

    parser = argparse.ArgumentParser(
        description="Projeto de Teoria dos Grafos"
    )

    parser.add_argument(
        "comando",
        choices=[
            "metricas",
            "rotas",
            "viz",
            "tudo",
            "parte2",
        ],
        help="Comando que será executado",
    )

    parser.add_argument(
        "--max-nodes",
        type=int,
        default=3000,
        help="Quantidade máxima de nós da Parte 2",
    )

    parser.add_argument(
        "--max-lines",
        type=int,
        default=600000,
        help="Quantidade máxima de linhas lidas do dataset SNAP",
    )

    parser.add_argument(
        "--peso",
        choices=["unit", "synthetic_km"],
        default="synthetic_km",
        help="Tipo de peso das arestas da Parte 2",
    )

    args = parser.parse_args()

    # =========================
    # PARTE 2
    # =========================
    if args.comando == "parte2":

        from .solve_parte2 import run_parte2

        run_parte2(
            root,
            max_vertices=args.max_nodes,
            max_lines_read=args.max_lines,
            weight_mode=args.peso,
        )

        return

    # =========================
    # PARTE 1
    # =========================

    grafo = build_graph_from_adjacency_csv(adj_csv)

    aeroportos = load_airports_table(aeroportos_csv)

    # =========================
    # MÉTRICAS
    # =========================
    if args.comando in ["metricas", "tudo"]:

        run_metrics(
            grafo,
            aeroportos,
            out_dir,
        )

        print("Métricas geradas com sucesso!")

    # =========================
    # ROTAS
    # =========================
    if args.comando in ["rotas", "tudo"]:

        if not rotas_csv.exists():
            raise SystemExit(
                f"Arquivo não encontrado: {rotas_csv}"
            )

        run_routes(
            grafo,
            rotas_csv,
            out_dir,
        )

        print("Rotas calculadas com sucesso!")

    # =========================
    # VISUALIZAÇÕES
    # =========================
    if args.comando in ["viz", "tudo"]:

        arquivos_necessarios = [
            out_dir / "ego_aeroportos.csv",
            out_dir / "graus.csv",
            out_dir / "regioes.json",
        ]

        for arquivo in arquivos_necessarios:

            if not arquivo.exists():

                raise SystemExit(
                    "Execute primeiro: python -m src.cli metricas"
                )

        run_all_visualizations(root)

        print("Visualizações geradas com sucesso!")


if __name__ == "__main__":
    main() 