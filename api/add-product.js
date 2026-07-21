/**
 * /api/add-product.js — Vercel Serverless Function
 * Agrega un producto a Google Sheets.
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

  // Verificar contraseña
  const { password, categoria, subcategoria, nombre, marca, descripcion, imagen } = req.body;

  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Contraseña incorrecta' });
  }

  // Validar campos obligatorios
  if (!categoria || !nombre) {
    return res.status(400).json({ error: 'Categoría y Nombre son obligatorios' });
  }

  try {
    // Autenticar con Google Sheets
    const credentials = JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    // Agregar fila a la Sheet
    const row = [
      categoria,
      subcategoria || '',
      nombre,
      marca || '',
      descripcion || '',
      imagen || '',
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Productos!A:F',
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [row],
      },
    });

    console.log(`✓ Producto agregado: ${nombre} (${categoria})`);
    return res.status(200).json({ success: true, message: 'Producto agregado correctamente' });

  } catch (error) {
    console.error('Error agregando producto:', error);
    return res.status(500).json({ 
      error: 'Error al agregar producto', 
      details: error.message 
    });
  }
};
