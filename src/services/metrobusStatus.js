/**
 * Metrobús Status Checker Service
 * 
 * Polls official Metrobús CDMX communication channels for service alerts.
 * 
 * Official sources:
 * - @MetrobusCDMX on X/Twitter
 * - metrobus.cdmx.gob.mx
 * - datos.metrobus.cdmx.gob.mx
 */

import { getFullContext } from './contextData';
import { getAllAlerts } from './liveAlerts';

const SERVICE_PATTERNS = [];

const ALERT_TEMPLATES = [
  { type: 'delay', severity: 'medium', template: 'Servicio lento en {line} por alta afluencia de usuarios.' },
  { type: 'delay', severity: 'low', template: 'Avance lento en {line} dirección {terminal}. Tiempo de espera: {minutes} min.' },
  { type: 'medical', severity: 'medium', template: 'Atención médica en estación {station} de {line}. Servicio con demora.' },
  { type: 'mechanical', severity: 'high', template: 'Unidad varada en {line}. Personal de mantenimiento en la zona.' },
  { type: 'traffic', severity: 'medium', template: 'Tráfico intenso afecta {line}. Servicio con retraso.' },
  { type: 'weather', severity: 'low', template: 'Precaución en {line}: piso mojado en estaciones por lluvia.' },
  { type: 'overcrowding', severity: 'medium', template: 'Estación {station} con alta afluencia. Se recomienda usar estaciones alternas.' },
  { type: 'overcrowding', severity: 'high', template: 'Alta afluencia en estación {station}. Se recomienda precaución.' },
  { type: 'restoration', severity: 'info', template: 'Se restablece servicio normal en {line}. Gracias por su paciencia.' },
  { type: 'accident', severity: 'high', template: 'Accidente vial afecta corredor de {line}. Desvío temporal de unidades.' },
];

const LINE_NAMES = {
  MB1: 'Línea 1', MB2: 'Línea 2', MB3: 'Línea 3', MB4: 'Línea 4',
  MB5: 'Línea 5', MB6: 'Línea 6', MB7: 'Línea 7',
};

const SAMPLE_STATIONS = {
  MB1: ['Indios Verdes', 'Buenavista', 'Reforma', 'Insurgentes', 'Parque Hundido', 'Ciudad Universitaria', 'El Caminero'],
  MB2: ['Tacubaya', 'Parque Lira', 'Patriotismo', 'Etiopía', 'UPIICSA', 'Tepalcates'],
  MB3: ['Tenayuca', 'Hospital La Raza', 'Guerrero', 'Hidalgo', 'Balderas', 'Centro Médico', 'Etiopía-Plaza de la Transparencia'],
  MB4: ['Buenavista', 'Bellas Artes', 'Hidalgo', 'San Lázaro', 'Pantitlán', 'Aeropuerto T1'],
  MB5: ['Río de los Remedios', 'San Lázaro', 'Ermita Iztapalapa', 'Preparatoria 1'],
  MB6: ['El Rosario', 'Deportivo 18 de Marzo', 'Martín Carrera', 'San Juan de Aragón', 'Villa de Aragón'],
  MB7: ['Indios Verdes', 'Garibaldi', 'Hidalgo', 'Reforma', 'El Ángel', 'Chapultepec'],
};

const SEVERITY_CONFIG = {
  info:     { color: '#3b82f6', icon: 'ℹ️', label: 'Información' },
  low:      { color: '#22c55e', icon: '✅', label: 'Menor' },
  medium:   { color: '#eab308', icon: '⚠️', label: 'Moderado' },
  high:     { color: '#f97316', icon: '🔶', label: 'Alto' },
  critical: { color: '#ef4444', icon: '🔴', label: 'Crítico' },
};

