import express from 'express';
import db from '../db';

const router = express.Router();

// GET /matricula - Obtener monto de la matrícula (suponiendo que solo hay un registro con el monto actual)
router.get('/', (req, res) => {
  const sql = 'SELECT * FROM matricula LIMIT 1'; // Trae el monto de matrícula actual

  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error al obtener monto de matrícula:', err);
      return res.status(500).json({ success: false, error: 'Error en la base de datos' });
    }

    const rows = results as any[]
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'No hay monto de matrícula configurado' });
    }

    res.json({ success: true, matricula: rows[0] });
  });
});

// POST /matricula - Crear o actualizar monto de matrícula
// router.post('/', (req, res) => {
//   const { monto } = req.body;

//   if (monto == null) {
//     return res.status(400).json({ success: false, error: 'Falta el monto de matrícula' });
//   }

//   // Primero chequeamos si ya hay un registro
//   const sqlCheck = 'SELECT id_matricula FROM matricula LIMIT 1';

//   db.query(sqlCheck, (err, results) => {
//     if (err) {
//       console.error('Error en la base de datos:', err);
//       return res.status(500).json({ success: false, error: 'Error en la base de datos' });
//     }

//     if (results.length === 0) {
//       // No hay registro, insertamos
//       const sqlInsert = 'INSERT INTO matricula (monto, fecha_matricula, estado) VALUES (?, CURDATE(), "activo")';
//       db.query(sqlInsert, [monto], (err2, result) => {
//         if (err2) {
//           console.error('Error al crear monto matrícula:', err2);
//           return res.status(500).json({ success: false, error: 'Error al guardar monto de matrícula' });
//         }
//         res.json({ success: true, message: 'Monto de matrícula creado', id: result.insertId });
//       });
//     } else {
//       // Ya existe, actualizamos
//       const id = results[0].id_matricula;
//       const sqlUpdate = 'UPDATE matricula SET monto = ?, fecha_matricula = CURDATE(), estado = "activo" WHERE id_matricula = ?';

//       db.query(sqlUpdate, [monto, id], (err3) => {
//         if (err3) {
//           console.error('Error al actualizar monto matrícula:', err3);
//           return res.status(500).json({ success: false, error: 'Error al actualizar monto de matrícula' });
//         }
//         res.json({ success: true, message: 'Monto de matrícula actualizado' });
//       });
//     }
//   });
// });

export default router;
