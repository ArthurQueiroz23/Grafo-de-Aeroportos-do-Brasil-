import { REGION_HEX, CHART } from "@/constants/theme";

const TONE = {
  info: "bg-blue-500/10 text-blue-400",
  warning: "bg-yellow-500/10 text-yellow-400",
  error: "bg-red-500/10 text-red-400",
  success: "text-green-400",
  accent: "text-amber-400",
  muted: "text-muted-foreground",
};

function grauTier(grau) {
  const g = parseInt(grau, 10);
  if (g >= 16) return "Hub (16+)";
  if (g >= 6) return "Médio (6–15)";
  return "Baixo (1–5)";
}

export function mapRegioes(regioes) {
  return regioes.map((r, i) => {
    const color = REGION_HEX[r.regiao] || CHART.primary;
    return {
      id: `reg-${i}`,
      badge: {
        label: r.regiao,
        className: "capitalize",
        style: { background: `${color}20`, color, borderColor: `${color}40` },
      },
      meta: `${r.ordem} vért.`,
      primary: r.regiao,
      summary: `Densidade ${parseFloat(r.densidade).toFixed(4)}`,
      status: { label: String(r.tamanho), className: TONE.success },
      detail: `${r.tamanho} arestas`,
      tags: ["subgrafo", "região"],
      details: [
        { label: "Ordem (vértices)", value: r.ordem },
        { label: "Tamanho (arestas)", value: r.tamanho },
        { label: "Densidade", value: parseFloat(r.densidade).toFixed(4) },
      ],
      filters: { level: r.regiao },
      searchText: `${r.regiao} ${r.ordem} ${r.tamanho} ${r.densidade}`,
    };
  });
}

export function mapEgo(ego) {
  return ego.map((r, i) => ({
    id: `ego-${i}`,
    badge: { label: r.aeroporto, className: TONE.info },
    meta: `grau ${r.grau}`,
    primary: r.aeroporto,
    summary: `Ego: ${r.ordem_ego} nós · densidade ${parseFloat(r.densidade_ego).toFixed(4)}`,
    status: { label: r.ordem_ego, className: TONE.accent },
    detail: `${r.tamanho_ego} arestas`,
    tags: ["ego-rede", "vizinhança"],
    details: [
      { label: "Grau", value: r.grau },
      { label: "Ordem ego", value: r.ordem_ego },
      { label: "Tamanho ego", value: r.tamanho_ego },
      { label: "Densidade ego", value: parseFloat(r.densidade_ego).toFixed(4) },
    ],
    filters: {
      level: grauTier(r.grau),
      service: r.aeroporto,
    },
    searchText: `${r.aeroporto} ${r.grau} ${r.ordem_ego} ${r.tamanho_ego}`,
  }));
}

export function mapGrausRanking(graus, limit) {
  const sorted = [...graus].sort(
    (a, b) => parseInt(b.grau, 10) - parseInt(a.grau, 10),
  );
  const slice = limit ? sorted.slice(0, limit) : sorted;

  return slice.map((g, i) => ({
    id: `grau-${g.aeroporto}`,
    badge: {
      label: `#${i + 1}`,
      className: i < 3 ? TONE.warning : TONE.muted,
    },
    meta: g.aeroporto,
    primary: g.aeroporto,
    summary: `Grau ${g.grau} — conectividade na malha`,
    status: { label: g.grau, className: TONE.accent },
    detail: grauTier(g.grau),
    tags: ["ranking", "hub"],
    details: [{ label: "Grau", value: g.grau }],
    filters: {
      level: grauTier(g.grau),
      service: g.aeroporto,
    },
    searchText: `${g.aeroporto} ${g.grau}`,
  }));
}

export function mapRotas(rotas) {
  return rotas.map((r, i) => {
    const isObrig =
      (r.origem === "MAO" && r.destino === "GRU") ||
      (r.origem === "REC" && r.destino === "POA");
    const tipo = isObrig ? "Obrigatória" : "Adicional";

    return {
      id: `rota-${i}`,
      badge: {
        label: r.origem,
        className: isObrig ? TONE.warning : TONE.info,
      },
      meta: "→",
      primary: r.destino,
      summary: r.caminho,
      status: {
        label: r.custo,
        className: isObrig ? TONE.accent : TONE.success,
      },
      detail: tipo,
      tags: [tipo.toLowerCase(), "dijkstra"],
      details: [
        { label: "Origem", value: r.origem },
        { label: "Destino", value: r.destino },
        { label: "Custo", value: r.custo },
        { label: "Caminho", value: r.caminho },
        { label: "Tipo", value: tipo },
      ],
      filters: {
        level: tipo,
        service: r.origem,
        status: r.destino,
      },
      searchText: `${r.origem} ${r.destino} ${r.custo} ${r.caminho} ${tipo}`,
    };
  });
}

export function mapComparacaoBfDijkstra(rows) {
  return rows.map((r, i) => {
    const coincide = r.coincide === "True";
    return {
      id: `cmp-${i}`,
      badge: {
        label: r.origem,
        className: coincide ? TONE.info : TONE.error,
      },
      meta: "→",
      primary: r.destino,
      summary: `Δ ${parseFloat(r.diferenca_abs || 0).toExponential(2)}`,
      status: {
        label: coincide ? "Sim" : "Não",
        className: coincide ? TONE.success : TONE.error,
      },
      detail: `BF ${parseFloat(r.distancia_bellman_ford).toFixed(2)}`,
      tags: ["bellman-ford", "dijkstra"],
      details: [
        { label: "Distância BF", value: parseFloat(r.distancia_bellman_ford).toFixed(2) },
        { label: "Distância Dijkstra", value: parseFloat(r.distancia_dijkstra).toFixed(2) },
        { label: "Diferença absoluta", value: parseFloat(r.diferenca_abs || 0).toExponential(2) },
        { label: "Coincide", value: coincide ? "Sim" : "Não" },
      ],
      filters: {
        level: coincide ? "Coincide" : "Diverge",
        service: r.origem,
        status: r.destino,
      },
      searchText: `${r.origem} ${r.destino} ${r.distancia_bellman_ford} ${r.distancia_dijkstra}`,
    };
  });
}

export const FILTER_LABELS = {
  level: "Categoria",
  service: "Origem / Serviço",
  status: "Destino / Status",
};
