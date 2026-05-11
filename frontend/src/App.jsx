import { useState } from "react";
import PageGeral from "./pages/PageGeral.jsx";
import PageRotas from "./pages/PageRotas.jsx";
import PageVisualizacoes from "./pages/PageVisualizacoes.jsx";
import PageParte2 from "./pages/PageParte2.jsx";

const PAGES = [
  { id: "geral", label: "Visão Geral", icon: "🌐" },
  { id: "rotas", label: "Rotas", icon: "🛫" },
  { id: "visualizacoes", label: "Visualizações", icon: "📊" },
  { id: "parte2", label: "Parte 2 — SNAP", icon: "🔬" },
];

export default function App() {
  const [page, setPage] = useState("geral");

  const renderPage = () => {
    if (page === "geral") return <PageGeral />;
    if (page === "rotas") return <PageRotas />;
    if (page === "visualizacoes") return <PageVisualizacoes />;
    if (page === "parte2") return <PageParte2 />;
    return null;
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>Grafo de Aeroportos do Brasil</h2>
          <p>Teoria dos Grafos</p>
        </div>
        <nav className="sidebar-nav">
          {PAGES.map((p) => (
            <div
              key={p.id}
              className={`nav-item${page === p.id ? " active" : ""}`}
              onClick={() => setPage(p.id)}
            >
              <span className="nav-icon">{p.icon}</span>
              <span>{p.label}</span>
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">© 2025 — Teoria dos Grafos</div>
      </aside>
      <main className="main-content">{renderPage()}</main>
    </div>
  );
}
