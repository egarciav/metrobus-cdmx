import { Marker } from "react-map-gl/maplibre";
import { Bus } from "lucide-react";

export default function BusMarkers({ vehicles, onBusClick }) {
  if (!vehicles || vehicles.length === 0) {
    return null;
  }

  return (
    <>
      {vehicles.map((vehicle) => {
        const isMoving = vehicle.speed > 2;

        return (
          <Marker
            key={vehicle.id}
            longitude={vehicle.lng}
            latitude={vehicle.lat}
            anchor="center"
          >
            <div
              className="bus-marker"
              style={{
                cursor: "pointer",
              }}
              onClick={() => onBusClick && onBusClick(vehicle)}
            >
              <svg width="16" height="16" viewBox="0 0 16 16">
                <defs>
                  <filter id={`bus-shadow-${vehicle.id}`} x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="1" stdDeviation="1" floodOpacity="0.25" />
                  </filter>
                </defs>
                
                <circle
                  cx="8"
                  cy="8"
                  r="6"
                  fill="#e23d28"
                  stroke="#fff"
                  strokeWidth="2"
                  filter={`url(#bus-shadow-${vehicle.id})`}
                />
                
                {isMoving && (
                  <g className="bus-motion-indicator">
                    <circle cx="8" cy="8" r="6" fill="none" stroke="#e23d28" strokeWidth="1" opacity="0.5">
                      <animate attributeName="r" from="6" to="9" dur="1.5s" repeatCount="indefinite" />
                      <animate attributeName="opacity" from="0.5" to="0" dur="1.5s" repeatCount="indefinite" />
                    </circle>
                  </g>
                )}
              </svg>
            </div>
          </Marker>
        );
      })}
    </>
  );
}

