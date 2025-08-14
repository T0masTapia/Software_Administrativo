// routes/deudas.js
import express from 'express';
import db from '../db';

const router = express.Router();

//GETS
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
      d.id_deuda,
      a.rut,
      a.nombre_completo,
      u.correo,
      d.costo_matricula - IFNULL(SUM(CASE WHEN p.concepto_pago = 'matricula' THEN p.monto END), 0) AS deudaMatricula,
      d.costo_cursos - IFNULL(SUM(CASE WHEN p.concepto_pago = 'cursos' THEN p.monto END), 0) AS deudaCursos,
      (d.costo_matricula - IFNULL(SUM(CASE WHEN p.concepto_pago = 'matricula' THEN p.monto END), 0))
      + (d.costo_cursos - IFNULL(SUM(CASE WHEN p.concepto_pago = 'cursos' THEN p.monto END), 0)) AS deuda_total
    FROM deuda d
    JOIN alumno_curso ac ON d.id_alumno_curso = ac.id
    JOIN alumno a ON ac.rut_alumno = a.rut
    JOIN usuario u ON u.id_usuario = a.id_usuario
    LEFT JOIN pago p ON p.id_deuda = d.id_deuda
    WHERE d.estado = 'pendiente'
    GROUP BY d.id_deuda, a.rut, a.nombre_completo, u.correo, d.costo_matricula, d.costo_cursos
    HAVING deuda_total > 0
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

router.get('/alumno/:rut', (req, res) => {
  const { rut } = req.params;
  const { desde, hasta } = req.query;

  let sql = `
    SELECT 
      d.id_deuda AS id_deuda,  
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

router.get('/alumno/:rut/pendientes', (req, res) => {
  const { rut } = req.params;

  const sql = `
    SELECT COUNT(*) AS total
    FROM deuda d
    JOIN alumno_curso ac ON d.id_alumno_curso = ac.id
    WHERE ac.rut_alumno = ? AND d.estado = 'pendiente'
  `;

  db.query(sql, [rut], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, error: 'Error en la base de datos' });
    }

    const rows = results as { total: number }[];
    res.json({ success: true, total: rows[0].total });
  });
});


export default router;
