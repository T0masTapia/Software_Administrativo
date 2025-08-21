import express from 'express';
import db from '../db';

const router = express.Router();

// Obtener todos los cursos
router.get('/', (req, res) => {
  db.query('SELECT * FROM curso', (err, results) => {
    if (err) {
      console.error('Error al obtener cursos:', err);
      return res.status(500).json({ success: false, error: 'Error al obtener los cursos' });
    }
    res.json({ success: true, cursos: results });
  });
});

// Obtener total de cursos
router.get('/total', (req, res) => {
  db.query('SELECT COUNT(*) AS total FROM curso', (err, results) => {
    if (err) {
      console.error('Error al contar cursos:', err);
      return res.status(500).json({ success: false, error: 'Error al obtener total de cursos' });
    }
    const rows = results as { total: number }[];
    res.json({ success: true, total: rows[0].total });
  });
});

// Añadir nuevo curso (POST)
router.post('/crear-curso', (req, res) => {
  const { nombre_curso, descripcion, costo_curso, codigo_curso, duracion_curso, url_aula } = req.body;

  // url_aula ahora es opcional
  if (!nombre_curso || !descripcion || costo_curso == null || !codigo_curso || !duracion_curso) {
    return res.status(400).json({ success: false, error: 'Faltan datos del curso' });
  }

  const sqlInsert = `
    INSERT INTO curso (nombre_curso, descripcion, costo_curso, codigo_curso, duracion_curso, url_aula)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sqlInsert,
    [nombre_curso, descripcion, costo_curso, codigo_curso, duracion_curso, url_aula || null],
    (err, result) => {
      if (err) {
        console.error('Error al insertar curso:', err);
        return res.status(500).json({ success: false, error: 'Error al crear el curso' });
      }

      res.json({ success: true, message: 'Curso creado exitosamente', id: (result as any).insertId });
    }
  );
});


// Editar curso (PATCH)
router.patch('/:idCurso', (req, res) => {
  const { idCurso } = req.params;
  const fields = req.body;

  if (Object.keys(fields).length === 0) {
    return res.status(400).json({ success: false, error: 'No se enviaron campos para actualizar' });
  }

  // Construir query dinámica según los campos que llegan
  const setFields = Object.keys(fields).map(key => `${key} = ?`).join(', ');
  const values = Object.values(fields);

  const sqlUpdate = `UPDATE curso SET ${setFields} WHERE id_curso = ?`;

  db.query(sqlUpdate, [...values, idCurso], (err, result) => {
    if (err) {
      console.error('Error al actualizar curso:', err);
      return res.status(500).json({ success: false, error: 'Error al actualizar curso' });
    }

    res.json({ success: true, message: 'Curso actualizado correctamente' });
  });
});


// Eliminar curso (DELETE)
router.delete('/:idCurso', (req, res) => {
  const { idCurso } = req.params;

  // Verificar si hay alumnos inscritos
  const sqlCheck = 'SELECT COUNT(*) AS total FROM alumno_curso WHERE id_curso = ?';
  db.query(sqlCheck, [idCurso], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, error: 'Error al verificar alumnos del curso' });
    }

    const totalAlumnos = (results as any)[0].total;
    if (totalAlumnos > 0) {
      return res.status(400).json({
        success: false,
        error: 'No se puede eliminar el curso porque tiene alumnos inscritos',
      });
    }

    // Si no hay alumnos, eliminar curso
    db.query('DELETE FROM curso WHERE id_curso = ?', [idCurso], (err2) => {
      if (err2) {
        console.error(err2);
        return res.status(500).json({ success: false, error: 'Error al eliminar curso' });
      }

      res.json({ success: true, message: 'Curso eliminado correctamente' });
    });
  });
});


// Obtener alumnos por ID de curso
router.get('/:idCurso/alumnos', (req, res) => {
  const { idCurso } = req.params;

  const sql = `
    SELECT a.rut, a.nombre_completo
    FROM alumno a
    JOIN alumno_curso ac ON a.rut = ac.rut_alumno
    WHERE ac.id_curso = ?
  `;

  db.query(sql, [idCurso], (err, results) => {
    if (err) {
      console.error('Error al obtener alumnos:', err);
      return res.status(500).json({ success: false, error: 'Error al obtener alumnos del curso' });
    }

    res.json({ success: true, alumnos: results });
  });
});

export default router;
