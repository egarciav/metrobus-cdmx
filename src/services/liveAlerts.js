/**
 * Live Station Alerts Service for Metrobús CDMX — FULLY AUTOMATIC
 *
 * Fetches real alerts from official Metrobús CDMX internet sources:
 * 1. @MetrobusCDMX tweets via RSSHub / Nitter RSS proxies
 * 2. Google News RSS for "Metrobús CDMX" headlines
 * 3. metrobus.cdmx.gob.mx official page scraping via CORS proxy
 * 4. Local stationAlerts.json as emergency-only fallback
 *
 * Matches parsed text against the full station database automatically.
 * Polls every 5 minutes for new alerts.
 */

import { METROBUS_LINES } from '../data/metrobusLines';
import localAlertsData from '../data/stationAlerts.json';

const CORS_PROXIES = [
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
];

const LIVE_SOURCES = [
  {
    id: 'rsshub-metrobus',
    name: '@MetrobusCDMX (RSSHub)',
    url: 'https://rsshub.app/twitter/user/MetrobusCDMX',
    type: 'rss',
    priority: 1,
  },
  {
    id: 'rsshub-semovi',
    name: '@LaSEMOVI (RSSHub)',
    url: 'https://rsshub.app/twitter/user/LaSEMOVI',
    type: 'rss',
    priority: 2,
  },
  {
    id: 'rsshub-c5',
    name: '@C5_CDMX (RSSHub)',
    url: 'https://rsshub.app/twitter/user/C5_CDMX',
    type: 'rss',
    priority: 3,
  },
  {
    id: 'google-news',
    name: 'Google Noticias',
    url: 'https://news.google.com/rss/search?q=%22Metrob%C3%BAs+CDMX%22+estaci%C3%B3n+cerrada+OR+cierre+OR+suspende&hl=es-419&gl=MX&ceid=MX:es-419',
    type: 'rss',
    priority: 4,
  },
  {
    id: 'google-news-alt',
    name: 'Google Noticias (alt)',
    url: 'https://news.google.com/rss/search?q=%22Metrob%C3%BAs%22+CDMX+servicio+cerrada+OR+fuera&hl=es-419&gl=MX&ceid=MX:es-419',
    type: 'rss',
    priority: 5,
  },
  {
    id: 'metrobus-oficial',
    name: 'metrobus.cdmx.gob.mx',
    url: 'https://www.metrobus.cdmx.gob.mx/',
    type: 'html',
    priority: 6,
  },
];

const POLL_INTERVAL_MS = 5 * 60 * 1000;

const KW_CLOSURE = ['cerrada', 'cierre', 'cerrado', 'sin servicio', 'fuera de servicio', 'suspende servicio', 'suspendido', 'no hay servicio', 'cierra', 'cerrar'];
const KW_DELAY = ['demora', 'retraso', 'servicio lento', 'marcha lenta', 'servicio irregular', 'avance lento'];
const KW_RESTORE = ['restablece', 'normaliza', 'servicio normal', 'reapertura', 'se reanuda', 'opera con normalidad'];
const KW_LINE = ['línea 1', 'línea 2', 'línea 3', 'línea 4', 'línea 5', 'línea 6', 'línea 7', 'linea 1', 'linea 2', 'linea 3', 'linea 4', 'linea 5', 'linea 6', 'linea 7', 'l1', 'l2', 'l3', 'l4', 'l5', 'l6', 'l7'];

const AMBIGUOUS_STATIONS = new Set([
  'reforma', 'insurgentes', 'buenavista', 'hidalgo', 'guerrero',
  'balderas', 'tacubaya', 'auditorio', 'campo marte',
]);

const STRONG_METROBUS_KW = ['metrobús', 'metrobus', 'mb cdmx', 'línea', 'linea', 'corredor', 'estación del metrobús', 'estacion del metrobus', 'carril confinado'];

const PROXIMITY_THRESHOLD = 120;

let _stationIndex = null;

function getStationIndex() {
  if (_stationIndex) return _stationIndex;

  _stationIndex = {};
  for (const line of METROBUS_LINES) {
    for (const st of line.stations) {
      const baseName = st.name.replace(/\s*\(L[0-9]+\)\s*$/, '').trim();
      const key = normalizeForSearch(baseName);
      if (!_stationIndex[key]) {
        _stationIndex[key] = {
          name: baseName,
          id: st.id,
          lineId: line.id,
          lineName: line.name,
        };
      }
    }
  }
  return _stationIndex;
}

