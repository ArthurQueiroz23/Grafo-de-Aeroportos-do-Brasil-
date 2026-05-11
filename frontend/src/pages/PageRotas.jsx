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
                  <td style={{ fontWeight: 600, color: "#4e9af1" }}>{r.custo}</td>
                  <td style={{ fontFamily: "monospace", fontSize: 12, color: "#a0b4cc" }}>
                    {r.caminho}
                  </td>
                  <td>
                    {isObrig
                      ? <span className="badge badge-red">Obrigatória</span>
                      : <span className="badge" style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.5)" }}>Adicional</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="section">
        <div className="section-title">Graus dos aeroportos</div>
        <table>
          <thead>
            <tr>
              <th>Aeroporto</th>
              <th>Grau</th>
              <th>Relevância</th>
            </tr>
          </thead>
          <tbody>
            {graus.map((g, i) => {
              const grau = parseInt(g.grau);
              return (
                <tr key={i}>
                  <td><span className="badge badge-blue">{g.aeroporto}</span></td>
                  <td style={{ fontWeight: 600 }}>{grau}</td>
                  <td>
                    <div style={{
                      borderRadius: 4,
                      height: 8,
                      width: `${Math.min(100, (grau / 6) * 100)}%`,
                      minWidth: 8,
                      background: `rgba(78,154,241,${0.2 + (grau / 6) * 0.8})`,
                    }} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
