import { useState } from "react";

export default function PageAnalises() {
  const [loaded, setLoaded] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 56px)" }}>
      <div className="page-title">Análises Estatísticas</div>
      <div className="page-subtitle" style={{ marginBottom: 12 }}>
        Métricas por região, ego-redes e calculadora de rotas interativa (Streamlit)
      </div>
      <div style={{
        flex: 1,
        borderRadius: 10,
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.07)",
        position: "relative",
        background: "#0f1923",
      }}>
        {!loaded && (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexDirection: "column", gap: 12, color: "rgba(255,255,255,0.3)",
          }}>
            <div style={{ fontSize: 28 }}>📊</div>
            <div style={{ fontSize: 14 }}>Carregando Streamlit…</div>
            <div style={{ fontSize: 11 }}>Pode levar alguns segundos na primeira vez</div>
          </div>
        )}
        <iframe
          src="http://localhost:8501"
          title="Análises Streamlit"
          onLoad={() => setLoaded(true)}
          style={{
            width: "100%",
            height: "100%",
            border: "none",
            opacity: loaded ? 1 : 0,
            transition: "opacity 0.3s",
          }}
        />
      </div>
    </div>
  );
}