function normalizeForSearch(str) {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function findStationsInText(text, closurePositions = []) {
  const index = getStationIndex();
  const normalizedText = normalizeForSearch(text);
  const matches = [];
  const seen = new Set();
  const matchedRanges = [];

  const entries = Object.entries(index).sort((a, b) => b[0].length - a[0].length);

  const hasStrongContext = STRONG_METROBUS_KW.some(k => normalizedText.includes(normalizeForSearch(k)));

  for (const [key, station] of entries) {
    if (key.length < 4) continue;
    const pos = normalizedText.indexOf(key);
    if (pos === -1) continue;
    if (seen.has(station.name)) continue;

    const matchEnd = pos + key.length;
    const overlaps = matchedRanges.some(([rStart, rEnd]) =>
      (pos >= rStart && pos < rEnd) || (matchEnd > rStart && matchEnd <= rEnd)
    );
    if (overlaps) continue;

    const charBefore = pos > 0 ? normalizedText[pos - 1] : ' ';
    const charAfter = matchEnd < normalizedText.length ? normalizedText[matchEnd] : ' ';
    if (charBefore !== ' ' && charBefore !== '.' && charBefore !== ',') continue;
    if (charAfter !== ' ' && charAfter !== '.' && charAfter !== ',' && charAfter !== '\n') continue;

    let confidence = 0.5;

    if (closurePositions.length > 0) {
      const minDist = Math.min(...closurePositions.map(cp => Math.abs(cp - pos)));
      if (minDist <= PROXIMITY_THRESHOLD) {
        confidence += 0.3;
      } else {
        confidence -= 0.2;
      }
    }

    if (hasStrongContext) confidence += 0.2;

    if (AMBIGUOUS_STATIONS.has(key)) {
      confidence -= 0.3;
      const nearbyText = normalizedText.substring(Math.max(0, pos - 60), Math.min(normalizedText.length, matchEnd + 60));
      if (nearbyText.includes('estacion') || nearbyText.includes('metrobus')) {
        confidence += 0.2;
      }
    }

    if (confidence < 0.5) continue;

    matchedRanges.push([pos, matchEnd]);

    const start = Math.max(0, pos - 100);
    const end = Math.min(normalizedText.length, matchEnd + 100);
    const context = normalizedText.substring(start, end);

    matches.push({ station, context, matchPos: pos, confidence });
    seen.add(station.name);
  }

  return matches;
}

let _alerts = [];
let _closedStations = {};
let _listeners = new Set();
let _pollTimer = null;
let _lastFetch = null;
let _fetchLog = [];
let _initialized = false;

async function fetchWithProxy(url, timeoutMs = 10000) {
  for (const proxyFn of CORS_PROXIES) {
    try {
      const proxyUrl = proxyFn(url);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const resp = await fetch(proxyUrl, {
        signal: controller.signal,
        headers: { 'Accept': 'text/html,application/rss+xml,application/xml,text/xml,*/*' },
      });
      clearTimeout(timer);

      if (!resp.ok) continue;
      return await resp.text();
    } catch {
      continue;
    }
  }
  return null;
}

function parseRSSItems(xmlText) {
  const items = [];
  if (!xmlText) return items;

  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = itemRegex.exec(xmlText)) !== null) {
    const block = m[1];
    const title = (block.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '';
    const desc = (block.match(/<description[^>]*>([\s\S]*?)<\/description>/i) || [])[1] || '';
    const pubDate = (block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i) || [])[1] || '';
    const link = (block.match(/<link[^>]*>([\s\S]*?)<\/link>/i) || [])[1] || '';

    const cleanTitle = title.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, '').trim();
    const cleanDesc = desc.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, '').trim();

    items.push({
      title: cleanTitle,
      description: cleanDesc,
      text: `${cleanTitle} ${cleanDesc}`,
      pubDate: pubDate ? new Date(pubDate) : null,
      link: link.trim(),
    });
  }

  return items;
}

