export const CDMX_CENTER = [19.4326, -99.1332];
export const DEFAULT_ZOOM = 12;
export const MIN_ZOOM = 10;
export const MAX_ZOOM = 18;

export const TILE_URLS = {
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  voyager: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
};

export const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>';

export const METROBUS_API_BASE = 'https://datos.metrobus.cdmx.gob.mx/api/v1';

export const POLLING_INTERVAL_MS = 15000;

export const AVG_METROBUS_SPEED_KMH = 18;
export const AVG_METROBUS_STOP_TIME_S = 30;
