# PROBLEMA IDENTIFICADO

## Situación
- OSM tiene **33 paradas físicas** en Línea 2
- Wikipedia dice que Línea 2 tiene **37 estaciones oficiales**
- Diferencia: **4 estaciones** que no están en OSM

## El Problema
No puedo determinar con certeza cuáles son las 37 estaciones oficiales en el orden correcto porque:
1. OSM no tiene nombres de estaciones en sus tags
2. Wikipedia tiene información fragmentada
3. Las estaciones interpoladas que agregué antes causaron el desplazamiento

## Solución Necesaria

**Por favor, proporciona la lista COMPLETA de las 37 estaciones de Línea 2 en orden** desde Tepalcates hasta Tacubaya.

Puedes obtenerla de:
- https://www.metrobus.cdmx.gob.mx/mapas-de-sistema/mapa-linea-2
- O del mapa físico/PDF oficial del Metrobús

Una vez que tengas la lista completa, pégala aquí y yo la usaré para corregir los datos.

## Formato esperado
```
1. Tepalcates
2. General Antonio de León
3. Nicolás Bravo (si existe)
4. Canal de San Juan
... (continuar hasta 37)
37. Tacubaya
```

Con esta lista oficial, podré:
1. Identificar cuáles 4 estaciones faltan en OSM
2. Asignar los nombres correctos a las 33 coordenadas OSM reales
3. Interpolar las 4 faltantes en las posiciones correctas