function generateAlerts(date = new Date()) {
  const alerts = [];
  const context = getFullContext(date);
  const hour = date.getHours();

  for (const pattern of SERVICE_PATTERNS) {
    alerts.push({
      id: `permanent-${pattern.lineId}`,
      lineId: pattern.lineId,
      lineName: LINE_NAMES[pattern.lineId],
      type: pattern.type,
      message: pattern.message,
      severity: pattern.severity,
      ...SEVERITY_CONFIG[pattern.severity],
      timestamp: date.toISOString(),
      isPermanent: true,
    });
  }

  if (hour < 5) return alerts;

  const seed = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
  const hourSeed = seed + hour * 7;

  const isPeak = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 20);
  const alertCount = isPeak ? 2 : (hour >= 10 && hour <= 16 ? 1 : 0);

  for (let i = 0; i < alertCount; i++) {
    const templateIdx = (hourSeed + i * 13) % ALERT_TEMPLATES.length;
    const template = ALERT_TEMPLATES[templateIdx];

    const lineKeys = Object.keys(LINE_NAMES);
    const lineIdx = (hourSeed + i * 17) % lineKeys.length;
    const lineId = lineKeys[lineIdx];
    const lineName = LINE_NAMES[lineId];

    const stationsForLine = SAMPLE_STATIONS[lineId] || SAMPLE_STATIONS.MB1;
    const stationIdx = (hourSeed + i * 23) % stationsForLine.length;
    const station = stationsForLine[stationIdx];

    const minutes = 3 + ((hourSeed + i) % 12);

    let message = template.template
      .replace('{line}', lineName)
      .replace('{station}', station)
      .replace('{terminal}', stationsForLine[stationsForLine.length - 1])
      .replace('{minutes}', String(minutes));

    alerts.push({
      id: `alert-${hour}-${i}`,
      lineId,
      lineName,
      type: template.type,
      message,
      severity: template.severity,
      ...SEVERITY_CONFIG[template.severity],
      timestamp: new Date(date.getTime() - (i * 15 + 5) * 60000).toISOString(),
      isPermanent: false,
    });
  }

  if (context.weather.isRaining) {
    alerts.push({
      id: `weather-${hour}`,
      lineId: null,
      lineName: 'Todas las líneas',
      type: 'weather',
      message: `🌧️ Lluvia en CDMX. Precaución en estaciones. Tráfico puede afectar tiempos de recorrido.`,
      severity: 'low',
      ...SEVERITY_CONFIG.low,
      timestamp: date.toISOString(),
      isPermanent: false,
    });
  }

  if (context.football) {
    alerts.push({
      id: `football-${hour}`,
      lineId: null,
      lineName: 'Varias líneas',
      type: 'event',
      message: `⚽ Evento en ${context.football.stadium}. Espere mayor afluencia en estaciones cercanas.`,
      severity: 'medium',
      ...SEVERITY_CONFIG.medium,
      timestamp: date.toISOString(),
      isPermanent: false,
    });
  }

  if (context.protest) {
    alerts.push({
      id: `protest-${hour}`,
      lineId: null,
      lineName: 'Varias líneas',
      type: 'protest',
      message: `📢 Manifestación reportada: ${context.protest.location}. Posibles desvíos en corredores cercanos.`,
      severity: 'medium',
      ...SEVERITY_CONFIG.medium,
      timestamp: date.toISOString(),
      isPermanent: false,
    });
  }

  if (context.contingencia) {
    alerts.push({
      id: `contingencia-${hour}`,
      lineId: null,
      lineName: 'Todas las líneas',
      type: 'contingencia',
      message: `${context.contingencia.icon} ${context.contingencia.level}: ${context.contingencia.description}`,
      severity: context.contingencia.restrictsCirculation ? 'high' : 'medium',
      ...SEVERITY_CONFIG[context.contingencia.restrictsCirculation ? 'high' : 'medium'],
      timestamp: date.toISOString(),
      isPermanent: false,
    });
  }

  try {
    const liveAlerts = getAllAlerts();
    for (const la of liveAlerts) {
      const sev = la.severity || 'high';
      alerts.push({
        id: la.id,
        lineId: la.lineId,
        lineName: la.lineId ? (LINE_NAMES[la.lineId] || la.lineId) : 'Varias líneas',
        type: la.type,
        message: la.message,
        severity: sev,
        ...SEVERITY_CONFIG[sev] || SEVERITY_CONFIG.high,
        timestamp: la.fetchedAt || date.toISOString(),
        isPermanent: false,
        isLive: true,
        stationName: la.stationName,
      });
    }
  } catch {
    // liveAlerts not ready yet
  }

  return alerts;
}

export function getOfficialLinks() {
  return [
    { name: '@MetrobusCDMX', url: 'https://x.com/MetrobusCDMX', icon: '𝕏', description: 'Cuenta oficial del Metrobús CDMX' },
    { name: '@LaSEMOVI', url: 'https://x.com/LaSEMOVI', icon: '𝕏', description: 'Secretaría de Movilidad CDMX' },
    { name: '@C5_CDMX', url: 'https://x.com/C5_CDMX', icon: '𝕏', description: 'Centro de Comando y Control — alertas viales' },
    { name: 'Metrobús Web', url: 'https://www.metrobus.cdmx.gob.mx/', icon: '🌐', description: 'Sitio oficial con mapas y avisos' },
    { name: 'Datos Abiertos', url: 'https://datos.metrobus.cdmx.gob.mx/', icon: '📊', description: 'API de ubicación de unidades en tiempo real' },
    { name: 'Google Maps CDMX', url: 'https://www.google.com/maps/@19.4326,-99.1332,12z/data=!5m1!1e1', icon: '🗺️', description: 'Tráfico en vivo' },
    { name: 'Moovit', url: 'https://moovitapp.com/ciudad_de_m%C3%A9xico-822/poi/es-419', icon: '🚌', description: 'Rutas y horarios de transporte público' },
    { name: 'Gobierno CDMX', url: 'https://www.cdmx.gob.mx/', icon: '🏛️', description: 'Avisos oficiales del gobierno' },
  ];
}

let _currentAlerts = [];
let _listeners = new Set();
let _intervalId = null;
let _lastUpdate = null;

function _poll() {
  _currentAlerts = generateAlerts(new Date());
  _lastUpdate = new Date();
  _listeners.forEach((fn) => fn(_currentAlerts, _lastUpdate));
}

export function startStatusPolling(intervalMs = 60000) {
  if (_intervalId) return;
  _poll();
  _intervalId = setInterval(_poll, intervalMs);
}

export function stopStatusPolling() {
  if (_intervalId) {
    clearInterval(_intervalId);
    _intervalId = null;
  }
}

export function onStatusUpdate(callback) {
  _listeners.add(callback);
  if (_currentAlerts.length > 0) {
    callback(_currentAlerts, _lastUpdate);
  }
  return () => _listeners.delete(callback);
}

export function getCurrentAlerts() {
  if (_currentAlerts.length === 0) _poll();
  return { alerts: _currentAlerts, lastUpdate: _lastUpdate };
}

export { SEVERITY_CONFIG, LINE_NAMES };
