/**
 * /api/get-products.js — Vercel Serverless Function
 * Lee productos directamente de Google Sheets (sin caché de publicación CSV).
 * 
 * GET: Devuelve todos los productos como JSON.
 * 
 * ENV VARS:
 *   GOOGLE_SHEETS_CREDENTIALS, GOOGLE_SHEET_ID
 */

const { google } = require('googleapis');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido' });

  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  try {
    const credentials = JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    const data = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Productos!A:F',
    });

    const rows = data.data.values || [];
    if (rows.length < 2) {
      return res.status(200).json({ products: [] });
    }

    // Skip header row, parse data — mantener índice original para rowIndex correcto
    const products = rows.slice(1)
      .map((row, originalIdx) => ({ _originalIdx: originalIdx, row }))
      .filter(item => item.row.length > 0 && (item.row[0] || '').trim())
      .map(item => ({
        rowIndex: item._originalIdx + 1, // 1-based, coincide con fila real en Sheet
        categoria: (item.row[0] || '').trim(),
        subcategoria: (item.row[1] || '').trim(),
        nombre: (item.row[2] || '').trim(),
        marca: (item.row[3] || '').trim(),
        descripcion: (item.row[4] || '').trim(),
        imagen: (item.row[5] || '').trim(),
      }))
      .filter(p => p.nombre);

    // Cache response for 10 seconds (Vercel edge cache) — enough to avoid hammering Sheets API
    res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=30');
    return res.status(200).json({ products });

  } catch (error) {
    console.error('Error leyendo productos:', error);
    return res.status(500).json({ error: error.message });
  }
};
