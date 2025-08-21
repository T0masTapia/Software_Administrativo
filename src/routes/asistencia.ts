import express from 'express';
import db from '../db';
import ExcelJS from 'exceljs';

const router = express.Router();

router.get('/toda', (req, res) => {
  const sql = `
    SELECT a.id_curso, al.rut, al.nombre_completo, asis.fecha, asis.estado
    FROM alumno_curso a
    JOIN alumno al ON a.rut_alumno = al.rut
    LEFT JOIN asistencia asis ON asis.rut_alumno = a.rut_alumno AND asis.id_curso = a.id_curso
    ORDER BY a.id_curso, al.nombre_completo, asis.fecha
  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ success: false, error: 'Error al obtener asistencia' });
    res.json({ success: true, asistencia: results });
  });
});

// Obtener asistencia de un curso específico
router.get('/toda/curso/:idCurso', (req, res) => {
  const { idCurso } = req.params;
  const sql = `
    SELECT a.id_curso, al.rut, al.nombre_completo, asis.fecha, asis.estado
    FROM alumno_curso a
    JOIN alumno al ON a.rut_alumno = al.rut
    LEFT JOIN asistencia asis ON asis.rut_alumno = a.rut_alumno AND asis.id_curso = a.id_curso
    WHERE a.id_curso = ?
    ORDER BY al.nombre_completo, asis.fecha
  `;
  
  db.query(sql, [idCurso], (err, results) => {
    if (err) return res.status(500).json({ success: false, error: 'Error al obtener asistencia' });

    const rows = results as any[];
    if (rows.length === 0) {
      return res.json({
        success: true,
        message: 'Actualmente no se ha registrado asistencia en este curso',
        asistencia: []
      });
    }

    // Si hay alumnos pero sin registros de asistencia
    const asistenciaProcesada = rows.map(row => ({
      id_curso: row.id_curso,
      rut: row.rut,
      nombre_completo: row.nombre_completo,
      fecha: row.fecha || null,
      estado: row.estado || 'S' // S = Sin marcar
    }));

    res.json({ success: true, asistencia: asistenciaProcesada });
  });
});


// Obtener asistencia de un curso en una fecha
router.get('/:idCurso/:fecha', (req, res) => {
  const { idCurso, fecha } = req.params;

  const sql = `
    SELECT a.rut_alumno, al.nombre_completo, asis.estado
    FROM alumno_curso a
    JOIN alumno al ON a.rut_alumno = al.rut
    LEFT JOIN asistencia asis 
      ON asis.rut_alumno = a.rut_alumno 
      AND asis.id_curso = a.id_curso 
      AND asis.fecha = ?
    WHERE a.id_curso = ?
  `;

  db.query(sql, [fecha, idCurso], (err, results) => {
    if (err) {
      console.error('Error al obtener asistencia:', err);
      return res.status(500).json({ success: false, error: 'Error al obtener asistencia' });
    }
    res.json({ success: true, asistencia: results });
  });
});

// Guardar asistencia (crear o actualizar)
router.post('/guardar-asistencia', (req, res) => {
  const { id_curso, fecha, asistencias } = req.body; // asistencias = [{ rut_alumno, estado }, ...]

  if (!id_curso || !fecha || !Array.isArray(asistencias)) {
    return res.status(400).json({ success: false, error: 'Datos incompletos' });
  }

  // Aquí puedes hacer un proceso para insertar o actualizar cada asistencia
  // Por simplicidad, ejemplo con MySQL múltiple:
  
  const sqlDelete = `DELETE FROM asistencia WHERE id_curso = ? AND fecha = ?`;
  db.query(sqlDelete, [id_curso, fecha], (err) => {
    if (err) {
      console.error('Error al borrar asistencias anteriores:', err);
      return res.status(500).json({ success: false, error: 'Error al guardar asistencia' });
    }

    // Insertar las nuevas asistencias
    const sqlInsert = `INSERT INTO asistencia (rut_alumno, id_curso, fecha, estado) VALUES ?`;

    const values = asistencias.map(({ rut_alumno, estado }) => [
      rut_alumno,
      id_curso,
      fecha,
      estado,
    ]);

    db.query(sqlInsert, [values], (err2) => {
      if (err2) {
        console.error('Error al insertar asistencias:', err2);
        return res.status(500).json({ success: false, error: 'Error al guardar asistencia' });
      }

      res.json({ success: true, message: 'Asistencia guardada correctamente' });
    });
  });
});

router.get('/descargar/:idCurso/:fecha', async (req, res) => {
  const { idCurso, fecha } = req.params;

  const sql = `
    SELECT a.rut_alumno, al.nombre_completo, asis.estado
    FROM alumno_curso a
    JOIN alumno al ON a.rut_alumno = al.rut
    LEFT JOIN asistencia asis 
      ON asis.rut_alumno = a.rut_alumno 
      AND asis.id_curso = a.id_curso 
      AND asis.fecha = ?
    WHERE a.id_curso = ?
  `;

  db.query(sql, [fecha, idCurso], async (err, results) => {
    if (err) {
      console.error('Error al obtener asistencia para Excel:', err);
      return res.status(500).send('Error al generar Excel');
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Asistencia');

    // Agregar encabezados
    worksheet.columns = [
      { header: 'RUT Alumno', key: 'rut_alumno', width: 20 },
      { header: 'Nombre Completo', key: 'nombre_completo', width: 30 },
      { header: 'Estado', key: 'estado', width: 15 },
    ];

    // Agregar filas
    const rows = results as any[];
    rows.forEach(row => {
      worksheet.addRow({
        rut_alumno: row.rut_alumno,
        nombre_completo: row.nombre_completo,
        estado: row.estado || 'S', // S: Sin marcar
      });
    });

    // Preparar la respuesta como archivo descargable
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=asistencia_${idCurso}_${fecha}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  });
});


export default router;
