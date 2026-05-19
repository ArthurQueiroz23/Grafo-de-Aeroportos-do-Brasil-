from pathlib import Path
import argparse

from .io import (
    build_graph_from_adjacency_csv,
    load_airports_table,
)

from .solve import (
    run_metrics,
    run_routes,
)

from .viz import run_all_visualizations


def get_root() -> Path:

    # pega raiz do projeto
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
        help="Comando que vai rodar",
    )

    parser.add_argument(
        "--max-nodes",
        type=int,
        default=3000,
        help="Limite de nós da parte 2",
    )

    parser.add_argument(
        "--max-lines",
        type=int,
        default=600000,
        help="Limite de linhas lidas",
    )

    parser.add_argument(
        "--peso",
        choices=["unit", "synthetic_km"],
        default="synthetic_km",
        help="Tipo de peso",
    )

    # filtro origem
    parser.add_argument(
        "--origem",
        type=str,
        help="Filtra aeroporto de origem",
    )

    # filtro destino
    parser.add_argument(
        "--destino",
        type=str,
        help="Filtra aeroporto de destino",
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

    # monta grafo
    grafo = build_graph_from_adjacency_csv(
        adj_csv
    )

    # tabela aeroportos
    aeroportos = load_airports_table(
        aeroportos_csv
    )

    # =========================
    # METRICAS
    # =========================
    if args.comando in ["metricas", "tudo"]:

        run_metrics(
            grafo,
            aeroportos,
            out_dir,
        )

        print("Metricas geradas!")

    # =========================
    # ROTAS
    # =========================
    if args.comando in ["rotas", "tudo"]:

        # garante csv
        if not rotas_csv.exists():

            raise SystemExit(
                f"Arquivo nao encontrado: {rotas_csv}"
            )

        run_routes(
            grafo,
            rotas_csv,
            out_dir,
            origem_filtro=args.origem,
            destino_filtro=args.destino,
        )

        print("Rotas calculadas!")

    # =========================
    # VISUALIZACOES
    # =========================
    if args.comando in ["viz", "tudo"]:

        arquivos_necessarios = [
            out_dir / "ego_aeroportos.csv",
            out_dir / "graus.csv",
            out_dir / "regioes.json",
        ]

        # confere arquivos
        for arquivo in arquivos_necessarios:

            if not arquivo.exists():

                raise SystemExit(
                    "Rode antes: python -m src.cli metricas"
                )

        run_all_visualizations(root)

        print("Visualizacoes geradas!")


if __name__ == "__main__":
    main()