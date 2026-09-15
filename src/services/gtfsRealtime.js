import GtfsRealtimeBindings from 'gtfs-realtime-bindings';
import { loadShapes, getRandomPointOnLine, getNextPointOnRoute, interpolateAlongRoute, getLineNumberFromRouteId, isValidRouteId } from './gtfsShapes';

const AUTH_ENDPOINT = '/auth-proxy/gtfs-api/partnerValidation';

const API_USERNAME = import.meta.env.VITE_METROBUS_USERNAME;
const API_PASSWORD = import.meta.env.VITE_METROBUS_PASSWORD;

let realtimeUrl = null;
let staticUrl = null;
let urlExpiry = null;
let lastAuthResponse = null;

let vehiclePositionsCache = [];
let tripUpdatesCache = [];
let alertsCache = [];
let listeners = [];
let pollingInterval = null;
const POLL_INTERVAL = 30000;
let simulatedVehicles = [];
let shapesLoaded = false;
let animationFrame = null;

async function authenticate() {
  if (!API_USERNAME || !API_PASSWORD) {
    console.warn('No API credentials configured. Using simulated data.');
    return null;
  }

  if (realtimeUrl && urlExpiry && Date.now() < urlExpiry - 60000) {
    return lastAuthResponse;
  }

  try {
    const response = await fetch(AUTH_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        usuario: API_USERNAME,
        senha: API_PASSWORD
      })
    });

    if (!response.ok) {
      throw new Error(`Authentication failed: ${response.status}`);
    }

    const data = await response.json();
    
    realtimeUrl = data.urlRealTime;
    staticUrl = data.urlStatic;
    
    if (data.expirationDateTime) {
      const expirationParts = data.expirationDateTime.split(/[- :]/);
      const expirationDate = new Date(
        expirationParts[0],
        expirationParts[1] - 1,
        expirationParts[2],
        expirationParts[3],
        expirationParts[4],
        expirationParts[5]
      );
      urlExpiry = expirationDate.getTime();
    } else {
      urlExpiry = Date.now() + (9 * 60 * 1000);
    }
    
    lastAuthResponse = data;
    
    console.log('✅ Autenticación exitosa con API del Metrobús');
    console.log(`🔗 URL GTFS-RT válida hasta: ${data.expirationDateTime || 'próximos 9 min'}`);
    
    return data;
  } catch (error) {
    console.error('Error authenticating with GTFS API:', error);
    return null;
  }
}

