import { useMemo, useState, useCallback } from "react";
import { Globe2, X } from "lucide-react";
import { GlobeCdn } from "@/components/ui/cobe-globe-cdn";
import {
  buildGlobeMarkers,
  buildGlobeArcs,
  filterEdgesByAirport,
} from "@/lib/globeData";
import { GRAPH } from "@/constants/theme";
import AppButton from "./ui/AppButton.jsx";

export default function GlobeRotas({
  airports,
  edges,
  mandatoryPairs = [],
  pathPairs = [],
  regionMap = {},
  grauMap = {},
  solo = false,
}) {
  const [selectedId, setSelectedId] = useState(null);
  const [searchVal, setSearchVal] = useState("");

  const iataList = useMemo(() => airports.map((a) => a.id).sort(), [airports]);

  const { edges: visibleEdges, visibleIds, routeCount } = useMemo(
    () => filterEdgesByAirport(edges, selectedId),
    [edges, selectedId]
  );

  const markers = useMemo(
    () =>
      buildGlobeMarkers(airports, regionMap, grauMap, {
        selectedId,
        visibleIds,
      }),
    [airports, regionMap, grauMap, selectedId, visibleIds]
  );

  const arcs = useMemo(
    () => buildGlobeArcs(visibleEdges, mandatoryPairs, pathPairs),
    [visibleEdges, mandatoryPairs, pathPairs]
  );

  const applySelection = useCallback((id) => {
    setSelectedId((prev) => (prev === id ? null : id));
    if (id) setSearchVal(id);
    else setSearchVal("");
  }, []);

  const handleSearch = () => {
    const val = searchVal.trim().toUpperCase();
    if (!val || !iataList.includes(val)) return;
    setSelectedId(val);
  };

  const handleSelectChange = (e) => {
    const val = e.target.value;
    if (!val) {
      setSelectedId(null);
      setSearchVal("");
      return;
    }
    setSelectedId(val);
    setSearchVal(val);
  };

  return (
    <div className={`globe-rotas${solo ? " globe-rotas--solo" : ""}`}>
      <div className="globe-rotas__header">
        <Globe2 size={16} strokeWidth={1.75} aria-hidden="true" />
        <span>Malha no globo — Brasil</span>
      </div>

      <div className="graph-controls globe-rotas__controls">
        <div className="form-field" style={{ flex: "1 1 140px", maxWidth: 200 }}>
          <label className="form-label" htmlFor="globe-search">
            Aeroporto (IATA)
          </label>
          <input
            id="globe-search"
            className="ctrl-input"
            list="globe-iata-list"
            placeholder="ex: GRU"
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <datalist id="globe-iata-list">
            {iataList.map((id) => (
              <option key={id} value={id} />
            ))}
          </datalist>
        </div>

        <div className="form-field" style={{ minWidth: 140 }}>
          <label className="form-label" htmlFor="globe-select">
            Selecionar
          </label>
          <select
            id="globe-select"
            className="ctrl-input ctrl-select"
            value={selectedId ?? ""}
            onChange={handleSelectChange}
          >
            <option value="">Todos os aeroportos</option>
            {iataList.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </div>

        <AppButton variant="primary" size="sm" onClick={handleSearch}>
          Buscar
        </AppButton>

        {selectedId && (
          <>
            <span className="graph-selection-badge">
              {selectedId}
              <span className="graph-selection-badge__count">
                {routeCount} rotas
              </span>
            </span>
            <AppButton
              variant="ghost"
              size="sm"
              onClick={() => applySelection(null)}
              aria-label="Limpar seleção"
            >
              <X size={14} aria-hidden="true" />
              Limpar
            </AppButton>
          </>
        )}
      </div>

      <div className="globe-rotas__stage">
        <div className="globe-rotas__canvas">
          <p className="graph-hint globe-rotas__hint-bar">
            {selectedId
              ? `${selectedId}: ${routeCount} rotas — clique no IATA ou Limpar`
              : "Clique no IATA para filtrar rotas · Arraste para girar"}
          </p>

          <GlobeCdn
            markers={markers}
            arcs={arcs}
            dark
            showLabels
            selectedMarkerId={selectedId}
            onMarkerSelect={applySelection}
          />

          <aside
            className="graph-legend-card globe-rotas__legend"
            aria-label="Legenda das rotas"
          >
            <div className="graph-legend-title">Legenda</div>
            <div className="graph-legend-items globe-rotas__legend-grid">
              <div className="graph-legend-item">
                <span
                  className="graph-legend-swatch graph-legend-swatch--line"
                  style={{ background: GRAPH.mandatory }}
                />
                Obrigatórias
              </div>
              <div className="graph-legend-item">
                <span
                  className="graph-legend-swatch graph-legend-swatch--line graph-legend-swatch--path"
                  style={{ background: GRAPH.path }}
                />
                Destacado
              </div>
              <div className="graph-legend-item">
                <span
                  className="graph-legend-swatch graph-legend-swatch--line"
                  style={{ background: GRAPH.hub }}
                />
                Hub
              </div>
              <div className="graph-legend-item">
                <span
                  className="graph-legend-swatch graph-legend-swatch--line"
                  style={{ background: "rgba(150, 170, 195, 0.85)" }}
                />
                Regional
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
