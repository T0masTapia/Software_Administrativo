// routes/deudas.js
import express from 'express';
import db from '../db';  

const router = express.Router();

router.get('/', (req, res) => {
  const sql = 'SELECT * FROM deuda';

  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error al obtener las deudas:', err);
      return res.status(500).json({ success: false, error: 'Error en la base de datos' });
    }

    res.json({ success: true, deudas: results });
  });
});


// Obtener alumnos con deuda pendiente
router.get('/con-deuda', (req, res) => {
  const sql = `
    SELECT 
      a.rut, 
      a.nombre_completo, 
      u.correo,
      SUM(d.monto) AS deuda_total
    FROM 
      alumno a
    JOIN 
      alumno_curso ac ON ac.rut_alumno = a.rut
    JOIN 
      deuda d ON d.id_alumno_curso = ac.id
    JOIN
      usuario u ON u.id_usuario = a.id_usuario
    WHERE 
      d.estado = 'pendiente'
    GROUP BY 
      a.rut, a.nombre_completo, u.correo
    HAVING 
      deuda_total > 0
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error al obtener alumnos con deuda:', err);
      return res.status(500).json({ success: false, error: 'Error en la base de datos' });
    }

    res.json({ success: true, alumnos: results });
  });
});


// Obtener total de deudas pendientes
router.get('/total-pendientes', (req, res) => {
  const sql = `SELECT COUNT(*) AS total FROM deuda WHERE estado = 'pendiente'`;

  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error al contar deudas pendientes:', err);
      return res.status(500).json({ success: false, error: 'Error en la base de datos' });
    }

    const rows = results as { total: number }[];
    res.json({ success: true, total: rows[0].total });
  });
});


// routes/deudas.js (o mejor crea otro archivo como finanzas.js)

router.get('/alumno/:rut', (req, res) => {
  const { rut } = req.params;
  const { desde, hasta } = req.query;

  let sql = `
    SELECT 
      d.id_deuda AS id_deuda,  -- Agregado para traer el id de la deuda
      d.fecha_deuda,  
      d.monto, 
      d.descripcion,
      CASE WHEN d.monto > 0 THEN 'Ingreso' ELSE 'Gasto' END AS tipo
    FROM deuda d
    JOIN alumno_curso ac ON d.id_alumno_curso = ac.id
    WHERE ac.rut_alumno = ?
  `;

  const params = [rut];

  if (desde) {
    sql += ' AND d.fecha_deuda >= ? ';
    params.push(String(desde));
  }
  if (hasta) {
    sql += ' AND d.fecha_deuda <= ? ';
    params.push(String(hasta));
  }

  sql += ' ORDER BY d.fecha_deuda DESC';

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error('Error al obtener transacciones del alumno:', err);
      return res.status(500).json({ success: false, error: 'Error en la base de datos' });
    }

    res.json({ success: true, transacciones: results });
  });
});


export default router;
