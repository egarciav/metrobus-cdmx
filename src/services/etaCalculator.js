/**
 * ETA Calculator Service for Metrobús CDMX
 *
 * Estimates travel time between stations using:
 * - Haversine distance between stations
 * - Average Metrobús speed (18 km/h with traffic)
 * - Time-of-day congestion factor + context factors
 * - Stop time at intermediate stations
 * - BFS graph search for multi-transfer routes
 * - Delay prediction integration
 */

import { METROBUS_LINES } from '../data/metrobusLines';
import {
  AVG_METROBUS_SPEED_KMH,
  AVG_METROBUS_STOP_TIME_S,
} from '../utils/constants';
import {
  haversineDistance,
  estimateTravelTime,
  getCongestionFactor,
} from '../utils/helpers';
import { getFullContext } from './contextData';
import { predictRouteDelay } from './delayPredictor';

const TRANSFER_WALK_MINUTES = 4;

export function getEnhancedCongestion() {
  const baseCongestion = getCongestionFactor();
  const context = getFullContext();
  return {
    factor: Math.round(baseCongestion * context.combinedFactor * 100) / 100,
    baseFactor: baseCongestion,
    contextFactor: context.combinedFactor,
    context,
  };
}

let _graph = null;
let _stationMap = null;

function normalizeStationName(name) {
  return name.replace(/\s*\(L[0-9]+\)\s*$/, '').trim();
}

function buildGraph() {
  const lines = METROBUS_LINES;
  const graph = {};
  const stationMap = {};

  for (const line of lines) {
    for (let i = 0; i < line.stations.length; i++) {
      const s = line.stations[i];
      const key = normalizeStationName(s.name);

      if (!graph[key]) graph[key] = [];
      if (!stationMap[key]) {
        stationMap[key] = {
          name: key,
          originalNames: new Set(),
          lat: s.lat,
          lng: s.lng,
          lineIds: {},
          lines: []
        };
      }
      
      stationMap[key].originalNames.add(s.name);
      stationMap[key].lineIds[line.id] = s.id;
      stationMap[key].lines.push({ lineId: line.id, stationId: s.id });

      if (i > 0) {
        const prev = line.stations[i - 1];
        const prevKey = normalizeStationName(prev.name);
        const dist = haversineDistance(s.lat, s.lng, prev.lat, prev.lng);
        
        graph[key].push({ neighbor: prevKey, lineId: line.id, lineObj: line, distKm: dist });
        if (!graph[prevKey]) graph[prevKey] = [];
        graph[prevKey].push({ neighbor: key, lineId: line.id, lineObj: line, distKm: dist });
      }
    }
  }

  _graph = graph;
  _stationMap = stationMap;
  return { graph, stationMap };
}

function getGraph() {
  if (!_graph) buildGraph();
  return { graph: _graph, stationMap: _stationMap };
}

function findRouteOnLine(line, originId, destId) {
  const stations = line.stations;
  const originIdx = stations.findIndex((s) => s.id === originId);
  const destIdx = stations.findIndex((s) => s.id === destId);

  if (originIdx === -1 || destIdx === -1) return null;

  const start = Math.min(originIdx, destIdx);
  const end = Math.max(originIdx, destIdx);
  const routeStations = stations.slice(start, end + 1);

  let totalDistance = 0;
  for (let i = 0; i < routeStations.length - 1; i++) {
    totalDistance += haversineDistance(
      routeStations[i].lat,
      routeStations[i].lng,
      routeStations[i + 1].lat,
      routeStations[i + 1].lng,
    );
  }

  return {
    stations: routeStations,
    distanceKm: totalDistance,
    stops: routeStations.length - 1,
  };
}

