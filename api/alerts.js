/**
 * Vercel Serverless Function — /api/alerts
 *
 * Fetches Metrobús CDMX alerts from multiple sources SERVER-SIDE
 * (no CORS issues). Returns parsed alerts as JSON.
 *
 * Sources:
 * 1. Multiple Nitter/X mirror instances for @MetrobusCDMX RSS
 * 2. Google News RSS for "Metrobús CDMX" closures
 * 3. metrobus.cdmx.gob.mx official page
 */

const NITTER_INSTANCES = [
  'https://nitter.privacydev.net',
  'https://xcancel.com',
  'https://nitter.poast.org',
  'https://nitter.net',
];

const GOOGLE_NEWS_QUERIES = [
  'https://news.google.com/rss/search?q=%22Metrob%C3%BAs+CDMX%22+estaci%C3%B3n+cerrada+OR+cierre+OR+suspende+OR+cerrar&hl=es-419&gl=MX&ceid=MX:es-419',
  'https://news.google.com/rss/search?q=%22Metrob%C3%BAs%22+CDMX+cerrada+OR+sin+servicio+OR+desalojo&hl=es-419&gl=MX&ceid=MX:es-419',
  'https://news.google.com/rss/search?q=MetrobusCDMX+cierre+OR+cerrada+OR+suspendido&hl=es-419&gl=MX&ceid=MX:es-419',
];

const METROBUS_OFICIAL_URL = 'https://www.metrobus.cdmx.gob.mx/';

async function safeFetch(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MetrobusMonitor/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    clearTimeout(timer);
    if (!resp.ok) return null;
    return await resp.text();
  } catch {
    clearTimeout(timer);
    return null;
  }
}

async function fetchNitterRSS() {
  for (const base of NITTER_INSTANCES) {
    const url = `${base}/MetrobusCDMX/rss`;
    const text = await safeFetch(url);
    if (text && text.includes('<item>')) {
      return { text, source: base };
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

    const cleanTitle = title.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, '').trim();
    const cleanDesc = desc.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, '').trim();

    items.push({
      title: cleanTitle,
      description: cleanDesc,
      text: `${cleanTitle} ${cleanDesc}`,
      pubDate: pubDate ? new Date(pubDate).toISOString() : null,
    });
  }
  return items;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const results = {
    fetchedAt: new Date().toISOString(),
    sources: [],
    items: [],
  };

  // 1. Fetch @MetrobusCDMX via Nitter
  try {
    const nitter = await fetchNitterRSS();
    if (nitter) {
      const items = parseRSSItems(nitter.text);
      const cutoff = new Date(Date.now() - 12 * 60 * 60 * 1000);
      const recent = items.filter(i => !i.pubDate || new Date(i.pubDate) > cutoff);
      results.sources.push({ id: 'nitter', name: `@MetrobusCDMX (${nitter.source})`, count: recent.length, error: null });
      for (const item of recent) {
        results.items.push({ ...item, source: '@MetrobusCDMX' });
      }
    } else {
      results.sources.push({ id: 'nitter', name: '@MetrobusCDMX (Nitter)', count: 0, error: 'All Nitter instances failed' });
    }
  } catch (e) {
    results.sources.push({ id: 'nitter', name: '@MetrobusCDMX (Nitter)', count: 0, error: e.message });
  }

  // 2. Fetch Google News RSS
  try {
    const newsResults = await Promise.allSettled(
      GOOGLE_NEWS_QUERIES.map(url => safeFetch(url))
    );
    let newsItems = [];
    for (const r of newsResults) {
      if (r.status === 'fulfilled' && r.value) {
        newsItems.push(...parseRSSItems(r.value));
      }
    }
    const seenTitles = new Set();
    const uniqueNews = [];
    for (const item of newsItems) {
      if (!seenTitles.has(item.title)) {
        seenTitles.add(item.title);
        uniqueNews.push(item);
      }
    }
    const cutoff = new Date(Date.now() - 12 * 60 * 60 * 1000);
    const recentNews = uniqueNews.filter(i => !i.pubDate || new Date(i.pubDate) > cutoff);
    results.sources.push({ id: 'google-news', name: 'Google Noticias', count: recentNews.length, error: null });
    for (const item of recentNews) {
      results.items.push({ ...item, source: 'Google Noticias' });
    }
  } catch (e) {
    results.sources.push({ id: 'google-news', name: 'Google Noticias', count: 0, error: e.message });
  }

  // 3. Fetch metrobus.cdmx.gob.mx
  try {
    const html = await safeFetch(METROBUS_OFICIAL_URL, 10000);
    if (html) {
      const textContent = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').substring(0, 5000);
      results.sources.push({ id: 'metrobus-oficial', name: 'metrobus.cdmx.gob.mx', count: 1, error: null });
      results.items.push({
        title: '',
        description: '',
        text: textContent,
        pubDate: new Date().toISOString(),
        source: 'metrobus.cdmx.gob.mx',
      });
    } else {
      results.sources.push({ id: 'metrobus-oficial', name: 'metrobus.cdmx.gob.mx', count: 0, error: 'Fetch failed' });
    }
  } catch (e) {
    results.sources.push({ id: 'metrobus-oficial', name: 'metrobus.cdmx.gob.mx', count: 0, error: e.message });
  }

  return res.status(200).json(results);
}
