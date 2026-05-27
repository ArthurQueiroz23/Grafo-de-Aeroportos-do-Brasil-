import { useState } from "react";
import { Globe2, Network } from "lucide-react";
import AppButton from "./ui/AppButton.jsx";
import GrafoVis from "./GrafoVis.jsx";
import GlobeRotas from "./GlobeRotas.jsx";

export default function GrafoVizPanel({
  airports,
  edges,
  mandatoryPairs,
  regionMap,
  grauMap,
}) {
  const [view, setView] = useState("graph");

  return (
    <div className="viz-panel">
      <div className="viz-mode-bar" role="tablist" aria-label="Modo de visualização">
        <AppButton
          type="button"
          role="tab"
          aria-selected={view === "graph"}
          variant={view === "graph" ? "primary" : "ghost"}
          size="sm"
          onClick={() => setView("graph")}
        >
          <Network size={15} aria-hidden="true" />
          Mapa 2D
        </AppButton>
        <AppButton
          type="button"
          role="tab"
          aria-selected={view === "globe"}
          variant={view === "globe" ? "primary" : "ghost"}
          size="sm"
          onClick={() => setView("globe")}
        >
          <Globe2 size={15} aria-hidden="true" />
          Globo 3D
        </AppButton>
      </div>

      <div className="viz-panel__content" role="tabpanel">
        {view === "globe" ? (
          <GlobeRotas
            solo
            airports={airports}
            edges={edges}
            mandatoryPairs={mandatoryPairs}
            regionMap={regionMap}
            grauMap={grauMap}
          />
        ) : (
          <GrafoVis
            airports={airports}
            edges={edges}
            mandatoryPairs={mandatoryPairs}
            regionMap={regionMap}
            grauMap={grauMap}
          />
        )}
      </div>
    </div>
  );
}
