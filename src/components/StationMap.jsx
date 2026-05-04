import { useCallback, useEffect, useRef, useState } from "react";
import Map, {
  Marker,
  NavigationControl,
  GeolocateControl,
  ScaleControl,
} from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { simulateOccupancy, getOccupancyLabel } from "../utils/helpers";

const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

const INITIAL_VIEW = {
  latitude: 19.4326,
  longitude: -99.133,
  zoom: 11.5,
  pitch: 45,
  bearing: -15,
};

export default function StationMap({ stations, selected, onSelect, onDeselect, closedStations = {} }) {
  const mapRef = useRef(null);
  const [hoveredId, setHoveredId] = useState(null);

  const flyTo = useCallback((lat, lng) => {
    const map = mapRef.current;
    if (!map) return;

    const isMobile = window.innerWidth < 768;
    const padding = isMobile
      ? { top: 50, right: 20, bottom: window.innerHeight * 0.5 + 50, left: 20 }
      : { top: 20, right: 20, bottom: 20, left: 20 };

    map.flyTo({
      center: [lng, lat],
      zoom: isMobile ? 15 : 16,
      pitch: isMobile ? 45 : 60,
      bearing: -20,
      duration: 1400,
      essential: true,
      padding,
    });
  }, []);

  useEffect(() => {
    if (selected) {
      flyTo(selected.lat, selected.lng);
    }
  }, [selected, flyTo]);

  const handleMarkerClick = useCallback(
    (station, e) => {
      e.stopPropagation();
      onSelect(station);
      flyTo(station.lat, station.lng);
    },
    [onSelect, flyTo],
  );

  const handleMapClick = useCallback(
    (e) => {
      const target = e.originalEvent.target;
      if (!target.closest(".station-pin")) {
        onDeselect();
      }
    },
    [onDeselect],
  );

  const handleLoad = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    const layers = map.getStyle().layers || [];
    let firstSymbol;
    for (const l of layers) {
      if (l.type === "symbol" && l.layout) {
        firstSymbol = l.id;
        break;
      }
    }

    if (!map.getLayer("3d-buildings")) {
      map.addLayer(
        {
          id: "3d-buildings",
          source: "openmaptiles",
          "source-layer": "building",
          type: "fill-extrusion",
          minzoom: 14,
          paint: {
            "fill-extrusion-color": [
              "interpolate",
              ["linear"],
              ["get", "render_height"],
              0, "#dce6f2",
              50, "#a8bdd9",
              200, "#7a9cc6",
            ],
            "fill-extrusion-height": ["get", "render_height"],
            "fill-extrusion-base": ["get", "render_min_height"],
            "fill-extrusion-opacity": 0.7,
          },
        },
        firstSymbol,
      );
    }
  }, []);

  return (
    <Map
      ref={mapRef}
      initialViewState={INITIAL_VIEW}
      style={{ width: "100%", height: "100%" }}
      mapStyle={MAP_STYLE}
      onClick={handleMapClick}
      onLoad={handleLoad}
      attributionControl={false}
      maxPitch={70}
    >
      <NavigationControl position="top-right" visualizePitch />
      <GeolocateControl position="top-right" />
      <ScaleControl position="bottom-right" />

      {stations.map((station) => {
        const isSelected = selected?.id === station.id;
        const isHovered = hoveredId === station.id;
        const isTransfer = station.isTransfer;
        const isClosed = !!(closedStations[station.name] || closedStations[station.stationId]);
        const scale = isSelected ? 1.4 : isHovered ? 1.15 : 1;
        const color = isClosed ? "#6b7280" : (station.color || "#888");
        const occ = simulateOccupancy(station.name);
        const occInfo = getOccupancyLabel(occ);

        return (
          <Marker key={station.id} longitude={station.lng} latitude={station.lat} anchor="bottom">
            <div
              className={`station-pin${isClosed ? ' station-pin--closed' : ''}`}
              style={{
                cursor: "pointer",
                transform: `scale(${scale})`,
                transition: "transform 0.2s ease",
              }}
              onClick={(e) => handleMarkerClick(station, e)}
              onMouseEnter={() => setHoveredId(station.id)}
              onMouseLeave={() => setHoveredId(null)}
              title={isClosed ? `${station.name} — 🚫 CERRADA` : `${station.name} — Ocupación: ${occInfo.label}`}
            >
              <svg width="28" height="36" viewBox="0 0 28 36">
                <defs>
                  <filter id={`sh${station.id}`} x="-30%" y="-20%" width="160%" height="160%">
                    <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.35" />
                  </filter>
                </defs>
                <path
                  d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 22 14 22s14-11.5 14-22C28 6.268 21.732 0 14 0z"
                  fill={isClosed ? "#991b1b" : (isSelected ? "#e23d28" : color)}
                  filter={`url(#sh${station.id})`}
                />
                {isClosed ? (
                  <>
                    <circle cx="14" cy="13" r="8" fill="#dc2626" opacity={0.9} />
                    <line x1="10" y1="9" x2="18" y2="17" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                    <line x1="18" y1="9" x2="10" y2="17" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                  </>
                ) : (
                  <>
                    <circle cx="14" cy="13" r="8" fill="none" stroke={occInfo.color} strokeWidth="2" opacity={0.7} />
                    <circle cx="14" cy="13" r="6" fill="white" opacity={0.95} />
                    {isTransfer ? (
                      <text x="14" y="16.5" textAnchor="middle" fontSize="9" fontWeight="800" fill={color}>T</text>
                    ) : (
                      <text x="14" y="16.5" textAnchor="middle" fontSize="9" fontWeight="800" fill={color}>
                        {station.lineShort}
                      </text>
                    )}
                  </>
                )}
              </svg>
              {isClosed && !isSelected && (
                <div className="pin-label pin-label--closed">CERRADA</div>
              )}
              {isSelected && (
                <div className={`pin-label${isClosed ? ' pin-label--closed' : ''}`}>
                  {isClosed ? '🚫 ' : ''}{station.name.length > 30 ? station.name.slice(0, 30) + "…" : station.name}
                </div>
              )}
            </div>
          </Marker>
        );
      })}
    </Map>
  );
}
