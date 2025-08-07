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

// Añadir nuevo curso (POST)
router.post('/crear-curso', (req, res) => {
  const { nombre_curso, descripcion, costo_curso, codigo_curso, duracion_curso } = req.body;

  // Validar que todos los campos obligatorios existan
  if (!nombre_curso || !descripcion || costo_curso == null || !codigo_curso || !duracion_curso) {
    return res.status(400).json({ success: false, error: 'Faltan datos del curso' });
  }

  const sqlInsert = `
    INSERT INTO curso (nombre_curso, descripcion, costo_curso, codigo_curso, duracion_curso)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(sqlInsert, [nombre_curso, descripcion, costo_curso, codigo_curso, duracion_curso], (err, result) => {
    if (err) {
      console.error('Error al insertar curso:', err);
      return res.status(500).json({ success: false, error: 'Error al crear el curso' });
    }

    res.json({ success: true, message: 'Curso creado exitosamente', id: (result as any).insertId });
  });
});

export default router;
