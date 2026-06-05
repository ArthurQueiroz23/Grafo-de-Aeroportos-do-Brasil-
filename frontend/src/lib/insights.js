/**
 * Geração de insights orientados a dados.
 *
 * Em vez de textos fixos focados só em teoria de grafos, cada função abaixo
 * calcula observações a partir dos dados realmente carregados (graus, regiões,
 * rotas, métricas globais) e devolve uma lista de objetos:
 *
 *   { tone: "primary" | "accent" | "neutral", title: string, text: string }
 *
 * Assim os insights acompanham os números exibidos e cobrem diferentes tipos
 * de dado (estrutura, geografia e rotas), não apenas o grafo em abstrato.
 */

const num = (x) => {
  const v = typeof x === "number" ? x : parseFloat(x);
  return Number.isFinite(v) ? v : 0;
};

const pct = (x, casas = 0) => `${(x * 100).toFixed(casas)}%`;

/** Insights gerais da rede (Visão Geral). */
export function insightsRede({ global, rankings, graus, regioes, rotas }) {
  const out = [];

  if (global && global.ordem) {
    const grauMedio = (2 * global.tamanho) / global.ordem;
    out.push({
      tone: "accent",
      title: "Malha enxuta, porém conectada",
      text: `São ${global.ordem} aeroportos ligados por ${global.tamanho} rotas. Cada aeroporto faz, em média, ${grauMedio.toFixed(
        1
      )} ligações diretas — densidade de ${pct(num(global.densidade), 1)}.`,
    });
  }

  if (rankings?.maior_grau && graus?.length) {
    const totalPontas = graus.reduce((s, g) => s + num(g.grau), 0);
    const hub = rankings.maior_grau;
    const share = totalPontas ? num(hub.grau) / totalPontas : 0;
    out.push({
      tone: "primary",
      title: `${hub.aeroporto} é o coração da rede`,
      text: `Com grau ${hub.grau}, ${hub.aeroporto} concentra ${pct(
        share
      )} de todas as pontas de rota. É o nó cuja remoção mais fragmentaria a malha.`,
    });
  }

  if (regioes?.length) {
    const maisAero = [...regioes].sort((a, b) => num(b.ordem) - num(a.ordem))[0];
    const maisDensa = [...regioes].sort(
      (a, b) => num(b.densidade) - num(a.densidade)
    )[0];
    out.push({
      tone: "neutral",
      title: "Distribuição regional desigual",
      text: `${maisAero.regiao} reúne o maior número de aeroportos (${maisAero.ordem}); já ${maisDensa.regiao} é a região internamente mais coesa (densidade ${num(
        maisDensa.densidade
      ).toFixed(2)}).`,
    });
  }

  if (rotas?.length) {
    const comCaminho = rotas.filter((r) => r.caminho && num(r.custo) > 0);
    if (comCaminho.length) {
      const maisCara = [...comCaminho].sort(
        (a, b) => num(b.custo) - num(a.custo)
      )[0];
      const saltos = maisCara.caminho.split("→").length - 1;
      const conex = Math.max(0, saltos - 1);
      out.push({
        tone: "accent",
        title: "Rota de maior custo analisada",
        text: `Entre as rotas de interesse, ${maisCara.origem} → ${maisCara.destino} é a mais cara (custo ${num(
          maisCara.custo
        ).toFixed(1)}), com ${saltos} salto${saltos !== 1 ? "s" : ""} e ${conex} ${
          conex === 1 ? "conexão" : "conexões"
        }.`,
      });
    }
  }

  return out;
}

/** Insights da distribuição de graus. */
export function insightsGraus(graus) {
  if (!graus?.length) return [];

  const degs = graus.map((g) => num(g.grau));
  const n = degs.length;
  const max = Math.max(...degs);
  const min = Math.min(...degs);
  const total = degs.reduce((a, b) => a + b, 0);
  const media = total / n;

  const ordenado = [...graus].sort((a, b) => num(b.grau) - num(a.grau));
  const top3 = ordenado.slice(0, 3);
  const top3Soma = top3.reduce((s, g) => s + num(g.grau), 0);
  const top3Share = total ? top3Soma / total : 0;
  const abaixoMedia = degs.filter((d) => d <= media).length;

  return [
    {
      tone: "accent",
      title: "Maioria com poucas conexões",
      text: `${pct(abaixoMedia / n)} dos aeroportos têm grau até ${Math.round(
        media
      )} (média ${media.toFixed(1)}). A cauda longa é sustentada por poucos hubs.`,
    },
    {
      tone: "primary",
      title: "Concentração nos hubs",
      text: `Apenas três aeroportos — ${top3
        .map((t) => t.aeroporto)
        .join(", ")} — somam ${pct(top3Share)} de todas as conexões diretas.`,
    },
    {
      tone: "neutral",
      title: "Amplitude do grau",
      text: `O grau varia de ${min} a ${max}. Essa distância entre o maior hub e o aeroporto típico é a marca do modelo hub-and-spoke.`,
    },
  ];
}

/** Insights das métricas regionais. */
export function insightsRegioes(regioes) {
  if (!regioes?.length) return [];

  const maisAero = [...regioes].sort((a, b) => num(b.ordem) - num(a.ordem))[0];
  const maisDensa = [...regioes].sort(
    (a, b) => num(b.densidade) - num(a.densidade)
  )[0];
  const maisRotas = [...regioes].sort((a, b) => num(b.tamanho) - num(a.tamanho))[0];

  return [
    {
      tone: "primary",
      title: `${maisAero.regiao} lidera em tamanho`,
      text: `É a região com mais aeroportos (${maisAero.ordem}); ${maisRotas.regiao} é a com mais rotas internas (${maisRotas.tamanho}).`,
    },
    {
      tone: "accent",
      title: `${maisDensa.regiao} é a mais coesa`,
      text: `Maior densidade interna (${num(maisDensa.densidade).toFixed(
        2
      )}): seus aeroportos estão fortemente interligados entre si.`,
    },
  ];
}
