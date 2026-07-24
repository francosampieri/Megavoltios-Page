/**
 * /api/manage-categories.js — Vercel Serverless Function
 * Gestiona categorías y subcategorías en la pestaña "Config" de Google Sheets.
 * 
 * Acciones:
 *   GET                          → Lista todas las categorías y subcategorías
 *   POST { action: "add", ... }  → Agrega una categoría o subcategoría
 *   POST { action: "delete", ...}→ Elimina una categoría o subcategoría
 *   POST { action: "count", ...} → Cuenta productos vinculados a una categoría
 * 
 * ENV VARS:
 *   GOOGLE_SHEETS_CREDENTIALS, GOOGLE_SHEET_ID, ADMIN_PASSWORD
 */

const { google } = require('googleapis');

function getAuth() {
  const credentials = JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS);
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

function getSheets(auth) {
  return google.sheets({ version: 'v4', auth });
}

// ═══ LEER CONFIG ════════════════════════════════════════════════════
async function readConfig(sheets, spreadsheetId) {
  try {
    const data = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Config!A:B',
    });

    const rows = (data.data.values || []).slice(1); // Skip header
    const categorias = {};

    rows.forEach(row => {
      const cat = (row[0] || '').trim();
      const sub = (row[1] || '').trim();
      if (!cat) return;

      if (!categorias[cat]) categorias[cat] = [];
      if (sub && !categorias[cat].includes(sub)) {
        categorias[cat].push(sub);
      }
    });

    return categorias;
  } catch (err) {
    if (err.code === 400 || err.message?.includes('Unable to parse range')) {
      return {}; // Pestaña Config no existe todavía
    }
    throw err;
  }
}

// ═══ CONTAR PRODUCTOS POR CATEGORÍA ═════════════════════════════════
async function countProductsByCategory(sheets, spreadsheetId, categoria) {
  try {
    const data = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Productos!A:C',
    });

    const rows = (data.data.values || []).slice(1);
    return rows.filter(row => (row[0] || '').trim() === categoria).length;
  } catch (err) {
    return 0;
  }
}

// ═══ AGREGAR CATEGORÍA O SUBCATEGORÍA ═══════════════════════════════
async function addCategory(sheets, spreadsheetId, categoria, subcategoria) {
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'Config!A:B',
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [[categoria, subcategoria || '']],
    },
  });
}

// ═══ ELIMINAR CATEGORÍA O SUBCATEGORÍA ══════════════════════════════
async function deleteCategory(sheets, spreadsheetId, categoria, subcategoria) {
  // Obtener sheetId de la pestaña Config
  const sheetMeta = await sheets.spreadsheets.get({ spreadsheetId });
  const sheet = sheetMeta.data.sheets.find(s => s.properties.title === 'Config');
  if (!sheet) throw new Error('No se encontró la pestaña "Config"');

  const sheetId = sheet.properties.sheetId;

  // Leer todas las filas para encontrar las que coinciden
  const data = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Config!A:B',
  });

  const rows = data.data.values || [];
  const rowsToDelete = [];

  for (let i = 1; i < rows.length; i++) {
    const cat = (rows[i][0] || '').trim();
    const sub = (rows[i][1] || '').trim();

    if (subcategoria !== undefined) {
      // Eliminar subcategoría específica
      if (cat === categoria && sub === subcategoria) {
        rowsToDelete.push(i);
      }
    } else {
      // Eliminar toda la categoría (todas las filas con esa categoría)
      if (cat === categoria) {
        rowsToDelete.push(i);
      }
    }
  }

  if (rowsToDelete.length === 0) return;

  // Eliminar de abajo hacia arriba para no desfasar los índices
  rowsToDelete.sort((a, b) => b - a);

  const requests = rowsToDelete.map(rowIndex => ({
    deleteDimension: {
      range: {
        sheetId,
        dimension: 'ROWS',
        startIndex: rowIndex,
        endIndex: rowIndex + 1,
      },
    },
  }));

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests },
  });
}

// ═══ HANDLER ════════════════════════════════════════════════════════
module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  try {
    const auth = getAuth();
    const sheets = getSheets(auth);

    // ── GET: Listar categorías ──
    if (req.method === 'GET') {
      const categorias = await readConfig(sheets, spreadsheetId);
      return res.status(200).json({ categorias });
    }

    // ── POST: Acciones con autenticación ──
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Método no permitido' });
    }

    const { password, action, categoria, subcategoria } = req.body;

    if (!password || password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    switch (action) {
      case 'add': {
        if (!categoria) return res.status(400).json({ error: 'Categoría requerida' });
        await addCategory(sheets, spreadsheetId, categoria, subcategoria || '');
        console.log(`✓ Categoría agregada: ${categoria}${subcategoria ? ' > ' + subcategoria : ''}`);
        return res.status(200).json({ success: true });
      }

      case 'delete': {
        if (!categoria) return res.status(400).json({ error: 'Categoría requerida' });
        await deleteCategory(sheets, spreadsheetId, categoria, subcategoria);
        console.log(`✓ Categoría eliminada: ${categoria}${subcategoria ? ' > ' + subcategoria : ''}`);
        return res.status(200).json({ success: true });
      }

      case 'count': {
        if (!categoria) return res.status(400).json({ error: 'Categoría requerida' });
        const count = await countProductsByCategory(sheets, spreadsheetId, categoria);
        return res.status(200).json({ count });
      }

      default:
        return res.status(400).json({ error: 'Acción no válida' });
    }

  } catch (error) {
    console.error('Error en manage-categories:', error);
    return res.status(500).json({ error: error.message });
  }
};
