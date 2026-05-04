# Metrobús CDMX — Mapa interactivo

Mapa web de las 7 líneas del Metrobús de la Ciudad de México. Muestra todas las estaciones con sus ubicaciones reales, calcula tiempos de viaje entre cualquier par de estaciones y te mantiene al tanto de posibles cierres o retrasos.

## Qué hace

- **Mapa completo** — 279 estaciones de las 7 líneas, con coordenadas tomadas del mapa oficial del Metrobús
- **Calculadora de ruta y ETA** — Seleccionas origen y destino, te da el tiempo estimado considerando hora pico, clima, eventos y hasta si hay partido de fútbol
- **Alertas en vivo** — Busca automáticamente en fuentes oficiales (@MetrobusCDMX, @LaSEMOVI, Google Noticias) si hay cierres, demoras o bloqueos
- **Fuentes oficiales** — Links directos a las cuentas y sitios del Metrobús, SEMOVI, C5, Datos Abiertos y Google Maps tráfico
- **Responsive** — Funciona en escritorio y celular

## Cómo correrlo

```bash
npm install
npm run dev
```

Abre `http://localhost:5173` en tu navegador.

Para hacer build de producción:

```bash
npm run build
npm run preview
```

## Tech stack

- **React 19** + Vite
- **MapLibre GL** para el mapa
- **Zustand** para estado global
- **CSS puro** (sin Tailwind en los estilos, aunque está en las dependencias)

## Estructura del proyecto

```
src/
├── components/       # UI: mapa, sidebar, panel ETA, alertas, detalle de estación
├── data/             # Datos de estaciones (metrobusLines.js) y alertas locales
├── services/         # Lógica: cálculo de ETA, predicción de retrasos, alertas en vivo, contexto
├── store/            # Estado global (Zustand)
└── utils/            # Helpers: distancia Haversine, congestión, constantes
```

## Cómo funciona el ETA

No es magia, es matemática sencilla con varias capas:

1. **Distancia real** entre estaciones (fórmula de Haversine con coordenadas GPS)
2. **Velocidad promedio** del Metrobús: 18 km/h (dato real con tráfico incluido)
3. **30 segundos** de parada por estación intermedia
4. **Factor de congestión** según la hora (pico matutino/vespertino = x1.4)
5. **Contexto**: lluvia (+20%), fin de semana (-35%), días festivos, vacaciones, manifestaciones
6. **Transbordos**: 4 min caminando entre andenes cuando cambias de línea

Para rutas que requieren cambio de línea, usa búsqueda BFS sobre el grafo de estaciones.

## De dónde salen los datos

- **Estaciones y coordenadas**: [Mapa oficial de Metrobús en Google My Maps](https://www.google.com/maps/d/viewer?mid=1K850htztydKaWRlEgz7Qh5uLN8HIF8s) (archivo KML)
- **Alertas en vivo**: RSS de @MetrobusCDMX, @LaSEMOVI, @C5_CDMX + Google Noticias
- **Ubicación de unidades**: [API de Datos Abiertos del Metrobús](https://datos.metrobus.cdmx.gob.mx/)

## Disclaimer

Los tiempos son estimaciones. El tiempo real puede variar por tráfico, incidentes o condiciones del servicio. Para información oficial, consulta [metrobus.cdmx.gob.mx](https://www.metrobus.cdmx.gob.mx/).
