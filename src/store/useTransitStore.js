import { create } from 'zustand';

const useTransitStore = create((set, get) => ({
  // Visible lines (line IDs that are toggled on)
  visibleLines: new Set(),
  initVisibleLines: (lineIds) => set({ visibleLines: new Set(lineIds) }),
  toggleLine: (lineId) => {
    const current = new Set(get().visibleLines);
    if (current.has(lineId)) {
      current.delete(lineId);
    } else {
      current.add(lineId);
    }
    set({ visibleLines: current });
  },
  showAllLines: (lineIds) => set({ visibleLines: new Set(lineIds) }),
  hideAllLines: () => set({ visibleLines: new Set() }),

  // Selected station
  selectedStation: null,
  setSelectedStation: (station) => set({ selectedStation: station }),
  clearSelectedStation: () => set({ selectedStation: null }),

  // Sidebar open/close
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  // ETA panel
  etaPanelOpen: false,
  etaOrigin: null,
  etaDestination: null,
  setEtaRoute: (origin, destination) =>
    set({ etaOrigin: origin, etaDestination: destination, etaPanelOpen: true }),
  clearEtaRoute: () =>
    set({ etaOrigin: null, etaDestination: null, etaPanelOpen: false }),

  // Service status
  serviceAlerts: [],
  setServiceAlerts: (alerts) => set({ serviceAlerts: alerts }),

  // Search
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),

  // Map view
  mapCenter: [19.4326, -99.1332],
  mapZoom: 12,
  setMapView: (center, zoom) => set({ mapCenter: center, mapZoom: zoom }),
}));

export default useTransitStore;