async function fetchGTFSRTData() {
  const authData = await authenticate();
  
  if (!authData || !authData.urlRealTime) {
    return null;
  }

  try {
    const proxyUrl = authData.urlRealTime.replace('https://sonda-gtfs-prd.s3.amazonaws.com', '/gtfs-proxy');
    const response = await fetch(proxyUrl);

    if (!response.ok) {
      if (response.status === 403 || response.status === 401) {
        realtimeUrl = null;
        urlExpiry = null;
        return await fetchGTFSRTData();
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const buffer = await response.arrayBuffer();
    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
      new Uint8Array(buffer)
    );

    return feed;
  } catch (error) {
    console.error('Error fetching GTFS-RT data:', error);
    return null;
  }
}

async function initializeSimulatedVehicles() {
  if (!shapesLoaded) {
    await loadShapes();
    shapesLoaded = true;
  }

  const vehicles = [];
  const linesData = [
    { line: '1', count: 12 },
    { line: '2', count: 8 },
    { line: '3', count: 10 },
    { line: '4', count: 9 },
    { line: '5', count: 7 },
    { line: '6', count: 6 },
    { line: '7', count: 11 }
  ];

  for (const lineData of linesData) {
    for (let i = 0; i < lineData.count; i++) {
      const pointOnLine = getRandomPointOnLine(lineData.line);
      
      if (!pointOnLine) continue;
      
      vehicles.push({
        id: `${lineData.line}-${String(i + 1).padStart(3, '0')}`,
        line: pointOnLine.lineNumber,
        color: pointOnLine.color,
        routeId: pointOnLine.routeId,
        lat: pointOnLine.lat,
        lng: pointOnLine.lng,
        bearing: pointOnLine.bearing,
        speed: 12 + Math.random() * 20,
        occupancy: Math.floor(Math.random() * 100),
        timestamp: Date.now(),
        shapeIndex: pointOnLine.shapeIndex,
        totalPoints: pointOnLine.totalPoints,
        progress: 0,
        targetSpeed: 12 + Math.random() * 20,
        forward: Math.random() > 0.5
      });
    }
  }

  simulatedVehicles = vehicles;
  startVehicleAnimation();
  return vehicles;
}

function startVehicleAnimation() {
  if (animationFrame) return;
  
  let lastTime = Date.now();
  
  const animate = () => {
    const now = Date.now();
    const deltaTime = (now - lastTime) / 1000;
    lastTime = now;
    
    for (const vehicle of simulatedVehicles) {
      const speedKmh = vehicle.speed;
      const speedPerSecond = speedKmh / 3600;
      const distancePerFrame = speedPerSecond * deltaTime;
      
      vehicle.progress += distancePerFrame * 100;
      
      if (vehicle.progress >= 1) {
        vehicle.progress = 0;
        const nextPoint = getNextPointOnRoute(vehicle.routeId, vehicle.shapeIndex, vehicle.forward);
        
        if (nextPoint) {
          vehicle.shapeIndex = nextPoint.shapeIndex;
          vehicle.lat = nextPoint.lat;
          vehicle.lng = nextPoint.lng;
          vehicle.bearing = nextPoint.bearing;
          vehicle.totalPoints = nextPoint.totalPoints;
        }
      } else {
        const interpolated = interpolateAlongRoute(vehicle.routeId, vehicle.shapeIndex, vehicle.progress);
        if (interpolated) {
          vehicle.lat = interpolated.lat;
          vehicle.lng = interpolated.lng;
          vehicle.bearing = interpolated.bearing;
        }
      }
      
      vehicle.speed += (vehicle.targetSpeed - vehicle.speed) * 0.1;
      
      if (Math.random() < 0.01) {
        vehicle.targetSpeed = 8 + Math.random() * 25;
      }
      
      vehicle.timestamp = now;
    }
    
    animationFrame = requestAnimationFrame(animate);
  };
  
  animate();
}

function stopVehicleAnimation() {
  if (animationFrame) {
    cancelAnimationFrame(animationFrame);
    animationFrame = null;
  }
}

async function updateVehiclePositions() {
  const feed = await fetchGTFSRTData();
  
  if (!feed) {
    if (simulatedVehicles.length === 0) {
      await initializeSimulatedVehicles();
    }
    vehiclePositionsCache = simulatedVehicles;
    notifyListeners();
    return;
  }

  if (!shapesLoaded) {
    await loadShapes();
    shapesLoaded = true;
  }

  vehiclePositionsCache = feed.entity
    .filter(entity => {
      if (!entity.vehicle || !entity.vehicle.position) return false;
      
      const vehicle = entity.vehicle;
      const position = vehicle.position;
      const routeId = vehicle.trip?.routeId;
      
      if (!routeId || !isValidRouteId(routeId)) return false;
      
      const lat = position.latitude;
      const lng = position.longitude;
      
      if (!lat || !lng) return false;
      if (lat < 19.1 || lat > 19.7 || lng < -99.35 || lng > -98.95) return false;
      
      return true;
    })
    .map(entity => {
      const vehicle = entity.vehicle;
      const position = vehicle.position;
      const routeId = vehicle.trip?.routeId;
      let lineNumber = getLineNumberFromRouteId(routeId);
      
      if (!lineNumber && routeId) {
        const match = routeId.match(/L(\d+)/);
        if (match) lineNumber = match[1];
      }
      
      if (!lineNumber) lineNumber = 'unknown';
      
      return {
        id: entity.id,
        vehicleId: vehicle.vehicle?.id || entity.id,
        line: lineNumber,
        routeId: routeId,
        lat: position.latitude,
        lng: position.longitude,
        bearing: position.bearing || 0,
        speed: position.speed || 0,
        occupancy: getOccupancyPercentage(vehicle.occupancyStatus),
        timestamp: vehicle.timestamp ? vehicle.timestamp.toNumber() * 1000 : Date.now(),
        tripId: vehicle.trip?.tripId,
        currentStopSequence: vehicle.currentStopSequence,
        currentStatus: vehicle.currentStatus,
        congestionLevel: vehicle.congestionLevel
      };
    })
    .filter(bus => bus.line !== 'unknown');

  notifyListeners();
}

async function updateTripUpdates() {
  const feed = await fetchGTFSRTData();
  
  if (!feed) {
    tripUpdatesCache = [];
    return;
  }

  tripUpdatesCache = feed.entity
    .filter(entity => entity.tripUpdate)
    .map(entity => {
      const tripUpdate = entity.tripUpdate;
      
      return {
        id: entity.id,
        tripId: tripUpdate.trip?.tripId,
        routeId: tripUpdate.trip?.routeId,
        stopTimeUpdates: tripUpdate.stopTimeUpdate?.map(update => ({
          stopSequence: update.stopSequence,
          stopId: update.stopId,
          arrival: update.arrival ? {
            delay: update.arrival.delay || 0,
            time: update.arrival.time ? update.arrival.time.toNumber() * 1000 : null
          } : null,
          departure: update.departure ? {
            delay: update.departure.delay || 0,
            time: update.departure.time ? update.departure.time.toNumber() * 1000 : null
          } : null
        })) || []
      };
    });

  notifyListeners();
}

async function updateAlerts() {
  alertsCache = [];
}

function getTranslatedText(translatedText) {
  if (!translatedText || !translatedText.translation || translatedText.translation.length === 0) {
    return '';
  }
  
  const spanish = translatedText.translation.find(t => t.language === 'es');
  if (spanish) return spanish.text;
  
  return translatedText.translation[0].text || '';
}

function getOccupancyPercentage(occupancyStatus) {
  if (!occupancyStatus) return 50;
  
  const occupancyMap = {
    0: 10,
    1: 30,
    2: 50,
    3: 70,
    4: 85,
    5: 95,
    6: 100,
    7: 0,
    8: 0
  };
  
  return occupancyMap[occupancyStatus] || 50;
}

function notifyListeners() {
  listeners.forEach(callback => {
    callback({
      vehicles: vehiclePositionsCache,
      tripUpdates: tripUpdatesCache,
      alerts: alertsCache
    });
  });
}

export function startRealtimePolling() {
  if (pollingInterval) {
    return;
  }

  updateVehiclePositions();
  updateTripUpdates();
  updateAlerts();

  pollingInterval = setInterval(() => {
    updateVehiclePositions();
    updateTripUpdates();
    updateAlerts();
  }, POLL_INTERVAL);
}

export function stopRealtimePolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
  stopVehicleAnimation();
}

