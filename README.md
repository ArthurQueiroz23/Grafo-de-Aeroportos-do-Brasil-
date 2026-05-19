# Rede de Aeroportos do Brasil (Teoria dos Grafos)

Projeto acadêmico dividido em duas partes:

* **Parte 1:** modelagem de uma rede de aeroportos brasileiros usando um grafo não direcionado, com métricas, Dijkstra, visualizações estáticas/interativas e frontend em React.
* **Parte 2:** análise da rede rodoviária SNAP roadNet-CA usando grafo dirigido, comparando Bellman–Ford e Dijkstra em problemas de caminhos mínimos.

Todos os algoritmos principais foram implementados manualmente, sem uso de `networkx`, `igraph` ou bibliotecas equivalentes.

---

# Como rodar

## 1. Instalar dependências Python

```bash
pip install -r requirements.txt
```

## 2. Gerar os dados

Execute na raiz do projeto (com o `.venv` ativado):

```bash
# Parte 1 — métricas + rotas + visualizações
python -m src.cli tudo

# Parte 2 — SNAP
python -m src.cli parte2
```

Isso cria a pasta `out/` com todos os arquivos que o frontend consome.

## 3. Rodar o frontend React

```bash
cd frontend
npm install   # apenas na primeira vez
npm run dev
```

Acesse em: **http://localhost:5173**

---

# 1. Tecnologias utilizadas

* Python 3.11+
* Pandas
* Matplotlib
* PyVis
* React 18 + Vite
* vis-network
* lucide-react

---

# 2. Estrutura do projeto

```text
GRAFO-DE-AEROPORTOS-DO-BRASIL/
│
├── data/
│   ├── aeroportos_data.csv
│   ├── adjacencias_aeroportos.csv
│   ├── rotas.csv
│   └── dataset_parte2/
│
├── out/
│
├── scripts/
│   └── download_roadnet_ca.py
│
├── src/
│   ├── algorithms.py
│   ├── directed_algorithms.py
│   ├── io.py
│   ├── cli.py
│   ├── solve.py
│   ├── solve_parte2.py
│   ├── snap_road.py
│   └── viz.py
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── App.jsx
│   │   └── App.css
│   ├── package.json
│   └── vite.config.js
│
├── tests/
│
├── requirements.txt
└── README.md
```

---

# 3. Instalação

Clone o repositório e instale as dependências:

```bash
pip install -r requirements.txt
```

Todos os comandos devem ser executados na raiz do projeto.

---

# 4. Parte 1 — Rede de Aeroportos

## Objetivo

A Parte 1 modela uma rede de aeroportos brasileiros como um grafo não direcionado com pesos.

O sistema:

* calcula métricas globais do grafo;
* calcula métricas por região;
* gera ego-redes;
* executa Dijkstra para caminhos mínimos;
* cria visualizações estáticas e interativas;
* disponibiliza um frontend interativo em React.

---

# 5. Executando a Parte 1

## Executar tudo

O comando abaixo executa todas as etapas automaticamente:

```bash
python -m src.cli tudo
```

Ele executa:

* métricas;
* rotas;
* visualizações.

---

## Executar separadamente

### Métricas

```bash
python -m src.cli metricas
```

Gera:

* `global.json`
* `regioes.json`
* `ego_aeroportos.csv`
* `graus.csv`
* `rankings.json`

---

### Rotas (Dijkstra)

```bash
python -m src.cli rotas
```
Também é possível filtrar rotas específicas:

### Filtrar por origem

```bash
python -m src.cli rotas --origem REC
```

### Filtrar por destino

```bash
python -m src.cli rotas --destino GRU
```

### Filtrar origem e destino

```bash
python -m src.cli rotas --origem REC --destino GRU
```

Lê:

```text
data/rotas.csv
```

Gera:

```text
out/distancias_rotas.csv
```

---

### Visualizações

```bash
python -m src.cli viz
```

Gera:

* gráficos PNG;
* HTML interativo;
* árvore de percursos;
* visualizações BFS;
* subgrafos.

---

# 6. Frontend React

O projeto possui uma interface web interativa feita com React + Vite.

## Executar o frontend

```bash
cd frontend
npm install   # apenas na primeira vez
npm run dev
```

Acesse em **http://localhost:5173**

> Os arquivos da pasta `out/` precisam existir antes de abrir o frontend. Gere-os com `python -m src.cli tudo` e `python -m src.cli parte2`.

---

## Páginas disponíveis

### Visão Geral

Exibe KPIs globais (ordem, tamanho, densidade, hub principal) e o grafo interativo completo com rotas obrigatórias destacadas.

---

### Métricas

Exibe em abas:

