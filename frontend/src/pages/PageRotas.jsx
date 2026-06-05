import { useEffect, useState } from "react";
import { GitBranch } from "lucide-react";
import PageHeader from "../components/ui/PageHeader.jsx";
import { LoadingCenter } from "../components/ui/LoadingState.jsx";
import { InteractiveListTable } from "../components/ui/interactive-logs-table-shadcnui.jsx";
import { mapRotas, mapGrausRanking } from "../lib/interactive-list-adapters.js";
import { parseCSV } from "../lib/graphUtils.js";

export default function PageRotas() {
  const [rotas, setRotas] = useState([]);
  const [graus, setGraus] = useState([]);

  useEffect(() => {
    fetch("/out/distancias_rotas.csv")
      .then((r) => r.text())
      .then((t) => setRotas(parseCSV(t)));
    fetch("/out/graus.csv")
      .then((r) => r.text())
      .then((t) => setGraus(parseCSV(t)));
  }, []);

  return (
    <>
      <PageHeader
        eyebrow="Caminhos mínimos"
        title="Rotas"
        subtitle="Caminhos mínimos calculados por Dijkstra e Bellman-Ford, com ranking de conectividade por grau."
      />

      <section className="section">
        <h2 className="section-title">
          <GitBranch size={18} strokeWidth={1.75} aria-hidden="true" />
          Rotas calculadas
        </h2>
        {rotas.length === 0 ? (
          <LoadingCenter label="Carregando rotas…" />
        ) : (
          <InteractiveListTable
            title="Rotas calculadas"
            items={mapRotas(rotas)}
            searchPlaceholder="Buscar origem, destino ou caminho…"
            filterLabels={{
              level: "Tipo",
              service: "Origem",
              status: "Destino",
            }}
          />
        )}
      </section>

      <section className="section">
        <h2 className="section-title">Graus dos aeroportos</h2>
        {graus.length === 0 ? (
          <LoadingCenter />
        ) : (
          <InteractiveListTable
            title="Graus dos aeroportos"
            items={mapGrausRanking(graus)}
            searchPlaceholder="Buscar aeroporto ou grau…"
            filterLabels={{
              level: "Faixa de grau",
              service: "Aeroporto",
            }}
          />
        )}
      </section>
    </>
  );
}
