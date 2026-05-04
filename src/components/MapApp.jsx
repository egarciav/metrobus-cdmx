import { useState, useCallback, useEffect, useMemo } from "react";
import StationMap from "./StationMap";
import Sidebar from "./Sidebar";
import StationDetail from "./StationDetail";
import ETAPanel from "./ETAPanel";
import StatusBar from "./StatusBar";
import Disclaimer from "./Disclaimer";
import { ALL_METROBUS_STATIONS } from "../data/metrobusLines";
import { startAlertPolling, stopAlertPolling, onAlertUpdate } from "../services/liveAlerts";

export default function MapApp() {
  const [selected, setSelected] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [closedStations, setClosedStations] = useState({});

  const stations = useMemo(() => {
    const transferMap = {};
    for (const s of ALL_METROBUS_STATIONS) {
      const baseName = s.name.replace(/\s*\(L[0-9]+\)\s*$/, '').trim();
      if (!transferMap[baseName]) {
        transferMap[baseName] = {
          id: s.id,
          stationId: s.id,
          name: baseName,
          lat: s.lat,
          lng: s.lng,
          color: s.lineColor,
          lineId: s.lineId,
          lineLabel: s.lineName,
          lineShort: s.lineShort,
          isTransfer: false,
          lines: [{ lineId: s.lineId, lineLabel: s.lineName, lineShort: s.lineShort, color: s.lineColor }],
        };
      } else {
        transferMap[baseName].isTransfer = true;
        transferMap[baseName].lines.push({ lineId: s.lineId, lineLabel: s.lineName, lineShort: s.lineShort, color: s.lineColor });
      }
    }
    return Object.values(transferMap);
  }, []);

  useEffect(() => {
    startAlertPolling();
    const unsub = onAlertUpdate(({ closedStations: cs }) => {
      setClosedStations(cs);
    });
    return () => { unsub(); stopAlertPolling(); };
  }, []);

  const handleSelect = useCallback((station) => {
    setSelected(station);
  }, []);

  const handleDeselect = useCallback(() => {
    setSelected(null);
  }, []);

  return (
    <div className="app">
      <Sidebar
        stations={stations}
        selected={selected}
        onSelect={handleSelect}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="map-area">
        <button
          className="mobile-menu-btn"
          onClick={() => setSidebarOpen(true)}
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          Estaciones
        </button>

        <StationMap
          stations={stations}
          selected={selected}
          onSelect={handleSelect}
          onDeselect={handleDeselect}
          closedStations={closedStations}
        />

        <StationDetail station={selected} onClose={handleDeselect} closedStations={closedStations} />
        <ETAPanel />
        <StatusBar />
      </div>

      <Disclaimer />
    </div>
  );
}
