import { useState, useMemo } from 'react';
import { METROBUS_LINES } from '../data/metrobusLines';
import { calculateETA, getEnhancedCongestion } from '../services/etaCalculator';
import { formatTime, getTimeOfDayLabel } from '../utils/helpers';
import { getFullContext } from '../services/contextData';

export default function ETAPanel() {
  const [originId, setOriginId] = useState('');
  const [destId, setDestId] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const groupedStations = useMemo(() => {
    const groups = {};
    METROBUS_LINES.forEach((line) => {
      groups[line.id] = { name: line.name, color: line.color, stations: line.stations };
    });
    return groups;
  }, []);

  const etaResult = useMemo(() => {
    if (!originId || !destId || originId === destId) return null;
    return calculateETA(originId, destId);
  }, [originId, destId]);

  const infoVisible = showInfo;

  const enhanced = getEnhancedCongestion();
  const context = getFullContext();
  const congestionLabel = enhanced.factor > 1.3 ? 'Alta' : enhanced.factor > 1.0 ? 'Normal' : 'Baja';
  const congestionColor = enhanced.factor > 1.3 ? '#ef4444' : enhanced.factor > 1.0 ? '#eab308' : '#22c55e';

  return (
    <div className="eta-panel-container">
      {!expanded && (
        <button className="eta-toggle-btn" onClick={() => setExpanded(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          Calcular ruta y ETA
        </button>
      )}

      {expanded && (
        <div className="eta-panel">
          {/* Header */}
          <div className="eta-panel-header">
            <div className="eta-panel-header-left">
              <div className="eta-panel-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <h3 className="eta-panel-title">Calculadora ETA</h3>
              <button className="eta-info-btn" onClick={() => setShowInfo(!showInfo)} title="¿Cómo funciona?">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
              </button>
            </div>
            <button className="eta-panel-close" onClick={() => setExpanded(false)}>
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Info dialog */}
          {infoVisible && <ETAInfoDialog onClose={() => setShowInfo(false)} />}

          {/* Congestion + context factors */}
          <div className="eta-congestion-bar">
            <span className="eta-congestion-label">{getTimeOfDayLabel()}</span>
            <span className="eta-congestion-chip" style={{ color: congestionColor, background: `${congestionColor}15`, borderColor: `${congestionColor}30` }}>
              <span className="eta-congestion-dot" style={{ background: congestionColor }} />
              {congestionLabel} ({enhanced.factor}x)
            </span>
          </div>

          {/* Active context factors */}
          {context.activeFactors.length > 0 && (
            <div className="eta-context-factors">
              {context.activeFactors.map((f, i) => (
                <span key={i} className="eta-context-chip" style={{ borderColor: f.factor > 1 ? '#fde68a' : '#bbf7d0', background: f.factor > 1 ? '#fffbeb' : '#f0fdf4' }}>
                  {f.icon} {f.name}
                </span>
              ))}
              {context.weather && (
                <span className="eta-context-chip" style={{ borderColor: '#e0e7ff', background: '#eef2ff' }}>
                  {context.weather.weatherIcon} {context.weather.tempC}°C
                </span>
              )}
            </div>
          )}

          {/* Origin / Destination selectors */}
          <div className="eta-selectors">
            <div>
              <label className="eta-select-label">
                <span className="eta-select-dot" style={{ background: '#22c55e' }} />
                Origen
              </label>
              <select value={originId} onChange={(e) => setOriginId(e.target.value)} className="eta-select">
                <option value="">Seleccionar estación</option>
                {Object.entries(groupedStations).map(([lineId, group]) => (
                  <optgroup key={lineId} label={group.name}>
                    {group.stations.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div className="eta-arrow-separator">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>
              </svg>
            </div>

            <div>
              <label className="eta-select-label">
                <span className="eta-select-dot" style={{ background: '#ef4444' }} />
                Destino
              </label>
              <select value={destId} onChange={(e) => setDestId(e.target.value)} className="eta-select">
                <option value="">Seleccionar estación</option>
                {Object.entries(groupedStations).map(([lineId, group]) => (
                  <optgroup key={lineId} label={group.name}>
                    {group.stations.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>

          {/* ETA Result */}
          {etaResult && (
            <div className="eta-result">
              {etaResult.type === 'direct' ? (
                <DirectETAResult result={etaResult} />
              ) : (etaResult.type === 'transfer' || etaResult.type === 'multi-transfer') ? (
                <TransferETAResult result={etaResult} />
              ) : null}
            </div>
          )}

          {originId && destId && originId !== destId && !etaResult && (
            <div className="eta-no-route">
              No se encontró ruta entre estas estaciones.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ETAInfoDialog({ onClose }) {
  return (
    <div className="eta-info-dialog">
      <div className="eta-info-dialog-header">
        <span className="eta-info-dialog-title">¿Cómo funciona el ETA?</span>
        <button className="eta-info-dialog-close" onClick={onClose}>
          <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="eta-info-dialog-body">
        <p><strong>ETA (Estimated Time of Arrival)</strong> calcula el tiempo estimado de viaje entre dos estaciones del Metrobús CDMX.</p>
        <div className="eta-info-section">
          <h4>Capa 1 — Cálculo base</h4>
          <ul>
            <li><strong>Distancia Haversine</strong> entre estaciones (coordenadas GPS reales)</li>
            <li><strong>Velocidad promedio</strong> del Metrobús: 18 km/h (con tráfico)</li>
            <li><strong>Tiempo de parada</strong>: 30s por estación intermedia</li>
            <li><strong>Tiempo de transbordo</strong>: 4 min caminando entre andenes</li>
          </ul>
        </div>
        <div className="eta-info-section">
          <h4>Capa 2 — Factores de contexto</h4>
          <ul>
            <li><strong>Hora del día</strong>: pico matutino/vespertino (x1.4), valle (x1.0), nocturno (x0.8)</li>
            <li><strong>Día de la semana</strong>: lunes +10%, fines de semana -35%</li>
            <li><strong>Días festivos</strong>: Navidad -70%, 12 de Dic +40%</li>
            <li><strong>Vacaciones SEP</strong>: -20% demanda</li>
            <li><strong>Clima</strong>: lluvia +20% (tráfico más lento)</li>
            <li><strong>Eventos</strong>: partidos fútbol, Buen Fin, etc.</li>
            <li><strong>Manifestaciones</strong>: marchas en Zócalo, Reforma, etc.</li>
          </ul>
        </div>
        <div className="eta-info-section">
          <h4>Capa 3 — Predicción de retrasos</h4>
          <ul>
            <li><strong>Confiabilidad por línea</strong>: historial de cada corredor</li>
            <li><strong>Patrón horario</strong>: 7-9am y 5-8pm mayor probabilidad</li>
            <li><strong>Factores combinados</strong>: clima + hora + eventos + contingencia</li>
          </ul>
        </div>
        <div className="eta-info-section">
          <h4>Ruteo inteligente</h4>
          <ul>
            <li><strong>Dijkstra</strong> sobre el grafo de estaciones</li>
            <li>Encuentra la ruta con <strong>menos transbordos</strong></li>
            <li>Soporta hasta <strong>3 cambios de línea</strong></li>
            <li>Conecta <strong>cualquier</strong> par de estaciones en la red</li>
          </ul>
        </div>
        <p className="eta-info-note">Los tiempos son estimaciones basadas en datos históricos y condiciones actuales simuladas. El tiempo real puede variar por tráfico vehicular.</p>
      </div>
    </div>
  );
}

function DelayBadge({ prediction }) {
  if (!prediction) return null;
  return (
    <div className="eta-delay-badge" style={{ borderColor: `${prediction.riskColor}30`, background: `${prediction.riskColor}08` }}>
      <div className="eta-delay-badge-header">
        <span style={{ color: prediction.riskColor, fontWeight: 700, fontSize: 11 }}>
          Riesgo retraso: {prediction.riskLevel} ({prediction.maxProbability}%)
        </span>
        {prediction.estimatedExtraMinutes > 0 && (
          <span className="eta-delay-extra">+{prediction.estimatedExtraMinutes} min</span>
        )}
      </div>
      {prediction.reasons.length > 0 && (
        <div className="eta-delay-reasons">
          {prediction.reasons.slice(0, 3).map((r, i) => (
            <span key={i} className="eta-delay-reason">{r}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function DirectETAResult({ result }) {
  return (
    <div>
      <div className="eta-result-header">
        <span className="eta-result-type">Ruta directa</span>
        <span className="eta-result-line-badge" style={{ background: result.line.color }}>
          {result.line.name}
        </span>
      </div>
      <div className="eta-result-time-box eta-result-time-box--direct">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        <span className="eta-result-time">{formatTime(result.estimatedMinutes, result.estimatedSeconds)}</span>
      </div>
      <DelayBadge prediction={result.delayPrediction} />
      <div className="eta-result-stats">
        <div className="eta-stat-box">
          <p className="eta-stat-label">Distancia</p>
          <p className="eta-stat-value">{result.distanceKm} km</p>
        </div>
        <div className="eta-stat-box">
          <p className="eta-stat-label">Paradas</p>
          <p className="eta-stat-value">{result.stops}</p>
        </div>
      </div>
    </div>
  );
}

function TransferETAResult({ result }) {
  const isMulti = result.transferCount > 1;
  const transferLabel = isMulti
    ? `${result.transferCount} transbordos`
    : 'Con transbordo';
  const transferNames = result.transferStations
    ? result.transferStations.join(' → ')
    : result.transferStation || '';

  return (
    <div>
      <div className="eta-result-header">
        <span className="eta-result-type">{transferLabel}</span>
        <span className="eta-result-transfer-badge">{transferNames}</span>
      </div>
      <div className="eta-result-time-box eta-result-time-box--transfer">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        <span className="eta-result-time">{formatTime(result.totalMinutes, result.totalSeconds)}</span>
      </div>
      <div className="eta-result-legs">
        {result.legs.map((leg, i) => (
          <div key={i} className="eta-leg-row">
            <span className="eta-leg-dot" style={{ background: leg.line.color }} />
            <span className="eta-leg-name">{leg.line.name}</span>
            <span className="eta-leg-route">{leg.origin.name} → {leg.destination.name}</span>
          </div>
        ))}
      </div>
      <DelayBadge prediction={result.delayPrediction} />
      <div className="eta-result-stats">
        <div className="eta-stat-box">
          <p className="eta-stat-label">Distancia</p>
          <p className="eta-stat-value">{result.totalDistanceKm} km</p>
        </div>
        <div className="eta-stat-box">
          <p className="eta-stat-label">Paradas</p>
          <p className="eta-stat-value">{result.totalStops}</p>
        </div>
      </div>
    </div>
  );
}
