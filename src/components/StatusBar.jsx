import { useState, useEffect, useCallback } from 'react';
import { startStatusPolling, stopStatusPolling, onStatusUpdate, getOfficialLinks } from '../services/metrobusStatus';
import { getFullContext } from '../services/contextData';

export default function StatusBar() {
  const [alerts, setAlerts] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [showLinks, setShowLinks] = useState(false);

  useEffect(() => {
    startStatusPolling(60000);
    const unsub = onStatusUpdate((newAlerts, ts) => {
      setAlerts(newAlerts);
      setLastUpdate(ts);
    });
    return () => {
      unsub();
      stopStatusPolling();
    };
  }, []);

  const context = getFullContext();
  const criticalAlerts = alerts.filter((a) => a.severity === 'critical' || a.severity === 'high');
  const hasIssues = criticalAlerts.length > 0;

  const formatTimestamp = useCallback((ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  }, []);

  return (
    <div className="status-bar-container">
      {/* Collapsed: status pill */}
      <button
        className={`status-pill ${hasIssues ? 'status-pill--alert' : 'status-pill--ok'}`}
        onClick={() => setExpanded(!expanded)}
      >
        <span className="status-pill-dot" style={{ background: hasIssues ? '#ef4444' : '#22c55e' }} />
        <span className="status-pill-text">
          {hasIssues ? `${criticalAlerts.length} alerta${criticalAlerts.length > 1 ? 's' : ''}` : 'Servicio normal'}
        </span>
        {context.weather && (
          <span className="status-pill-weather">{context.weather.weatherIcon} {context.weather.tempC}°C</span>
        )}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {/* Expanded panel */}
      {expanded && (
        <div className="status-panel">
          <div className="status-panel-header">
            <div>
              <h3 className="status-panel-title">Estado del servicio</h3>
              {lastUpdate && (
                <p className="status-panel-updated">Actualizado: {formatTimestamp(lastUpdate)}</p>
              )}
            </div>
            <button className="status-links-btn" onClick={() => setShowLinks(!showLinks)}>
              Fuentes oficiales
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points={showLinks ? "18 15 12 9 6 15" : "6 9 12 15 18 9"}/>
              </svg>
            </button>
          </div>

          {/* Official links */}
          {showLinks && (
            <div className="status-links">
              {getOfficialLinks().map((link, i) => (
                <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="status-link">
                  <span className="status-link-icon">{link.icon}</span>
                  <div>
                    <span className="status-link-name">{link.name}</span>
                    <span className="status-link-desc">{link.description}</span>
                  </div>
                </a>
              ))}
            </div>
          )}

          {/* Context factors active */}
          {context.activeFactors.length > 0 && (
            <div className="status-context">
              {context.activeFactors.map((f, i) => (
                <span key={i} className="status-context-chip">
                  {f.icon} {f.name}
                </span>
              ))}
            </div>
          )}

          {/* Alerts list */}
          <div className="status-alerts-list">
            {alerts.length === 0 && (
              <div className="status-empty">Sin alertas activas</div>
            )}
            {alerts.map((alert) => (
              <div key={alert.id} className="status-alert" style={{ borderLeftColor: alert.color }}>
                <div className="status-alert-header">
                  <span className="status-alert-icon">{alert.icon}</span>
                  <span className="status-alert-line">{alert.lineName}</span>
                  <span className="status-alert-severity" style={{ color: alert.color, background: `${alert.color}12`, borderColor: `${alert.color}25` }}>
                    {alert.label}
                  </span>
                  {alert.isPermanent && <span className="status-alert-permanent">Permanente</span>}
                  {alert.isLive && <span className="status-alert-live">EN VIVO</span>}
                </div>
                <p className="status-alert-message">{alert.message}</p>
                {alert.stationName && alert.isLive && (
                  <span className="status-alert-source">📡 {alert.source || 'Internet'}</span>
                )}
                <span className="status-alert-time">{formatTimestamp(alert.timestamp)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
