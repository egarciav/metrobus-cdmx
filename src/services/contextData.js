/**
 * Context Data Service for Metrobús CDMX
 * 
 * Provides real-world context factors that affect Metrobús congestion:
 * - Días festivos oficiales de México
 * - Vacaciones SEP
 * - Eventos de calendario
 * - Clima CDMX (lluvia = más demanda)
 * - Partidos de fútbol
 * - Manifestaciones / marchas
 * - Contingencia ambiental
 */

const HOLIDAYS = [
  { month: 1, day: 1, name: 'Año Nuevo', factor: 0.4 },
  { month: 2, day: 5, name: 'Día de la Constitución', factor: 0.6 },
  { month: 3, day: 21, name: 'Natalicio de Benito Juárez', factor: 0.6 },
  { month: 5, day: 1, name: 'Día del Trabajo', factor: 0.4 },
  { month: 5, day: 5, name: 'Batalla de Puebla', factor: 0.7 },
  { month: 5, day: 10, name: 'Día de las Madres', factor: 1.15 },
  { month: 9, day: 16, name: 'Día de la Independencia', factor: 0.5 },
  { month: 10, day: 12, name: 'Día de la Raza', factor: 0.7 },
  { month: 11, day: 1, name: 'Día de Muertos', factor: 1.2 },
  { month: 11, day: 2, name: 'Día de Muertos', factor: 1.15 },
  { month: 11, day: 20, name: 'Revolución Mexicana', factor: 0.6 },
  { month: 12, day: 12, name: 'Día de la Virgen de Guadalupe', factor: 1.4 },
  { month: 12, day: 25, name: 'Navidad', factor: 0.3 },
  { month: 12, day: 31, name: 'Fin de Año', factor: 0.4 },
];

const SEP_VACATION_RANGES = [
  { startMonth: 7, startDay: 22, endMonth: 8, endDay: 25, name: 'Vacaciones de verano' },
  { startMonth: 12, startDay: 19, endMonth: 1, endDay: 6, name: 'Vacaciones de invierno' },
  { startMonth: 3, startDay: 31, endMonth: 4, endDay: 11, name: 'Semana Santa' },
];

const CALENDAR_EVENTS = [
  { month: 2, day: 14, name: 'Día de San Valentín', factor: 1.1 },
  { month: 4, day: 30, name: 'Día del Niño', factor: 0.9 },
  { month: 6, day: 15, name: 'Día del Padre', factor: 1.05 },
  { month: 10, day: 31, name: 'Halloween', factor: 1.1 },
  { month: 11, startDay: 15, endDay: 18, name: 'Buen Fin', factor: 1.25 },
  { month: 12, day: 24, name: 'Nochebuena', factor: 0.5 },
];

const STADIUMS = [
  {
    name: 'Estadio Azteca',
    nearLines: ['MB1'],
    capacity: 87000,
    congestionRadius: 1.3,
  },
  {
    name: 'Estadio Olímpico CU',
    nearLines: ['MB1'],
    capacity: 63000,
    congestionRadius: 1.25,
  },
  {
    name: 'Foro Sol / Estadio GNP',
    nearLines: ['MB2', 'MB5'],
    capacity: 65000,
    congestionRadius: 1.3,
  },
  {
    name: 'Palacio de los Deportes',
    nearLines: ['MB2'],
    capacity: 22000,
    congestionRadius: 1.15,
  },
];

const PROTEST_HOTSPOTS = [
  {
    name: 'Zócalo / Centro Histórico',
    nearLines: ['MB4'],
    baseFactor: 1.0,
    description: 'Zona de concentración de marchas y mítines',
  },
  {
    name: 'Ángel de la Independencia / Reforma',
    nearLines: ['MB7', 'MB1'],
    baseFactor: 1.0,
    description: 'Paseo de la Reforma, ruta frecuente de marchas',
  },
  {
    name: 'Monumento a la Revolución',
    nearLines: ['MB7', 'MB1'],
    baseFactor: 1.0,
    description: 'Punto de concentración sindical',
  },
  {
    name: 'Senado / San Lázaro',
    nearLines: ['MB4', 'MB5'],
    baseFactor: 1.0,
    description: 'Cámara de Diputados, protestas legislativas',
  },
];

