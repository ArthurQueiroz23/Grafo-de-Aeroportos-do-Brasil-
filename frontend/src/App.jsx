import { useState, useEffect } from "react";
import {
  Globe,
  BarChart2,
  Plane,
  ArrowLeftRight,
  Image,
  Microscope,
  Menu,
  X,
  PlaneTakeoff,
} from "lucide-react";
import PageGeral from "./pages/PageGeral.jsx";
import PageMetricas from "./pages/PageMetricas.jsx";
import PageCalculadora from "./pages/PageCalculadora.jsx";
import PageRotas from "./pages/PageRotas.jsx";
import PageVisualizacoes from "./pages/PageVisualizacoes.jsx";
import PageParte2 from "./pages/PageParte2.jsx";
import EmptyState from "./components/ui/EmptyState.jsx";
import { AppBackground } from "./components/ui/background-paths.jsx";

const PAGES = [
  { id: "geral", label: "Visão Geral", Icon: Globe },
  { id: "metricas", label: "Métricas", Icon: BarChart2 },
  { id: "calculadora", label: "Calculadora de Rotas", Icon: Plane },
  { id: "rotas", label: "Rotas", Icon: ArrowLeftRight },
  { id: "visualizacoes", label: "Visualizações", Icon: Image },
  { id: "parte2", label: "Parte 2 — SNAP", Icon: Microscope },
];

const PAGE_MAP = {
  geral: PageGeral,
  metricas: PageMetricas,
  calculadora: PageCalculadora,
  rotas: PageRotas,
  visualizacoes: PageVisualizacoes,
  parte2: PageParte2,
};

export default function App() {
  const [page, setPage] = useState("geral");
  const [menuOpen, setMenuOpen] = useState(false);

  const navigate = (id) => {
    setPage(id);
    setMenuOpen(false);
  };

  useEffect(() => {
    if (!menuOpen) return;
    const mq = window.matchMedia("(min-width: 769px)");
    const close = () => {
      if (mq.matches) setMenuOpen(false);
    };
    mq.addEventListener("change", close);
    return () => mq.removeEventListener("change", close);
  }, [menuOpen]);

  const ActivePage = PAGE_MAP[page];
  const current = PAGES.find((p) => p.id === page);

  return (
    <div className="layout">
      <AppBackground />

      <div
        className={`sidebar-backdrop${menuOpen ? " sidebar-backdrop--visible" : ""}`}
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
      />

      <aside className={`sidebar${menuOpen ? " sidebar--open" : ""}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="sidebar-logo" aria-hidden="true">
              <PlaneTakeoff size={20} strokeWidth={1.5} />
            </div>
            <div>
              <h2>
                Grafo de Aeroportos
                <br />
                do Brasil
              </h2>
              <p>Teoria dos Grafos</p>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Navegação principal">
          {PAGES.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`nav-item${page === p.id ? " active" : ""}`}
              onClick={() => navigate(p.id)}
              aria-current={page === p.id ? "page" : undefined}
            >
              <span className="nav-icon" aria-hidden="true">
                <p.Icon size={16} strokeWidth={1.75} />
              </span>
              <span>{p.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">© 2025 — Teoria dos Grafos</div>
      </aside>

      <div className="main-shell">
        <header className="mobile-header">
          <button
            type="button"
            className="menu-toggle"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <span className="mobile-header-title">{current?.label ?? "Grafo"}</span>
          <div style={{ width: 40 }} aria-hidden="true" />
        </header>

        <main className="main-content">
          <div key={page} className="page-content">
            {ActivePage ? (
              <ActivePage />
            ) : (
              <EmptyState
                icon={Globe}
                title="Página não encontrada"
                description="A seção que você tentou acessar não existe nesta aplicação."
                actionLabel="Ir para Visão Geral"
                onAction={() => navigate("geral")}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
