import { useState } from "react";

const IMAGES = [
  { src: "/out/viz_exploratoria_distribuicao_graus.png",      label: "Distribuição de graus" },
  { src: "/out/viz_exploratoria_bfs_camadas.png",             label: "Camadas BFS" },
  { src: "/out/viz_explanatoria_ranking_conectividade.png",   label: "Ranking de conectividade" },
  { src: "/out/viz_explanatoria_regioes_ordem_tamanho.png",   label: "Regiões — ordem e tamanho" },
  { src: "/out/viz_explanatoria_regioes_densidade.png",       label: "Regiões — densidade" },
  { src: "/out/viz_subgrafo_maior_grau.png",                  label: "Subgrafo do maior grau (GRU)" },
  { src: "/out/arvore_percurso.png",                          label: "Árvore de percurso DFS" },
];

export default function PageVisualizacoes() {
  const [modal, setModal] = useState(null);
  const [showInteractive, setShowInteractive] = useState(false);

  return (
    <div>
      <div className="page-title">Visualizações</div>
      <div className="page-subtitle">Gráficos exploratórios e explicativos gerados pela análise</div>

      <div className="section">
        <div className="section-title">Grafo interativo (PyVis)</div>
        <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
          <button className="btn" onClick={() => setShowInteractive((v) => !v)}>
            {showInteractive ? "Ocultar grafo" : "Abrir grafo interativo"}
          </button>
          <a
            href="/out/grafo_interativo.html"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline"
          >
            Nova aba →
          </a>
          <a
            href="/out/arvore_percurso.html"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline"
          >
            Árvore DFS →
          </a>
        </div>
        {showInteractive && (
          <div className="iframe-wrap" style={{ height: 520 }}>
            <iframe src="/out/grafo_interativo.html" title="Grafo interativo" />
          </div>
        )}
      </div>

      <div className="section">
        <div className="section-title">Gráficos estatísticos</div>
        <div className="img-grid">
          {IMAGES.map((img) => (
            <div
              key={img.src}
              className="img-card"
              onClick={() => setModal(img)}
            >
              <img src={img.src} alt={img.label} loading="lazy" />
              <div className="img-card-label">{img.label}</div>
            </div>
          ))}
        </div>
      </div>

      {modal && (
        <div
          onClick={() => setModal(null)}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(4, 14, 25, 0.92)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000, cursor: "zoom-out",
            backdropFilter: "blur(4px)",
          }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: "90vw", maxHeight: "90vh" }}>
            <img
              src={modal.src}
              alt={modal.label}
              style={{ maxWidth: "100%", maxHeight: "85vh", borderRadius: 10, boxShadow: "0 20px 60px rgba(0,0,0,0.7)" }}
            />
            <div style={{ color: "var(--muted)", textAlign: "center", marginTop: 10, fontSize: 13 }}>
              {modal.label} — clique fora para fechar
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
