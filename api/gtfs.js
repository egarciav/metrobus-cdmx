/**
 * Vercel Serverless Function — /api/gtfs
 *
 * Proxy server-side para descargar el feed GTFS-RT binario desde S3.
 * Necesario porque S3 bloquea peticiones directas del navegador (CORS).
 *
 * Uso: GET /api/gtfs?url=<url_gtfs_rt_encoded>
 */

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  // Solo permitir URLs de S3 del Metrobús (seguridad)
  const ALLOWED_HOST = 'sonda-gtfs-prd.s3.amazonaws.com';
  let targetUrl;
  try {
    targetUrl = new URL(url);
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  if (targetUrl.hostname !== ALLOWED_HOST) {
    return res.status(403).json({ error: 'URL not allowed' });
  }

  try {
    const response = await fetch(url, {
      headers: { 'Accept': 'application/octet-stream' }
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: `Upstream error: ${response.status} ${response.statusText}`
      });
    }

    const buffer = await response.arrayBuffer();

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-store');

    return res.status(200).send(Buffer.from(buffer));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
