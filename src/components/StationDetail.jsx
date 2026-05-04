import { useMemo } from "react";
import { simulateOccupancy, getOccupancyLabel, formatTime } from "../utils/helpers";
import { calculateDirectETA } from "../services/etaCalculator";
import { METROBUS_LINES } from "../data/metrobusLines";

export default function StationDetail({ station, onClose, closedStations = {} }) {
  const nearbyETAs = useMemo(() => {
    if (!station) return [];
    const stationName = station.name;
    if (!stationName) return [];
    const results = [];

    for (const line of METROBUS_LINES) {
      const idx = line.stations.findIndex((s) => {
        const baseName = s.name.replace(/\s*\(L[0-9]+\)\s*$/, '').trim();
        return baseName === stationName || s.name === stationName || s.id === station.stationId;
      });
      if (idx === -1) continue;

      const stId = line.stations[idx].id;
      if (idx < line.stations.length - 1) {
        const next = line.stations[idx + 1];
        const eta = calculateDirectETA(stId, next.id);
        if (eta) {
          const cleanName = next.name.replace(/\s*\(L[0-9]+\)\s*$/, '').trim();
          results.push({ lineLabel: line.name, lineColor: line.color, direction: line.terminals?.[1] || '', nextStation: cleanName, minutes: eta.estimatedMinutes, seconds: eta.estimatedSeconds });
        }
      }
      if (idx > 0) {
        const prev = line.stations[idx - 1];
        const eta = calculateDirectETA(stId, prev.id);
        if (eta) {
          const cleanName = prev.name.replace(/\s*\(L[0-9]+\)\s*$/, '').trim();
          results.push({ lineLabel: line.name, lineColor: line.color, direction: line.terminals?.[0] || '', nextStation: cleanName, minutes: eta.estimatedMinutes, seconds: eta.estimatedSeconds });
        }
      }
    }
    return results;
  }, [station]);

  if (!station) return null;

  const color = station.color || "#888";
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${station.lat},${station.lng}`;
  const mbUrl = `https://www.metrobus.cdmx.gob.mx/`;

  const occupancy = simulateOccupancy(station.name);
  const occInfo = getOccupancyLabel(occupancy);
  const closureAlert = closedStations[station.name] || closedStations[station.stationId] || null;

  return (
    <div className="detail-overlay">
      <div className="detail-panel">
        {/* Header */}
        <div className="detail-header" style={{ background: closureAlert ? 'linear-gradient(135deg, #991b1b, #dc2626)' : `linear-gradient(135deg, ${color}, ${color}dd)` }}>
          <div className="detail-handle" />
          <button onClick={onClose} className="detail-close" aria-label="Cerrar">
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="detail-badges">
            {station.lines ? station.lines.map((l) => (
              <span key={l.lineId} className="detail-badge" style={{ backgroundColor: "rgba(255,255,255,0.25)" }}>
                {l.lineLabel}
              </span>
            )) : (
              <span className="detail-badge" style={{ backgroundColor: "rgba(255,255,255,0.25)" }}>
                {station.lineLabel}
              </span>
            )}
            {station.isTransfer && (
              <span className="detail-badge" style={{ backgroundColor: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.4)" }}>
                Transbordo
              </span>
            )}
          </div>

          <h2 className="detail-title">{station.name}</h2>
          <p className="detail-subtitle">{station.lineLabel}</p>
        </div>

        {/* Body */}
        <div className="detail-body-wrapper">
          <div className="detail-body">
            {/* Closure banner */}
            {closureAlert && (
              <div className="closure-banner">
                <div className="closure-banner-icon">🚫</div>
                <div className="closure-banner-content">
                  <strong>Estación cerrada</strong>
                  <p>{closureAlert.message}</p>
                  {closureAlert.source && (
                    <span className="closure-banner-source">Fuente: {closureAlert.source}</span>
                  )}
                </div>
              </div>
            )}

            {/* Occupancy bar */}
            <div className="detail-section">
              <div className="detail-section-header">
                <span>👥 Ocupación estimada</span>
                <span style={{ color: occInfo.color, fontWeight: 700 }}>{occInfo.label}</span>
              </div>
              <div className="occupancy-bar">
                <div className="occupancy-fill" style={{ width: `${occupancy * 100}%`, background: `linear-gradient(90deg, ${occInfo.color}, ${occInfo.color}cc)` }} />
              </div>
              <div className="occupancy-labels">
                <span>Baja</span>
                <span>Moderada</span>
                <span>Alta</span>
                <span>Muy alta</span>
              </div>
            </div>

            {/* ETA to adjacent stations */}
            {nearbyETAs.length > 0 && (
              <div className="detail-section">
                <div className="detail-section-header">
                  <span>🚍 ETA siguiente estación</span>
                </div>
                {nearbyETAs.map((eta, i) => (
                  <div key={i} className="eta-row">
                    <div className="eta-row-info">
                      <span className="eta-row-line-dot" style={{ background: eta.lineColor }} />
                      <div>
                        <p className="eta-row-station">{eta.nextStation}</p>
                        <p className="eta-row-dir">{eta.lineLabel} — {eta.direction}</p>
                      </div>
                    </div>
                    <span className="eta-row-time">
                      {formatTime(eta.minutes, eta.seconds)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Transfer lines */}
            {station.lines && station.lines.length > 1 && (
              <InfoRow
                icon="🔄"
                label="Líneas de transbordo"
                value={station.lines.map(l => l.lineLabel).join(", ")}
              />
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="detail-actions">
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ backgroundColor: color }}>
            🗺️ Cómo llegar
          </a>
          <a href={mbUrl} target="_blank" rel="noopener noreferrer" className="btn-outline" style={{ borderColor: color, color }}>
            🌐 Más info
          </a>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <div className="info-row">
      <span className="info-icon">{icon}</span>
      <div>
        <p className="info-label">{label}</p>
        <p className="info-value">{value}</p>
      </div>
    </div>
  );
}