export function onRealtimeUpdate(callback) {
  listeners.push(callback);
  
  if (vehiclePositionsCache.length > 0 || tripUpdatesCache.length > 0 || alertsCache.length > 0) {
    callback({
      vehicles: vehiclePositionsCache,
      tripUpdates: tripUpdatesCache,
      alerts: alertsCache
    });
  }
  
  return () => {
    listeners = listeners.filter(cb => cb !== callback);
  };
}

export function getVehiclePositions() {
  return vehiclePositionsCache;
}

export function getTripUpdates() {
  return tripUpdatesCache;
}

export function getAlerts() {
  return alertsCache;
}

export function getETAForStation(stationId, lineId) {
  const relevantUpdates = tripUpdatesCache.filter(update => 
    update.routeId === lineId
  );

  const arrivals = [];
  
  for (const update of relevantUpdates) {
    for (const stopUpdate of update.stopTimeUpdates) {
      if (stopUpdate.stopId === stationId && stopUpdate.arrival) {
        arrivals.push({
          tripId: update.tripId,
          arrivalTime: stopUpdate.arrival.time,
          delay: stopUpdate.arrival.delay,
          minutesAway: stopUpdate.arrival.time 
            ? Math.max(0, Math.round((stopUpdate.arrival.time - Date.now()) / 60000))
            : null
        });
      }
    }
  }

  arrivals.sort((a, b) => (a.arrivalTime || Infinity) - (b.arrivalTime || Infinity));
  
  return arrivals.slice(0, 3);
}
