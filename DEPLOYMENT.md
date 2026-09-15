# 🚀 Guía de Despliegue - Metrobús CDMX Tracker

## 📋 Configuración de Variables de Entorno

### Variables Requeridas

Para que la aplicación funcione correctamente en producción, necesitas configurar las siguientes variables de entorno:

```bash
VITE_METROBUS_USERNAME=tu_usuario_aqui
VITE_METROBUS_PASSWORD=tu_contraseña_aqui
```

### ¿Cómo obtener las credenciales?

1. **Regístrate** en: https://metrobus-gtfs.sinopticoplus.com/
2. **Acepta** los términos y condiciones
3. **Recibirás** credenciales (usuario y contraseña) por correo electrónico
4. El token de autenticación expira cada 12 horas (se renueva automáticamente)

### Más información
- Portal de Datos Abiertos: https://www.metrobus.cdmx.gob.mx/portal-ciudadano/datos-abiertos
- Documentación GTFS-RT: https://developers.google.com/transit/gtfs-realtime

---

## 🔐 Configuración en Vercel

### Paso 1: Agregar Variables de Entorno

1. Ve a tu proyecto en Vercel Dashboard
2. Navega a **Settings** → **Environment Variables**
3. Agrega las siguientes variables:

| Variable | Valor | Environments |
|----------|-------|--------------|
| `VITE_METROBUS_USERNAME` | Tu usuario de la API | Production, Preview, Development |
| `VITE_METROBUS_PASSWORD` | Tu contraseña de la API | Production, Preview, Development |

### Paso 2: Configurar Rewrites (ya configurado en vercel.json)

El archivo `vercel.json` ya está configurado con los rewrites necesarios para SPA routing.

### Paso 3: Deploy

```bash
# Opción 1: Deploy automático (conecta tu repo a Vercel)
# Cada push a main/master desplegará automáticamente

# Opción 2: Deploy manual con Vercel CLI
npm install -g vercel
vercel --prod
```

---

## 🛡️ Seguridad

### ✅ Archivos protegidos (NO se suben a Git)

- `.env` - Variables de entorno locales
- `.env.local` - Variables de entorno locales
- `.env.*.local` - Variables de entorno por ambiente
- `node_modules/` - Dependencias
- `dist/` - Build de producción

### ✅ Credenciales seguras

- **NUNCA** incluyas credenciales directamente en el código
- **SIEMPRE** usa variables de entorno (`import.meta.env.VITE_*`)
- Las credenciales se configuran en Vercel Dashboard, no en el código

### ⚠️ Importante

Si accidentalmente commiteas credenciales:
1. **Revoca** las credenciales inmediatamente en el portal de CDMX
2. **Solicita** nuevas credenciales
3. **Elimina** el commit con credenciales del historial de Git
4. **Actualiza** las variables en Vercel

---

## 🔄 Proxy Configuration

### Desarrollo Local (Vite)

El archivo `vite.config.js` configura proxies para desarrollo local:

```javascript
proxy: {
  '/gtfs-proxy': 'https://sonda-gtfs-prd.s3.amazonaws.com',
  '/auth-proxy': 'https://metrobus-gtfs.sinopticoplus.com'
}
```

### Producción (Vercel)

En producción, las peticiones se hacen directamente a los endpoints:
- GTFS Static: `https://sonda-gtfs-prd.s3.amazonaws.com`
- GTFS Realtime: `https://metrobus-gtfs.sinopticoplus.com`

**Nota:** Vercel maneja CORS automáticamente para peticiones del cliente.

---

## 📦 Build y Deploy

### Build Local

```bash
npm run build
```

Esto genera la carpeta `dist/` con los archivos estáticos optimizados.

### Preview Local del Build

```bash
npm run preview
```

### Deploy a Vercel

```bash
# Instalar Vercel CLI (si no lo tienes)
npm install -g vercel

# Login
vercel login

# Deploy a producción
vercel --prod
```

---

## 🧪 Testing en Producción

Después del deploy, verifica:

1. ✅ **GPS Toggle funciona** - Activa/desactiva buses en tiempo real
2. ✅ **Buses se mueven** - Los iconos rojos se actualizan cada 30 segundos
3. ✅ **Popup de buses** - Click en un bus muestra información
4. ✅ **Disclaimer funciona** - Botón ℹ️ muestra información de datos abiertos
5. ✅ **Responsive** - Prueba en móvil y desktop
6. ✅ **Console sin errores** - Abre DevTools y verifica que no hay errores de autenticación

### Si no funcionan los datos en tiempo real:

1. Verifica que las variables de entorno estén configuradas en Vercel
2. Revisa la consola del navegador para errores de autenticación
3. Confirma que las credenciales sean válidas y no hayan expirado
4. Verifica que el token se esté renovando automáticamente

---

## 🐛 Troubleshooting

### Problema: "No API credentials configured"

**Solución:** Configura las variables de entorno en Vercel Dashboard.

### Problema: Buses no se mueven

**Solución:** 
1. Verifica credenciales en Vercel
2. Revisa la consola del navegador
3. Confirma que el toggle GPS esté activado

### Problema: Error 401/403 en peticiones

**Solución:**
1. Las credenciales pueden haber expirado
2. Solicita nuevas credenciales en el portal de CDMX
3. Actualiza las variables en Vercel

---

## 📊 Monitoreo

### Logs en Vercel

1. Ve a tu proyecto en Vercel
2. Navega a **Deployments** → selecciona un deployment
3. Click en **View Function Logs** para ver logs en tiempo real

### Analytics

Vercel proporciona analytics automáticos:
- Visitas
- Performance
- Errores
- Core Web Vitals

---

## 🔄 Actualización de Credenciales

Si necesitas actualizar las credenciales:

1. Ve a Vercel Dashboard → Settings → Environment Variables
2. Edita `VITE_METROBUS_USERNAME` y `VITE_METROBUS_PASSWORD`
3. **Redeploy** el proyecto para aplicar los cambios

```bash
vercel --prod --force
```

---

## 📝 Checklist Pre-Deploy

- [ ] Variables de entorno configuradas en Vercel
- [ ] `.env` NO está en Git (verificar `.gitignore`)
- [ ] Build local funciona (`npm run build`)
- [ ] Preview local funciona (`npm run preview`)
- [ ] No hay credenciales hardcodeadas en el código
- [ ] `vercel.json` está configurado correctamente
- [ ] README actualizado con instrucciones

---

## 🎉 Deploy Exitoso

Una vez desplegado, tu aplicación estará disponible en:
- **Producción:** `https://tu-proyecto.vercel.app`
- **Preview:** `https://tu-proyecto-git-branch.vercel.app`

¡Listo! Tu aplicación de seguimiento del Metrobús CDMX está en producción. 🚍✨
