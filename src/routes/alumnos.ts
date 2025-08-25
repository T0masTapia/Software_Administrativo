import express from 'express';
import db from '../db';
import { RowDataPacket } from 'mysql2';
import bcrypt from 'bcrypt';

const router = express.Router();

//GETS
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

router.get('/total', (req, res) => {
  const query = `
    SELECT COUNT(*) AS total
    FROM alumno
  `;

  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: 'Error al contar alumnos: ' + err.message });

    const rows = results as { total: number }[];
    res.json({ success: true, total: rows[0].total });
  });
});

// Obtener cursos de un alumno por RUT
router.get('/:rut/cursos', (req, res) => {
  const rut = req.params.rut;

  const query = `
    SELECT COUNT(*) AS total
    FROM curso c
    JOIN alumno_curso ac ON c.id_curso = ac.id_curso
    JOIN alumno a ON ac.rut_alumno = a.rut
    WHERE a.rut = ?
  `;

  db.query(query, [rut], (err, results) => {
    if (err) {
      console.error("Error al obtener cursos del alumno:", err);
      return res.status(500).json({ success: false, error: err.message });
    }

    const rows = results as RowDataPacket[];
    res.json({ success: true, total: rows[0].total });
  });
});


router.post('/crear', async (req, res) => {
  const { rut, nombre_completo, direccion, fono, correo, password } = req.body;

  if (!rut || !nombre_completo || !correo || !password) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  try {
    // 1️⃣ Verificar si el correo ya existe
    const [correoExistente] = await new Promise<any[]>((resolve, reject) => {
      db.query('SELECT COUNT(*) AS total FROM usuario WHERE correo = ?', [correo], (err, results) => {
        if (err) reject(err);
        else resolve(results as any[]);
      });
    });

    if (correoExistente.total > 0) {
      return res.status(400).json({ error: 'El correo ya está registrado' });
    }

    // 2️⃣ Hashear la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3️⃣ Insertar en tabla usuario
    const usuarioResult: any = await new Promise((resolve, reject) => {
      const sql = `INSERT INTO usuario (correo, password, tipo_usuario) VALUES (?, ?, 'alumno')`;
      db.query(sql, [correo, hashedPassword], (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });

    const id_usuario = usuarioResult.insertId;

    // 4️⃣ Insertar en tabla alumno
    await new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO alumno (rut, nombre_completo, direccion, id_usuario, fono)
        VALUES (?, ?, ?, ?, ?)
      `;
      db.query(sql, [rut, nombre_completo, direccion, id_usuario, fono], (err) => {
        if (err) reject(err);
        else resolve(null);
      });
    });

    res.json({ success: true, message: 'Alumno creado correctamente' });

  } catch (err: any) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Error al crear alumno: ' + err.message });
  }
});


// Obtener alumno por RUT (para mostrar en el panel del alumno logeado)
router.get('/:rut', (req, res) => {
  const rut = req.params.rut;

  const query = `
    SELECT a.rut, a.nombre_completo, a.direccion, a.fono, u.correo
    FROM alumno a
    JOIN usuario u ON a.id_usuario = u.id_usuario
    WHERE a.rut = ?
    LIMIT 1
  `;

  db.query(query, [rut], (err, results) => {
    if (err) return res.status(500).json({ error: 'Error al obtener alumno: ' + err.message });

    const rows = results as any[];
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Alumno no encontrado' });
    }

    res.json({ success: true, alumno: rows[0] });
  });
});

// PATCH /alumnos/:rut
router.patch('/:rut', async (req, res) => {
  const rut = req.params.rut;
  const { nombre, fono, direccion, correo } = req.body;

  try {
    const updatesAlumno: string[] = [];
    const valuesAlumno: any[] = [];

    // Campos de la tabla alumno
    if (nombre) {
      updatesAlumno.push('nombre_completo = ?');
      valuesAlumno.push(nombre);
    }
    if (fono) {
      updatesAlumno.push('fono = ?');
      valuesAlumno.push(fono);
    }
    if (direccion) {
      updatesAlumno.push('direccion = ?');
      valuesAlumno.push(direccion);
    }

    // Actualizar tabla alumno si hay campos
    if (updatesAlumno.length > 0) {
      const queryAlumno = `UPDATE alumno SET ${updatesAlumno.join(', ')} WHERE rut = ?`;
      valuesAlumno.push(rut);
      await new Promise<void>((resolve, reject) => {
        db.query(queryAlumno, valuesAlumno, (err) => (err ? reject(err) : resolve()));
      });
    }

    // Actualizar correo en tabla usuario si viene
    if (correo) {
      const queryUsuario = `
        UPDATE usuario u
        JOIN alumno a ON a.id_usuario = u.id_usuario
        SET u.correo = ?
        WHERE a.rut = ?
      `;
      await new Promise<void>((resolve, reject) => {
        db.query(queryUsuario, [correo, rut], (err) => (err ? reject(err) : resolve()));
      });
    }

    res.json({ success: true, message: 'Alumno actualizado correctamente' });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});


// Eliminar alumno
router.delete('/:rut', (req, res) => {
  const rut = req.params.rut;

  // Primero obtener id_usuario del alumno
  const obtenerUsuarioId = `SELECT id_usuario FROM alumno WHERE rut = ?`;

  db.query(obtenerUsuarioId, [rut], (err, results) => {
    if (err) return res.status(500).json({ success: false, error: 'Error al buscar alumno: ' + err.message });

    if ((results as any).length === 0) {
      return res.status(404).json({ success: false, error: 'Alumno no encontrado' });
    }

    const id_usuario = (results as any)[0].id_usuario;

    // Eliminar alumno
    const eliminarAlumno = `DELETE FROM alumno WHERE rut = ?`;
    db.query(eliminarAlumno, [rut], (err2) => {
      if (err2) return res.status(500).json({ success: false, error: 'Error al eliminar alumno: ' + err2.message });

      // Eliminar usuario
      const eliminarUsuario = `DELETE FROM usuario WHERE id_usuario = ?`;
      db.query(eliminarUsuario, [id_usuario], (err3) => {
        if (err3) return res.status(500).json({ success: false, error: 'Error al eliminar usuario: ' + err3.message });

        res.json({ success: true, message: 'Alumno eliminado correctamente' });
      });
    });
  });
});



export default router;
