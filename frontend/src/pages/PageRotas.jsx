import { useEffect, useState } from "react";
import { GitBranch } from "lucide-react";
import PageHeader from "../components/ui/PageHeader.jsx";
import Badge from "../components/ui/Badge.jsx";
import { LoadingCenter } from "../components/ui/LoadingState.jsx";

function parseCSV(text) {
  const [header, ...lines] = text.trim().split("\n");
  const keys = header.split(",");
  return lines.map((l) => {
    const vals = l.split(",");
    const obj = {};
    keys.forEach((k, i) => {
      obj[k.trim()] = vals[i] ? vals[i].trim() : "";
    });
    return obj;
  });
}

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

  const maxGrau =
    graus.length > 0 ? Math.max(...graus.map((g) => parseInt(g.grau))) : 1;

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
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Origem</th>
                  <th>Destino</th>
                  <th className="num">Custo</th>
                  <th>Caminho</th>
                  <th>Tipo</th>
                </tr>
              </thead>
              <tbody>
                {rotas.map((r, i) => {
                  const isObrig =
                    (r.origem === "MAO" && r.destino === "GRU") ||
                    (r.origem === "REC" && r.destino === "POA");
                  return (
                    <tr key={i}>
                      <td>
                        <Badge variant="primary">{r.origem}</Badge>
                      </td>
                      <td>
                        <Badge variant="primary">{r.destino}</Badge>
                      </td>
                      <td
                        className="num"
                        style={{ fontWeight: 600, color: "var(--color-primary)" }}
                      >
                        {r.custo}
                      </td>
                      <td className="mono" style={{ color: "var(--color-text-muted)" }}>
                        {r.caminho}
                      </td>
                      <td>
                        {isObrig ? (
                          <Badge variant="danger">Obrigatória</Badge>
                        ) : (
                          <Badge variant="neutral">Adicional</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="section">
        <h2 className="section-title">Graus dos aeroportos</h2>
        {graus.length === 0 ? (
          <LoadingCenter />
        ) : (
          <div className="rank-list">
            {graus.map((g, i) => {
              const grau = parseInt(g.grau);
              const pct = Math.min(100, (grau / maxGrau) * 100);
              return (
                <div key={i} className="rank-row">
                  <span className="rank-code rank-code--top">{g.aeroporto}</span>
                  <div className="rank-bar-track">
                    <div
                      className="rank-bar-fill"
                      style={{
                        width: `${pct}%`,
                        opacity: 0.6 + (pct / 100) * 0.4,
                      }}
                    >
                      {grau}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
