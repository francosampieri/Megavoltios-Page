# 🔧 Guía de Setup — Catálogo con Panel Admin

Guía paso a paso para configurar el sistema completo: Google Sheets + Cloudinary + Vercel + Panel Admin.

---

## Índice

1. [Google Sheets — Crear la planilla](#1-google-sheets)
2. [Google Cloud Console — Service Account](#2-google-cloud-console)
3. [Cloudinary — Upload Preset](#3-cloudinary)
4. [Variables de entorno en Vercel](#4-vercel-env-vars)
5. [Configurar el código](#5-configurar-código)
6. [Deploy](#6-deploy)
7. [Uso del panel admin](#7-uso)

---

## 1. Google Sheets — Crear la planilla {#1-google-sheets}

### Crear la Sheet

1. Andá a [Google Sheets](https://sheets.google.com) y creá una nueva hoja
2. Renombrala a **"Megavoltios — Catálogo"**
3. Renombrá la primera pestaña a **"Productos"** (clic derecho en "Hoja 1" → Cambiar nombre)

### Configurar las columnas

En la **primera fila** (headers), escribí exactamente:

| A | B | C | D | E | F |
|---|---|---|---|---|---|
| Categoría | Subcategoría | Nombre | Marca | Descripción | Imagen |

### Cargar los productos existentes

Copiá los productos del `products.json` actual a la Sheet. Ejemplo:

| Categoría | Subcategoría | Nombre | Marca | Descripción | Imagen |
|-----------|-------------|--------|-------|-------------|--------|
| Industrial | | Térmicas | | | |
| Industrial | | Disyuntores | | | |
| Iluminación | | Lámparas LED y dicroica | | | |
| Ferretería | Herramientas Eléctricas | Taladro Percutor 550W | Einhell | Taladro con mandril de 13mm... | taladro-einhell.jpg |

> 💡 Las filas con columnas D, E, F vacías se muestran como texto. Las que tienen Imagen se muestran como cards.

### Publicar como CSV

1. **Archivo** → **Compartir** → **Publicar en la web**
2. Seleccioná **"Productos"** en el dropdown (no "Todo el documento")
3. Cambiá "Página web" a **"Valores separados por comas (.csv)"**
4. Click **"Publicar"**
5. **Copiá la URL** generada — la vas a necesitar en el paso 5

> La URL se ve así: `https://docs.google.com/spreadsheets/d/e/2PACX-XXXXX/pub?gid=0&single=true&output=csv`

---

## 2. Google Cloud Console — Service Account {#2-google-cloud-console}

Esto permite que la serverless function de Vercel **escriba** en la Sheet.

### Crear proyecto

1. Andá a [Google Cloud Console](https://console.cloud.google.com)
2. Creá un nuevo proyecto: **"Megavoltios Web"**
3. Esperá a que se cree (puede tardar 1 min)

### Habilitar Google Sheets API

1. En el menú lateral: **APIs y servicios** → **Biblioteca**
2. Buscá **"Google Sheets API"**
3. Click en el resultado → **"Habilitar"**

### Crear Service Account

1. **APIs y servicios** → **Credenciales**
2. Click **"+ Crear credenciales"** → **"Cuenta de servicio"**
3. Nombre: **"megavoltios-admin"**
4. Click **"Crear y continuar"**
5. Rol: **"Editor de Hojas de cálculo de Google"** (buscalo en el dropdown)
6. Click **"Continuar"** → **"Listo"**

### Descargar el JSON de credenciales

1. En la lista de cuentas de servicio, hacé click en **"megavoltios-admin"**
2. Pestaña **"Claves"** → **"Agregar clave"** → **"Crear nueva clave"**
3. Formato: **JSON** → Click **"Crear"**
4. Se descarga un archivo `.json` — **NO lo subas a Git**

### Compartir la Sheet con el Service Account

1. Abrí el JSON descargado y buscá el campo `"client_email"` (algo como `megavoltios-admin@megavoltios-web.iam.gserviceaccount.com`)
2. Andá a tu Google Sheet → **Compartir** (botón arriba a la derecha)
3. Pegá el email del service account
4. Rol: **Editor**
5. Desmarcá "Notificar a las personas" → Click **"Compartir"**

### Preparar las credenciales para Vercel

1. Abrí el archivo JSON descargado
2. Copiá **TODO el contenido** (es un JSON completo)
3. Lo vas a pegar como variable de entorno en Vercel (paso 4)

---

## 3. Cloudinary — Upload Preset {#3-cloudinary}

### Crear Upload Preset

1. Entrá a [Cloudinary Console](https://cloudinary.com/console)
2. Anotá tu **Cloud Name** (aparece arriba, algo como `dxxxxxx`)
3. Andá a **Settings** (rueda dentada) → **Upload**
4. Scroll hasta **"Upload presets"**
5. Click **"+ Add upload preset"**
6. Signing Mode: **"Unsigned"** ← MUY IMPORTANTE
7. En **"Folder"** podés poner `megavoltios` (opcional)
8. Click **"Save"**
9. Anotá el **nombre del preset** (algo como `ml_default` o el que le pusiste)

> ⚠️ El preset DEBE ser "Unsigned" para que funcione desde el frontend sin backend.

---

## 4. Variables de entorno en Vercel {#4-vercel-env-vars}

1. Entrá a tu proyecto en [Vercel Dashboard](https://vercel.com/dashboard)
2. **Settings** → **Environment Variables**
3. Agregá estas 3 variables:

| Nombre | Valor |
|--------|-------|
| `GOOGLE_SHEETS_CREDENTIALS` | El JSON completo del Service Account (copiado en paso 2) |
| `GOOGLE_SHEET_ID` | El ID de tu Google Sheet (está en la URL: `docs.google.com/spreadsheets/d/` **ESTE_ES_EL_ID** `/edit`) |
| `ADMIN_PASSWORD` | La contraseña que querés para el panel admin (ej: `mivol2024admin`) |

> 💡 Para `GOOGLE_SHEETS_CREDENTIALS`, pegá el JSON completo como string. Vercel acepta JSON en las env vars.

4. Click **"Save"**
5. **Redeploy** el proyecto para que tome las nuevas variables

---

## 5. Configurar el código {#5-configurar-código}

### En `js/products.js`

Buscá la línea:
```javascript
const SHEET_CSV_URL = ''; // ← Pegar URL aquí
```

Y pegá la URL del CSV que copiaste en el paso 1:
```javascript
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-XXXXX/pub?gid=0&single=true&output=csv';
```

### En `admin/index.html`

Buscá el bloque `CONFIG` al inicio del script y completá:

```javascript
const CONFIG = {
  sheetCsvUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-XXXXX/pub?gid=0&single=true&output=csv',
  cloudinaryCloudName: 'dxxxxxx',      // ← Tu cloud name
  cloudinaryUploadPreset: 'ml_default', // ← Tu upload preset
  categorias: [
    'Ferretería',
    'Industrial',
    // ... agregá/quita las que necesites
  ],
};
```

---

## 6. Deploy {#6-deploy}

### Estructura de carpetas del proyecto

```
tu-proyecto/
├── index.html
├── vercel.json
├── package.json
├── css/
│   ├── styles.css
│   └── product-cards.css        ← NUEVO
├── js/
│   ├── main.js
│   ├── products.js              ← MODIFICADO
│   └── animations.js
├── data/
│   └── products.json            ← Fallback (no borrar)
├── admin/
│   └── index.html               ← NUEVO
├── api/
│   ├── add-product.js           ← NUEVO
│   └── delete-product.js        ← NUEVO
└── assets/
    ├── logos/
    ├── brands/
    ├── categories/
    ├── products/                ← Crear carpeta para imágenes locales (opcional)
    └── why-us/
```

### Subir a Vercel

Si usás Git:
```bash
git add .
git commit -m "Agregar panel admin + catálogo híbrido"
git push
```

Vercel detecta automáticamente las serverless functions en `/api/` y las deploya.

Si no usás Git, podés subir la carpeta completa con Vercel CLI:
```bash
npm i -g vercel
vercel --prod
```

---

## 7. Uso del panel admin {#7-uso}

### Acceder al panel

El panel está en: `https://tudominio.com/admin`

1. Ingresá la contraseña que configuraste en `ADMIN_PASSWORD`
2. Vas a ver el listado de todos los productos

### Agregar un producto

1. Click **"Agregar producto"**
2. Seleccioná **Categoría** y opcionalmente **Subcategoría**
3. Escribí el **Nombre** (obligatorio)
4. Opcionalmente: Marca, Descripción
5. **Arrastrá la imagen** (o hacé click para seleccionar) → se sube sola a Cloudinary
6. Click **"Guardar producto"**
7. Esperá ~2 segundos y recargá la web principal → el producto aparece

### Eliminar un producto

1. Buscá el producto en la lista
2. Click en el ícono de **papelera**
3. Confirmá la eliminación

### Editar textos directamente en Google Sheets

Para cambios rápidos (corregir un nombre, cambiar una descripción), podés editar directamente en Google Sheets sin pasar por el panel. Los cambios se reflejan en la web automáticamente.

---

## ⚠️ Troubleshooting

### Los productos no aparecen
- Verificá que la Sheet esté publicada como CSV (paso 1)
- Verificá que la URL en `SHEET_CSV_URL` sea correcta
- Abrí la consola del navegador (F12) → debería decir "✓ Catálogo cargado desde Google Sheets"

### El panel admin da error de contraseña
- Verificá que `ADMIN_PASSWORD` esté configurada en Vercel
- Después de cambiar una env var, hay que hacer **redeploy** en Vercel

### Las imágenes no se suben
- Verificá que el Cloudinary Upload Preset sea **"Unsigned"**
- Verificá que `cloudinaryCloudName` y `cloudinaryUploadPreset` estén bien en el CONFIG
- Abrí la consola del navegador (F12) → Network tab → mirá el request a Cloudinary

### Error al agregar/eliminar productos
- Verificá que el Service Account tenga acceso de **Editor** a la Sheet
- Verificá que `GOOGLE_SHEETS_CREDENTIALS` contenga el JSON completo
- Verificá que `GOOGLE_SHEET_ID` sea correcto
- Mirá los logs en Vercel: **Dashboard → Tu proyecto → Functions → Logs**

### Los cambios en Sheets tardan en aparecer
- Google Sheets tiene un caché de ~1-2 minutos en la versión publicada
- Es normal, no es un bug

---

## 📝 Notas importantes

- El `products.json` local funciona como **fallback**. Si Google Sheets falla, la web sigue funcionando con el JSON.
- Las imágenes se pueden servir desde Cloudinary (URL directa) o desde la carpeta `/assets/products/` (nombre de archivo).
- El panel admin está protegido con contraseña simple. Para mayor seguridad, podés agregar [Vercel Authentication](https://vercel.com/docs/security/deployment-protection).
