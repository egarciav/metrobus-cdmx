import { useState } from 'react';

const STORAGE_KEY = 'cdmx-metrobus-disclaimer-seen';

export default function Disclaimer() {
  const [visible, setVisible] = useState(() => !localStorage.getItem(STORAGE_KEY));

  if (!visible) return null;

  const handleAccept = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  };

  return (
    <div className="disclaimer-overlay">
      <div className="disclaimer-panel">
        <div className="disclaimer-icon">🚍</div>
        <h2 className="disclaimer-title">Metrobús Monitor</h2>
        <p className="disclaimer-text">
          Los tiempos de viaje, ocupación y alertas mostrados son <strong>estimaciones aproximadas</strong> generadas 
          por un algoritmo basado en datos históricos, distancias GPS y patrones de demanda simulados.
        </p>
        <p className="disclaimer-text">
          <strong>No representan condiciones en tiempo real.</strong> Para información oficial, 
          consulta las redes del <strong>@MetrobusCDMX</strong> y <strong>metrobus.cdmx.gob.mx</strong>.
        </p>
        <button className="disclaimer-btn" onClick={handleAccept}>
          Entendido
        </button>
      </div>
    </div>
  );
}
