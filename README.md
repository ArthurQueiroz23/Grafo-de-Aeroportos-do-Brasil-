# Rede de aeroportos do Brasil (Teoria dos Grafos)

Projeto acadêmico: modelagem em grafo não direcionado com pesos, métricas (ordem, tamanho, densidade, subgrafos por região, ego-redes), percursos mínimos com **Dijkstra** (implementação própria), visualizações e HTML interativo (**pyvis** / **matplotlib**).

## Requisitos

- Python **3.11+** (testado também em 3.13).
- Dependências: `pip install -r requirements.txt`

## Estrutura

- `data/` — Parte 1: CSV de aeroportos e adjacências; Parte 2: `dataset_parte2/roadNet-CA.txt.gz` (SNAP, não versionado).
- `scripts/download_roadnet_ca.py` — baixa o roadNet-CA para a Parte 2.
- `src/` — `cli.py`, `solve.py`, `viz.py`, `solve_parte2.py`, `snap_road.py`, pacote `graphs/` (`graph.py`, `digraph.py`, `io.py`, `algorithms.py`, `directed_algorithms.py`).
- `out/` — saídas geradas (JSON, CSV, PNG, HTML).
- `tests/` — testes mínimos de BFS, DFS, Dijkstra e Bellman–Ford.

## Uso

Na raiz do repositório:

```bash
# Gera métricas, distâncias (Dijkstra) e todas as visualizações
python -m src.cli tudo
```

Comandos parciais:

```bash
python -m src.cli metricas   # out/global.json, regioes.json, ego_*.csv, graus.csv, rankings.json
python -m src.cli rotas      # requer out/ após metricas, ou use tudo
python -m src.cli viz        # requer CSV/JSON de metricas; gera figuras e HTML
```

### Parte 2 — Rede rodoviária (SNAP roadNet-CA)

1. Baixe o dataset (ou coloque o `.gz` manualmente em `data/dataset_parte2/`):

```bash
python scripts/download_roadnet_ca.py
```

2. Rode o pipeline (lê uma **amostra** do grafo completo, extrai a **maior WCC** na amostra e um **subgrafo conexo** com até *N* nós; o arquivo original tem ~1,97M nós, então o corte é obrigatório para caber em memória e no Bellman–Ford em Python puro):

```bash
python -m src.cli parte2
python -m src.cli parte2 --max-nodes 4000 --max-lines 800000 --peso unit
```

**Pesos:** o SNAP fornece apenas topologia (interseção → interseção). Não há distância em km nas arestas. O projeto oferece `--peso unit` (custo 1) ou `synthetic_km` (proxy positivo estável, **não** é quilometragem real). Ver `out/parte2/nota_pesos.txt`.

**Fonte / citação:** [SNAP — California road network](https://snap.stanford.edu/data/roadNet-CA.html), J. Leskovec *et al.*, conforme a página do dataset.

**Saídas (Parte 2):** `out/parte2/subgrafo_metricas.json`, `out/parte2/comparacao_bf_dijkstra.csv` (SSSP: Bellman–Ford vs Dijkstra, distâncias e tempos), `out/parte2/viz_parte2_grau_saida.png`, `out/parte2/nota_pesos.txt`.

## Saídas principais (Parte 1)

| Arquivo | Conteúdo |
|--------|----------|
| `out/global.json` | Ordem, tamanho, densidade global |
| `out/regioes.json` | Métricas por região (subgrafo induzido) |
| `out/ego_aeroportos.csv` | Ego-rede por aeroporto |
| `out/graus.csv` / `out/rankings.json` | Graus e destaques (maior grau, maior densidade ego) |
| `out/distancias_rotas.csv` | Custo e caminho (Dijkstra) para cada par em `data/rotas.csv` |
| `out/arvore_percurso.html`, `out/arvore_percurso.png` | Percursos Recife→Porto Alegre e Manaus→São Paulo |
| `out/grafo_interativo.html` | Grafo completo; tooltip com grau, região e densidade ego; percursos obrigatórios destacados |
| `out/viz_*.png` | Visualizações analíticas |
| `out/notas_visualizacoes.txt` | Notas curtas (exploratória vs explanatória) para o relatório em PDF |

## Testes

```bash
python -m unittest discover -s tests -p "test_*.py" -v
```

## Observacoes importantes

Este projeto implementa manualmente algoritmos classicos de grafos, como Dijkstra, BFS e DFS, com foco no entendimento pratico da logica por tras dessas abordagens. Alem disso, os dados sao tratados como um grafo nao direcionado com pesos, garantindo maior proximidade com cenarios reais de rotas aereas. Recomenda-se executar primeiro o comando `tudo` para garantir que todas as dependencias de arquivos gerados estejam atualizadas antes de rodar comandos isolados.

## Restrições do enunciado

Não se usa **networkx**, **igraph** etc. para BFS, DFS, Dijkstra ou Bellman–Ford — apenas as implementações em `src/graphs/algorithms.py` (grafo não direcionado) e `src/graphs/directed_algorithms.py` (Parte 2, grafo dirigido).