function analyzeText(text, sourceName) {
  const alerts = [];
  const lower = text.toLowerCase();
  const normalized = normalizeForSearch(text);

  const isMetrobusRelated = lower.includes('metrobús') || lower.includes('metrobus') || lower.includes('mb') ||
    KW_LINE.some(k => lower.includes(k));
  if (!isMetrobusRelated) return alerts;

  const isRestoration = KW_RESTORE.some(k => lower.includes(k));
  if (isRestoration) return alerts;

  const isClosure = KW_CLOSURE.some(k => lower.includes(k));
  const isDelay = KW_DELAY.some(k => lower.includes(k));

  if (!isClosure && !isDelay) return alerts;

  const keywordPositions = [];
  const kwList = isClosure ? KW_CLOSURE : KW_DELAY;
  for (const kw of kwList) {
    const kwNorm = normalizeForSearch(kw);
    let searchFrom = 0;
    while (true) {
      const pos = normalized.indexOf(kwNorm, searchFrom);
      if (pos === -1) break;
      keywordPositions.push(pos);
      searchFrom = pos + kwNorm.length;
    }
  }

  const stationMatches = findStationsInText(text, keywordPositions);

  if (stationMatches.length > 0) {
    for (const match of stationMatches) {
      const effectiveType = (isClosure && match.confidence >= 0.7) ? 'closure' : 'delay';
      const effectiveSeverity = effectiveType === 'closure' ? 'critical' : 'medium';

      alerts.push({
        id: `live-${sourceName}-${match.station.id}-${Date.now()}`,
        stationName: match.station.name,
        stationId: match.station.id,
        lineId: match.station.lineId,
        type: effectiveType,
        severity: effectiveSeverity,
        confidence: match.confidence,
        message: effectiveType === 'closure'
          ? `Estación ${match.station.name} reportada cerrada. Fuente: ${sourceName}`
          : `Posibles demoras en estación ${match.station.name}. Fuente: ${sourceName}`,
        source: sourceName,
        isLive: true,
        fetchedAt: new Date().toISOString(),
      });
    }
  } else {
    const lineMatch = KW_LINE.find(k => lower.includes(k));
    if (lineMatch && isClosure) {
      alerts.push({
        id: `live-${sourceName}-line-${Date.now()}`,
        stationName: null,
        stationId: null,
        lineId: null,
        type: 'service_change',
        severity: 'high',
        message: text.length > 200 ? text.substring(0, 200) + '…' : text,
        source: sourceName,
        isLive: true,
        fetchedAt: new Date().toISOString(),
      });
    }
  }

  return alerts;
}

async function fetchSource(source) {
  const raw = await fetchWithProxy(source.url);
  if (!raw) return { source: source.id, alerts: [], error: 'All proxies failed' };

  let alerts = [];

  if (source.type === 'rss') {
    const items = parseRSSItems(raw);
    const cutoff = new Date(Date.now() - 6 * 60 * 60 * 1000);
    for (const item of items) {
      if (item.pubDate && item.pubDate < cutoff) continue;
      const found = analyzeText(item.text, source.name);
      alerts.push(...found);
    }
  } else if (source.type === 'html') {
    const textContent = raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    const found = analyzeText(textContent, source.name);
    alerts.push(...found);
  }

  return { source: source.id, alerts, error: null, itemCount: alerts.length };
}

function loadLocalFallback() {
  const results = [];
  if (!localAlertsData?.alerts) return results;

  for (const alert of localAlertsData.alerts) {
    if (!alert.active) continue;
    if (alert.endDate && new Date() > new Date(alert.endDate)) continue;

    results.push({
      id: alert.id,
      stationName: alert.stationName,
      stationId: alert.stationId,
      lineId: alert.lineId,
      type: alert.type,
      severity: alert.severity,
      message: alert.message,
      source: alert.source || 'Local (respaldo)',
      isLocal: true,
      fetchedAt: localAlertsData.lastUpdated,
    });
  }

  if (localAlertsData.serviceChanges) {
    for (const svc of localAlertsData.serviceChanges) {
      if (!svc.active) continue;
      results.push({
        id: svc.id,
        stationName: null,
        stationId: null,
        lineId: svc.lineId,
        type: svc.type,
        severity: 'high',
        message: svc.message,
        affectedStations: svc.affectedStations || [],
        source: 'Local (respaldo)',
        isLocal: true,
        fetchedAt: localAlertsData.lastUpdated,
      });
    }
  }

  return results;
}

function deduplicateAlerts(alerts) {
  const seen = new Map();
  const sevOrder = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };

  for (const alert of alerts) {
    if (alert.isRestoration) continue;

    const key = alert.stationName || alert.stationId || alert.id;
    const existing = seen.get(key);
    if (existing) {
      if ((sevOrder[alert.severity] || 0) > (sevOrder[existing.severity] || 0)) {
        seen.set(key, alert);
      }
    } else {
      seen.set(key, alert);
    }
  }

  return [...seen.values()];
}

function buildClosedIndex(alerts) {
  const closed = {};
  for (const alert of alerts) {
    if (alert.type === 'closure') {
      if (alert.stationName) closed[alert.stationName] = alert;
      if (alert.stationId) closed[alert.stationId] = alert;
    }
    if (alert.affectedStations) {
      for (const stId of alert.affectedStations) {
        closed[stId] = alert;
      }
    }
  }
  return closed;
}