const CDMX_CLIMATE = {
  1:  { minT: 6,  maxT: 22, rainPct: 5 },
  2:  { minT: 7,  maxT: 24, rainPct: 4 },
  3:  { minT: 9,  maxT: 26, rainPct: 5 },
  4:  { minT: 11, maxT: 27, rainPct: 12 },
  5:  { minT: 12, maxT: 27, rainPct: 25 },
  6:  { minT: 12, maxT: 25, rainPct: 55 },
  7:  { minT: 12, maxT: 23, rainPct: 60 },
  8:  { minT: 12, maxT: 24, rainPct: 60 },
  9:  { minT: 12, maxT: 23, rainPct: 55 },
  10: { minT: 10, maxT: 23, rainPct: 30 },
  11: { minT: 8,  maxT: 22, rainPct: 8 },
  12: { minT: 6,  maxT: 21, rainPct: 4 },
};

function getWeatherContext() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const hour = now.getHours();
  const climate = CDMX_CLIMATE[month];

  let tempProgress;
  if (hour <= 6) tempProgress = 0;
  else if (hour <= 15) tempProgress = (hour - 6) / 9;
  else tempProgress = 1 - (hour - 15) / 9;
  tempProgress = Math.max(0, Math.min(1, tempProgress));

  const tempC = Math.round(climate.minT + (climate.maxT - climate.minT) * tempProgress);

  const isRainySeason = month >= 5 && month <= 10;
  const isAfternoon = hour >= 14 && hour <= 20;
  let rainPct = climate.rainPct;
  if (isRainySeason && isAfternoon) rainPct = Math.min(85, rainPct * 1.5);
  else if (!isAfternoon && isRainySeason) rainPct = Math.max(5, rainPct * 0.4);

  const daySeed = now.getFullYear() * 1000 + now.getMonth() * 32 + now.getDate();
  const pseudoRandom = ((Math.sin(daySeed * 1.7) * 10000) % 100 + 100) % 100;
  const isRaining = isAfternoon && pseudoRandom < rainPct;

  const weatherFactor = isRaining ? 1.2 : 1.0;
  const weatherLabel = isRaining ? 'Lluvia' : (tempC > 28 ? 'Caluroso' : (tempC < 10 ? 'Frío' : 'Despejado'));
  const weatherIcon = isRaining ? '🌧️' : (tempC > 28 ? '☀️' : (tempC < 10 ? '🥶' : '⛅'));

  return {
    isRaining,
    rainProbability: Math.round(rainPct),
    tempC,
    weatherFactor,
    weatherLabel,
    weatherIcon,
    isRainySeason,
  };
}

function getContingenciaAmbiental(date = new Date()) {
  const month = date.getMonth() + 1;
  const isContingenciaSeason = month >= 2 && month <= 5;
  if (!isContingenciaSeason) return null;

  const daySeed = date.getFullYear() * 1000 + month * 32 + date.getDate();
  const val = ((Math.sin(daySeed * 3.1) * 10000) % 100 + 100) % 100;

  if (val < 5) {
    return {
      level: 'Contingencia Fase I',
      factor: 1.25,
      icon: '🟠',
      description: 'Contingencia ambiental activa. Mayor demanda de transporte público.',
      restrictsCirculation: true,
    };
  } else if (val < 20) {
    return {
      level: 'Pre-contingencia',
      factor: 1.12,
      icon: '🟡',
      description: 'Pre-contingencia por mala calidad del aire. Más usuarios en Metrobús.',
      restrictsCirculation: false,
    };
  }

  return null;
}

function getHolidayInfo(date = new Date()) {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return HOLIDAYS.find((h) => h.month === m && h.day === d) || null;
}

function isVacationPeriod(date = new Date()) {
  const m = date.getMonth() + 1;
  const d = date.getDate();

  for (const v of SEP_VACATION_RANGES) {
    if (v.endMonth < v.startMonth) {
      if ((m === v.startMonth && d >= v.startDay) || (m > v.startMonth) ||
          (m < v.endMonth) || (m === v.endMonth && d <= v.endDay)) {
        return { isVacation: true, name: v.name };
      }
    } else {
      if ((m > v.startMonth || (m === v.startMonth && d >= v.startDay)) &&
          (m < v.endMonth || (m === v.endMonth && d <= v.endDay))) {
        return { isVacation: true, name: v.name };
      }
    }
  }
  return { isVacation: false, name: null };
}

function getCalendarEvent(date = new Date()) {
  const m = date.getMonth() + 1;
  const d = date.getDate();

  for (const evt of CALENDAR_EVENTS) {
    if (evt.month === m) {
      if (evt.day && evt.day === d) return evt;
      if (evt.startDay && evt.endDay && d >= evt.startDay && d <= evt.endDay) return evt;
    }
  }
  return null;
}