* subgrafos por região com cards coloridos;
* ego-redes por aeroporto;
* ranking de conectividade com barras em gradiente.

---

### Calculadora de Rotas

Calcula o menor caminho entre aeroportos usando Dijkstra (implementado em JavaScript).

Mostra:

* custo total;
* quantidade de arestas;
* paradas intermediárias;
* rota destacada em dourado no grafo interativo.

---

### Rotas

Lista todas as rotas calculadas (Dijkstra / Bellman-Ford) com destaque para as obrigatórias (MAO→GRU, REC→POA).

---

### Visualizações

Exibe os gráficos PNG gerados pelo Python e permite abrir o grafo interativo PyVis em iframe.

---

### Parte 2 — SNAP

Exibe métricas do subgrafo SNAP, comparação BF × Dijkstra e demos de ciclo negativo.

---

# 7. Visualizações geradas

## Arquivos PNG

| Arquivo                                      | Descrição                    |
| -------------------------------------------- | ---------------------------- |
| `viz_exploratoria_distribuicao_graus.png`    | Histograma dos graus         |
| `viz_exploratoria_bfs_camadas.png`           | BFS em camadas               |
| `viz_explanatoria_ranking_conectividade.png` | Ranking dos aeroportos       |
| `viz_explanatoria_regioes_ordem_tamanho.png` | Comparação regional          |
| `viz_explanatoria_regioes_densidade.png`     | Densidade regional           |
| `viz_subgrafo_maior_grau.png`                | Subgrafo dos hubs principais |

---

## HTMLs interativos

| Arquivo                 | Descrição                    |
| ----------------------- | ---------------------------- |
| `grafo_interativo.html` | Grafo completo interativo    |
| `arvore_percurso.html`  | Percursos mínimos destacados |

---

# 8. Parte 2 — SNAP roadNet-CA

## Objetivo

A Parte 2 trabalha com o dataset real:

SNAP roadNet-CA.

O sistema:

* lê uma amostra do dataset;
* extrai um subgrafo conexo;
* cria um grafo dirigido;
* compara Bellman–Ford e Dijkstra;
* mede tempos de execução;
* gera estatísticas e gráficos.

---

# 9. Download do dataset

Execute:

```bash
python scripts/download_roadnet_ca.py
```

O dataset será salvo em:

```text
data/dataset_parte2/
```

---

# 10. Executando a Parte 2

## Execução padrão

```bash
python -m src.cli parte2
```

---

## Com parâmetros personalizados

```bash
python -m src.cli parte2 --max-nodes 4000 --max-lines 800000 --peso unit
```

---

## Parâmetros disponíveis

| Parâmetro     | Descrição                         |
| ------------- | --------------------------------- |
| `--max-nodes` | Limite de nós do subgrafo         |
| `--max-lines` | Quantidade máxima de linhas lidas |
| `--peso`      | `unit` ou `synthetic_km`          |

---

# 11. Saídas da Parte 2

Os resultados ficam em:

```text
out/parte2/
```

---

## Arquivos principais

| Arquivo                      | Descrição                       |
| ---------------------------- | ------------------------------- |
| `subgrafo_metricas.json`     | Métricas do subgrafo            |
| `comparacao_bf_dijkstra.csv` | Comparação BF vs Dijkstra       |
| `viz_parte2_grau_saida.png`  | Distribuição do grau de saída   |
| `nota_pesos.txt`             | Explicação dos pesos sintéticos |

---

# 12. Algoritmos implementados manualmente

## Parte 1

Arquivo:

```text
src/algorithms.py
```

Implementações:

* BFS
* DFS
* Dijkstra
* métricas de grafos

---

## Parte 2

Arquivo:

```text
src/directed_algorithms.py
```

Implementações:

* BFS dirigido
* Bellman–Ford
* Dijkstra dirigido

---

# 13. Testes

Executar todos os testes:

```bash
python -m unittest discover -s tests -p "test_*.py" -v
```

---

# 14. Observações importantes

* O projeto NÃO utiliza `networkx` ou `igraph` para algoritmos.
* O dataset SNAP não possui distâncias reais.
* O modo `synthetic_km` cria pesos positivos sintéticos apenas para fins acadêmicos.
* O frontend React depende dos arquivos previamente gerados em `out/` pelos scripts Python.

---

# 15. Referências

## SNAP Dataset

roadNet-CA:

[SNAP roadNet-CA]

---

## Bibliotecas

* [React](https://react.dev)
* [Vite](https://vitejs.dev)
* [vis-network](https://visjs.github.io/vis-network/)
* [lucide-react](https://lucide.dev)
* [PyVis]
* [Matplotlib]
* [Pandas]
