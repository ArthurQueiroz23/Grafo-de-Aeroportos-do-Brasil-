import { useState } from "react";

const IMAGES = [
  { src: "/out/viz_distribuicao_graus.png",   label: "Distribuição de graus",        cat: "Exploratória",  catColor: "#4da3ff" },
  { src: "/out/viz_bfs_camadas.png",          label: "Camadas BFS",                  cat: "Exploratória",  catColor: "#4da3ff" },
  { src: "/out/viz_ranking_graus.png",        label: "Ranking de conectividade",     cat: "Explanatória",  catColor: "#7c5cff" },
  { src: "/out/viz_regioes_metricas.png",     label: "Regiões — ordem e tamanho",    cat: "Explanatória",  catColor: "#7c5cff" },
  { src: "/out/viz_regioes_densidade.png",    label: "Regiões — densidade",          cat: "Explanatória",  catColor: "#7c5cff" },
  { src: "/out/viz_subgrafo_maior_grau.png",  label: "Subgrafo do maior grau (GRU)", cat: "Explanatória",  catColor: "#f5c542" },
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
        <div style={{ display: "flex", gap: 14, marginBottom: 16, flexWrap: "wrap" }}>
          {[
            { cat: "Exploratória",  color: "#4da3ff", desc: "O que os dados revelam por conta própria" },
            { cat: "Explanatória",  color: "#7c5cff", desc: "Confirma hipóteses e comunica insights" },
          ].map((c) => (
            <div key={c.cat} style={{
              display: "flex", alignItems: "center", gap: 8,
              background: `${c.color}12`,
              border: `1px solid ${c.color}30`,
              borderRadius: 8, padding: "6px 14px",
            }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: c.color, display: "inline-block", flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: c.color }}>{c.cat}</span>
              <span style={{ fontSize: 11, color: "var(--muted)" }}>— {c.desc}</span>
            </div>
          ))}
        </div>
        <div className="img-grid">
          {IMAGES.map((img) => (
            <div
              key={img.src}
              className="img-card"
              onClick={() => setModal(img)}
            >
              <img src={img.src} alt={img.label} loading="lazy" />
              <div className="img-card-label" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <span>{img.label}</span>
                <span style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: img.catColor,
                  background: `${img.catColor}18`,
                  border: `1px solid ${img.catColor}30`,
                  borderRadius: 10,
                  padding: "2px 8px",
                  whiteSpace: "nowrap",
                }}>
                  {img.cat}
                </span>
              </div>
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
