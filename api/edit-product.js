/**
 * /api/edit-product.js — Vercel Serverless Function
 * Actualiza un producto existente en Google Sheets.
 * 
 * ENV VARS necesarias:
 *   GOOGLE_SHEETS_CREDENTIALS — JSON del Service Account (stringified)
 *   GOOGLE_SHEET_ID          — ID de la Google Sheet
 *   ADMIN_PASSWORD            — Contraseña del panel admin
 */

const { google } = require('googleapis');

module.exports = async function handler(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { password, rowIndex, categoria, subcategoria, nombre, marca, descripcion, imagen } = req.body;

  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Contraseña incorrecta' });
  }

  if (typeof rowIndex !== 'number' || rowIndex < 1) {
    return res.status(400).json({ error: 'rowIndex inválido' });
  }

  if (!categoria || !nombre) {
    return res.status(400).json({ error: 'Categoría y Nombre son obligatorios' });
  }

  try {
    const credentials = JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    // rowIndex viene como 1-based desde el frontend (1 = primera fila de datos, después del header)
    // En la Sheet, el header es fila 1, así que los datos empiezan en fila 2
    // Por lo tanto, la fila real en Sheets = rowIndex + 1
    const sheetRow = rowIndex + 1;

    const row = [
      categoria,
      subcategoria || '',
      nombre,
      marca || '',
      descripcion || '',
      imagen || '',
    ];

    // Actualizar la fila directamente
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Productos!A${sheetRow}:F${sheetRow}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [row],
      },
    });

    console.log(`✓ Producto actualizado: ${nombre} (fila ${sheetRow})`);
    return res.status(200).json({ success: true, message: 'Producto actualizado correctamente' });

  } catch (error) {
    console.error('Error actualizando producto:', error);
    return res.status(500).json({ 
      error: 'Error al actualizar producto', 
      details: error.message 
    });
  }
};
