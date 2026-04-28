# Rede de aeroportos do Brasil (Teoria dos Grafos)

Projeto acadêmico: modelagem em grafo não direcionado com pesos, métricas (ordem, tamanho, densidade, subgrafos por região, ego-redes), percursos mínimos com **Dijkstra** (implementação própria), visualizações e HTML interativo (**pyvis** / **matplotlib**).

## Requisitos

- Python **3.11+** (testado também em 3.13).
- Dependências: `pip install -r requirements.txt`

## Estrutura

- `data/` — `aeroportos_data.csv`, `adjacencias_aeroportos.csv`, `rotas.csv`, pasta `dataset_parte2/` reservada à Parte 2.
- `src/` — `cli.py`, `solve.py`, `viz.py`, pacote `graphs/` (`graph.py`, `io.py`, `algorithms.py`).
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

## Restrições do enunciado

Não se usa **networkx**, **igraph** etc. para BFS, DFS, Dijkstra ou Bellman–Ford — apenas as implementações em `src/graphs/algorithms.py`.