export function calculateDirectETA(originId, destId) {
  const lines = METROBUS_LINES;
  const avgSpeed = AVG_METROBUS_SPEED_KMH;
  const stopTime = AVG_METROBUS_STOP_TIME_S;

  for (const line of lines) {
    const route = findRouteOnLine(line, originId, destId);
    if (route) {
      const { factor: congestion } = getEnhancedCongestion();
      const adjustedSpeed = avgSpeed / congestion;
      const travelTime = estimateTravelTime(
        route.distanceKm,
        adjustedSpeed,
        stopTime * route.stops,
      );

      // Enforce minimum 1 min between adjacent stations (BRT physical minimum)
      const totalSec = travelTime.minutes * 60 + travelTime.seconds;
      const minSec = route.stops * 60; // at least 1 min per hop
      const finalSec = Math.max(totalSec, minSec);
      const finalMin = Math.floor(finalSec / 60);
      const finalRemSec = finalSec % 60;

      return {
        line: line,
        origin: route.stations[0],
        destination: route.stations[route.stations.length - 1],
        intermediateStations: route.stations.slice(1, -1),
        distanceKm: Math.round(route.distanceKm * 100) / 100,
        stops: route.stops,
        estimatedMinutes: finalMin,
        estimatedSeconds: finalRemSec,
        congestionFactor: congestion,
        system: 'metrobus',
      };
    }
  }

  return null;
}

export function findMultiTransferRoute(originName, destName, maxAlternatives = 3) {
  const { graph, stationMap } = getGraph();

  if (!graph[originName] || !graph[destName]) return null;

  const originInfo = stationMap[originName];
  if (!originInfo) return null;

  const queue = [];
  const visited = new Map();
  const foundRoutes = [];

  for (const li of originInfo.lines) {
    queue.push({
      station: originName,
      lineId: li.lineId,
      path: [{ station: originName, lineId: li.lineId }],
      transfers: 0,
      distance: 0,
    });
  }

  let minTransfersFound = Infinity;

  while (queue.length > 0) {
    queue.sort((a, b) => {
      if (a.transfers !== b.transfers) return a.transfers - b.transfers;
      if (Math.abs(a.distance - b.distance) > 0.01) return a.distance - b.distance;
      return a.path.length - b.path.length;
    });

    const current = queue.shift();

    if (current.station === destName) {
      const transferPattern = extractTransferPattern(current.path);
      const isDuplicate = foundRoutes.some(r =>
        extractTransferPattern(r.path) === transferPattern
      );

      if (!isDuplicate) {
        foundRoutes.push(current);
        minTransfersFound = Math.min(minTransfersFound, current.transfers);
      }

      if (foundRoutes.length >= maxAlternatives * 2) break;
      continue;
    }

    if (minTransfersFound < Infinity && current.transfers > minTransfersFound + 1) continue;
    if (current.transfers > 3) continue;

    const visitKey = `${current.station}|${current.lineId}`;
    const prevVisit = visited.get(visitKey);
    if (prevVisit &&
        (prevVisit.transfers < current.transfers ||
         (prevVisit.transfers === current.transfers && prevVisit.distance <= current.distance))) {
      continue;
    }
    visited.set(visitKey, { transfers: current.transfers, distance: current.distance });

    const neighbors = graph[current.station] || [];
    for (const edge of neighbors) {
      const isSameLine = edge.lineId === current.lineId;
      const isTransfer = !isSameLine;

      if (isTransfer) {
        const stationInfo = stationMap[current.station];
        const hasThisLine = stationInfo && stationInfo.lines.some(l => l.lineId === edge.lineId);
        if (!hasThisLine) continue;
      }

      const newTransfers = current.transfers + (isTransfer ? 1 : 0);
      const newDistance = current.distance + edge.distKm;

      if (minTransfersFound < Infinity && newTransfers > minTransfersFound + 1) continue;

      queue.push({
        station: edge.neighbor,
        lineId: edge.lineId,
        path: [...current.path, { station: edge.neighbor, lineId: edge.lineId }],
        transfers: newTransfers,
        distance: newDistance,
      });
    }
  }

  if (foundRoutes.length === 0) return null;

  foundRoutes.sort((a, b) => {
    if (a.transfers !== b.transfers) return a.transfers - b.transfers;
    return a.distance - b.distance;
  });

  return foundRoutes.slice(0, maxAlternatives);
}

function extractTransferPattern(path) {
  const parts = [];
  let prevLine = null;
  for (const step of path) {
    if (step.lineId !== prevLine) {
      if (prevLine !== null) {
        parts.push(step.station);
      }
      parts.push(step.lineId);
      prevLine = step.lineId;
    }
  }
  return parts.join('→');
}

