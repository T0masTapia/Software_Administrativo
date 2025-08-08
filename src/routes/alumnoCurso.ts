// src/routes/alumnoCurso.ts
import express from 'express';
import db from '../db';

const router = express.Router();

// POST /alumnoCurso/matricular
router.post('/matricular', (req, res) => {
  const { rut_alumno, id_curso } = req.body;

  if (!rut_alumno || !id_curso) {
    return res.status(400).json({ success: false, error: 'Faltan datos' });
  }

  const fecha = new Date();

  // Insertar matrícula
  const sqlInsertMatricula = 'INSERT INTO alumno_curso (rut_alumno, id_curso, fecha_inscripcion) VALUES (?, ?, ?)';

  db.query(sqlInsertMatricula, [rut_alumno, id_curso, fecha], (err, result) => {
    if (err) {
      console.error('Error al matricular alumno:', err);
      return res.status(500).json({ success: false, error: 'Error en la base de datos' });
    }

    const id_alumno_curso = (result as any).insertId;

    // Obtener costo del curso
    const sqlGetCosto = 'SELECT costo_curso FROM curso WHERE id_curso = ?';

    db.query(sqlGetCosto, [id_curso], (err2, resultsCurso) => {
      if (err2) {
        console.error('Error al obtener costo del curso:', err2);
        return res.status(500).json({ success: false, error: 'Error en la base de datos' });
      }

      if ((resultsCurso as any[]).length === 0) {
        return res.status(400).json({ success: false, error: 'Curso no encontrado' });
      }

      const costoCurso = Number((resultsCurso as any[])[0].costo_curso);
      const montoTotal = Number(costoCurso.toFixed(2));

      // Insertar deuda
      const descripcion = `Deuda por matrícula del curso ID ${id_curso}`;
      const estado = 'pendiente';
      const fechaDeuda = new Date();

      const sqlInsertDeuda = `
        INSERT INTO deuda (id_alumno_curso, monto, descripcion, fecha_deuda, estado)
        VALUES (?, ?, ?, ?, ?)
      `;

      db.query(sqlInsertDeuda, [id_alumno_curso, montoTotal, descripcion, fechaDeuda, estado], (err3) => {
        if (err3) {
          console.error('Error al crear deuda:', err3);
          return res.status(500).json({ success: false, error: 'Error al crear deuda' });
        }

        res.json({ success: true, message: 'Alumno matriculado y deuda creada exitosamente' });
      });
    });
  });
});

// GET /alumnoCurso/ (obtener matrículas)
router.get('/', (req, res) => {
  const sql = `
    SELECT ac.rut_alumno as rut, a.nombre_completo, c.nombre_curso as curso
    FROM alumno_curso ac
    JOIN alumno a ON ac.rut_alumno = a.rut
    JOIN curso c ON ac.id_curso = c.id_curso
    ORDER BY ac.fecha_inscripcion DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error al obtener matrículas:', err);
      return res.status(500).json({ success: false, error: 'Error en la base de datos' });
    }

    res.json({ success: true, matriculas: results });
  });
});

export default router;
