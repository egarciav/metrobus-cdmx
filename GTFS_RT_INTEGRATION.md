# Integración GTFS-RT — Metrobús CDMX

## Resumen

Se ha integrado exitosamente el sistema GTFS-Realtime del Metrobús CDMX para visualizar en tiempo real:

✅ **Ubicación GPS de autobuses** — Cada unidad se muestra en el mapa con su posición actual  
✅ **Movimiento en tiempo real** — Los autobuses se actualizan cada 30 segundos  
✅ **Llegadas a estaciones** — ETAs en vivo basados en datos GTFS-RT  
✅ **Información de ocupación** — Nivel de pasajeros por autobús  
✅ **Velocidad y rumbo** — Datos de movimiento de cada vehículo  
✅ **Alertas del sistema** — Notificaciones en tiempo real del servicio  

## Características implementadas

### 1. Visualización de autobuses en el mapa

- **Iconos animados**: Cada autobús aparece como un icono de bus con el color de su línea
- **Indicador de movimiento**: Los autobuses en movimiento muestran un círculo pulsante
- **Indicador de ocupación**: Un punto de color indica el nivel de pasajeros
- **Rotación según rumbo**: Los iconos apuntan en la dirección del movimiento

### 2. Detalles de autobús (clic en el marcador)

Al hacer clic en un autobús, se muestra:
- ID del vehículo y del viaje
- Velocidad actual (km/h)
- Nivel de ocupación (%)
- Estación más cercana
- Última actualización
- Coordenadas GPS

### 3. Llegadas en tiempo real por estación

En el panel de detalles de cada estación:
- **Sección "Próximas llegadas (tiempo real)"** con badge "● EN VIVO"
- Tiempo de llegada en minutos
- Retrasos (si existen)
- Se actualiza automáticamente cada 30 segundos

### 4. Datos simulados (modo demo)

Sin API key, la aplicación genera ~60 autobuses simulados:
- 12 unidades en Línea 1
- 8 unidades en Línea 2
- 10 unidades en Línea 3
- 9 unidades en Línea 4
- 7 unidades en Línea 5
- 6 unidades en Línea 6
- 11 unidades en Línea 7

## Archivos creados/modificados

### Nuevos archivos

```
src/services/gtfsRealtime.js         → Servicio principal GTFS-RT
src/components/BusMarkers.jsx        → Marcadores de autobuses
src/components/BusDetailPopup.jsx    → Popup de detalles
.env.example                         → Configuración API key
GTFS_RT_INTEGRATION.md              → Este documento
```

### Archivos modificados

```
package.json                         → Añadido gtfs-realtime-bindings
src/components/StationMap.jsx        → Integración de autobuses
src/components/StationDetail.jsx     → ETAs en tiempo real
src/index.css                        → Estilos para autobuses y popup
README.md                            → Documentación actualizada
```

## Cómo activar datos en tiempo real

### Paso 1: Obtener credenciales

1. Visita: https://metrobus-gtfs.sinopticoplus.com/
2. Completa el registro con tus datos
3. Acepta los términos y condiciones
4. Recibirás usuario y contraseña por correo electrónico

### Paso 2: Configurar

```bash
# Copia el archivo de ejemplo
cp .env.example .env

# Edita .env y agrega tus credenciales
VITE_METROBUS_USERNAME=tu_usuario
VITE_METROBUS_PASSWORD=tu_contraseña
```

### Paso 3: Reiniciar el servidor

```bash
# Detén el servidor (Ctrl+C)
# Inicia nuevamente
npm run dev
```

### Autenticación automática

La aplicación obtiene URLs temporales pre-firmadas usando:
- **Endpoint**: `POST https://metrobus-gtfs.sinopticoplus.com/gtfs-api/partnerValidation`
- **Body**: `{ "usuario": "...", "senha": "..." }`
- **Respuesta**: 
  - `urlRealTime`: URL temporal (AWS S3) al archivo .proto con datos de vehículos
  - `urlStatic`: URL temporal (AWS S3) al ZIP con datos GTFS estáticos
  - `expirationDateTime`: Fecha/hora de expiración de las URLs (10 minutos)
  - `generationDateTime`: Fecha/hora de generación de las URLs
- **Renovación**: Automática 1 minuto antes de expirar

**Nota importante**: Las URLs son pre-firmadas de AWS S3 y **no requieren autenticación adicional**. Se descargan directamente.

## Arquitectura de datos GTFS-RT

El sistema consume un único archivo Protocol Buffer (.proto):

