import express from 'express';
import db from '../db';

const router = express.Router();

// Obtener todos los alumnos con correo del usuario
router.get('/', (req, res) => {
  const query = `
    SELECT a.rut, a.nombre_completo, a.direccion, a.fono, u.correo
    FROM alumno a
    JOIN usuario u ON a.id_usuario = u.id_usuario
  `;

  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: 'Error al obtener alumnos: ' + err.message });

    res.json({ success: true, alumnos: results });
  });
});

// Buscar alumnos por coincidencia parcial del RUT (para autocompletado)
// Cambié la ruta para que sea /buscar con query param ?rut=...
router.get('/buscar', (req, res) => {
  const termino = req.query.rut;

  if (!termino) {
    return res.status(400).json({ error: 'Falta término de búsqueda' });
  }

  const query = `
    SELECT rut, nombre_completo
    FROM alumno
    WHERE rut LIKE ?
    LIMIT 10
  `;

  db.query(query, [`%${termino}%`], (err, results) => {
    if (err) return res.status(500).json({ error: 'Error al buscar rut: ' + err.message });

    res.json({ success: true, alumnos: results });
  });
});

// Ruta para crear un nuevo alumno
router.post('/crear', (req, res) => {
  const { rut, nombre_completo, direccion, fono, correo, password } = req.body;

  if (!rut || !nombre_completo || !correo || !password) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  const insertarUsuario = `
    INSERT INTO usuario (correo, password, tipo_usuario)
    VALUES (?, ?, 'alumno')
  `;

  db.query(insertarUsuario, [correo, password], (err, usuarioResult: any) => {
    if (err) return res.status(500).json({ error: 'Error al crear usuario: ' + err.message });

    const id_usuario = usuarioResult.insertId;

    const insertarAlumno = `
      INSERT INTO alumno (rut, nombre_completo, direccion, id_usuario, fono)
      VALUES (?, ?, ?, ?, ?)
    `;

    db.query(insertarAlumno, [rut, nombre_completo, direccion, id_usuario, fono], (err2) => {
      if (err2) return res.status(500).json({ error: 'Error al crear alumno: ' + err2.message });

      res.json({ success: true, message: 'Alumno creado correctamente' });
    });
  });
});

export default router;
