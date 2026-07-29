/**
 * /api/edit-product.js — Vercel Serverless Function
 * Actualiza un producto existente o toggle su estado de destacado.
 * 
 * Actions:
 *   (default)     → Actualiza todos los campos del producto
 *   toggle-featured → Solo marca/desmarca como destacado (columna G)
 * 
 * ENV VARS necesarias:
 *   GOOGLE_SHEETS_CREDENTIALS — JSON del Service Account (stringified)
 *   GOOGLE_SHEET_ID          — ID de la Google Sheet
 *   ADMIN_PASSWORD            — Contraseña del panel admin
 */

const { google } = require('googleapis');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const { password, action, rowIndex } = req.body;

  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Contraseña incorrecta' });
  }

  if (typeof rowIndex !== 'number' || rowIndex < 1) {
    return res.status(400).json({ error: 'rowIndex inválido' });
  }

  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  try {
    const credentials = JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const sheetRow = rowIndex + 1; // rowIndex es 1-based, sheet es 1-based con header

    // ── TOGGLE FEATURED ──────────────────────────────────────────────
    if (action === 'toggle-featured') {
      // Leer el valor actual de la columna G
      const current = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `Productos!G${sheetRow}`,
      });

      const currentValue = ((current.data.values || [])[0] || [''])[0].trim().toLowerCase();
      const isFeatured = currentValue === 'sí' || currentValue === 'si';
      const newValue = isFeatured ? '' : 'Sí';

      // Actualizar solo la columna G
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `Productos!G${sheetRow}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [[newValue]] },
      });

      console.log(`✓ Producto ${isFeatured ? 'desmarcado' : 'marcado'} como destacado (fila ${sheetRow})`);
      return res.status(200).json({ success: true, destacado: !isFeatured });
    }

    // ── ACTUALIZAR PRODUCTO COMPLETO ─────────────────────────────────
    const { categoria, subcategoria, nombre, marca, descripcion, imagen, destacado } = req.body;

    if (!categoria || !nombre) {
      return res.status(400).json({ error: 'Categoría y Nombre son obligatorios' });
    }

    const row = [
      categoria,
      subcategoria || '',
      nombre,
      marca || '',
      descripcion || '',
      imagen || '',
      destacado ? 'Sí' : '',
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Productos!A${sheetRow}:G${sheetRow}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [row] },
    });

    console.log(`✓ Producto actualizado: ${nombre} (fila ${sheetRow})`);
    return res.status(200).json({ success: true, message: 'Producto actualizado correctamente' });

  } catch (error) {
    console.error('Error actualizando producto:', error);
    return res.status(500).json({ error: error.message });
  }
};