### Vehicle Positions (archivo .proto completo)
**URL**: Temporal, obtenida vía autenticación  
**Formato**: Protocol Buffer (GTFS-Realtime)  
**Actualización**: Cada 30 segundos (últimos 30s de datos)  
**Datos**:
- Posición GPS (latitud, longitud)
- Velocidad (km/h)
- Rumbo (grados)
- Ocupación (porcentaje)
- ID de vehículo y viaje
- Estado actual (en parada, en movimiento, etc.)

El archivo .proto incluye múltiples tipos de entidades GTFS-RT:
- **Vehicle Positions**: Ubicación en tiempo real de cada autobús
- **Trip Updates**: Actualizaciones de llegadas a estaciones (si están disponibles)
- **Service Alerts**: Alertas del sistema (si están disponibles)

**Importante**: El archivo contiene los datos de los últimos 30 segundos. Se descarga completo cada vez que se consulta la API (cada 30 segundos en esta implementación).

## Estructura del código

### gtfsRealtime.js — Servicio principal

```javascript
// Funciones principales
startRealtimePolling()      // Inicia polling cada 30s
stopRealtimePolling()       // Detiene polling
onRealtimeUpdate(callback)  // Suscribe a actualizaciones
getVehiclePositions()       // Obtiene posiciones actuales
getTripUpdates()            // Obtiene llegadas estimadas
getAlerts()                 // Obtiene alertas activas
getETAForStation(id, line)  // Calcula ETA para estación
```

### BusMarkers.jsx — Componente visual

```javascript
<BusMarkers 
  vehicles={vehicles}        // Array de autobuses
  onBusClick={handleClick}   // Handler al hacer clic
/>
```

### BusDetailPopup.jsx — Popup de detalles

```javascript
<BusDetailPopup
  bus={selectedBus}          // Datos del autobús
  onClose={handleClose}      // Handler para cerrar
  nearestStation={station}   // Estación más cercana
/>
```

## Limitaciones conocidas

### 1. Caducidad de credenciales
- Las API keys expiran cada **12 horas**
- Requiere renovación manual vía correo electrónico
- Esto es una limitación del sistema del Metrobús CDMX

### 2. Disponibilidad de datos
- Los datos dependen del operador del Metrobús
- Puede haber periodos sin datos (madrugada, mantenimiento)
- La calidad varía según la cobertura GPS

### 3. Precisión
- Los ETAs son estimaciones basadas en posición GPS
- No consideran tráfico en tiempo real entre vehículo y estación
- Los retrasos reportados son aproximados

## Consideraciones técnicas

### Protocol Buffers
- Formato binario eficiente para transmisión
- Requiere deserialización con `gtfs-realtime-bindings`
- Basado en el schema oficial de Google Transit

### Performance
- Polling cada 30s minimiza carga en el servidor
- Datos cacheados en memoria
- Actualización reactiva con listeners

### Modo offline
- Sin API key: usa datos simulados
- Sin conexión: mantiene último estado conocido
- Degradación elegante del servicio

## Próximos pasos sugeridos

### Mejoras opcionales

1. **Historial de ubicaciones**
   - Guardar trayectorias de autobuses
   - Visualizar rutas recorridas

2. **Predicción de llegadas mejorada**
   - Machine learning basado en patrones históricos
   - Considerar datos del artículo PLOS ONE

3. **Notificaciones push**
   - Alertar cuando un autobús está cerca
   - Avisos de retrasos significativos

4. **Heatmap de ocupación**
   - Visualizar zonas con mayor demanda
   - Horarios de mayor congestión

5. **Exportación de datos**
   - Descargar histórico en CSV/JSON
   - Análisis estadístico de rutas

## Recursos y referencias

### Documentación oficial
- [GTFS-Realtime Specification](https://gtfs.org/documentation/realtime/)
- [Protocol Buffers](https://protobuf.dev/)
- [Datos Abiertos Metrobús](https://www.metrobus.cdmx.gob.mx/portal-ciudadano/datos-abiertos)

### Investigación académica
- [Pattern detection in BRT systems](https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0312541) — Análisis de sistemas BRT usando GTFS-RT (incluye Metrobús CDMX)

### Librerías utilizadas
- [gtfs-realtime-bindings](https://www.npmjs.com/package/gtfs-realtime-bindings) — Parser de Protocol Buffers
- [MapLibre GL](https://maplibre.org/) — Visualización de mapas
- [React Map GL](https://visgl.github.io/react-map-gl/) — Wrapper de React

## Soporte

Para problemas con:
- **API key**: contactar a datos.abiertos@metrobus.cdmx.gob.mx
- **Datos incorrectos**: reportar al Metrobús CDMX
- **Bugs en la app**: revisar código en este repositorio

---

**Última actualización**: 8 de septiembre de 2026  
**Versión**: 1.0.0  
**Estado**: ✅ Funcional (con datos simulados sin API key)
