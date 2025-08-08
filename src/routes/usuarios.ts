import express from 'express';
import db from '../db';
import { ResultSetHeader } from 'mysql2';

const router = express.Router();

// Obtener usuarios (solo datos básicos)
router.get('/', (req, res) => {
  const sql = 'SELECT id_usuario, tipo_usuario, correo FROM usuario';
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Crear nuevo usuario
router.post('/crear-usuario', (req, res) => {
  const { correo, password, tipo_usuario } = req.body;

  // Validaciones
  if (!correo || !password || !tipo_usuario) {
    return res.status(400).json({ success: false, error: 'Faltan datos del usuario' });
  }

  const sql = `
    INSERT INTO usuario (correo, password, tipo_usuario)
    VALUES (?, ?, ?)
  `;

  db.query(sql, [correo, password, tipo_usuario], (err, result) => {
    if (err) {
      console.error('Error al insertar usuario:', err);
      return res.status(500).json({ success: false, error: 'Error al crear el usuario' });
    }

    res.json({
      success: true,
      message: 'Usuario creado exitosamente',
      id_usuario: (result as any).insertId
    });
  });
});


// Login
router.post('/login', (req, res) => {
  const { correo, password } = req.body;

  if (!correo || !password)
    return res.status(400).json({ error: 'Faltan campos' });

  const sql = `
    SELECT u.*, a.nombre_completo, a.rut
    FROM usuario u
    LEFT JOIN alumno a ON u.id_usuario = a.id_usuario
    WHERE u.correo = ? AND u.password = ?
  `;

  db.query(sql, [correo, password], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    const rows = results as any[];

    if (rows.length > 0) {
      const user = rows[0];
      res.json({
        success: true,
        id_usuario: user.id_usuario,
        tipo_usuario: user.tipo_usuario,
        nombre: user.nombre_completo || null,
        rut: user.rut || null
      });
    } else {
      res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
    }
  });
});

router.patch('/cambiar-clave/:id_usuario', (req, res) => {
  const { id_usuario } = req.params;
  const { nuevaContrasena } = req.body;

  if (!nuevaContrasena) {
    return res.status(400).json({ success: false, error: 'Falta la nueva contraseña' });
  }

  // Aquí deberías hacer hash a la contraseña antes de guardarla (recomendado)
  // Por simplicidad, lo guardamos directamente (NO RECOMENDADO EN PRODUCCIÓN)
  const sql = 'UPDATE usuario SET password = ? WHERE id_usuario = ?';

  db.query(sql, [nuevaContrasena, id_usuario], (err, result) => {
    if (err) {
      console.error('Error al actualizar contraseña:', err);
      return res.status(500).json({ success: false, error: 'Error al actualizar la contraseña' });
    }
    
    const resultTyped = result as ResultSetHeader;

    if (resultTyped.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    }
    res.json({ success: true, message: 'Contraseña actualizada correctamente' });
  });
});


export default router;
