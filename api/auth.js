/**
 * Vercel Serverless Function — /api/auth
 *
 * Autentica con el API de Metrobús CDMX usando credenciales
 * almacenadas SOLO en el servidor (sin prefijo VITE_).
 *
 * El cliente recibe únicamente las URLs temporales de GTFS-RT
 * (expiran cada 9-12 horas), nunca las credenciales reales.
 */

const GTFS_AUTH_URL = 'https://metrobus-gtfs.sinopticoplus.com/gtfs-api/partnerValidation';

// Cache en memoria del proceso serverless (vive mientras Vercel mantenga el proceso activo)
let cachedAuth = null;
let cacheExpiry = null;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Devolver cache si todavía es válida (con 60 seg de margen)
  if (cachedAuth && cacheExpiry && Date.now() < cacheExpiry - 60000) {
    return res.status(200).json(cachedAuth);
  }

  const username = process.env.METROBUS_USERNAME;
  const password = process.env.METROBUS_PASSWORD;

  if (!username || !password) {
    return res.status(503).json({
      error: 'API credentials not configured',
      hint: 'Set METROBUS_USERNAME and METROBUS_PASSWORD in Vercel environment variables'
    });
  }

  try {
    const response = await fetch(GTFS_AUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario: username, senha: password })
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: `Authentication failed: ${response.status} ${response.statusText}`
      });
    }

    const data = await response.json();

    // Calcular expiración para el cache
    if (data.expirationDateTime) {
      const parts = data.expirationDateTime.split(/[- :]/);
      const expDate = new Date(
        Number(parts[0]),
        Number(parts[1]) - 1,
        Number(parts[2]),
        Number(parts[3]),
        Number(parts[4]),
        Number(parts[5])
      );
      cacheExpiry = expDate.getTime();
    } else {
      cacheExpiry = Date.now() + 9 * 60 * 1000;
    }

    // Solo devolver las URLs temporales — NUNCA las credenciales
    cachedAuth = {
      urlRealTime: data.urlRealTime,
      urlStatic: data.urlStatic,
      expirationDateTime: data.expirationDateTime,
    };

    // Cache-Control: 8 minutos en Vercel Edge, sin cache en browser
    res.setHeader('Cache-Control', 's-maxage=480, stale-while-revalidate=60');

    return res.status(200).json(cachedAuth);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
