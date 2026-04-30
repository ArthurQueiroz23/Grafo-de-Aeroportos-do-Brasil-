# Rede de aeroportos do Brasil (Teoria dos Grafos)

Projeto acadêmico em duas partes: **Parte 1** — grafo não direcionado de aeroportos (métricas, Dijkstra, visualizações); **Parte 2** — rede rodoviária [SNAP roadNet-CA](https://snap.stanford.edu/data/roadNet-CA.html) com grafo dirigido (Bellman–Ford vs Dijkstra). Algoritmos implementados manualmente; sem `networkx`/`igraph` para BFS, DFS, Dijkstra e Bellman–Ford.

---

## 1. Instalação e onde rodar os comandos

- **Python:** 3.11 ou superior.
- **Pasta de trabalho:** raiz do repositório (onde está `requirements.txt` e a pasta `src/`).

```bash
pip install -r requirements.txt
```

Todos os exemplos abaixo assumem que o terminal já está nessa raiz.

---

## 2. Parte 1 — Aeroportos (executar)

### Objetivo

Carregar `data/aeroportos_data.csv` e `data/adjacencias_aeroportos.csv`, calcular métricas globais e por região, ego-redes e graus; resolver rotas com **Dijkstra** (`data/rotas.csv`); gerar PNG, HTML interativo e CSVs em `out/`.

### Forma recomendada (um comando)

Gera **tudo** da Parte 1 em sequência (métricas → rotas → figuras e HTML):

```bash
python -m src.cli tudo
```

### Forma passo a passo (opcional)

Útil para depurar ou só atualizar uma etapa:

| Ordem | Comando | O que faz |
|------|---------|-----------|
| 1 | `python -m src.cli metricas` | Escreve `out/global.json`, `out/regioes.json`, `out/ego_aeroportos.csv`, `out/graus.csv`, `out/rankings.json` |
| 2 | `python -m src.cli rotas` | Lê `data/rotas.csv`, escreve `out/distancias_rotas.csv` (precisa dos dados do grafo; métricas já terão criado consistência) |
| 3 | `python -m src.cli viz` | Exige os CSVs/JSON da etapa 1; gera PNG, `arvore_percurso.*`, `grafo_interativo.html` |

Regra prática: **se falhar o `viz`, rode antes `metricas` ou use `tudo`.**

### Saídas principais da Parte 1 (`out/`)

| Caminho | Descrição |
|---------|-----------|
| `global.json`, `regioes.json` | Ordem, tamanho, densidade (global e por região) |
| `ego_aeroportos.csv`, `graus.csv`, `rankings.json` | Graus, ego-redes, aeroportos em destaque |
| `distancias_rotas.csv` | Custo e caminho (Dijkstra) por par em `data/rotas.csv` |
| `arvore_percurso.html`, `arvore_percurso.png` | Percursos mínimos Recife→Porto Alegre e Manaus→São Paulo |
| `grafo_interativo.html` | Abrir no navegador: grafo completo, tooltip, percursos obrigatórios destacados |
| `viz_*.png` | Histogramas, rankings, regiões, BFS em camadas, subgrafo de maior grau |
| `notas_visualizacoes.txt` | Texto auxiliar para relatório (tipo de cada visualização) |

---

## 3. Parte 2 — Road network SNAP (executar)

### Objetivo

Ler uma **amostra** do ficheiro roadNet-CA (o grafo completo tem ~1,97M de nós), extrair um **subgrafo conexo** limitado e comparar **Bellman–Ford** com **Dijkstra** em caminhos mínimos de fonte única (SSSP).

### Passo A — Obter o dataset

Automático:

```bash
python scripts/download_roadnet_ca.py
```

O ficheiro esperado é `data/dataset_parte2/roadNet-CA.txt.gz` (é grande; pode não estar no Git — ver `data/dataset_parte2/README.txt`).

### Passo B — Correr o pipeline da Parte 2

```bash
python -m src.cli parte2
```

Parâmetros opcionais:

```bash
python -m src.cli parte2 --max-nodes 4000 --max-lines 800000 --peso unit
```

| Opção | Significado |
|-------|-------------|
| `--max-nodes` | Número máximo de nós no subgrafo conexo (predefinição: 3000) |
| `--max-lines` | Linhas lidas do `.gz` como amostra do grafo enorme (predefinição: 600000) |
| `--peso` | `unit` = peso 1 em todas as arestas; `synthetic_km` = peso sintético positivo (o SNAP **não** traz quilometragem real) |

### Saídas da Parte 2 (`out/parte2/`)

| Ficheiro | Conteúdo |
|----------|----------|
| `subgrafo_metricas.json` | Ordem, tamanho, densidade (dirigida), meta da amostra |
| `comparacao_bf_dijkstra.csv` | Distâncias BF vs Dijkstra e tempos de SSSP |
| `viz_parte2_grau_saida.png` | Distribuição do grau de saída |
| `nota_pesos.txt` | Explicação dos modos de peso |

**Citação do dataset:** página oficial do [roadNet-CA](https://snap.stanford.edu/data/roadNet-CA.html) (Leskovec et al., conforme o SNAP).

---

## 4. Como explorar o projeto por completo

Sugestão de ordem para “mapear” repositório, código e resultados:

### 4.1 Dados de entrada

1. **Parte 1:** `data/aeroportos_data.csv`, `data/adjacencias_aeroportos.csv`, `data/rotas.csv`.
2. **Parte 2:** `data/dataset_parte2/` após download (e opcionalmente ler `README.txt` dentro dessa pasta).

### 4.2 Código-fonte (`src/`)

| Área | Ficheiros |
|------|-----------|
| Entrada e CLI | `cli.py` |
| Métricas e rotas (Parte 1) | `solve.py`, `graphs/io.py`, `graphs/graph.py` |
| Algoritmos não direcionados | `graphs/algorithms.py` (BFS, DFS, Dijkstra, Bellman–Ford no modelo aeroportos) |
| Parte 2 | `snap_road.py`, `solve_parte2.py`, `graphs/digraph.py`, `graphs/directed_algorithms.py` |
| Figuras Parte 1 | `viz.py` |

### 4.3 Resultados gerados

1. Rode **Parte 1:** `python -m src.cli tudo`.
2. Abra no navegador **`out/grafo_interativo.html`** e **`out/arvore_percurso.html`**.
3. Percorra **`out/*.png`** e leia **`out/notas_visualizacoes.txt`**.
4. Rode **Parte 2:** download + `python -m src.cli parte2`; analise **`out/parte2/comparacao_bf_dijkstra.csv`** e o PNG de graus.

### 4.4 Testes automáticos

Valida implementações dos algoritmos sem depender dos datasets grandes:

```bash
python -m unittest discover -s tests -p "test_*.py" -v
```

### 4.5 Documentação académica

Use este README, os JSON/CSV em `out/` e `out/parte2/`, e as notas em texto como base para o PDF do trabalho (manual + parte técnica).

---

## 5. Testes (referência rápida)

```bash
python -m unittest discover -s tests -p "test_*.py" -v
```

---

## 6. Observações

Na Parte 1, o grafo é **não direcionado** com pesos nas rotas aéreas modeladas. Executar **`tudo`** garante que todas as dependências entre ficheiros em `out/` estão consistentes antes de comandos isolados.

## 7. Restrições do enunciado

Não se usa **networkx**, **igraph** nem bibliotecas análogas para implementar BFS, DFS, Dijkstra ou Bellman–Ford. As implementações estão em `src/graphs/algorithms.py` (não direcionado) e `src/graphs/directed_algorithms.py` (dirigido, Parte 2).