function computeRouteETA(route, stationMap, lines) {
  const legs = [];
  let currentLeg = { lineId: route.path[0].lineId, stations: [route.path[0].station] };

  for (let i = 1; i < route.path.length; i++) {
    if (route.path[i].lineId === currentLeg.lineId) {
      currentLeg.stations.push(route.path[i].station);
    } else {
      legs.push(currentLeg);
      currentLeg = { lineId: route.path[i].lineId, stations: [route.path[i - 1].station, route.path[i].station] };
    }
  }
  legs.push(currentLeg);

  const legResults = [];
  let totalDistanceKm = 0;
  let totalStops = 0;
  let totalSeconds = 0;
  const lineIdsUsed = [];

  for (const leg of legs) {
    if (leg.stations.length < 2) continue;

    const line = lines.find((l) => l.id === leg.lineId);
    if (!line) continue;

    lineIdsUsed.push(leg.lineId);

    const originSt = stationMap[leg.stations[0]];
    const destSt = stationMap[leg.stations[leg.stations.length - 1]];
    if (!originSt || !destSt) continue;

    const oId = originSt.lineIds[leg.lineId];
    const dId = destSt.lineIds[leg.lineId];
    if (!oId || !dId) continue;

    const eta = calculateDirectETA(oId, dId);
    if (eta) {
      legResults.push(eta);
      totalDistanceKm += eta.distanceKm;
      totalStops += eta.stops;
      totalSeconds += eta.estimatedMinutes * 60 + eta.estimatedSeconds;
    }
  }

  if (legResults.length === 0) return null;

  const transferCount = Math.max(0, legResults.length - 1);
  const transferTimeSeconds = transferCount * TRANSFER_WALK_MINUTES * 60;
  totalSeconds += transferTimeSeconds;

  const delayPrediction = predictRouteDelay(lineIdsUsed);
  if (delayPrediction && delayPrediction.estimatedExtraMinutes > 0) {
    totalSeconds += delayPrediction.estimatedExtraMinutes * 60;
  }

  const totalMinutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;

  const transferStations = [];
  for (let i = 0; i < legResults.length - 1; i++) {
    const lastStation = legResults[i].destination;
    transferStations.push(normalizeStationName(lastStation.name));
  }

  return {
    type: transferCount === 1 ? 'transfer' : 'multi-transfer',
    legs: legResults,
    transferStations,
    transferCount,
    transferTimeMinutes: transferCount * TRANSFER_WALK_MINUTES,
    totalMinutes,
    totalSeconds: remainingSeconds,
    totalDistanceKm: Math.round(totalDistanceKm * 100) / 100,
    totalStops,
    delayPrediction,
    lineIdsUsed: [...new Set(lineIdsUsed)],
  };
}

export function calculateMultiTransferETA(originName, destName) {
  const routes = findMultiTransferRoute(originName, destName);
  if (!routes || routes.length === 0) return null;

  const { stationMap } = getGraph();
  const lines = METROBUS_LINES;

  let bestETA = null;
  let bestTime = Infinity;

  for (const route of routes) {
    if (route.path.length < 2) continue;
    const eta = computeRouteETA(route, stationMap, lines);
    if (!eta) continue;
    const totalTime = eta.totalMinutes * 60 + eta.totalSeconds;
    if (totalTime < bestTime) {
      bestTime = totalTime;
      bestETA = eta;
    }
  }

  return bestETA;
}

export function calculateETA(originId, destId) {
  const direct = calculateDirectETA(originId, destId);
  if (direct) {
    const delayPrediction = predictRouteDelay([direct.line.id]);
    return { type: 'direct', ...direct, delayPrediction };
  }

  const lines = METROBUS_LINES;
  let originName = null;
  let destName = null;

  for (const line of lines) {
    for (const s of line.stations) {
      if (s.id === originId) originName = normalizeStationName(s.name);
      if (s.id === destId) destName = normalizeStationName(s.name);
    }
  }

  if (!originName || !destName) return null;

  const multiRoute = calculateMultiTransferETA(originName, destName);
  if (multiRoute) return multiRoute;

  return null;
}
