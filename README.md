# Megavoltios — Sitio Web

Catálogo digital para Megavoltios, materiales eléctricos y ferretería industrial.

---

## Estructura del proyecto

```
megavoltios/
├── index.html          → Página principal (no modificar estructura)
├── css/styles.css      → Estilos visuales
├── js/
│   ├── products.js     → Genera el catálogo desde el JSON
│   └── main.js         → Interacciones (menú, WhatsApp, FAQ)
├── data/
│   └── products.json   → ⭐ AQUÍ se edita el catálogo
└── assets/
    ├── logos/          → Logo de la empresa
    └── brands/         → Logos de marcas
```

---

## ⭐ Cómo actualizar el catálogo de productos

El catálogo completo vive en **`data/products.json`**.

### Agregar un producto

Abrí `products.json`, encontrá la subcategoría que corresponde y agregá el producto a la lista:

```json
"productos": [
  "Producto existente 1",
  "Producto existente 2",
  "Producto nuevo"        ← agregar acá
]
```

### Agregar una subcategoría

Dentro de la categoría que corresponde, copiar y pegar este bloque:

```json
{
  "nombre": "Nombre de la subcategoría",
  "productos": [
    "Producto 1",
    "Producto 2"
  ]
}
```

Asegurarse de que quede separada por coma del bloque anterior.

### Agregar una categoría nueva

Copiar este bloque completo y pegarlo antes del último `]` del archivo:

```json
{
  "id": "nombre-sin-espacios",
  "nombre": "Nombre visible en la página",
  "subcategorias": [
    {
      "nombre": "Primera subcategoría",
      "productos": [
        "Producto 1",
        "Producto 2"
      ]
    }
  ]
}
```

### Eliminar un producto, subcategoría o categoría

Borrar la línea o el bloque completo correspondiente.

**Importante:** después de cualquier edición, verificar que el archivo no tenga errores abriendo
https://jsonlint.com y pegando el contenido del archivo.

---

## Qué modificar para personalizar el sitio

Buscar en `index.html` los comentarios `<!-- MODIFICAR -->`:

| Qué cambiar | Dónde |
|---|---|
| Número de WhatsApp | `js/main.js` → línea `numero:` |
| Nombre del negocio | `index.html` → sección `HEADER` |
| Horarios | `index.html` → sección `HEADER` y `UBICACIÓN` |
| Dirección | `index.html` → sección `UBICACIÓN` y `CONTACTO` |
| Mapa de Google Maps | `index.html` → sección `UBICACIÓN`, atributo `src` del iframe |
| Logo | Reemplazar el archivo en `assets/logos/` y descomentar la línea en el header |
| Logos de marcas | Poner imágenes en `assets/brands/` y reemplazar el texto en la sección `MARCAS` |
| Preguntas frecuentes | `index.html` → sección `FAQ` |
| "Por qué elegirnos" | `index.html` → sección `POR QUÉ ELEGIRNOS` |
| Redes sociales | `index.html` → sección `CONTACTO`, reemplazar `#` con URLs reales |

---

## Cómo obtener el iframe de Google Maps

1. Ir a Google Maps (maps.google.com)
2. Buscar la dirección exacta del negocio
3. Hacer clic en **Compartir**
4. Ir a la pestaña **Incorporar un mapa**
5. Copiar únicamente el valor del atributo `src="..."` (sin las comillas)
6. Pegarlo en `index.html` reemplazando el src actual del iframe

---

## Cómo agregar el logo

1. Guardar el logo en `assets/logos/logo.png` (recomendado: PNG con fondo transparente, altura mínima 80px)
2. En `index.html`, buscar esta línea en el HEADER y descomentar (quitar `<!--` y `-->`):
   ```html
   <!-- <img src="./assets/logos/logo.png" alt="Megavoltios" class="header__logo-img" /> -->
   ```

---

## Cómo agregar logos de marcas

1. Guardar el logo en `assets/brands/nombre-marca.png`
2. En `index.html`, en la sección MARCAS, reemplazar:
   ```html
   <li class="brands__item"><span class="brands__name">Schneider</span></li>
   ```
   por:
   ```html
   <li class="brands__item"><img src="./assets/brands/schneider.png" alt="Schneider Electric" class="brands__logo" /></li>
   ```

---

## Deploy y hosting

El sitio está publicado en **Netlify** conectado al repositorio de GitHub.

Cualquier cambio que se pushee a la rama `main` se publica automáticamente en minutos.

Para publicar cambios desde la terminal:
```bash
git add .
git commit -m "Descripción del cambio"
git push
```

---

## Contacto técnico

Desarrollado por: [Tu nombre]
Contacto: [Tu email o WhatsApp]
