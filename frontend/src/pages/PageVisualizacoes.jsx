import { useState } from "react";
import { ImageIcon, ExternalLink } from "lucide-react";
import PageHeader from "../components/ui/PageHeader.jsx";
import AppButton from "../components/ui/AppButton.jsx";
import AppBadge from "../components/ui/AppBadge.jsx";
import Modal from "../components/ui/Modal.jsx";
import ChartSequence from "../components/ChartSequence.jsx";

const IMAGES = [
  {
    src: "/out/viz_distribuicao_graus.png",
    label: "Distribuição de graus",
    cat: "Exploratória",
    variant: "accent",
    desc: "Quantos aeroportos possuem cada grau de conectividade.",
  },
  {
    src: "/out/viz_bfs_camadas.png",
    label: "Camadas BFS",
    cat: "Exploratória",
    variant: "accent",
    desc: "Quantos aeroportos estão a cada distância (em saltos) de GRU.",
  },
  {
    src: "/out/viz_ranking_graus.png",
    label: "Ranking de conectividade",
    cat: "Explanatória",
    variant: "primary",
    desc: "Os aeroportos com maior número de conexões diretas.",
  },
  {
    src: "/out/viz_regioes_metricas.png",
    label: "Regiões — ordem e tamanho",
    cat: "Explanatória",
    variant: "primary",
    desc: "Número de aeroportos e de rotas em cada região.",
  },
  {
    src: "/out/viz_regioes_densidade.png",
    label: "Regiões — densidade",
    cat: "Explanatória",
    variant: "primary",
    desc: "Quão conectada internamente é cada região.",
  },
  {
    src: "/out/viz_subgrafo_maior_grau.png",
    label: "Subgrafo do maior grau (GRU)",
    cat: "Explanatória",
    variant: "primary",
    desc: "As conexões diretas entre os principais hubs da malha.",
  },
];

const CAT_LEGEND = [
  {
    cat: "Exploratória",
    variant: "accent",
    desc: "O que os dados revelam por conta própria",
  },
  {
    cat: "Explanatória",
    variant: "primary",
    desc: "Confirma hipóteses e comunica insights",
  },
];

export default function PageVisualizacoes() {
  const [modal, setModal] = useState(null);
  const [showInteractive, setShowInteractive] = useState(false);

  return (
    <>
      <PageHeader
        eyebrow="Outputs da análise"
        title="Visualizações"
        subtitle="Gráficos exploratórios e explicativos gerados pela análise, além do grafo interativo PyVis."
      />

      <section className="section">
        <h2 className="section-title">
          <ImageIcon size={18} strokeWidth={1.75} aria-hidden="true" />
          Grafo interativo (PyVis)
        </h2>
        <div
          style={{
            display: "flex",
            gap: "var(--space-3)",
            marginBottom: "var(--space-5)",
            flexWrap: "wrap",
          }}
        >
          <AppButton
            variant="primary"
            onClick={() => setShowInteractive((v) => !v)}
          >
            {showInteractive ? "Ocultar grafo" : "Abrir grafo interativo"}
          </AppButton>
          <AppButton
            as="a"
            variant="secondary"
            href="/out/grafo_interativo.html"
            target="_blank"
            rel="noopener noreferrer"
          >
            Nova aba
            <ExternalLink size={14} aria-hidden="true" />
          </AppButton>
          <AppButton
            as="a"
            variant="ghost"
            href="/out/arvore_percurso.html"
            target="_blank"
            rel="noopener noreferrer"
          >
            Árvore DFS
            <ExternalLink size={14} aria-hidden="true" />
          </AppButton>
        </div>
        {showInteractive && (
          <div className="iframe-wrap">
            <iframe src="/out/grafo_interativo.html" title="Grafo interativo PyVis" />
          </div>
        )}
      </section>

      <section className="section">
        <h2 className="section-title">Gráficos estatísticos</h2>
        <p className="section-lead">
          Cada gráfico abaixo é uma <strong>análise independente</strong> — eles
          não formam uma sequência contínua nem dependem uns dos outros. A
          numeração serve apenas para referência.
        </p>
        <div className="legend-row" style={{ marginBottom: "var(--space-5)" }}>
          {CAT_LEGEND.map((c) => (
            <span key={c.cat} style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
              <AppBadge variant={c.variant}>{c.cat}</AppBadge>
              <span style={{ fontSize: "var(--text-caption)", color: "var(--color-text-muted)" }}>
                {c.desc}
              </span>
            </span>
          ))}
        </div>

        <ChartSequence images={IMAGES} onOpen={setModal} />
      </section>

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        caption={modal ? `${modal.label} — pressione Esc ou clique fora para fechar` : ""}
      >
        {modal && (
          <img src={modal.src} alt={modal.label} />
        )}
      </Modal>
    </>
  );
}