function getDayOfWeekFactor(date = new Date()) {
  const day = date.getDay();
  if (day === 0) return { factor: 0.5, label: 'Domingo', isWeekend: true };
  if (day === 6) return { factor: 0.65, label: 'Sábado', isWeekend: true };
  if (day === 1) return { factor: 1.1, label: 'Lunes', isWeekend: false };
  if (day === 5) return { factor: 1.05, label: 'Viernes', isWeekend: false };
  return { factor: 1.0, label: ['','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'][day], isWeekend: false };
}

function getFootballMatchInfo(date = new Date()) {
  const day = date.getDay();
  const hour = date.getHours();

  const isMatchDay = (day === 0 && hour >= 10 && hour <= 22) ||
                     (day === 3 && hour >= 18 && hour <= 23) ||
                     (day === 6 && hour >= 16 && hour <= 23);

  if (!isMatchDay) return null;

  const dayOfMonth = date.getDate();
  const stadiumIdx = dayOfMonth % STADIUMS.length;
  const stadium = STADIUMS[stadiumIdx];

  return {
    isMatchDay: true,
    stadium: stadium.name,
    nearLines: stadium.nearLines,
    congestionFactor: stadium.congestionRadius,
    estimatedAttendance: Math.round(stadium.capacity * 0.75),
  };
}

function getProtestInfo(date = new Date()) {
  const day = date.getDay();
  const dayOfMonth = date.getDate();

  const isProtestLikely = (day >= 1 && day <= 5) && (dayOfMonth % 7 === 0 || dayOfMonth === 1 || dayOfMonth === 15);

  if (!isProtestLikely) return null;

  const hotspotIdx = dayOfMonth % PROTEST_HOTSPOTS.length;
  const hotspot = PROTEST_HOTSPOTS[hotspotIdx];

  return {
    isProtest: true,
    location: hotspot.name,
    nearLines: hotspot.nearLines,
    description: hotspot.description,
    congestionFactor: 1.2,
  };
}

export function getFullContext(date = new Date()) {
  const weather = getWeatherContext();
  const holiday = getHolidayInfo(date);
  const vacation = isVacationPeriod(date);
  const calendarEvent = getCalendarEvent(date);
  const dayOfWeek = getDayOfWeekFactor(date);
  const football = getFootballMatchInfo(date);
  const protest = getProtestInfo(date);
  const contingencia = getContingenciaAmbiental(date);

  let combinedFactor = 1.0;
  const activeFactors = [];

  combinedFactor *= dayOfWeek.factor;
  if (dayOfWeek.isWeekend) activeFactors.push({ name: dayOfWeek.label, factor: dayOfWeek.factor, icon: '📅' });

  if (holiday) {
    combinedFactor *= holiday.factor;
    activeFactors.push({ name: holiday.name, factor: holiday.factor, icon: '🎉' });
  }

  if (vacation.isVacation) {
    combinedFactor *= 0.8;
    activeFactors.push({ name: vacation.name, factor: 0.8, icon: '🏖️' });
  }

  if (calendarEvent) {
    combinedFactor *= calendarEvent.factor;
    activeFactors.push({ name: calendarEvent.name, factor: calendarEvent.factor, icon: '📆' });
  }

  if (weather.weatherFactor > 1.0) {
    combinedFactor *= weather.weatherFactor;
    activeFactors.push({ name: weather.weatherLabel, factor: weather.weatherFactor, icon: weather.weatherIcon });
  }

  if (football) {
    combinedFactor *= football.congestionFactor;
    activeFactors.push({ name: `Partido: ${football.stadium}`, factor: football.congestionFactor, icon: '⚽' });
  }

  if (protest) {
    combinedFactor *= protest.congestionFactor;
    activeFactors.push({ name: `Marcha: ${protest.location}`, factor: protest.congestionFactor, icon: '📢' });
  }

  if (contingencia) {
    combinedFactor *= contingencia.factor;
    activeFactors.push({ name: contingencia.level, factor: contingencia.factor, icon: contingencia.icon });
  }

  combinedFactor = Math.max(0.2, Math.min(2.5, combinedFactor));

  return {
    weather,
    holiday,
    vacation,
    calendarEvent,
    dayOfWeek,
    football,
    protest,
    contingencia,
    combinedFactor: Math.round(combinedFactor * 100) / 100,
    activeFactors,
  };
}

export {
  HOLIDAYS,
  SEP_VACATION_RANGES,
  STADIUMS,
  PROTEST_HOTSPOTS,
  getWeatherContext,
  getHolidayInfo,
  isVacationPeriod,
  getCalendarEvent,
  getDayOfWeekFactor,
  getFootballMatchInfo,
  getProtestInfo,
  getContingenciaAmbiental,
};
