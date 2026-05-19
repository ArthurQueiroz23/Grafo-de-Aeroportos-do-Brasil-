import { useState } from "react";
import { Globe, BarChart2, Plane, ArrowLeftRight, Image, Microscope } from "lucide-react";
import PageGeral from "./pages/PageGeral.jsx";
import PageMetricas from "./pages/PageMetricas.jsx";
import PageCalculadora from "./pages/PageCalculadora.jsx";
import PageRotas from "./pages/PageRotas.jsx";
import PageVisualizacoes from "./pages/PageVisualizacoes.jsx";
import PageParte2 from "./pages/PageParte2.jsx";

const PAGES = [
  { id: "geral",         label: "Visão Geral",          Icon: Globe },
  { id: "metricas",      label: "Métricas",              Icon: BarChart2 },
  { id: "calculadora",   label: "Calculadora de Rotas",  Icon: Plane },
  { id: "rotas",         label: "Rotas",                 Icon: ArrowLeftRight },
  { id: "visualizacoes", label: "Visualizações",         Icon: Image },
  { id: "parte2",        label: "Parte 2 — SNAP",        Icon: Microscope },
];

export default function App() {
  const [page, setPage] = useState("geral");

  const renderPage = () => {
    if (page === "geral")         return <PageGeral />;
    if (page === "metricas")      return <PageMetricas />;
    if (page === "calculadora")   return <PageCalculadora />;
    if (page === "rotas")         return <PageRotas />;
    if (page === "visualizacoes") return <PageVisualizacoes />;
    if (page === "parte2")        return <PageParte2 />;
    return null;
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo-icon">✈</div>
          <h2>Grafo de Aeroportos<br />do Brasil</h2>
          <p>Teoria dos Grafos</p>
        </div>
        <nav className="sidebar-nav">
          {PAGES.map((p) => (
            <div
              key={p.id}
              className={`nav-item${page === p.id ? " active" : ""}`}
              onClick={() => setPage(p.id)}
            >
              <span className="nav-icon"><p.Icon size={15} /></span>
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
