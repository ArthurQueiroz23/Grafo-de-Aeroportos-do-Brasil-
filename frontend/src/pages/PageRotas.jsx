import { useEffect, useState } from "react";

function parseCSV(text) {
  const [header, ...lines] = text.trim().split("\n");
  const keys = header.split(",");
  return lines.map((l) => {
    const vals = l.split(",");
    const obj = {};
    keys.forEach((k, i) => { obj[k.trim()] = vals[i] ? vals[i].trim() : ""; });
    return obj;
  });
}

export default function PageRotas() {
  const [rotas, setRotas] = useState([]);
  const [graus, setGraus] = useState([]);

  useEffect(() => {
    fetch("/out/distancias_rotas.csv").then((r) => r.text()).then((t) => setRotas(parseCSV(t)));
    fetch("/out/graus.csv").then((r) => r.text()).then((t) => setGraus(parseCSV(t)));
  }, []);

  const maxGrau = graus.length > 0 ? Math.max(...graus.map((g) => parseInt(g.grau))) : 1;

  return (
    <div>
      <div className="page-title">Rotas</div>
      <div className="page-subtitle">Caminhos mínimos calculados por Dijkstra e Bellman-Ford</div>

      <div className="section">
        <div className="section-title">Rotas calculadas</div>
        <table>
          <thead>
            <tr>
              <th>Origem</th>
              <th>Destino</th>
              <th>Custo</th>
              <th>Caminho</th>
              <th>Tipo</th>
            </tr>
          </thead>
          <tbody>
            {rotas.map((r, i) => {
              const isObrig = (r.origem === "MAO" && r.destino === "GRU") ||
                              (r.origem === "REC" && r.destino === "POA");
              return (
                <tr key={i}>
                  <td><span className="badge badge-blue">{r.origem}</span></td>
                  <td><span className="badge badge-blue">{r.destino}</span></td>
                  <td style={{ fontWeight: 700, color: "var(--blue)" }}>{r.custo}</td>
                  <td style={{ fontFamily: "monospace", fontSize: 12, color: "rgba(221,232,245,0.65)" }}>
                    {r.caminho}
                  </td>
                  <td>
                    {isObrig
                      ? <span className="badge badge-red">Obrigatória</span>
                      : <span className="badge" style={{ background: "rgba(255,255,255,0.05)", color: "var(--muted)" }}>Adicional</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="section">
        <div className="section-title">Graus dos aeroportos</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {graus.map((g, i) => {
            const grau = parseInt(g.grau);
            const pct = Math.min(100, (grau / maxGrau) * 100);
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ width: 36, fontSize: 12, color: "var(--text)", fontFamily: "monospace", fontWeight: 700 }}>
                  {g.aeroporto}
                </span>
                <div className="rank-bar-track">
                  <div
                    className="rank-bar-fill"
                    style={{ width: `${pct}%`, opacity: 0.6 + (pct / 100) * 0.4 }}
                  >
                    {grau}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
