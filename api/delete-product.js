/**
 * /api/delete-product.js — Vercel Serverless Function
 * Elimina un producto de Google Sheets por su nombre + categoría.
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

  const { password, categoria, nombre, rowIndex } = req.body;

  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Contraseña incorrecta' });
  }

  try {
    const credentials = JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    // Obtener el sheetId (el ID interno de la pestaña, no el spreadsheetId)
    const sheetMeta = await sheets.spreadsheets.get({ spreadsheetId });
    const sheet = sheetMeta.data.sheets.find(s => s.properties.title === 'Productos');
    
    if (!sheet) {
      return res.status(404).json({ error: 'No se encontró la pestaña "Productos"' });
    }

    const sheetId = sheet.properties.sheetId;

    // rowIndex viene del frontend como 1-based (1 = primer producto, después del header)
    // deleteDimension usa índices 0-based donde:
    //   0 = fila 1 (headers)
    //   1 = fila 2 (primer producto) ← rowIndex = 1 mapea directo
    const targetRow = typeof rowIndex === 'number' ? rowIndex : null;

    if (targetRow === null) {
      // Buscar la fila por categoría + nombre
      const data = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Productos!A:F',
      });

      const rows = data.data.values || [];
      let foundIndex = -1;

      for (let i = 1; i < rows.length; i++) { // Empezar en 1 para saltar headers
        if (rows[i][0] === categoria && rows[i][2] === nombre) {
          foundIndex = i;
          break;
        }
      }

      if (foundIndex === -1) {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }

      // Eliminar la fila usando batchUpdate
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{
            deleteDimension: {
              range: {
                sheetId: sheetId,
                dimension: 'ROWS',
                startIndex: foundIndex,
                endIndex: foundIndex + 1,
              },
            },
          }],
        },
      });

      console.log(`✓ Producto eliminado: ${nombre} (fila ${foundIndex + 1})`);
    } else {
      // Eliminar por rowIndex directo
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{
            deleteDimension: {
              range: {
                sheetId: sheetId,
                dimension: 'ROWS',
                startIndex: targetRow,
                endIndex: targetRow + 1,
              },
            },
          }],
        },
      });

      console.log(`✓ Producto eliminado (fila ${targetRow + 1})`);
    }

    return res.status(200).json({ success: true, message: 'Producto eliminado' });

  } catch (error) {
    console.error('Error eliminando producto:', error);
    return res.status(500).json({ 
      error: 'Error al eliminar producto', 
      details: error.message 
    });
  }
};
