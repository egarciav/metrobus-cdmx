/**
 * Delay Prediction Service for Metrobús CDMX
 * 
 * Estimates probability and magnitude of delays based on:
 * - Historical patterns per line (simulated)
 * - Time of day
 * - Context factors (weather, events, holidays)
 * - Line-specific reliability data
 */

import { getFullContext } from './contextData';

const LINE_RELIABILITY = {
  MB1: { base: 0.14, name: 'Línea 1',  notes: 'Alta demanda, corredor Insurgentes muy transitado' },
  MB2: { base: 0.12, name: 'Línea 2',  notes: 'Eje 4 Sur, tráfico cruzado frecuente' },
  MB3: { base: 0.11, name: 'Línea 3',  notes: 'Eje 1 Poniente, tramo largo' },
  MB4: { base: 0.09, name: 'Línea 4',  notes: 'Buenavista-Aeropuerto, carril confinado estable' },
  MB5: { base: 0.13, name: 'Línea 5',  notes: 'Eje 3 Oriente, zona con alto tráfico' },
  MB6: { base: 0.15, name: 'Línea 6',  notes: 'El Rosario-Aragón, tramo largo con cruces' },
  MB7: { base: 0.10, name: 'Línea 7',  notes: 'Paseo de la Reforma, carril confinado' },
};

const HOURLY_DELAY_PATTERN = {
  0: 0.02, 1: 0.01, 2: 0.01, 3: 0.01, 4: 0.02, 5: 0.05,
  6: 0.15, 7: 0.30, 8: 0.35, 9: 0.25, 10: 0.10, 11: 0.08,
  12: 0.10, 13: 0.12, 14: 0.10, 15: 0.12, 16: 0.18, 17: 0.30,
  18: 0.35, 19: 0.28, 20: 0.15, 21: 0.08, 22: 0.05, 23: 0.03,
};

export function predictDelay(lineId, date = new Date()) {
  const reliability = LINE_RELIABILITY[lineId];
  if (!reliability) return null;

  const context = getFullContext(date);
  const hour = date.getHours();
  const hourlyFactor = HOURLY_DELAY_PATTERN[hour] || 0.1;

  let probability = reliability.base + hourlyFactor;
  const reasons = [];

  if (context.weather.isRaining) {
    probability += 0.12;
    reasons.push('Lluvia: calles resbalosas, tráfico lento');
  }

  if (hour >= 7 && hour <= 9) {
    probability += 0.05;
    reasons.push('Hora pico matutina: saturación');
  } else if (hour >= 17 && hour <= 20) {
    probability += 0.05;
    reasons.push('Hora pico vespertina: saturación');
  }

  if (context.football) {
    probability += 0.04;
    reasons.push(`Partido en ${context.football.stadium}`);
  }

  if (context.protest) {
    probability += 0.08;
    reasons.push(`Manifestación: ${context.protest.location}`);
  }

  if (context.holiday) {
    if (context.holiday.factor < 0.7) {
      probability -= 0.05;
      reasons.push(`${context.holiday.name}: menor demanda`);
    } else {
      probability += 0.03;
      reasons.push(`${context.holiday.name}: alta afluencia especial`);
    }
  }

  if (context.vacation.isVacation) {
    probability -= 0.08;
    reasons.push(`${context.vacation.name}: menor demanda`);
  }

  if (context.contingencia) {
    probability += context.contingencia.restrictsCirculation ? 0.06 : 0.03;
    reasons.push(`${context.contingencia.level}: mayor demanda`);
  }

  probability = Math.max(0.01, Math.min(0.95, probability));

  let estimatedDelayMin;
  if (probability < 0.15) estimatedDelayMin = Math.round(1 + Math.random() * 2);
  else if (probability < 0.3) estimatedDelayMin = Math.round(3 + Math.random() * 5);
  else if (probability < 0.5) estimatedDelayMin = Math.round(5 + Math.random() * 10);
  else estimatedDelayMin = Math.round(10 + Math.random() * 20);

  let riskLevel, riskColor;
  if (probability < 0.2) { riskLevel = 'Bajo'; riskColor = '#22c55e'; }
  else if (probability < 0.4) { riskLevel = 'Medio'; riskColor = '#eab308'; }
  else { riskLevel = 'Alto'; riskColor = '#ef4444'; }

  return {
    lineId,
    lineName: reliability.name,
    probability: Math.round(probability * 100) / 100,
    probabilityPct: Math.round(probability * 100),
    estimatedDelayMinutes: estimatedDelayMin,
    riskLevel,
    riskColor,
    reasons: reasons.length > 0 ? reasons : ['Sin factores de riesgo adicionales'],
    lineNotes: reliability.notes,
    context,
  };
}

export function predictAllDelays(date = new Date()) {
  return Object.keys(LINE_RELIABILITY).map((lineId) => predictDelay(lineId, date));
}

export function predictRouteDelay(lineIds, date = new Date()) {
  const predictions = lineIds.map((id) => predictDelay(id, date)).filter(Boolean);
  if (predictions.length === 0) return null;

  const maxProbability = Math.max(...predictions.map((p) => p.probability));
  const totalEstimatedDelay = predictions.reduce((sum, p) => sum + p.estimatedDelayMinutes * p.probability, 0);
  const allReasons = [...new Set(predictions.flatMap((p) => p.reasons))];

  let riskLevel, riskColor;
  if (maxProbability < 0.2) { riskLevel = 'Bajo'; riskColor = '#22c55e'; }
  else if (maxProbability < 0.4) { riskLevel = 'Medio'; riskColor = '#eab308'; }
  else { riskLevel = 'Alto'; riskColor = '#ef4444'; }

  return {
    predictions,
    maxProbability: Math.round(maxProbability * 100),
    estimatedExtraMinutes: Math.round(totalEstimatedDelay),
    riskLevel,
    riskColor,
    reasons: allReasons,
  };
}
