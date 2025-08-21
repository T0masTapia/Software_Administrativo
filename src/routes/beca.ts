import express from 'express';
import db from '../db';

const router = express.Router();

// --- Obtener todas las becas ---
router.get('/', (req, res) => {
  const sql = 'SELECT * FROM beca ORDER BY id_beca';
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ success: false, error: 'Error al obtener becas' });
    res.json({ success: true, becas: results });
  });
});

// --- Obtener beca por ID ---
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const sql = 'SELECT * FROM beca WHERE id_beca = ?';
  db.query(sql, [id], (err, results) => {
    if (err) return res.status(500).json({ success: false, error: 'Error al obtener beca' });
    const rows = results as any[];
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Beca no encontrada' });
    res.json({ success: true, beca: rows[0] });
  });
});

// Crear nueva beca
router.post('/', (req, res) => {
  const { nombre_beca, monto_descuento, fecha_inicio, fecha_fin, criterios, estado, image } = req.body;

  if (!nombre_beca || !monto_descuento || !fecha_inicio || !fecha_fin) {
    return res.status(400).json({ success: false, error: 'Datos incompletos' });
  }

  const sql = `INSERT INTO beca 
    (nombre_beca, monto_descuento, fecha_inicio, fecha_fin, criterios, estado, image)
    VALUES (?, ?, ?, ?, ?, ?, ?)`;

  db.query(
    sql,
    [nombre_beca, monto_descuento, fecha_inicio, fecha_fin, criterios || '', estado || 'activa', image || ''],
    (err, result) => {
      if (err) return res.status(500).json({ success: false, error: 'Error al crear beca' });
      res.json({ success: true, message: 'Beca creada correctamente', id_beca: (result as any).insertId });
    }
  );
});

// Actualizar beca
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { nombre_beca, monto_descuento, fecha_inicio, fecha_fin, criterios, estado, image } = req.body;

  const sql = `UPDATE beca
               SET nombre_beca = ?, monto_descuento = ?, fecha_inicio = ?, fecha_fin = ?, criterios = ?, estado = ?, image = ?
               WHERE id_beca = ?`;

  db.query(
    sql,
    [nombre_beca, monto_descuento, fecha_inicio, fecha_fin, criterios, estado, image || '', id],
    (err, result) => {
      if (err) return res.status(500).json({ success: false, error: 'Error al actualizar beca' });
      res.json({ success: true, message: 'Beca actualizada correctamente' });
    }
  );
});

// --- Eliminar beca ---
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM beca WHERE id_beca = ?';
  db.query(sql, [id], (err, result) => {
    if (err) return res.status(500).json({ success: false, error: 'Error al eliminar beca' });
    res.json({ success: true, message: 'Beca eliminada correctamente' });
  });
});

export default router;