async function fetchFromAPI() {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    const resp = await fetch('/api/alerts', { signal: controller.signal });
    clearTimeout(timer);
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
}

async function _poll() {
  const logEntry = { time: new Date(), sources: [], liveAlertCount: 0, usedFallback: false };
  let allLiveAlerts = [];

  const apiResult = await fetchFromAPI();
  if (apiResult && apiResult.items && apiResult.items.length > 0) {
    for (const src of (apiResult.sources || [])) {
      logEntry.sources.push({ source: src.name || src.id, count: src.count || 0, error: src.error });
    }
    for (const item of apiResult.items) {
      const found = analyzeText(item.text || '', item.source || 'API');
      allLiveAlerts.push(...found);
    }
  }

  if (allLiveAlerts.length === 0) {
    const results = await Promise.allSettled(
      LIVE_SOURCES.map(src => fetchSource(src))
    );
    for (const result of results) {
      if (result.status === 'fulfilled') {
        const { source, alerts, error, itemCount } = result.value;
        logEntry.sources.push({ source, count: itemCount || 0, error });
        allLiveAlerts.push(...alerts);
      } else {
        logEntry.sources.push({ source: '?', count: 0, error: result.reason?.message });
      }
    }
  }

  logEntry.liveAlertCount = allLiveAlerts.length;

  if (allLiveAlerts.length === 0) {
    const fallback = loadLocalFallback();
    allLiveAlerts.push(...fallback);
    logEntry.usedFallback = true;
  }

  const localAlerts = loadLocalFallback();
  allLiveAlerts.push(...localAlerts);

  _alerts = deduplicateAlerts(allLiveAlerts);
  _closedStations = buildClosedIndex(_alerts);
  _lastFetch = new Date();
  _initialized = true;

  _fetchLog.push(logEntry);
  if (_fetchLog.length > 20) _fetchLog.shift();

  _listeners.forEach(fn => fn({
    alerts: _alerts,
    closedStations: _closedStations,
    lastFetch: _lastFetch,
    fetchLog: _fetchLog,
  }));
}

export function startAlertPolling(intervalMs = POLL_INTERVAL_MS) {
  if (_pollTimer) return;

  if (!_initialized) {
    const fallback = loadLocalFallback();
    if (fallback.length > 0) {
      _alerts = deduplicateAlerts(fallback);
      _closedStations = buildClosedIndex(_alerts);
      _initialized = true;
      _listeners.forEach(fn => fn({
        alerts: _alerts,
        closedStations: _closedStations,
        lastFetch: _lastFetch,
        fetchLog: _fetchLog,
      }));
    }
  }

  _poll();
  _pollTimer = setInterval(_poll, intervalMs);
}

export function stopAlertPolling() {
  if (_pollTimer) {
    clearInterval(_pollTimer);
    _pollTimer = null;
  }
}

export function onAlertUpdate(callback) {
  _listeners.add(callback);
  if (_initialized) {
    callback({
      alerts: _alerts,
      closedStations: _closedStations,
      lastFetch: _lastFetch,
      fetchLog: _fetchLog,
    });
  }
  return () => _listeners.delete(callback);
}

export function getStationAlert(stationName, stationId) {
  if (!_initialized) {
    const fallback = loadLocalFallback();
    _alerts = deduplicateAlerts(fallback);
    _closedStations = buildClosedIndex(_alerts);
  }
  if (stationName && _closedStations[stationName]) return _closedStations[stationName];
  if (stationId && _closedStations[stationId]) return _closedStations[stationId];
  return null;
}

export function getClosedStationNames() {
  const names = new Set();
  for (const alert of _alerts) {
    if (alert.type === 'closure' && alert.stationName) names.add(alert.stationName);
  }
  return names;
}

export function getAllAlerts() {
  if (!_initialized) {
    const fallback = loadLocalFallback();
    _alerts = deduplicateAlerts(fallback);
    _closedStations = buildClosedIndex(_alerts);
  }
  return _alerts;
}

export function getAlertDiagnostics() {
  return {
    alertCount: _alerts.length,
    closedCount: Object.keys(_closedStations).length,
    lastFetch: _lastFetch,
    fetchLog: _fetchLog.slice(-5),
    sources: LIVE_SOURCES.map(s => ({ id: s.id, name: s.name, priority: s.priority })),
    stationIndexSize: Object.keys(getStationIndex()).length,
    initialized: _initialized,
  };
}
