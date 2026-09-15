# Metrobús CDMX — Mapa interactivo

Mapa web de las 7 líneas del Metrobús de la Ciudad de México. Muestra todas las estaciones con sus ubicaciones reales, calcula tiempos de viaje entre cualquier par de estaciones y te mantiene al tanto de posibles cierres o retrasos.

## Qué hace

- **Mapa completo** — 279 estaciones de las 7 líneas, con coordenadas tomadas del mapa oficial del Metrobús
- **Rastreo en tiempo real** — Visualiza la ubicación GPS de cada autobús en movimiento, actualizado cada 30 segundos vía GTFS-RT
- **Llegadas en vivo** — Ve cuándo llega el próximo Metrobús a cada estación con datos en tiempo real
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

### Configuración opcional: Datos en tiempo real

Para activar el rastreo en vivo de autobuses:

1. Copia el archivo `.env.example` a `.env`:
   ```bash
   cp .env.example .env
   ```

2. Regístrate en [https://metrobus-gtfs.sinopticoplus.com/](https://metrobus-gtfs.sinopticoplus.com/) para obtener credenciales API

3. Agrega tus credenciales en `.env`:
   ```
   VITE_METROBUS_USERNAME=tu_usuario
   VITE_METROBUS_PASSWORD=tu_contraseña
   ```

4. Reinicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```

**Autenticación:** La app se autentica automáticamente con el endpoint POST de validación. El token expira cada 12 horas pero se renueva automáticamente. Sin credenciales, la app usa datos simulados sobre rutas reales para demostración.

Para hacer build de producción:

```bash
npm run build
npm run preview
```

## Tech stack

- **React 19** + Vite
- **MapLibre GL** para el mapa
- **GTFS-Realtime** (Protocol Buffers) para datos en tiempo real
- **Zustand** para estado global
- **CSS puro** (sin Tailwind en los estilos, aunque está en las dependencias)
- **Lucide React** para iconos

## Estructura del proyecto

```
src/
├── components/       # UI: mapa, sidebar, panel ETA, alertas, detalle de estación
│   ├── BusMarkers.jsx         # Marcadores de autobuses en movimiento
│   ├── BusDetailPopup.jsx     # Popup con detalles de cada autobús
│   └── StationMap.jsx         # Mapa principal con estaciones y autobuses
├── data/             # Datos de estaciones (metrobusLines.js) y alertas locales
├── services/         # Lógica: cálculo de ETA, predicción de retrasos, alertas en vivo
│   ├── gtfsRealtime.js        # Consumo de datos GTFS-RT (posiciones, llegadas, alertas)
│   ├── etaCalculator.js       # Cálculo de ETAs estimados
│   └── liveAlerts.js          # Alertas en tiempo real
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
- **Ubicación de autobuses en tiempo real**: [GTFS-RT API del Metrobús CDMX](https://metrobus-gtfs.sinopticoplus.com/) (Protocol Buffers)
  - Vehicle Positions: Ubicación GPS, velocidad, rumbo y ocupación de cada unidad
  - Trip Updates: Llegadas estimadas a cada estación
  - Service Alerts: Alertas del sistema en tiempo real
- **Alertas adicionales**: RSS de @MetrobusCDMX, @LaSEMOVI, @C5_CDMX + Google Noticias

### Sobre GTFS-RT

El sistema usa el estándar [GTFS-Realtime](https://gtfs.org/documentation/realtime/reference/) que permite intercambiar información de transporte público en tiempo real. Los datos se actualizan cada 30 segundos y están en formato Protocol Buffers para eficiencia en la transmisión.

**Referencias técnicas:**
- [Documentación oficial GTFS-RT](https://gtfs.org/documentation/realtime/)
- [Datos Abiertos Metrobús CDMX](https://www.metrobus.cdmx.gob.mx/portal-ciudadano/datos-abiertos)
- [Análisis de patrones en BRT usando GTFS-RT](https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0312541) (PLOS ONE, 2024)

## Disclaimer

Los tiempos son estimaciones. El tiempo real puede variar por tráfico, incidentes o condiciones del servicio. Para información oficial, consulta [metrobus.cdmx.gob.mx](https://www.metrobus.cdmx.gob.mx/).
