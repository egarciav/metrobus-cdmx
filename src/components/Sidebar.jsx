import { useState, useMemo } from "react";

const LINE_META = [
  { id: 'MB1', short: '1', label: 'Línea 1', color: '#e23d28' },
  { id: 'MB2', short: '2', label: 'Línea 2', color: '#9e168a' },
  { id: 'MB3', short: '3', label: 'Línea 3', color: '#6cbe45' },
  { id: 'MB4', short: '4', label: 'Línea 4', color: '#f28e1e' },
  { id: 'MB5', short: '5', label: 'Línea 5', color: '#0072bc' },
  { id: 'MB6', short: '6', label: 'Línea 6', color: '#ffd100' },
  { id: 'MB7', short: '7', label: 'Línea 7', color: '#81c044' },
];

export default function Sidebar({ stations, selected, onSelect, isOpen, onClose }) {
  const [search, setSearch] = useState("");
  const [activeLine, setActiveLine] = useState(null);

  const filtered = useMemo(() => {
    return stations.filter((s) => {
      const q = search.toLowerCase();
      const matchSearch =
        s.name.toLowerCase().includes(q) ||
        (s.lineLabel && s.lineLabel.toLowerCase().includes(q));
      const matchLine = !activeLine || s.lineId === activeLine ||
        (s.lines && s.lines.some(l => l.lineId === activeLine));
      return matchSearch && matchLine;
    });
  }, [stations, search, activeLine]);

  return (
    <>
      {isOpen && <div className="sidebar-backdrop" onClick={onClose} />}

      <aside className={`sidebar ${isOpen ? "sidebar--open" : ""}`}>
        {/* Header */}
        <div className="sidebar-header">
          <div className="sidebar-header-top">
            <div>
              <h1 className="sidebar-title">🚍 Metrobús CDMX</h1>
              <p className="sidebar-count">{filtered.length} de {stations.length} estaciones</p>
            </div>
            <button onClick={onClose} className="sidebar-close-btn">
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search */}
          <div className="sidebar-search">
            <svg className="sidebar-search-icon" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="search"
              placeholder="Buscar estación, línea…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="sidebar-search-input"
            />
          </div>

          {/* Line filter chips */}
          <div className="sidebar-chips">
            <button
              onClick={() => setActiveLine(null)}
              className={`chip ${!activeLine ? "chip--active" : ""}`}
            >
              Todas
            </button>
            {LINE_META.map((line) => (
              <button
                key={line.id}
                onClick={() => setActiveLine(activeLine === line.id ? null : line.id)}
                className={`chip ${activeLine === line.id ? "chip--active" : ""}`}
                style={activeLine === line.id ? { backgroundColor: line.color, color: '#fff' } : undefined}
              >
                {line.short}
              </button>
            ))}
          </div>
        </div>

        {/* Station list */}
        <ul className="sidebar-list">
          {filtered.length === 0 && (
            <li className="sidebar-empty">
              <p>🔍</p>
              <p>Sin resultados</p>
            </li>
          )}
          {filtered.map((station) => {
            const isActive = selected?.id === station.id;
            const color = station.color || "#888";

            return (
              <li key={station.id}>
                <button
                  onClick={() => {
                    onSelect(station);
                    if (window.innerWidth < 768) onClose();
                  }}
                  className={`sidebar-item ${isActive ? "sidebar-item--active" : ""}`}
                  style={isActive ? { borderLeftColor: color } : undefined}
                >
                  <div className="sidebar-item-dot" style={{ backgroundColor: color }} />
                  <div className="sidebar-item-info">
                    <p className="sidebar-item-name">{station.name}</p>
                    <p className="sidebar-item-meta">
                      {station.lineLabel}
                    </p>
                    <div className="sidebar-item-badges">
                      {station.lines ? station.lines.map((l) => (
                        <span
                          key={l.lineId}
                          className="sidebar-item-badge"
                          style={{ backgroundColor: l.color }}
                        >
                          {l.lineShort}
                        </span>
                      )) : (
                        <span className="sidebar-item-badge" style={{ backgroundColor: color }}>
                          {station.lineShort}
                        </span>
                      )}
                      {station.isTransfer && (
                        <span className="sidebar-item-badge sidebar-item-badge--transfer">
                          Transbordo
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>

        {/* Footer */}
        <div className="sidebar-footer">
          Fuente: <a href="https://www.metrobus.cdmx.gob.mx/" target="_blank" rel="noopener noreferrer">Metrobús CDMX</a> · OpenStreetMap · OpenFreeMap
        </div>
      </aside>
    </>
  );
}
