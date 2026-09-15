# ⚡ Configuración Rápida para Vercel

## 🔑 Variables de Entorno Requeridas

Antes de desplegar, configura estas variables en Vercel Dashboard:

### Settings → Environment Variables

```
VITE_METROBUS_USERNAME = [tu_usuario]
VITE_METROBUS_PASSWORD = [tu_contraseña]
```

**Importante:** Aplica a todos los ambientes (Production, Preview, Development)

---

## 🚀 Pasos para Desplegar

### 1. Conectar Repositorio

1. Ve a https://vercel.com/new
2. Importa tu repositorio de GitHub
3. Selecciona el proyecto `cdmx-metrobus`

### 2. Configurar Variables

1. En el dashboard del proyecto → **Settings**
2. **Environment Variables** → **Add New**
3. Agrega:
   - `VITE_METROBUS_USERNAME` → tu usuario
   - `VITE_METROBUS_PASSWORD` → tu contraseña
4. Selecciona: **Production**, **Preview**, **Development**

### 3. Deploy

Click en **Deploy** - Vercel hará el build automáticamente.

---

## ✅ Verificación Post-Deploy

Abre tu app desplegada y verifica:

1. ✅ Toggle GPS funciona
2. ✅ Buses rojos aparecen en el mapa
3. ✅ Click en bus muestra popup
4. ✅ No hay errores en la consola (F12)

### Si no aparecen buses:

1. Verifica que las variables estén configuradas
2. Revisa la consola del navegador
3. Confirma que el toggle GPS esté activado (rojo)

---

## 🔄 Redeploy después de cambiar variables

Si actualizas las credenciales:

```bash
vercel --prod --force
```

O en el dashboard: **Deployments** → **Redeploy**

---

## 📝 Comandos Útiles

```bash
# Deploy desde CLI
npm install -g vercel
vercel login
vercel --prod

# Ver logs
vercel logs [deployment-url]

# Ver variables configuradas
vercel env ls
```

---

## 🆘 Troubleshooting

**Error: "No API credentials configured"**
→ Agrega las variables de entorno en Vercel

**Buses no se mueven**
→ Verifica credenciales y toggle GPS activado

**Error 401/403**
→ Credenciales inválidas o expiradas

---

## 📞 Soporte

- Documentación Vercel: https://vercel.com/docs
- Datos Abiertos CDMX: https://www.metrobus.cdmx.gob.mx/portal-ciudadano/datos-abiertos
- Registro API: https://metrobus-gtfs.sinopticoplus.com/
