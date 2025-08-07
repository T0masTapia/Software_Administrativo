import express from 'express';
import db from '../db';

const router = express.Router();

// Obtener usuarios (solo datos básicos)
router.get('/', (req, res) => {
  const sql = 'SELECT id_usuario, tipo_usuario, correo FROM usuario';
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Login
router.post('/login', (req, res) => {
  const { correo, password } = req.body;

  if (!correo || !password)
    return res.status(400).json({ error: 'Faltan campos' });

  // Consulta con JOIN para traer datos de usuario y alumno
  const sql = `
    SELECT u.*, a.nombre_completo 
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
        tipo_usuario: user.tipo_usuario,
        nombre: user.nombre_completo || null // si no es alumno puede ser null
      });
    } else {
      res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
    }
  });
});

export default router;
