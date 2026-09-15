import { useState, useEffect } from 'react';
import { Radio, Info } from 'lucide-react';

export default function BusTrackingToggle({ onToggle }) {
  const [isActive, setIsActive] = useState(() => {
    const saved = localStorage.getItem('busTrackingActive');
    return saved !== null ? JSON.parse(saved) : false; // default: apagado (opt-in)
  });
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  useEffect(() => {
    localStorage.setItem('busTrackingActive', JSON.stringify(isActive));
    onToggle(isActive);
  }, [isActive, onToggle]);

  const handleToggle = () => {
    setIsActive(!isActive);
  };

  return (
    <div className="bus-tracking-toggle">
      <button
        className={`bus-toggle-btn ${isActive ? 'active' : ''}`}
        onClick={handleToggle}
        title={isActive ? 'Desactivar seguimiento GPS' : 'Activar seguimiento GPS'}
      >
        <Radio size={18} />
        <span className="bus-toggle-label">GPS Unidades MB</span>
        <div className={`bus-toggle-switch ${isActive ? 'on' : 'off'}`}>
          <div className="bus-toggle-slider" />
        </div>
      </button>
      
      <button
        className="bus-info-btn"
        onClick={() => setShowDisclaimer(!showDisclaimer)}
        title="Información sobre datos GPS"
      >
        <Info size={16} />
      </button>

      {showDisclaimer && (
        <div className="bus-disclaimer">
          <div className="bus-disclaimer-header">
            <Info size={16} />
            <strong>Datos GPS en Tiempo Real</strong>
          </div>
          <p>
            Los datos provienen de la <strong>Plataforma de Datos Abiertos de CDMX</strong> 
            y se actualizan cada 15 segundos.
          </p>
          <p className="bus-disclaimer-warning">
            ⚠️ Pueden presentarse fallas, inconsistencias o retrasos en la información GPS 
            debido a la naturaleza de los datos en tiempo real.
          </p>
        </div>
      )}
    </div>
  );
}
