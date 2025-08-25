import express from 'express';
import db from '../db';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import bcrypt from 'bcrypt';

const router = express.Router();

// Obtener usuarios (solo datos básicos)
router.get('/', (req, res) => {
  const sql = 'SELECT id_usuario, tipo_usuario, correo FROM usuario';
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Crear un usuario administrativo (admi o subAdmi)
router.post('/crear-usuario', (req, res) => {
  const { correo, password, tipo_usuario } = req.body;

  if (!correo || !password || !tipo_usuario) {
    return res.status(400).json({ success: false, error: 'Faltan datos del usuario' });
  }

  if (!['admi', 'subAdmi'].includes(tipo_usuario)) {
    return res.status(400).json({ success: false, error: 'Tipo de usuario inválido' });
  }

  // Primero verificamos si ya existe un usuario con ese correo
  const checkCorreoSql = 'SELECT COUNT(*) AS total FROM usuario WHERE correo = ?';
  db.query(checkCorreoSql, [correo], (err, results) => {
    if (err) return res.status(500).json({ success: false, error: 'Error en la base de datos' });

    const rows = results as RowDataPacket[];
    if (rows[0].total > 0) {
      return res.status(400).json({ success: false, error: 'El correo ya está registrado' });
    }

    // Validación: solo puede existir un admi
    if (tipo_usuario === 'admi') {
      const checkAdmiSql = 'SELECT COUNT(*) AS total FROM usuario WHERE tipo_usuario = "admi"';
      db.query(checkAdmiSql, (err2, results2) => {
        if (err2) return res.status(500).json({ success: false, error: 'Error en la base de datos' });

        const rows2 = results2 as RowDataPacket[];
        if (rows2[0].total > 0) {
          return res.status(400).json({ success: false, error: 'Ya existe un usuario admi' });
        }

        crearUsuario();
      });
    } else {
      crearUsuario();
    }

    function crearUsuario() {
      const saltRounds = 10;
      bcrypt.hash(password, saltRounds, (err, hashedPassword) => {
        if (err) {
          return res.status(500).json({ success: false, error: 'Error al encriptar la contraseña' });
        }

        const sql = 'INSERT INTO usuario (correo, password, tipo_usuario) VALUES (?, ?, ?)';
        db.query(sql, [correo, hashedPassword, tipo_usuario], (err3, result) => {
          if (err3) return res.status(500).json({ success: false, error: 'Error al crear usuario' });

          const insertId = (result as ResultSetHeader).insertId;
          res.json({ success: true, message: 'Usuario creado correctamente', id_usuario: insertId });
        });
      });
    }
  });
});

// Verificar si ya existe un usuario admi
router.get('/check-admi', (req, res) => {
  const sql = 'SELECT COUNT(*) AS total FROM usuario WHERE tipo_usuario = "admi"';
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ success: false, error: 'Error en la base de datos' });

    const rows = results as RowDataPacket[];
    const admiExiste = rows[0].total > 0;

    res.json({ success: true, admiExiste });
  });
});

// Login con verificación de contraseña hasheada
router.post('/login', (req, res) => {
  const { correo, password } = req.body;

  if (!correo || !password)
    return res.status(400).json({ error: 'Faltan campos' });

  const sql = `
    SELECT u.*, a.nombre_completo, a.rut
    FROM usuario u
    LEFT JOIN alumno a ON u.id_usuario = a.id_usuario
    WHERE u.correo = ?
  `;

  db.query(sql, [correo], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    const rows = results as any[];

    if (rows.length > 0) {
      const user = rows[0];
      bcrypt.compare(password, user.password, (err2, isMatch) => {
        if (err2) return res.status(500).json({ error: 'Error al verificar contraseña' });

        if (isMatch) {
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
    } else {
      res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
    }
  });
});

// Cambiar contraseña con hash
router.patch('/cambiar-clave/:id_usuario', (req, res) => {
  const { id_usuario } = req.params;
  const { nuevaContrasena } = req.body;

  if (!nuevaContrasena) {
    return res.status(400).json({ success: false, error: 'Falta la nueva contraseña' });
  }

  bcrypt.hash(nuevaContrasena, 10, (err, hashedPassword) => {
    if (err) {
      console.error('Error al encriptar contraseña:', err);
      return res.status(500).json({ success: false, error: 'Error al encriptar contraseña' });
    }

    const sql = 'UPDATE usuario SET password = ? WHERE id_usuario = ?';
    db.query(sql, [hashedPassword, id_usuario], (err, result) => {
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
});

// Crear un usuario administrador (admi) – solo puede existir uno
router.post('/crear-admi', (req, res) => {
  const { correo, password } = req.body;

  if (!correo || !password) {
    return res.status(400).json({ success: false, error: 'Faltan datos del usuario' });
  }

  // Verificar si ya existe un admi
  const checkAdmiSql = 'SELECT COUNT(*) AS total FROM usuario WHERE tipo_usuario = "admi"';
  db.query(checkAdmiSql, (err, results) => {
    if (err) return res.status(500).json({ success: false, error: 'Error en la base de datos' });

    const rows = results as RowDataPacket[];
    if (rows[0].total > 0) {
      return res.status(400).json({ success: false, error: 'Ya existe un usuario admi' });
    }

    // Verificar que el correo no exista
    const checkCorreoSql = 'SELECT COUNT(*) AS total FROM usuario WHERE correo = ?';
    db.query(checkCorreoSql, [correo], (err2, results2) => {
      if (err2) return res.status(500).json({ success: false, error: 'Error en la base de datos' });

      const rows2 = results2 as RowDataPacket[];
      if (rows2[0].total > 0) {
        return res.status(400).json({ success: false, error: 'El correo ya está registrado' });
      }

      // Crear admi
      bcrypt.hash(password, 10, (err3, hashedPassword) => {
        if (err3) return res.status(500).json({ success: false, error: 'Error al encriptar contraseña' });

        const sql = 'INSERT INTO usuario (correo, password, tipo_usuario) VALUES (?, ?, "admi")';
        db.query(sql, [correo, hashedPassword], (err4, result) => {
          if (err4) return res.status(500).json({ success: false, error: 'Error al crear usuario' });

          const insertId = (result as ResultSetHeader).insertId;
          res.json({ success: true, message: 'Usuario admi creado correctamente', id_usuario: insertId });
        });
      });
    });
  });
});


export default router;
