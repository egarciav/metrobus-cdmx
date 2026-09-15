import { X, Bus, Gauge, Clock } from "lucide-react";

export default function BusDetailPopup({ bus, onClose, nearestStation }) {
  if (!bus) return null;

  const speedKmh = Math.round(bus.speed);
  const timeAgo = getTimeAgo(bus.timestamp);

  return (
    <div className="bus-detail-popup">
      <div className="bus-detail-header">
        <div className="bus-detail-title">
          <Bus size={20} style={{ color: bus.color }} />
          <h3>Metrobús Línea {bus.line}</h3>
        </div>
        <button className="close-btn" onClick={onClose}>
          <X size={18} />
        </button>
      </div>

      <div className="bus-detail-content">
        <div className="bus-detail-row">
          <div className="bus-detail-label">
            <Bus size={16} />
            <span>ID de Vehículo</span>
          </div>
          <div className="bus-detail-value">{bus.vehicleId || bus.id}</div>
        </div>

        {bus.tripId && (
          <div className="bus-detail-row">
            <div className="bus-detail-label">
              <Clock size={16} />
              <span>ID de Viaje</span>
            </div>
            <div className="bus-detail-value">{bus.tripId}</div>
          </div>
        )}

        <div className="bus-detail-row">
          <div className="bus-detail-label">
            <Gauge size={16} />
            <span>Velocidad</span>
          </div>
          <div className="bus-detail-value">
            {speedKmh} km/h
            {speedKmh < 5 && " (detenido)"}
            {speedKmh >= 5 && speedKmh < 15 && " (lento)"}
            {speedKmh >= 15 && " (en movimiento)"}
          </div>
        </div>

        {nearestStation && (
          <div className="bus-detail-row">
            <div className="bus-detail-label">
              <span>📍</span>
              <span>Cerca de</span>
            </div>
            <div className="bus-detail-value">{nearestStation.name}</div>
          </div>
        )}

        <div className="bus-detail-row">
          <div className="bus-detail-label">
            <Clock size={16} />
            <span>Última actualización</span>
          </div>
          <div className="bus-detail-value">{timeAgo}</div>
        </div>

        <div className="bus-coordinates">
          <small>
            📍 {bus.lat.toFixed(6)}, {bus.lng.toFixed(6)}
          </small>
        </div>
      </div>
    </div>
  );
}

function getTimeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  if (seconds < 10) return "Ahora mismo";
  if (seconds < 60) return `Hace ${seconds}s`;
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Hace ${minutes} min`;
  
  const hours = Math.floor(minutes / 60);
  return `Hace ${hours}h`;
}
