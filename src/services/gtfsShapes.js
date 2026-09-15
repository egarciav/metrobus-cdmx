let shapesData = null;
let routeShapes = {};
let routeMetadata = {};
let routeIdToLine = {};

export async function loadShapes() {
  if (shapesData) return shapesData;

  try {
    const response = await fetch('/gtfs/shapes.txt');
    const text = await response.text();
    const lines = text.split('\n');
    const headers = lines[0].split(',');
    
    const shapes = {};
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = line.split(',');
      const shapeId = values[0];
      const lat = parseFloat(values[1]);
      const lon = parseFloat(values[2]);
      const sequence = parseInt(values[3]);
      
      if (!shapeId || isNaN(lat) || isNaN(lon)) continue;
      
      if (!shapes[shapeId]) {
        shapes[shapeId] = [];
      }
      
      shapes[shapeId].push({ lat, lon, sequence });
    }
    
    for (const shapeId in shapes) {
      shapes[shapeId].sort((a, b) => a.sequence - b.sequence);
    }
    
    shapesData = shapes;
    
    const response2 = await fetch('/gtfs/routes.txt');
    const text2 = await response2.text();
    const routeLines = text2.split('\n');
    
    for (let i = 1; i < routeLines.length; i++) {
      const line = routeLines[i].trim();
      if (!line) continue;
      
      const values = line.split(',');
      const routeId = values[0];
      const lineNumber = values[2];
      const routeColor = values[7] ? `#${values[7]}` : null;
      
      if (!lineNumber) continue;
      
      if (!routeShapes[lineNumber]) {
        routeShapes[lineNumber] = [];
      }
      
      if (shapes[routeId]) {
        const routeData = {
          routeId,
          lineNumber,
          color: routeColor,
          points: shapes[routeId]
        };
        routeShapes[lineNumber].push(routeData);
        routeMetadata[routeId] = routeData;
        routeIdToLine[routeId] = lineNumber;
      }
    }
    
    return shapesData;
  } catch (error) {
    console.error('Error loading shapes:', error);
    return null;
  }
}

export function getShapeForLine(lineNumber) {
  const routes = routeShapes[lineNumber];
  if (!routes || routes.length === 0) return null;
  return routes;
}

export function getShapeForRoute(routeId) {
  const route = routeMetadata[routeId];
  if (!route) return null;
  return route.points;
}

export function getRandomPointOnLine(lineNumber) {
  const routes = getShapeForLine(lineNumber);
  if (!routes || routes.length === 0) return null;
  
  const randomRoute = routes[Math.floor(Math.random() * routes.length)];
  const shape = randomRoute.points;
  
  const randomIndex = Math.floor(Math.random() * shape.length);
  const point = shape[randomIndex];
  
  let bearing = 0;
  if (randomIndex < shape.length - 1) {
    const next = shape[randomIndex + 1];
    bearing = calculateBearing(point.lat, point.lon, next.lat, next.lon);
  } else if (randomIndex > 0) {
    const prev = shape[randomIndex - 1];
    bearing = calculateBearing(prev.lat, prev.lon, point.lat, point.lon);
  }
  
  return {
    lat: point.lat,
    lng: point.lon,
    bearing,
    shapeIndex: randomIndex,
    totalPoints: shape.length,
    routeId: randomRoute.routeId,
    lineNumber: randomRoute.lineNumber,
    color: randomRoute.color
  };
}

export function getNextPointOnRoute(routeId, currentIndex, forward = true) {
  const shape = getShapeForRoute(routeId);
  if (!shape || shape.length === 0) return null;
  
  let nextIndex;
  if (forward) {
    nextIndex = (currentIndex + 1) % shape.length;
  } else {
    nextIndex = (currentIndex - 1 + shape.length) % shape.length;
  }
  
  const point = shape[nextIndex];
  const prevPoint = shape[currentIndex];
  
  const bearing = calculateBearing(prevPoint.lat, prevPoint.lon, point.lat, point.lon);
  
  return {
    lat: point.lat,
    lng: point.lon,
    bearing,
    shapeIndex: nextIndex,
    totalPoints: shape.length
  };
}

export function interpolateAlongRoute(routeId, startIndex, progress) {
  const shape = getShapeForRoute(routeId);
  if (!shape || shape.length === 0) return null;
  
  const nextIndex = (startIndex + 1) % shape.length;
  const start = shape[startIndex];
  const end = shape[nextIndex];
  
  const lat = start.lat + (end.lat - start.lat) * progress;
  const lng = start.lon + (end.lon - start.lon) * progress;
  const bearing = calculateBearing(start.lat, start.lon, end.lat, end.lon);
  
  return { lat, lng, bearing };
}

export function getLineNumberFromRouteId(routeId) {
  return routeIdToLine[routeId] || null;
}

export function isValidRouteId(routeId) {
  return routeId && routeIdToLine.hasOwnProperty(routeId);
}

function calculateBearing(lat1, lon1, lat2, lon2) {
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180);
  const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
            Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLon);
  let bearing = Math.atan2(y, x) * 180 / Math.PI;
  bearing = (bearing + 360) % 360;
  return bearing;
}
