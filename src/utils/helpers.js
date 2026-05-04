/**
 * Calculate distance between two coordinates using Haversine formula
 * @returns distance in kilometers
 */
export function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

/**
 * Estimate travel time between two stations
 * @param {number} distanceKm - distance in km
 * @param {number} avgSpeedKmh - average speed in km/h
 * @param {number} stopTimeS - average stop time in seconds
 * @returns {{ minutes: number, seconds: number }}
 */
export function estimateTravelTime(distanceKm, avgSpeedKmh, stopTimeS) {
  const travelSeconds = (distanceKm / avgSpeedKmh) * 3600;
  const totalSeconds = Math.round(travelSeconds + stopTimeS);
  return {
    minutes: Math.floor(totalSeconds / 60),
    seconds: totalSeconds % 60,
  };
}

/**
 * Format time as "X min", "X min Y s", or "Xh Ym Zs" when >= 60 min
 */
export function formatTime(minutes, seconds) {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (m === 0 && seconds === 0) return `${h}h`;
    if (seconds === 0) return `${h}h ${m}min`;
    if (m === 0) return `${h}h ${seconds}s`;
    return `${h}h ${m}min ${seconds}s`;
  }
  if (minutes === 0) return `${seconds}s`;
  if (seconds === 0) return `${minutes} min`;
  return `${minutes} min ${seconds}s`;
}

/**
 * Get current hour-based congestion factor (1.0 = normal)
 */
export function getCongestionFactor() {
  const hour = new Date().getHours();
  if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 20)) return 1.4;
  if ((hour >= 10 && hour <= 16)) return 1.0;
  if (hour >= 21 || hour <= 5) return 0.8;
  return 1.1;
}

/**
 * Get time-of-day label
 */
export function getTimeOfDayLabel() {
  const hour = new Date().getHours();
  if (hour >= 7 && hour <= 9) return 'Hora pico matutina';
  if (hour >= 17 && hour <= 20) return 'Hora pico vespertina';
  if (hour >= 10 && hour <= 16) return 'Hora valle';
  if (hour >= 21 || hour <= 5) return 'Servicio nocturno/reducido';
  return 'Servicio regular';
}

/**
 * Generate a simulated occupancy level for a station
 */
export function simulateOccupancy(stationName) {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay();

  const seed = stationName.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const stationVariance = ((seed % 17) - 8) * 0.01;

  let timeBase;
  if (hour >= 7 && hour <= 9) timeBase = 0.68;
  else if (hour >= 17 && hour <= 20) timeBase = 0.65;
  else if (hour >= 10 && hour <= 12) timeBase = 0.30;
  else if (hour >= 13 && hour <= 16) timeBase = 0.33;
  else if (hour >= 6 && hour < 7) timeBase = 0.25;
  else if (hour >= 21 && hour <= 23) timeBase = 0.20;
  else timeBase = 0.06;

  let dayFactor = 1.0;
  if (day === 0) dayFactor = 0.30;
  else if (day === 6) dayFactor = 0.45;
  else if (day === 1) dayFactor = 1.08;

  const raw = timeBase * dayFactor + stationVariance;
  return Math.min(0.98, Math.max(0.03, raw));
}

/**
 * Get occupancy label from 0-1 value
 */
export function getOccupancyLabel(value) {
  if (value < 0.25) return { label: 'Baja', color: '#22c55e' };
  if (value < 0.50) return { label: 'Moderada', color: '#eab308' };
  if (value < 0.75) return { label: 'Alta', color: '#f97316' };
  return { label: 'Muy alta', color: '#ef4444' };
}
